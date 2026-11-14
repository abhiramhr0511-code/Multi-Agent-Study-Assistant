from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from backend.schemas.schemas import (
    LearningTwinResponse,
    SkillTwinItem,
    TopicEvidence,
    RepeatedDifficultyItem,
    RecommendedFocusItem,
    LearningActivityItem
)
from backend.utils.auth_utils import get_current_user
from backend.database.connection import get_db_collection

router = APIRouter(prefix="/learning-twin", tags=["Student Learning Twin"])

@router.get("", response_model=LearningTwinResponse)
def get_learning_twin(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    # 1. Fetch relevant collections for the authenticated user
    assessment_col = get_db_collection("skill_assessments")
    quiz_col = get_db_collection("quiz_results")
    mistake_col = get_db_collection("mistake_analysis")
    doc_col = get_db_collection("documents")
    
    assessments = list(assessment_col.find({"user_id": user_id}).sort("created_at", -1))
    quizzes = list(quiz_col.find({"user_id": user_id}).sort("created_at", -1))
    mistakes = list(mistake_col.find({"user_id": user_id}).sort("created_at", -1))
    docs = list(doc_col.find({"user_id": user_id}).sort("created_at", -1))
    
    now_iso = datetime.utcnow().isoformat()
    
    # 2. Check empty state
    if not assessments and not quizzes and not mistakes:
        return LearningTwinResponse(
            user_id=str(user_id),
            learning_goal="Set your first learning goal with a Skill Assessment",
            primary_subject=None,
            overall_progress=0.0,
            skills=[],
            strong_topics=[],
            moderate_topics=[],
            weak_topics=[],
            repeated_difficulties=[],
            recommended_focus_topics=[],
            recent_activity=[],
            total_assessments=0,
            total_quizzes=0,
            total_mistakes=0,
            has_data=False,
            last_updated=now_iso
        )

    # 3. Extract primary subject and learning goal from latest assessment or quizzes
    latest_assessment = assessments[0] if assessments else None
    primary_subject = latest_assessment.get("subject") if latest_assessment else (quizzes[0].get("topic") if quizzes else "General Studies")
    learning_goal = latest_assessment.get("learning_goal") if latest_assessment else (f"Master {primary_subject} and core concepts")
    
    # 4. Aggregate topic-wise evidence
    topic_data: Dict[str, Dict[str, Any]] = {}
    
    # Process Assessments
    for a_idx, ass in enumerate(assessments):
        breakdown = ass.get("topic_breakdown", [])
        for tb in breakdown:
            t_name = tb.get("topic", "General")
            if t_name not in topic_data:
                topic_data[t_name] = {
                    "subject": ass.get("subject", primary_subject),
                    "assessment_scores": [],
                    "latest_assessment_score": None,
                    "quiz_scores": [],
                    "quiz_attempts": 0,
                    "mistakes": [],
                    "latest_misconception": None,
                    "latest_recommended_action": None
                }
            score_pct = float(tb.get("percentage", 0.0))
            topic_data[t_name]["assessment_scores"].append(score_pct)
            if topic_data[t_name]["latest_assessment_score"] is None and a_idx == 0:
                topic_data[t_name]["latest_assessment_score"] = score_pct

    # Process Quizzes
    for q in quizzes:
        q_topic = q.get("topic", "General")
        q_pct = float(q.get("percentage", 0.0))
        q_breakdown = q.get("topic_breakdown", [])
        
        if q_breakdown:
            for tb in q_breakdown:
                tb_name = tb.get("topic", q_topic)
                if tb_name not in topic_data:
                    topic_data[tb_name] = {
                        "subject": primary_subject,
                        "assessment_scores": [],
                        "latest_assessment_score": None,
                        "quiz_scores": [],
                        "quiz_attempts": 0,
                        "mistakes": [],
                        "latest_misconception": None,
                        "latest_recommended_action": None
                    }
                topic_data[tb_name]["quiz_scores"].append(float(tb.get("percentage", q_pct)))
                topic_data[tb_name]["quiz_attempts"] += 1
        else:
            if q_topic not in topic_data:
                topic_data[q_topic] = {
                    "subject": primary_subject,
                    "assessment_scores": [],
                    "latest_assessment_score": None,
                    "quiz_scores": [],
                    "quiz_attempts": 0,
                    "mistakes": [],
                    "latest_misconception": None,
                    "latest_recommended_action": None
                }
            topic_data[q_topic]["quiz_scores"].append(q_pct)
            topic_data[q_topic]["quiz_attempts"] += 1

    # Process Mistakes
    for m in mistakes:
        m_topic = m.get("topic", "General")
        if m_topic not in topic_data:
            topic_data[m_topic] = {
                "subject": m.get("subject", primary_subject),
                "assessment_scores": [],
                "latest_assessment_score": None,
                "quiz_scores": [],
                "quiz_attempts": 0,
                "mistakes": [],
                "latest_misconception": None,
                "latest_recommended_action": None
            }
        topic_data[m_topic]["mistakes"].append(m)
        if not topic_data[m_topic]["latest_misconception"]:
            topic_data[m_topic]["latest_misconception"] = m.get("possible_misconception")
            topic_data[m_topic]["latest_recommended_action"] = m.get("recommended_action")

    # 5. Compute Skills, Trends, and Priorities for each Topic
    skill_items: List[SkillTwinItem] = []
    strong_topics: List[str] = []
    moderate_topics: List[str] = []
    weak_topics: List[str] = []
    repeated_diff_items: List[RepeatedDifficultyItem] = []
    
    total_scores = []
    
    for topic_name, data in topic_data.items():
        ass_score = data["latest_assessment_score"]
        if ass_score is None and data["assessment_scores"]:
            ass_score = sum(data["assessment_scores"]) / len(data["assessment_scores"])
            
        q_scores = data["quiz_scores"]
        recent_quiz_acc = (sum(q_scores[:3]) / len(q_scores[:3])) if q_scores else None
        mistake_cnt = len(data["mistakes"])
        is_rep = mistake_cnt >= 2
        
        # Calculate unified score
        if ass_score is not None and recent_quiz_acc is not None:
            raw_score = 0.4 * ass_score + 0.6 * recent_quiz_acc - min(15.0, mistake_cnt * 3.0)
        elif ass_score is not None:
            raw_score = ass_score - min(15.0, mistake_cnt * 3.0)
        elif recent_quiz_acc is not None:
            raw_score = recent_quiz_acc - min(15.0, mistake_cnt * 3.0)
        else:
            raw_score = max(20.0, 50.0 - (mistake_cnt * 5.0))
            
        computed_score = round(max(0.0, min(100.0, raw_score)), 1)
        total_scores.append(computed_score)
        
        # Mastery classification
        if computed_score >= 80.0 and mistake_cnt <= 1:
            mastery = "Strong"
            strong_topics.append(topic_name)
        elif computed_score >= 60.0:
            mastery = "Moderate"
            moderate_topics.append(topic_name)
        else:
            mastery = "Weak"
            weak_topics.append(topic_name)
            
        # Trend Calculation
        if len(q_scores) >= 2:
            earlier_avg = sum(q_scores[1:]) / len(q_scores[1:])
            latest_val = q_scores[0]
            if latest_val >= earlier_avg + 7.0:
                trend = "Improving"
            elif latest_val <= earlier_avg - 7.0:
                trend = "Declining"
            else:
                trend = "Stable"
        elif ass_score is not None and recent_quiz_acc is not None:
            diff = recent_quiz_acc - ass_score
            if diff >= 7.0:
                trend = "Improving"
            elif diff <= -7.0:
                trend = "Declining"
            else:
                trend = "Stable"
        else:
            trend = "Insufficient Data"
            
        # Educational Priority Classification
        if is_rep or computed_score < 60.0:
            priority = "High"
        elif computed_score < 75.0 or mistake_cnt > 0:
            priority = "Medium"
        else:
            priority = "Low"
            
        # Evidence explanation
        reasons = []
        if is_rep:
            reasons.append(f"repeated conceptual difficulties ({mistake_cnt} recorded mistakes)")
        elif mistake_cnt > 0:
            reasons.append(f"{mistake_cnt} recorded mistake(s)")
            
        if ass_score is not None and recent_quiz_acc is not None:
            if recent_quiz_acc > ass_score:
                reasons.append(f"quiz accuracy ({round(recent_quiz_acc)}%) improved over initial assessment ({round(ass_score)}%)")
            else:
                reasons.append(f"quiz accuracy is {round(recent_quiz_acc)}% (assessment: {round(ass_score)}%)")
        elif ass_score is not None:
            reasons.append(f"assessed baseline score of {round(ass_score)}%")
        elif recent_quiz_acc is not None:
            reasons.append(f"quiz accuracy averaging {round(recent_quiz_acc)}%")
            
        reason_str = ". ".join([r.capitalize() for r in reasons]) if reasons else f"Demonstrated {mastery.lower()} foundational mastery."
        
        evidence_obj = TopicEvidence(
            assessment_score=round(ass_score, 1) if ass_score is not None else None,
            recent_quiz_accuracy=round(recent_quiz_acc, 1) if recent_quiz_acc is not None else None,
            quiz_attempts_count=data["quiz_attempts"],
            mistake_count=mistake_cnt,
            is_repeated_difficulty=is_rep
        )
        
        skill_items.append(SkillTwinItem(
            topic=topic_name,
            subject=data["subject"],
            score=computed_score,
            mastery=mastery,
            trend=trend,
            priority=priority,
            evidence=evidence_obj,
            reason=reason_str
        ))
        
        if is_rep:
            repeated_diff_items.append(RepeatedDifficultyItem(
                topic=topic_name,
                mistake_count=mistake_cnt,
                latest_misconception=data["latest_misconception"],
                recommended_action=data["latest_recommended_action"] or f"Review {topic_name} concepts and practice targeted queries"
            ))

    # Sort skills by priority (High -> Medium -> Low), then ascending score
    priority_order = {"High": 0, "Medium": 1, "Low": 2}
    skill_items.sort(key=lambda x: (priority_order.get(x.priority, 3), x.score))
    
    # 6. Build Recommended Focus Topics
    recommended_focus: List[RecommendedFocusItem] = []
    for sk in skill_items:
        if sk.priority in ("High", "Medium") or sk.mastery == "Weak":
            rec_action = None
            if sk.evidence.is_repeated_difficulty:
                rec_action = f"Review foundational rules for {sk.topic} and complete a 5-question targeted adaptive quiz."
            elif sk.score < 60.0:
                rec_action = f"Study lesson notes on {sk.topic} to raise baseline accuracy."
            else:
                rec_action = f"Complete practice questions on {sk.topic} to maintain mastery."
                
            recommended_focus.append(RecommendedFocusItem(
                topic=sk.topic,
                priority=sk.priority,
                reason=sk.reason,
                recommended_action=rec_action
            ))
        if len(recommended_focus) >= 4:
            break

    # 7. Build Chronological Activity Timeline (Top 8 events)
    activity_events = []
    for a in assessments[:4]:
        activity_events.append({
            "type": "assessment",
            "title": f"Skill Gap Assessment ({a.get('subject', 'General')})",
            "subtitle": f"{a.get('total_questions', 0)} questions • {len(a.get('weak_topics', []))} priority focus areas",
            "score_or_status": f"{round(float(a.get('percentage', 0)))}%",
            "timestamp": a.get("created_at", now_iso)
        })
        
    for q in quizzes[:5]:
        is_ad = "Adaptive " if q.get("is_adaptive") else ""
        activity_events.append({
            "type": "quiz",
            "title": f"Completed {is_ad}Quiz",
            "subtitle": f"{q.get('topic', 'General')} • {q.get('difficulty', 'medium')}",
            "score_or_status": f"{round(float(q.get('percentage', 0)))}%",
            "timestamp": q.get("created_at", now_iso)
        })
        
    for m in mistakes[:4]:
        activity_events.append({
            "type": "mistake",
            "title": f"Diagnosed Mistake: {m.get('topic', 'Concept')}",
            "subtitle": m.get("question", "")[:60] + ("..." if len(m.get("question", "")) > 60 else ""),
            "score_or_status": "Analyzed",
            "timestamp": m.get("created_at", now_iso)
        })
        
    for d in docs[:3]:
        activity_events.append({
            "type": "document",
            "title": f"Uploaded Notes: {d.get('filename', 'Document')}",
            "subtitle": f"{d.get('num_chunks', 0)} text chunks indexed for Q&A",
            "score_or_status": "Ready",
            "timestamp": d.get("created_at", now_iso)
        })
        
    activity_events.sort(key=lambda x: str(x.get("timestamp", "")), reverse=True)
    recent_activity_items = [LearningActivityItem(**ev) for ev in activity_events[:8]]

    # 8. Calculate Overall Progress
    overall_progress = round(sum(total_scores) / len(total_scores), 1) if total_scores else 0.0

    return LearningTwinResponse(
        user_id=str(user_id),
        learning_goal=learning_goal,
        primary_subject=primary_subject,
        overall_progress=overall_progress,
        skills=skill_items,
        strong_topics=strong_topics,
        moderate_topics=moderate_topics,
        weak_topics=weak_topics,
        repeated_difficulties=repeated_diff_items,
        recommended_focus_topics=recommended_focus,
        recent_activity=recent_activity_items,
        total_assessments=len(assessments),
        total_quizzes=len(quizzes),
        total_mistakes=len(mistakes),
        has_data=True,
        last_updated=now_iso
    )
