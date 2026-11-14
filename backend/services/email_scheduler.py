import asyncio
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from backend.config import settings
from backend.database.connection import get_db_collection
from backend.services.email_service import email_service


class EmailScheduler:
    """
    Background scheduler for proactive email notification dispatch.
    Periodically checks active user schedules, exams, spaced revisions, and routines,
    preventing duplicate notifications and respecting user preferences.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmailScheduler, cls).__new__(cls)
            cls._instance.is_running = False
            cls._instance._task = None
        return cls._instance

    def start(self):
        """
        Starts the background async scheduler loop.
        """
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._scheduler_loop())
        print("⏰ [EmailScheduler] Proactive background notification scheduler started.")

    def stop(self):
        """
        Stops the background async scheduler loop.
        """
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
        print("🛑 [EmailScheduler] Notification scheduler stopped.")

    async def _scheduler_loop(self):
        """
        Main worker loop executing checks every 60 seconds.
        """
        while self.is_running:
            try:
                await self.run_evaluation_cycle()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"⚠️ [EmailScheduler Exception in loop]: {e}")
            
            # Wait 60 seconds before next evaluation
            try:
                await asyncio.sleep(60)
            except asyncio.CancelledError:
                break

    async def run_evaluation_cycle(self) -> Dict[str, Any]:
        """
        Executes a single pass over all registered users to evaluate notification triggers.
        Can also be triggered directly for testing or manual sync.
        """
        now = datetime.utcnow()
        today_str = now.strftime("%Y-%m-%d")
        current_hm = now.strftime("%H:%M")

        users_col = get_db_collection("users")
        settings_col = get_db_collection("user_notification_settings")
        reviews_col = get_db_collection("revision_reviews")
        progress_col = get_db_collection("student_progress")

        all_users = list(users_col.find({}))
        summary = {
            "evaluated_users": len(all_users),
            "routine_emails_sent": 0,
            "revision_emails_sent": 0,
            "streak_emails_sent": 0,
            "timestamp": now.isoformat()
        }

        for user in all_users:
            user_id = str(user.get("_id"))
            email = user.get("email")
            name = user.get("name", "Student")

            # CRITICAL: Only send notification emails to verified users
            if not email or not user.get("email_verified", False):
                continue

            # 1. Fetch user preferences (or default settings)
            pref = settings_col.find_one({"user_id": user_id})
            if not pref:
                pref = {
                    "user_id": user_id,
                    "daily_routine_emails": True,
                    "revision_emails": True,
                    "streak_emails": True,
                    "routine_time": "09:00",
                    "routine_name": "Daily Study Sprint",
                    "routine_activity": "Review roadmap milestones and practice 5 flashcards",
                    "timezone_offset_minutes": 0
                }

            tz_offset = pref.get("timezone_offset_minutes", 0)
            user_local_time = now + timedelta(minutes=tz_offset)
            user_local_hm = user_local_time.strftime("%H:%M")
            user_local_hour = user_local_time.hour
            user_local_date_str = user_local_time.strftime("%Y-%m-%d")

            # --------------------------------------------------------
            # A. Daily Routine Email Evaluation
            # --------------------------------------------------------
            if pref.get("daily_routine_emails", True):
                target_routine_time = pref.get("routine_time", "09:00")
                
                # Check if current local time is within +/- 15 mins of target routine time
                # Or if routine time hours match
                target_h, target_m = map(int, target_routine_time.split(":") if ":" in target_routine_time else (9, 0))
                user_h, user_m = user_local_time.hour, user_local_time.minute
                time_diff_mins = abs((user_h * 60 + user_m) - (target_h * 60 + target_m))
                
                if time_diff_mins <= 30:
                    if not email_service.is_already_sent(user_id, "daily_routine", user_local_date_str):
                        res = email_service.send_daily_routine_email(
                            user_id=user_id,
                            to_email=email,
                            user_name=name,
                            routine_name=pref.get("routine_name", "Daily Study Session"),
                            activity=pref.get("routine_activity", "Complete 1 practice quiz and review weak areas"),
                            scheduled_time=target_routine_time
                        )
                        if res.get("status") in ["sent", "simulated"]:
                            summary["routine_emails_sent"] += 1

            # --------------------------------------------------------
            # B. Spaced Revision Due Evaluation
            # --------------------------------------------------------
            if pref.get("revision_emails", True):
                due_reviews = list(reviews_col.find({
                    "user_id": user_id,
                    "next_review_due": {"$lte": user_local_date_str}
                }))
                if due_reviews:
                    due_topic_names = [r.get("topic", "Topic") for r in due_reviews if r.get("topic")]
                    if due_topic_names:
                        if not email_service.is_already_sent(user_id, "revision_due", user_local_date_str):
                            res = email_service.send_revision_due_email(
                                user_id=user_id,
                                to_email=email,
                                user_name=name,
                                due_items=due_topic_names
                            )
                            if res.get("status") in ["sent", "simulated"]:
                                summary["revision_emails_sent"] += 1

            # --------------------------------------------------------
            # D. Study Streak Reminder Evaluation (Evening Check)
            # --------------------------------------------------------
            if pref.get("streak_emails", True) and user_local_hour >= 18:
                user_prog = progress_col.find_one({"user_id": user_id})
                streak = user_prog.get("current_streak", 0) if user_prog else 0
                last_active = user_prog.get("last_active_date", "") if user_prog else ""
                
                # If student has an active streak but hasn't practiced yet today
                if streak > 0 and last_active != user_local_date_str:
                    if not email_service.is_already_sent(user_id, "streak_reminder", user_local_date_str):
                        res = email_service.send_streak_reminder_email(
                            user_id=user_id,
                            to_email=email,
                            user_name=name,
                            current_streak=streak
                        )
                        if res.get("status") in ["sent", "simulated"]:
                            summary["streak_emails_sent"] += 1

        return summary


email_scheduler = EmailScheduler()
