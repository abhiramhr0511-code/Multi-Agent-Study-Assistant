import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from backend.schemas.schemas import (
    NotificationSettings,
    NotificationSettingsUpdate,
    TestEmailRequest,
    EmailLogItem,
    EmailLogsResponse,
    RoutineConfig,
    RoutineCreateRequest
)
from backend.utils.auth_utils import get_current_user
from backend.database.connection import get_db_collection
from backend.services.email_service import email_service
from backend.services.email_scheduler import email_scheduler

router = APIRouter(prefix="/notifications", tags=["Email Notifications & Routines"])


# ============================================================
# 1. NOTIFICATION SETTINGS
# ============================================================

@router.get("/settings", response_model=NotificationSettings)
def get_notification_settings(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    email = current_user.get("email", "")
    settings_col = get_db_collection("user_notification_settings")
    doc = settings_col.find_one({"user_id": user_id})

    now_iso = datetime.utcnow().isoformat()
    if not doc:
        default_settings = {
            "_id": str(uuid.uuid4()),
            "user_id": str(user_id),
            "email": email,
            "daily_routine_emails": True,
            "weekly_exam_emails": True,
            "revision_emails": True,
            "exam_reminder_emails": True,
            "streak_emails": True,
            "routine_time": "09:00",
            "routine_name": "Daily Study Sprint",
            "routine_activity": "Review roadmap milestones, complete 1 quiz, and practice weak topics",
            "timezone_offset_minutes": 0,
            "updated_at": now_iso
        }
        settings_col.insert_one(default_settings)
        doc = default_settings

    return NotificationSettings(
        user_id=str(doc.get("user_id")),
        email=str(doc.get("email", email)),
        daily_routine_emails=bool(doc.get("daily_routine_emails", True)),
        weekly_exam_emails=bool(doc.get("weekly_exam_emails", True)),
        revision_emails=bool(doc.get("revision_emails", True)),
        exam_reminder_emails=bool(doc.get("exam_reminder_emails", True)),
        streak_emails=bool(doc.get("streak_emails", True)),
        routine_time=str(doc.get("routine_time", "09:00")),
        routine_name=str(doc.get("routine_name", "Daily Study Sprint")),
        routine_activity=str(doc.get("routine_activity", "Review roadmap milestones, complete 1 quiz, and practice weak topics")),
        timezone_offset_minutes=int(doc.get("timezone_offset_minutes", 0)),
        updated_at=str(doc.get("updated_at", now_iso))
    )


@router.put("/settings", response_model=NotificationSettings)
def update_notification_settings(
    settings_in: NotificationSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    email = current_user.get("email", "")
    settings_col = get_db_collection("user_notification_settings")

    now_iso = datetime.utcnow().isoformat()
    update_data = {k: v for k, v in settings_in.dict().items() if v is not None}
    update_data["updated_at"] = now_iso
    update_data["email"] = email

    settings_col.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )

    doc = settings_col.find_one({"user_id": user_id})
    return NotificationSettings(
        user_id=str(doc.get("user_id", user_id)),
        email=str(doc.get("email", email)),
        daily_routine_emails=bool(doc.get("daily_routine_emails", True)),
        weekly_exam_emails=bool(doc.get("weekly_exam_emails", True)),
        revision_emails=bool(doc.get("revision_emails", True)),
        exam_reminder_emails=bool(doc.get("exam_reminder_emails", True)),
        streak_emails=bool(doc.get("streak_emails", True)),
        routine_time=str(doc.get("routine_time", "09:00")),
        routine_name=str(doc.get("routine_name", "Daily Study Sprint")),
        routine_activity=str(doc.get("routine_activity", "Review roadmap milestones, complete 1 quiz, and practice weak topics")),
        timezone_offset_minutes=int(doc.get("timezone_offset_minutes", 0)),
        updated_at=str(doc.get("updated_at", now_iso))
    )


# ============================================================
# 2. SEND TEST & MANUAL DISPATCH
# ============================================================

@router.post("/send-test")
def send_test_email(
    request: TestEmailRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    name = current_user.get("name", "Student")
    to_email = request.custom_recipient or current_user.get("email")

    if not to_email:
        raise HTTPException(status_code=400, detail="Recipient email address is required")

    email_type = request.email_type.lower()
    res = {}

    if email_type == "routine":
        res = email_service.send_daily_routine_email(
            user_id=user_id,
            to_email=to_email,
            user_name=name,
            routine_name="Morning Code & Review Sprint",
            activity="Solve 2 algorithm problems and review system design concepts",
            scheduled_time="09:00",
            force=True
        )
    elif email_type == "exam" or email_type == "weekly_exam":
        res = email_service.send_weekly_exam_email(
            user_id=user_id,
            to_email=to_email,
            user_name=name,
            exam_name="Weekly Full-Stack & Python Mastery Exam",
            exam_date=datetime.utcnow().strftime("%Y-%m-%d"),
            subjects=["Computer Science", "Backend Engineering"],
            topics=["FastAPI", "MongoDB", "AsyncIO", "RAG Embeddings"],
            question_count=20,
            difficulty="Advanced",
            target_score=85,
            days_remaining=3,
            force=True
        )
    elif email_type == "revision":
        res = email_service.send_revision_due_email(
            user_id=user_id,
            to_email=to_email,
            user_name=name,
            due_items=["Asyncio Event Loops", "MongoDB Indexing", "JWT Authentication Flow", "LangChain VectorStores"],
            force=True
        )
    elif email_type == "streak":
        res = email_service.send_streak_reminder_email(
            user_id=user_id,
            to_email=to_email,
            user_name=name,
            current_streak=5,
            force=True
        )
    else:  # Standard system test email
        res = email_service.send_test_email(
            user_id=user_id,
            to_email=to_email,
            user_name=name
        )

    return {
        "success": True,
        "email_type": email_type,
        "recipient": to_email,
        "delivery_result": res
    }


# ============================================================
# 3. SENT EMAIL LOGS / AUDIT TRAIL
# ============================================================

@router.get("/logs", response_model=EmailLogsResponse)
def get_email_logs(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    logs_col = get_db_collection("sent_email_logs")

    cursor = logs_col.find({"user_id": str(user_id)}).sort("sent_at", -1).limit(limit)
    docs = list(cursor)

    items = []
    for d in docs:
        items.append(EmailLogItem(
            id=str(d.get("_id")),
            user_id=str(d.get("user_id")),
            recipient_email=str(d.get("recipient_email", "")),
            event_type=str(d.get("event_type", "")),
            subject=str(d.get("subject", "")),
            status=str(d.get("status", "sent")),
            reference_id=d.get("reference_id"),
            sent_at=str(d.get("sent_at", "")),
            error_message=d.get("error_message")
        ))

    return EmailLogsResponse(
        logs=items,
        total=len(items)
    )


# ============================================================
# 4. MANUAL SCHEDULER TRIGGER
# ============================================================

@router.post("/trigger-scheduler")
async def trigger_scheduler_cycle(current_user: dict = Depends(get_current_user)):
    """
    Manually triggers the background evaluation cycle across all active notifications.
    """
    summary = await email_scheduler.run_evaluation_cycle()
    return {
        "success": True,
        "message": "Scheduler evaluation cycle executed successfully.",
        "summary": summary
    }
