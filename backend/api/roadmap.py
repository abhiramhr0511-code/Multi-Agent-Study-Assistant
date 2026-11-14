from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends
from backend.schemas.schemas import (
    RoadmapGenerateRequest,
    RoadmapGenerateResponse,
    RoadmapPersonalizationMeta
)
from backend.services.ai_bridge import ai_bridge
from backend.utils.auth_utils import get_current_user
from backend.database.connection import get_db_collection

router = APIRouter(prefix="/roadmap", tags=["Learning Roadmap"])

@router.post("/generate", response_model=RoadmapGenerateResponse)
def generate_roadmap(
    payload: RoadmapGenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    skill_context: Optional[Dict[str, Any]] = None
    personalization_meta: Optional[RoadmapPersonalizationMeta] = None

    if payload.use_latest_assessment:
        try:
            assessment_col = get_db_collection("skill_assessments")
            assessments = list(assessment_col.find({"user_id": current_user["id"]}).sort("created_at", -1))
            
            if assessments:
                latest = assessments[0]
                weak_topics = latest.get("weak_topics", [])
                moderate_topics = latest.get("moderate_topics", [])
                strong_topics = latest.get("strong_topics", [])
                topic_breakdown = latest.get("topic_breakdown", [])
                topic_scores = {tb.get("topic"): float(tb.get("percentage", 0)) for tb in topic_breakdown}
                assessment_subject = latest.get("subject", payload.goal)

                skill_context = {
                    "weak_topics": weak_topics,
                    "moderate_topics": moderate_topics,
                    "strong_topics": strong_topics,
                    "topic_scores": topic_scores,
                    "assessment_subject": assessment_subject
                }

                if weak_topics:
                    explanation = f"Your roadmap prioritizes {', '.join(weak_topics)} because these are currently your weakest assessed areas."
                elif moderate_topics:
                    explanation = f"Your roadmap emphasizes practice on {', '.join(moderate_topics)} to build mastery."
                else:
                    explanation = "Your roadmap includes advanced acceleration since you demonstrated strong foundational knowledge."

                personalization_meta = RoadmapPersonalizationMeta(
                    personalized=True,
                    based_on_assessment=True,
                    assessment_subject=assessment_subject,
                    priority_topics=weak_topics,
                    moderate_topics=moderate_topics,
                    strong_topics=strong_topics,
                    topic_scores=topic_scores,
                    explanation=explanation
                )
        except Exception as e:
            print(f"⚠️ Warning retrieving assessment for roadmap personalization: {e}")

    if not personalization_meta:
        personalization_meta = RoadmapPersonalizationMeta(
            personalized=False,
            based_on_assessment=False,
            explanation="Complete a Skill Gap Assessment to make your roadmap more personalized."
        )

    res = ai_bridge.generate_roadmap(
        goal=payload.goal,
        current_skill_level=payload.current_skill_level or "Beginner",
        target_skill=payload.target_skill or "Advanced",
        available_study_time=payload.available_study_time or "5 hours/week",
        preferred_learning_style=payload.preferred_learning_style or "Visual",
        skill_context=skill_context
    )
    
    return RoadmapGenerateResponse(
        roadmap_markdown=res["roadmap_markdown"],
        topic=res["topic"],
        personalization=personalization_meta
    )

@router.get("/latest-assessment")
def get_latest_assessment_summary(current_user: dict = Depends(get_current_user)):
    """
    Returns a quick summary of the user's latest completed skill assessment for the roadmap view.
    """
    try:
        assessment_col = get_db_collection("skill_assessments")
        assessments = list(assessment_col.find({"user_id": current_user["id"]}).sort("created_at", -1))
        if assessments:
            latest = assessments[0]
            return {
                "has_assessment": True,
                "assessment_id": str(latest.get("_id")),
                "subject": latest.get("subject", "General"),
                "learning_goal": latest.get("learning_goal", ""),
                "score": latest.get("score", 0),
                "total_questions": latest.get("total_questions", 0),
                "percentage": latest.get("percentage", 0),
                "topic_breakdown": latest.get("topic_breakdown", []),
                "weak_topics": latest.get("weak_topics", []),
                "moderate_topics": latest.get("moderate_topics", []),
                "strong_topics": latest.get("strong_topics", []),
                "created_at": latest.get("created_at", "")
            }
    except Exception as e:
        print(f"⚠️ Warning in get_latest_assessment_summary: {e}")
        
    return {
        "has_assessment": False,
        "message": "No assessments completed yet."
    }
