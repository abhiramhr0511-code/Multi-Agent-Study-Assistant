import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from backend.schemas.schemas import (
    RevisionItem,
    RevisionReviewRequest,
    RevisionReviewRecord,
    RevisionScheduleResponse
)
from backend.utils.auth_utils import get_current_user
from backend.database.connection import get_db_collection
from backend.api.learning_twin import get_learning_twin

router = APIRouter(prefix="/revision", tags=["Personalized Revision Scheduler"])

@router.get("", response_model=RevisionScheduleResponse)
def get_revision_schedule(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    # 1. Obtain dynamic learning twin data
    twin_data = get_learning_twin(current_user=current_user)
    
    now = datetime.utcnow()
    now_iso = now.isoformat()
    today_str = now.strftime("%Y-%m-%d")
    
    if not twin_data.has_data or not twin_data.skills:
        return RevisionScheduleResponse(
            user_id=str(user_id),
            due_today_count=0,
            overdue_count=0,
            upcoming_count=0,
            total_reviewed_count=0,
            items_due_today=[],
            items_upcoming=[],
            recently_reviewed=[],
            has_data=False,
            last_generated=now_iso
        )

    # 2. Fetch past review history
    review_col = get_db_collection("revision_reviews")
    review_docs = list(review_col.find({"user_id": user_id}))
    review_map: Dict[str, Dict[str, Any]] = {r.get("topic"): r for r in review_docs if r.get("topic")}

    # 3. Fetch latest activity timestamps per topic from quizzes & assessments
    quiz_col = get_db_collection("quiz_results")
    assessment_col = get_db_collection("skill_assessments")
    
    quizzes = list(quiz_col.find({"user_id": user_id}).sort("created_at", -1).limit(20))
    assessments = list(assessment_col.find({"user_id": user_id}).sort("created_at", -1).limit(5))
    
    last_practiced_map: Dict[str, str] = {}
    for q in quizzes:
        q_time = q.get("created_at")
        if q.get("topic") and q.get("topic") not in last_practiced_map and q_time:
            last_practiced_map[q.get("topic")] = q_time
        for tb in q.get("topic_breakdown", []):
            tb_name = tb.get("topic")
            if tb_name and tb_name not in last_practiced_map and q_time:
                last_practiced_map[tb_name] = q_time
                
    for a in assessments:
        a_time = a.get("created_at")
        for tb in a.get("topic_breakdown", []):
            tb_name = tb.get("topic")
            if tb_name and tb_name not in last_practiced_map and a_time:
                last_practiced_map[tb_name] = a_time

    # 4. Generate Spaced Repetition Revision Items
    items_due_today: List[RevisionItem] = []
    items_upcoming: List[RevisionItem] = []
    recently_reviewed: List[RevisionItem] = []
    
    overdue_counter = 0

    for skill in twin_data.skills:
        topic_name = skill.topic
        subject_name = skill.subject or twin_data.primary_subject or "General"
        
        rev_history = review_map.get(topic_name)
        last_practiced_time = last_practiced_map.get(topic_name) or (rev_history.get("reviewed_at") if rev_history else None)
        
        # Determine Spaced Repetition Interval & Next Due Date
        if rev_history:
            review_count = rev_history.get("review_count", 1)
            interval_days = rev_history.get("interval_days", 1)
            next_due_date_str = rev_history.get("next_due_date", today_str)
            last_reviewed_at = rev_history.get("reviewed_at")
        else:
            review_count = 0
            # Initial Spaced Interval based on mastery
            if skill.evidence.is_repeated_difficulty or skill.mastery == "Weak":
                interval_days = 1
                next_due_date_str = today_str # Due immediately
            elif skill.mastery == "Moderate" or skill.trend == "Declining":
                interval_days = 2
                next_due_date_str = today_str
            else:
                interval_days = 5
                target_due = now + timedelta(days=interval_days)
                next_due_date_str = target_due.strftime("%Y-%m-%d")
            last_reviewed_at = None

        # Determine Priority
        if skill.evidence.is_repeated_difficulty or skill.mastery == "Weak" or skill.trend == "Declining":
            priority = "High"
        elif skill.mastery == "Moderate" or skill.evidence.mistake_count > 0:
            priority = "Medium"
        else:
            priority = "Low"

        # Formulate Specific Reason for Revision
        reason_parts = []
        if skill.evidence.is_repeated_difficulty:
            reason_parts.append(f"Repeated conceptual difficulties ({skill.evidence.mistake_count} recorded mistakes)")
        elif skill.evidence.mistake_count > 0:
            reason_parts.append(f"{skill.evidence.mistake_count} mistake(s) diagnosed")
            
        if skill.trend == "Declining":
            reason_parts.append("Accuracy trend has declined over recent sessions")
        elif skill.mastery == "Weak":
            reason_parts.append(f"Low baseline competency ({skill.score}%)")
        elif skill.mastery == "Moderate":
            reason_parts.append(f"Moderate competency ({skill.score}%) — practice needed to reinforce concept")
        else:
            reason_parts.append(f"Periodic spaced repetition check ({skill.score}% mastery)")

        revision_reason = ". ".join(reason_parts)

        # Check due status against today's date
        try:
            next_due_dt = datetime.strptime(next_due_date_str[:10], "%Y-%m-%d")
            today_dt = datetime.strptime(today_str, "%Y-%m-%d")
            is_overdue = next_due_dt < today_dt
            is_due_today = next_due_dt == today_dt
        except Exception:
            is_overdue = False
            is_due_today = True

        if is_overdue:
            status_label = "Overdue"
            overdue_counter += 1
        elif is_due_today:
            status_label = "Due Today"
        elif rev_history and last_reviewed_at and (now - datetime.fromisoformat(last_reviewed_at.replace("Z", ""))).days < 1:
            status_label = "Reviewed"
        else:
            status_label = "Upcoming"

        item = RevisionItem(
            id=f"rev-{topic_name.replace(' ', '-').lower()}",
            topic=topic_name,
            subject=subject_name,
            priority=priority,
            reason=revision_reason,
            last_practiced=last_practiced_time,
            recommended_revision_date=next_due_date_str[:10],
            status=status_label,
            interval_days=interval_days,
            review_count=review_count,
            competency_score=skill.score,
            mastery=skill.mastery,
            trend=skill.trend,
            mistake_count=skill.evidence.mistake_count,
            is_repeated_difficulty=skill.evidence.is_repeated_difficulty
        )

        if status_label in ("Due Today", "Overdue"):
            items_due_today.append(item)
        else:
            items_upcoming.append(item)
            
        if rev_history:
            recently_reviewed.append(item)

    # Sort items_due_today by Priority (High -> Medium -> Low), then lowest score
    priority_weights = {"High": 0, "Medium": 1, "Low": 2}
    items_due_today.sort(key=lambda x: (priority_weights.get(x.priority, 3), x.competency_score))
    items_upcoming.sort(key=lambda x: (x.recommended_revision_date, priority_weights.get(x.priority, 3)))
    recently_reviewed.sort(key=lambda x: x.recommended_revision_date, reverse=True)

    return RevisionScheduleResponse(
        user_id=str(user_id),
        due_today_count=len(items_due_today),
        overdue_count=overdue_counter,
        upcoming_count=len(items_upcoming),
        total_reviewed_count=len(recently_reviewed),
        items_due_today=items_due_today,
        items_upcoming=items_upcoming,
        recently_reviewed=recently_reviewed[:10],
        has_data=True,
        last_generated=now_iso
    )

@router.post("/review", response_model=RevisionReviewRecord)
def mark_topic_reviewed(
    payload: RevisionReviewRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    topic = payload.topic
    subject = payload.subject or "General"
    ease = payload.ease_rating or "Good"
    
    review_col = get_db_collection("revision_reviews")
    existing = review_col.find_one({"user_id": user_id, "topic": topic})
    
    current_count = existing.get("review_count", 0) if existing else 0
    new_count = current_count + 1
    
    # Spaced Repetition Interval Multiplier Schedule
    # Stage 1: 1-2 days
    # Stage 2: 3-5 days
    # Stage 3: 7-10 days
    # Stage 4: 14-21 days
    # Stage 5+: 30-45 days
    if ease == "Hard":
        intervals = [1, 1, 2, 4, 7]
    elif ease == "Easy":
        intervals = [2, 5, 10, 21, 45]
    else: # "Good"
        intervals = [1, 3, 7, 14, 30]
        
    idx = min(new_count - 1, len(intervals) - 1)
    next_interval = intervals[max(0, idx)]
    
    now = datetime.utcnow()
    now_iso = now.isoformat()
    next_due = now + timedelta(days=next_interval)
    next_due_str = next_due.strftime("%Y-%m-%d")
    
    doc_id = str(existing.get("_id")) if existing else str(uuid.uuid4())
    
    doc = {
        "_id": doc_id,
        "user_id": user_id,
        "topic": topic,
        "subject": subject,
        "reviewed_at": now_iso,
        "next_due_date": next_due_str,
        "interval_days": next_interval,
        "review_count": new_count,
        "ease_rating": ease,
        "notes": payload.notes
    }
    
    if existing:
        review_col.update_one({"_id": doc_id}, {"$set": doc})
    else:
        review_col.insert_one(doc)
        
    return RevisionReviewRecord(
        id=doc_id,
        user_id=str(user_id),
        topic=topic,
        subject=subject,
        reviewed_at=now_iso,
        next_due_date=next_due_str,
        interval_days=next_interval,
        review_count=new_count,
        ease_rating=ease
    )
