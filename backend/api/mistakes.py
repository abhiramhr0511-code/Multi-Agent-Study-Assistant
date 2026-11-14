from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from backend.schemas.schemas import (
    MistakeAnalysisRecord,
    MistakeTopicSummary,
    MistakesSummaryResponse
)
from backend.utils.auth_utils import get_current_user
from backend.database.connection import get_db_collection

router = APIRouter(prefix="/mistakes", tags=["AI Mistake Analyzer"])

@router.get("/recent", response_model=List[MistakeAnalysisRecord])
def get_recent_mistakes(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    mistake_col = get_db_collection("mistake_analysis")
    docs = mistake_col.find({"user_id": current_user["id"]}).sort("created_at", -1).limit(limit)
    
    records = []
    for d in docs:
        records.append(MistakeAnalysisRecord(
            id=str(d.get("_id")),
            user_id=str(d.get("user_id")),
            quiz_id=str(d.get("quiz_id", "")),
            subject=d.get("subject", "General"),
            topic=d.get("topic", "General"),
            difficulty=d.get("difficulty", "medium"),
            question=d.get("question", ""),
            student_answer=d.get("student_answer", ""),
            correct_answer=d.get("correct_answer", ""),
            is_correct=False,
            explanation=d.get("explanation", ""),
            possible_misconception=d.get("possible_misconception", ""),
            correct_concept=d.get("correct_concept", ""),
            recommended_action=d.get("recommended_action", ""),
            practice_recommendation=d.get("practice_recommendation", ""),
            is_repeated_topic=bool(d.get("is_repeated_topic", False)),
            mistake_count_for_topic=d.get("mistake_count_for_topic", 1),
            created_at=str(d.get("created_at", ""))
        ))
    return records

@router.get("/summary", response_model=MistakesSummaryResponse)
def get_mistakes_summary(current_user: dict = Depends(get_current_user)):
    mistake_col = get_db_collection("mistake_analysis")
    docs = list(mistake_col.find({"user_id": current_user["id"]}).sort("created_at", -1))
    
    total_mistakes = len(docs)
    
    topic_counts: Dict[str, int] = {}
    topic_latest_misconception: Dict[str, str] = {}
    topic_latest_action: Dict[str, str] = {}
    topic_grouping: Dict[str, Dict[str, int]] = {}

    for d in docs:
        subj = d.get("subject", "General")
        top = d.get("topic", "General")
        
        topic_counts[top] = topic_counts.get(top, 0) + 1
        if top not in topic_latest_misconception:
            topic_latest_misconception[top] = d.get("possible_misconception", "")
            topic_latest_action[top] = d.get("recommended_action", "")
            
        if subj not in topic_grouping:
            topic_grouping[subj] = {}
        topic_grouping[subj][top] = topic_grouping[subj].get(top, 0) + 1

    # Identify repeated problem topics (mistake frequency >= 2)
    repeated_topics = []
    top_problem_topics = []

    sorted_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)
    for top, count in sorted_topics:
        is_rep = count >= 2
        status_label = "Needs Attention" if is_rep else "Monitored"
        summary_item = MistakeTopicSummary(
            topic=top,
            mistake_count=count,
            is_repeated=is_rep,
            status=status_label,
            latest_misconception=topic_latest_misconception.get(top),
            recommended_action=topic_latest_action.get(top)
        )
        if is_rep:
            repeated_topics.append(summary_item)
        top_problem_topics.append({"topic": top, "count": count})

    # Recent 10 records
    recent_records = []
    for d in docs[:10]:
        recent_records.append(MistakeAnalysisRecord(
            id=str(d.get("_id")),
            user_id=str(d.get("user_id")),
            quiz_id=str(d.get("quiz_id", "")),
            subject=d.get("subject", "General"),
            topic=d.get("topic", "General"),
            difficulty=d.get("difficulty", "medium"),
            question=d.get("question", ""),
            student_answer=d.get("student_answer", ""),
            correct_answer=d.get("correct_answer", ""),
            is_correct=False,
            explanation=d.get("explanation", ""),
            possible_misconception=d.get("possible_misconception", ""),
            correct_concept=d.get("correct_concept", ""),
            recommended_action=d.get("recommended_action", ""),
            practice_recommendation=d.get("practice_recommendation", ""),
            is_repeated_topic=bool(d.get("is_repeated_topic", False)),
            mistake_count_for_topic=d.get("mistake_count_for_topic", 1),
            created_at=str(d.get("created_at", ""))
        ))

    return MistakesSummaryResponse(
        total_mistakes=total_mistakes,
        repeated_topics_count=len(repeated_topics),
        repeated_topics=repeated_topics,
        top_problem_topics=top_problem_topics,
        topic_grouping=topic_grouping,
        recent_mistakes=recent_records
    )

@router.get("/topic/{topic}", response_model=List[MistakeAnalysisRecord])
def get_mistakes_by_topic(
    topic: str,
    current_user: dict = Depends(get_current_user)
):
    mistake_col = get_db_collection("mistake_analysis")
    docs = mistake_col.find({"user_id": current_user["id"], "topic": topic}).sort("created_at", -1)
    
    records = []
    for d in docs:
        records.append(MistakeAnalysisRecord(
            id=str(d.get("_id")),
            user_id=str(d.get("user_id")),
            quiz_id=str(d.get("quiz_id", "")),
            subject=d.get("subject", "General"),
            topic=d.get("topic", "General"),
            difficulty=d.get("difficulty", "medium"),
            question=d.get("question", ""),
            student_answer=d.get("student_answer", ""),
            correct_answer=d.get("correct_answer", ""),
            is_correct=False,
            explanation=d.get("explanation", ""),
            possible_misconception=d.get("possible_misconception", ""),
            correct_concept=d.get("correct_concept", ""),
            recommended_action=d.get("recommended_action", ""),
            practice_recommendation=d.get("practice_recommendation", ""),
            is_repeated_topic=bool(d.get("is_repeated_topic", False)),
            mistake_count_for_topic=d.get("mistake_count_for_topic", 1),
            created_at=str(d.get("created_at", ""))
        ))
    return records
