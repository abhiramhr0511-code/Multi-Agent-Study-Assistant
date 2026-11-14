import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from backend.schemas.schemas import (
    QuizGenerateRequest, QuizGenerateResponse,
    QuizResultSubmit, QuizResultResponse, QuizQuestion
)
from backend.services.ai_bridge import ai_bridge
from backend.utils.auth_utils import get_current_user
from backend.database.connection import get_db_collection

router = APIRouter(prefix="/quiz", tags=["Quiz Generator"])

@router.post("/generate", response_model=QuizGenerateResponse)
def generate_quiz(
    payload: QuizGenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    # Mode A: ADAPTIVE QUIZ
    if payload.adaptive:
        try:
            assessment_col = get_db_collection("skill_assessments")
            assessments = list(assessment_col.find({"user_id": current_user["id"]}).sort("created_at", -1))
            
            # Also check recent quiz performance for dynamic learning adjustments
            quiz_col = get_db_collection("quiz_results")
            recent_quizzes = list(quiz_col.find({"user_id": current_user["id"]}).sort("created_at", -1).limit(5))
            
            weak_topics = []
            moderate_topics = []
            strong_topics = []
            topic_scores = {}
            subject_name = payload.subject or payload.topic or "General"

            if assessments:
                latest = assessments[0]
                if not payload.subject and latest.get("subject"):
                    subject_name = latest.get("subject")
                
                weak_topics = latest.get("weak_topics", [])
                moderate_topics = latest.get("moderate_topics", [])
                strong_topics = latest.get("strong_topics", [])
                
                for tb in latest.get("topic_breakdown", []):
                    topic_scores[tb.get("topic")] = tb.get("percentage", 0)

            # Adjust if recent quiz history shows mastered weak topics
            recent_improvements = set()
            for rq in recent_quizzes:
                if rq.get("percentage", 0) >= 80:
                    for tb in rq.get("topic_breakdown", []):
                        if tb.get("percentage", 0) >= 80 and tb.get("topic") in weak_topics:
                            recent_improvements.add(tb.get("topic"))

            for imp in recent_improvements:
                if imp in weak_topics:
                    weak_topics.remove(imp)
                    if imp not in moderate_topics:
                        moderate_topics.append(imp)

            adaptive_ctx = {
                "weak_topics": weak_topics,
                "moderate_topics": moderate_topics,
                "strong_topics": strong_topics,
                "topic_scores": topic_scores,
                "recent_quizzes_count": len(recent_quizzes)
            }

            res = ai_bridge.generate_adaptive_quiz(
                subject=subject_name,
                topics=payload.topics or (weak_topics + moderate_topics + strong_topics),
                num_questions=payload.num_questions,
                adaptive_context=adaptive_ctx,
                base_difficulty=payload.difficulty_level
            )

            formatted_qs = [
                QuizQuestion(
                    id=q.get("id", i + 1),
                    question=q["question"],
                    options=q["options"],
                    correct_answer=q["correct_answer"],
                    explanation=q.get("explanation", ""),
                    key_concept=q.get("key_concept", q.get("topic", "General")),
                    topic=q.get("topic", subject_name),
                    difficulty=q.get("difficulty", "medium")
                )
                for i, q in enumerate(res["questions"])
            ]

            return QuizGenerateResponse(
                questions=formatted_qs,
                adaptive=True,
                adaptive_meta=res.get("adaptive_meta")
            )

        except Exception as e:
            print(f"⚠️ Adaptive quiz generation failed ({e}), falling back to standard generation.")

    # Mode B: STANDARD QUIZ (Existing behavior)
    raw_questions = ai_bridge.generate_quiz(
        topic=payload.topic or "General Programming",
        difficulty_level=payload.difficulty_level,
        focus_areas=payload.focus_areas or "general concepts",
        num_questions=payload.num_questions,
        subject_category=payload.subject_category or "Computer Science",
        knowledge_level=payload.knowledge_level or "Intermediate"
    )

    formatted_qs = [
        QuizQuestion(
            id=q.get("id", i + 1),
            question=q["question"],
            options=q["options"],
            correct_answer=q["correct_answer"],
            explanation=q.get("explanation", ""),
            key_concept=q.get("key_concept", payload.topic or "General"),
            topic=q.get("topic", payload.topic or "General"),
            difficulty=q.get("difficulty", payload.difficulty_level or "intermediate")
        )
        for i, q in enumerate(raw_questions)
    ]
    
    return QuizGenerateResponse(
        questions=formatted_qs,
        adaptive=False
    )

@router.post("/results", response_model=QuizResultResponse)
def submit_quiz_result(
    payload: QuizResultSubmit,
    current_user: dict = Depends(get_current_user)
):
    quiz_col = get_db_collection("quiz_results")
    mistake_col = get_db_collection("mistake_analysis")
    res_id = str(uuid.uuid4())
    now_iso = datetime.utcnow().isoformat()
    
    # Process incorrect answers through AI Mistake Analyzer
    enhanced_details = []
    if payload.details:
        for item in payload.details:
            q_copy = dict(item)
            is_correct = q_copy.get("is_correct", False)
            user_ans = q_copy.get("user_answer", "")
            correct_ans = q_copy.get("correct_answer", "")

            # Identify if incorrect
            if not is_correct or (user_ans != correct_ans):
                q_text = q_copy.get("question", "")
                q_topic = q_copy.get("topic") or payload.topic or "General"
                q_diff = q_copy.get("difficulty") or payload.difficulty or "medium"
                
                try:
                    analysis = ai_bridge.analyze_mistake(
                        question=q_text,
                        student_answer=user_ans,
                        correct_answer=correct_ans,
                        topic=q_topic,
                        difficulty=q_diff
                    )
                    
                    # Check repeated mistake count for this user & topic
                    prev_mistakes_count = mistake_col.count_documents({
                        "user_id": current_user["id"],
                        "topic": q_topic
                    })
                    is_repeated = prev_mistakes_count >= 1
                    
                    # Store record in mistake_analysis collection
                    mistake_doc = {
                        "_id": str(uuid.uuid4()),
                        "user_id": current_user["id"],
                        "quiz_id": res_id,
                        "subject": payload.topic,
                        "topic": q_topic,
                        "difficulty": q_diff,
                        "question": q_text,
                        "student_answer": user_ans,
                        "correct_answer": correct_ans,
                        "is_correct": False,
                        "explanation": analysis["explanation"],
                        "possible_misconception": analysis["possible_misconception"],
                        "correct_concept": analysis["correct_concept"],
                        "recommended_action": analysis["recommended_action"],
                        "practice_recommendation": analysis["practice_recommendation"],
                        "is_repeated_topic": is_repeated,
                        "mistake_count_for_topic": prev_mistakes_count + 1,
                        "created_at": now_iso
                    }
                    mistake_col.insert_one(mistake_doc)
                    
                    q_copy["mistake_analysis"] = analysis
                    q_copy["is_repeated_topic"] = is_repeated
                except Exception as e:
                    print(f"⚠️ Warning analyzing mistake ({e}); proceeding with standard result saving.")
                    q_copy["mistake_analysis"] = {
                        "explanation": f"The correct answer is {correct_ans}.",
                        "possible_misconception": f"The answer suggests a misunderstanding of core {q_topic} concepts.",
                        "correct_concept": f"Review key principles of {q_topic}.",
                        "recommended_action": f"Practice more questions on {q_topic}.",
                        "practice_recommendation": f"Review {q_topic} fundamentals."
                    }
            enhanced_details.append(q_copy)

    # Compute recommendation if not provided
    rec = payload.recommended_next_step
    if not rec:
        if payload.weak_areas:
            rec = f"Focus practice on {', '.join(payload.weak_areas[:2])} to build mastery."
        elif payload.percentage >= 80:
            rec = "Excellent performance! Ready to advance to harder challenges."
        else:
            rec = "Review key concepts and retake to reinforce understanding."

    doc = {
        "_id": res_id,
        "user_id": current_user["id"],
        "topic": payload.topic,
        "difficulty": payload.difficulty,
        "score": payload.score,
        "total_questions": payload.total_questions,
        "percentage": payload.percentage,
        "weak_areas": payload.weak_areas,
        "details": enhanced_details or payload.details,
        "is_adaptive": payload.is_adaptive or False,
        "topic_breakdown": payload.topic_breakdown or [],
        "recommended_next_step": rec,
        "created_at": now_iso
    }
    
    quiz_col.insert_one(doc)
    
    return QuizResultResponse(
        id=res_id,
        user_id=current_user["id"],
        topic=payload.topic,
        difficulty=payload.difficulty,
        score=payload.score,
        total_questions=payload.total_questions,
        percentage=payload.percentage,
        weak_areas=payload.weak_areas,
        created_at=now_iso,
        is_adaptive=payload.is_adaptive or False,
        topic_breakdown=payload.topic_breakdown or [],
        recommended_next_step=rec
    )

@router.get("/history", response_model=List[QuizResultResponse])
def get_quiz_history(current_user: dict = Depends(get_current_user)):
    quiz_col = get_db_collection("quiz_results")
    docs = quiz_col.find({"user_id": current_user["id"]}).sort("created_at", -1)
    
    results = []
    for d in docs:
        results.append(QuizResultResponse(
            id=str(d["_id"]),
            user_id=str(d["user_id"]),
            topic=d.get("topic", "General"),
            difficulty=d.get("difficulty", "intermediate"),
            score=d.get("score", 0),
            total_questions=d.get("total_questions", 0),
            percentage=float(d.get("percentage", 0.0)),
            weak_areas=d.get("weak_areas", []),
            created_at=str(d.get("created_at", "")),
            is_adaptive=bool(d.get("is_adaptive", False)),
            topic_breakdown=d.get("topic_breakdown", []),
            recommended_next_step=d.get("recommended_next_step")
        ))
    return results

@router.get("/adaptive-context")
def get_adaptive_context(current_user: dict = Depends(get_current_user)):
    """
    Returns latest skill assessment and performance metrics for the adaptive quiz setup UI.
    """
    try:
        assessment_col = get_db_collection("skill_assessments")
        assessments = list(assessment_col.find({"user_id": current_user["id"]}).sort("created_at", -1))
        
        quiz_col = get_db_collection("quiz_results")
        recent_quizzes = list(quiz_col.find({"user_id": current_user["id"], "is_adaptive": True}).sort("created_at", -1).limit(5))

        if assessments:
            latest = assessments[0]
            return {
                "has_assessment": True,
                "subject": latest.get("subject", "General"),
                "score": latest.get("score", 0),
                "total_questions": latest.get("total_questions", 0),
                "percentage": latest.get("percentage", 0),
                "weak_topics": latest.get("weak_topics", []),
                "moderate_topics": latest.get("moderate_topics", []),
                "strong_topics": latest.get("strong_topics", []),
                "topic_breakdown": latest.get("topic_breakdown", []),
                "adaptive_quizzes_taken": len(recent_quizzes),
                "created_at": latest.get("created_at", "")
            }
    except Exception as e:
        print(f"⚠️ Error retrieving adaptive context: {e}")

    return {
        "has_assessment": False,
        "message": "Complete a Skill Assessment to unlock more personalized quiz recommendations."
    }
