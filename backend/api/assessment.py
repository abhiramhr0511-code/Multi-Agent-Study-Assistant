import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from backend.schemas.schemas import (
    SkillAssessmentGenerateRequest,
    SkillAssessmentGenerateResponse,
    SkillAssessmentSubmit,
    SkillAssessmentResultResponse,
    TopicPerformance
)
from backend.services.ai_bridge import ai_bridge
from backend.utils.auth_utils import get_current_user
from backend.database.connection import get_db_collection

router = APIRouter(prefix="/assessment", tags=["Skill Gap Assessment"])

@router.post("/generate", response_model=SkillAssessmentGenerateResponse)
def generate_assessment(
    payload: SkillAssessmentGenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        data = ai_bridge.generate_skill_assessment(
            subject=payload.subject,
            learning_goal=payload.learning_goal or "Master core concepts",
            topics=payload.topics or [],
            difficulty_level=payload.difficulty_level or "intermediate",
            num_questions=payload.num_questions
        )
        return SkillAssessmentGenerateResponse(
            subject=data["subject"],
            learning_goal=data["learning_goal"],
            topics=data["topics"],
            questions=data["questions"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate assessment questions: {str(e)}"
        )

@router.post("/submit", response_model=SkillAssessmentResultResponse)
def submit_assessment(
    payload: SkillAssessmentSubmit,
    current_user: dict = Depends(get_current_user)
):
    assessments_col = get_db_collection("skill_assessments")
    res_id = str(uuid.uuid4())
    now_iso = datetime.utcnow().isoformat()

    # Re-verify and ensure mastery levels adhere to:
    # 80-100% = Strong, 60-79% = Moderate, 0-59% = Weak
    strong_topics = []
    moderate_topics = []
    weak_topics = []
    
    verified_breakdown = []
    for tb in payload.topic_breakdown:
        pct = tb.percentage
        if pct >= 80.0:
            level = "Strong"
            strong_topics.append(tb.topic)
        elif pct >= 60.0:
            level = "Moderate"
            moderate_topics.append(tb.topic)
        else:
            level = "Weak"
            weak_topics.append(tb.topic)
            
        verified_breakdown.append({
            "topic": tb.topic,
            "total_questions": tb.total_questions,
            "correct_count": tb.correct_count,
            "incorrect_count": tb.incorrect_count,
            "percentage": pct,
            "mastery_level": level
        })

    doc = {
        "_id": res_id,
        "user_id": current_user["id"],
        "subject": payload.subject,
        "learning_goal": payload.learning_goal,
        "topics": payload.topics,
        "total_questions": payload.total_questions,
        "score": payload.score,
        "percentage": payload.percentage,
        "time_taken_seconds": payload.time_taken_seconds or 0,
        "topic_breakdown": verified_breakdown,
        "weak_topics": weak_topics,
        "moderate_topics": moderate_topics,
        "strong_topics": strong_topics,
        "details": payload.details,
        "created_at": now_iso
    }

    assessments_col.insert_one(doc)

    return SkillAssessmentResultResponse(
        id=res_id,
        user_id=current_user["id"],
        subject=payload.subject,
        learning_goal=payload.learning_goal,
        topics=payload.topics,
        total_questions=payload.total_questions,
        score=payload.score,
        percentage=payload.percentage,
        time_taken_seconds=payload.time_taken_seconds or 0,
        topic_breakdown=[TopicPerformance(**tb) for tb in verified_breakdown],
        weak_topics=weak_topics,
        moderate_topics=moderate_topics,
        strong_topics=strong_topics,
        created_at=now_iso
    )

@router.get("/history", response_model=List[SkillAssessmentResultResponse])
def get_assessment_history(current_user: dict = Depends(get_current_user)):
    assessments_col = get_db_collection("skill_assessments")
    docs = assessments_col.find({"user_id": current_user["id"]}).sort("created_at", -1)

    results = []
    for d in docs:
        breakdown_list = [
            TopicPerformance(
                topic=tb.get("topic", "General"),
                total_questions=tb.get("total_questions", 0),
                correct_count=tb.get("correct_count", 0),
                incorrect_count=tb.get("incorrect_count", 0),
                percentage=float(tb.get("percentage", 0.0)),
                mastery_level=tb.get("mastery_level", "Weak")
            )
            for tb in d.get("topic_breakdown", [])
        ]
        results.append(SkillAssessmentResultResponse(
            id=str(d.get("_id")),
            user_id=str(d.get("user_id")),
            subject=d.get("subject", "General Subject"),
            learning_goal=d.get("learning_goal", "Skill Assessment"),
            topics=d.get("topics", []),
            total_questions=d.get("total_questions", 0),
            score=d.get("score", 0),
            percentage=float(d.get("percentage", 0.0)),
            time_taken_seconds=d.get("time_taken_seconds", 0),
            topic_breakdown=breakdown_list,
            weak_topics=d.get("weak_topics", []),
            moderate_topics=d.get("moderate_topics", []),
            strong_topics=d.get("strong_topics", []),
            created_at=str(d.get("created_at", ""))
        ))
    return results

@router.get("/{assessment_id}", response_model=SkillAssessmentResultResponse)
def get_assessment_by_id(assessment_id: str, current_user: dict = Depends(get_current_user)):
    assessments_col = get_db_collection("skill_assessments")
    doc = assessments_col.find_one({"_id": assessment_id, "user_id": current_user["id"]})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment result not found"
        )
    breakdown_list = [
        TopicPerformance(
            topic=tb.get("topic", "General"),
            total_questions=tb.get("total_questions", 0),
            correct_count=tb.get("correct_count", 0),
            incorrect_count=tb.get("incorrect_count", 0),
            percentage=float(tb.get("percentage", 0.0)),
            mastery_level=tb.get("mastery_level", "Weak")
        )
        for tb in doc.get("topic_breakdown", [])
    ]
    return SkillAssessmentResultResponse(
        id=str(doc.get("_id")),
        user_id=str(doc.get("user_id")),
        subject=doc.get("subject", "General Subject"),
        learning_goal=doc.get("learning_goal", "Skill Assessment"),
        topics=doc.get("topics", []),
        total_questions=doc.get("total_questions", 0),
        score=doc.get("score", 0),
        percentage=float(doc.get("percentage", 0.0)),
        time_taken_seconds=doc.get("time_taken_seconds", 0),
        topic_breakdown=breakdown_list,
        weak_topics=doc.get("weak_topics", []),
        moderate_topics=doc.get("moderate_topics", []),
        strong_topics=doc.get("strong_topics", []),
        created_at=str(doc.get("created_at", ""))
    )
