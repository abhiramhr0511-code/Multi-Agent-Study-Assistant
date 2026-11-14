import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from backend.schemas.schemas import (
    InterviewStartRequest,
    InterviewAnswerEvaluateRequest,
    InterviewAnswerEvaluation,
    InterviewQuestion,
    InterviewTopicBreakdown,
    InterviewSession,
    InterviewHistoryResponse
)
from backend.utils.auth_utils import get_current_user
from backend.database.connection import get_db_collection
from backend.services.ai_bridge import ai_bridge
from backend.api.learning_twin import get_learning_twin

router = APIRouter(prefix="/interview", tags=["AI Viva & Interview Coach"])


def _doc_to_session(doc: Dict[str, Any]) -> InterviewSession:
    raw_qs = doc.get("questions", [])
    qs_list = [
        InterviewQuestion(
            id=q.get("id", idx + 1),
            question=q.get("question", ""),
            category=q.get("category", "General"),
            expected_key_points=q.get("expected_key_points", []),
            difficulty=q.get("difficulty", "Intermediate")
        )
        for idx, q in enumerate(raw_qs)
    ]

    raw_evals = doc.get("evaluations", [])
    evals_list = [
        InterviewAnswerEvaluation(
            question_id=e.get("question_id", idx + 1),
            student_answer=e.get("student_answer", ""),
            score=float(e.get("score", 0.0)),
            rating=e.get("rating", "Good"),
            feedback=e.get("feedback", ""),
            key_strengths=e.get("key_strengths", []),
            missing_concepts=e.get("missing_concepts", []),
            suggested_model_answer=e.get("suggested_model_answer", ""),
            follow_up_question=e.get("follow_up_question")
        )
        for idx, e in enumerate(raw_evals)
    ]

    raw_topics = doc.get("topic_breakdown", [])
    topic_list = [
        InterviewTopicBreakdown(
            topic=t.get("topic", "General"),
            score=float(t.get("score", 0.0)),
            rating=t.get("rating", "Good"),
            questions_count=t.get("questions_count", 1)
        )
        for t in raw_topics
    ]

    return InterviewSession(
        id=str(doc.get("_id")),
        user_id=str(doc.get("user_id")),
        interview_type=doc.get("interview_type", "Technical Interview"),
        subject=doc.get("subject", "Computer Science"),
        difficulty=doc.get("difficulty", "Intermediate"),
        project_title=doc.get("project_title"),
        total_questions=int(doc.get("total_questions", len(qs_list))),
        questions=qs_list,
        evaluations=evals_list,
        overall_score=doc.get("overall_score"),
        performance_tier=doc.get("performance_tier"),
        topic_breakdown=topic_list,
        weak_areas=doc.get("weak_areas", []),
        improvement_suggestions=doc.get("improvement_suggestions", []),
        status=doc.get("status", "in_progress"),
        created_at=str(doc.get("created_at", "")),
        completed_at=doc.get("completed_at")
    )


@router.post("/start", response_model=InterviewSession, status_code=status.HTTP_201_CREATED)
def start_interview_session(
    payload: InterviewStartRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Starts a new AI viva or interview session, generating tailored questions.
    """
    user_id = current_user["id"]
    now_iso = datetime.utcnow().isoformat()
    session_id = str(uuid.uuid4())

    student_ctx = {}
    project_title = payload.project_title
    project_desc = payload.project_description

    # 1. If project_id provided, fetch project context
    if payload.project_id:
        projects_col = get_db_collection("projects")
        proj_doc = projects_col.find_one({"_id": payload.project_id, "user_id": user_id})
        if proj_doc:
            project_title = proj_doc.get("title", project_title)
            project_desc = proj_doc.get("description", project_desc)
            stack = ", ".join(proj_doc.get("tech_stack", []))
            if stack and not payload.subject:
                payload.subject = stack

    # 2. If include_learning_context, load Learning Twin weak topics
    if payload.include_learning_context:
        try:
            twin = get_learning_twin(current_user=current_user)
            if twin and twin.has_data:
                weak = [s.topic for s in twin.skills if s.priority == "High" or s.mastery == "Beginner"]
                student_ctx["weak_topics"] = weak
        except Exception:
            pass

    # 3. Generate Questions
    questions = ai_bridge.generate_interview_questions(
        interview_type=payload.interview_type,
        subject=payload.subject or "Computer Science",
        project_title=project_title,
        project_description=project_desc,
        difficulty=payload.difficulty or "Intermediate",
        num_questions=payload.num_questions or 5,
        student_context=student_ctx
    )

    doc = {
        "_id": session_id,
        "user_id": user_id,
        "interview_type": payload.interview_type,
        "subject": payload.subject or "Computer Science",
        "difficulty": payload.difficulty or "Intermediate",
        "project_title": project_title,
        "total_questions": len(questions),
        "questions": questions,
        "evaluations": [],
        "overall_score": None,
        "performance_tier": None,
        "topic_breakdown": [],
        "weak_areas": [],
        "improvement_suggestions": [],
        "status": "in_progress",
        "created_at": now_iso,
        "completed_at": None
    }

    interviews_col = get_db_collection("interviews")
    interviews_col.insert_one(doc)

    return _doc_to_session(doc)


@router.post("/{session_id}/evaluate", response_model=InterviewAnswerEvaluation)
def evaluate_student_answer(
    session_id: str,
    payload: InterviewAnswerEvaluateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Evaluates a student's answer for a specific question in the interview session.
    """
    user_id = current_user["id"]
    interviews_col = get_db_collection("interviews")
    doc = interviews_col.find_one({"_id": session_id, "user_id": user_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found."
        )

    # Find the question
    question_obj = next((q for q in doc.get("questions", []) if q.get("id") == payload.question_id), None)
    if not question_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question ID {payload.question_id} not found in this interview session."
        )

    eval_result = ai_bridge.evaluate_interview_answer(
        question=question_obj.get("question", ""),
        category=question_obj.get("category", "General"),
        expected_key_points=question_obj.get("expected_key_points", []),
        student_answer=payload.student_answer,
        interview_type=doc.get("interview_type", "Technical Interview"),
        difficulty=doc.get("difficulty", "Intermediate")
    )

    evaluation_entry = {
        "question_id": payload.question_id,
        "student_answer": payload.student_answer,
        "score": eval_result["score"],
        "rating": eval_result["rating"],
        "feedback": eval_result["feedback"],
        "key_strengths": eval_result["key_strengths"],
        "missing_concepts": eval_result["missing_concepts"],
        "suggested_model_answer": eval_result["suggested_model_answer"],
        "follow_up_question": eval_result.get("follow_up_question")
    }

    # Upsert or append evaluation
    evaluations = doc.get("evaluations", [])
    evaluations = [e for e in evaluations if e.get("question_id") != payload.question_id]
    evaluations.append(evaluation_entry)
    evaluations.sort(key=lambda x: x.get("question_id", 0))

    interviews_col.update_one(
        {"_id": session_id},
        {"$set": {"evaluations": evaluations, "updated_at": datetime.utcnow().isoformat()}}
    )

    return InterviewAnswerEvaluation(**evaluation_entry)


@router.post("/{session_id}/complete", response_model=InterviewSession)
def complete_interview_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Finalizes the interview, computing overall score, topic breakdown, weak areas, and suggestions.
    """
    user_id = current_user["id"]
    interviews_col = get_db_collection("interviews")
    doc = interviews_col.find_one({"_id": session_id, "user_id": user_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found."
        )

    questions = doc.get("questions", [])
    evaluations = doc.get("evaluations", [])
    now_iso = datetime.utcnow().isoformat()

    # Calculate overall score
    if evaluations:
        scores = [float(e.get("score", 0.0)) for e in evaluations]
        overall_score = round(sum(scores) / len(scores), 1)
    else:
        overall_score = 0.0

    # Performance tier
    if overall_score >= 88.0:
        perf_tier = "Outstanding"
    elif overall_score >= 72.0:
        perf_tier = "Strong Candidate"
    elif overall_score >= 50.0:
        perf_tier = "Needs Preparation"
    else:
        perf_tier = "Requires Practice"

    # Topic breakdown calculation
    q_map = {q.get("id"): q for q in questions}
    category_scores: Dict[str, List[float]] = {}
    weak_areas = []
    missing_all = []

    for ev in evaluations:
        qid = ev.get("question_id")
        q_obj = q_map.get(qid, {})
        cat = q_obj.get("category", "General")
        sc = float(ev.get("score", 0.0))
        
        category_scores.setdefault(cat, []).append(sc)
        if sc < 70.0:
            weak_areas.append(f"{cat} (Score: {sc}%)")
        missing_all.extend(ev.get("missing_concepts", []))

    topic_breakdown = []
    for cat, sc_list in category_scores.items():
        avg_sc = round(sum(sc_list) / len(sc_list), 1)
        cat_rating = "Strong" if avg_sc >= 80 else ("Moderate" if avg_sc >= 60 else "Needs Improvement")
        topic_breakdown.append({
            "topic": cat,
            "score": avg_sc,
            "rating": cat_rating,
            "questions_count": len(sc_list)
        })

    # Suggestions
    suggestions = []
    if overall_score >= 85.0:
        suggestions.append("Excellent performance! Continue practicing advanced system design and niche edge-case trade-offs.")
    else:
        suggestions.append("Structure answers using the STAR format (Situation, Task, Action, Result) or Architecture-First principles.")
    
    if weak_areas:
        suggestions.append(f"Dedicate review sessions to weak categories: {', '.join([w.split(' (')[0] for w in weak_areas[:3]])}.")
    if missing_all:
        suggestions.append(f"Make sure to explicitly mention production constraints such as: {', '.join(missing_all[:3])}.")

    doc["overall_score"] = overall_score
    doc["performance_tier"] = perf_tier
    doc["topic_breakdown"] = topic_breakdown
    doc["weak_areas"] = weak_areas[:5]
    doc["improvement_suggestions"] = suggestions
    doc["status"] = "completed"
    doc["completed_at"] = now_iso

    interviews_col.update_one(
        {"_id": session_id},
        {
            "$set": {
                "overall_score": overall_score,
                "performance_tier": perf_tier,
                "topic_breakdown": topic_breakdown,
                "weak_areas": weak_areas[:5],
                "improvement_suggestions": suggestions,
                "status": "completed",
                "completed_at": now_iso
            }
        }
    )

    return _doc_to_session(doc)


@router.get("/history", response_model=InterviewHistoryResponse)
def get_interview_history(current_user: dict = Depends(get_current_user)):
    """
    Returns all interview sessions for the authenticated user.
    """
    user_id = current_user["id"]
    interviews_col = get_db_collection("interviews")
    docs = list(interviews_col.find({"user_id": user_id}).sort("created_at", -1))
    return InterviewHistoryResponse(
        history=[_doc_to_session(d) for d in docs]
    )


@router.get("/{session_id}", response_model=InterviewSession)
def get_interview_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns an individual interview session by ID.
    """
    user_id = current_user["id"]
    interviews_col = get_db_collection("interviews")
    doc = interviews_col.find_one({"_id": session_id, "user_id": user_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found."
        )
    return _doc_to_session(doc)
