from fastapi import APIRouter, Depends
from backend.schemas.schemas import ProgressResponse, QuizResultResponse
from backend.services.ai_bridge import ai_bridge
from backend.utils.auth_utils import get_current_user
from backend.database.connection import get_db_collection

router = APIRouter(prefix="/progress", tags=["Progress Tracking"])

@router.get("", response_model=ProgressResponse)
def get_user_progress(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    quiz_col = get_db_collection("quiz_results")
    doc_col = get_db_collection("documents")
    
    quizzes = list(quiz_col.find({"user_id": user_id}).sort("created_at", -1))
    docs = list(doc_col.find({"user_id": user_id}))
    
    quizzes_completed = len(quizzes)
    adaptive_quizzes_completed = sum(1 for q in quizzes if q.get("is_adaptive"))
    scores = [q.get("percentage", 0.0) for q in quizzes]
    average_score = sum(scores) / len(scores) if scores else 0.0
    best_score = max(scores) if scores else 0.0
    
    weak_topics_set = set()
    recent_quizzes = []
    for q in quizzes[:10]:
        weak_topics_set.update(q.get("weak_areas", []))
        recent_quizzes.append(QuizResultResponse(
            id=str(q["_id"]),
            user_id=str(q["user_id"]),
            topic=q.get("topic", "General"),
            difficulty=q.get("difficulty", "intermediate"),
            score=q.get("score", 0),
            total_questions=q.get("total_questions", 0),
            percentage=float(q.get("percentage", 0.0)),
            weak_areas=q.get("weak_areas", []),
            created_at=str(q.get("created_at", "")),
            is_adaptive=bool(q.get("is_adaptive", False)),
            topic_breakdown=q.get("topic_breakdown", []),
            recommended_next_step=q.get("recommended_next_step")
        ))
        
    documents_uploaded = len(docs)
    text_chunks = sum(d.get("num_chunks", 0) for d in docs)
    
    # Check Skill Assessments collection
    assessment_col = get_db_collection("skill_assessments")
    assessments = list(assessment_col.find({"user_id": user_id}).sort("created_at", -1))
    assessments_completed = len(assessments)
    latest_assessment = assessments[0] if assessments else None
    
    if latest_assessment:
        # Also include weak topics identified from assessments
        weak_topics_set.update(latest_assessment.get("weak_topics", []))

    # Check Mistake Analysis collection
    mistake_col = get_db_collection("mistake_analysis")
    mistakes = list(mistake_col.find({"user_id": user_id}))
    total_mistakes = len(mistakes)
    topic_counts = {}
    for m in mistakes:
        top = m.get("topic", "General")
        topic_counts[top] = topic_counts.get(top, 0) + 1
    repeated_mistake_topics = [top for top, count in topic_counts.items() if count >= 2]

    return ProgressResponse(
        quizzes_completed=quizzes_completed,
        average_score=round(average_score, 1),
        best_score=round(best_score, 1),
        weak_topics=list(weak_topics_set),
        documents_uploaded=documents_uploaded,
        text_chunks=text_chunks,
        study_sessions_count=quizzes_completed + documents_uploaded + assessments_completed,
        recent_quizzes=recent_quizzes,
        assessments_completed=assessments_completed,
        adaptive_quizzes_completed=adaptive_quizzes_completed,
        total_mistakes=total_mistakes,
        repeated_mistake_topics=repeated_mistake_topics,
        latest_assessment=latest_assessment
    )
