import os
import smtplib
import uuid
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, date
from typing import Dict, Any, List, Optional, Tuple

from backend.config import settings
from backend.database.connection import get_db_collection


class EmailService:
    """
    Core Email Delivery & Template Service for StudyMate AI.
    Handles responsive HTML/Plain-text email templating, SMTP transmission,
    duplicate email prevention, email verification checks, and audit logging into MongoDB.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmailService, cls).__new__(cls)
        return cls._instance

    # ========================================================
    # 0. VERIFICATION & PERMISSION GATES
    # ========================================================

    def can_send_notification(
        self,
        user_id: str,
        notification_type: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Validates all prerequisites before sending ANY email notification:
        1. User exists in MongoDB
        2. user.email_verified == True
        3. Email notifications are globally and per-preference enabled
        4. User has a valid, non-empty email address

        Returns (allowed: bool, reason: str, user_doc: Optional[dict])
        """
        if not user_id:
            return False, "User ID is required.", None

        users_col = get_db_collection("users")
        user = users_col.find_one({"_id": str(user_id)})
        if not user:
            return False, f"User '{user_id}' does not exist.", None

        # 1. Check valid email
        email = user.get("email", "").strip()
        if not email or "@" not in email:
            return False, f"User '{user_id}' does not have a valid email address.", user

        # 2. Check email_verified status (CRITICAL REQUIREMENT)
        if not user.get("email_verified", False):
            return False, f"User email '{email}' is unverified. Notification emails are not permitted.", user

        # 3. Check global email setting
        if not settings.EMAIL_ENABLED:
            return False, "Email sending is globally disabled via configuration.", user

        # 4. Check user preferences if notification_type specified
        if notification_type:
            settings_col = get_db_collection("user_notification_settings")
            pref = settings_col.find_one({"user_id": str(user_id)})
            if pref:
                type_map = {
                    "daily_routine": "daily_routine_emails",
                    "weekly_exam": "weekly_exam_emails",
                    "revision_due": "revision_emails",
                    "streak_reminder": "streak_emails",
                    "exam_reminder": "exam_reminder_emails",
                }
                pref_field = type_map.get(notification_type)
                if pref_field and not pref.get(pref_field, True):
                    return False, f"User has disabled '{notification_type}' notifications.", user

        return True, "User is verified and eligible for notifications.", user

    # ========================================================
    # 1. DUPLICATE PREVENTION & LOGGING
    # ========================================================

    def is_already_sent(
        self,
        user_id: str,
        event_type: str,
        date_key: str,
        reference_id: Optional[str] = None
    ) -> bool:
        """
        Checks whether an email of the given event_type was already sent to the user on this date_key.
        Prevents redundant or duplicate emails for the same scheduled event.
        """
        logs_col = get_db_collection("sent_email_logs")
        query = {
            "user_id": str(user_id),
            "event_type": event_type,
            "date_key": date_key,
            "status": {"$in": ["sent", "simulated"]}
        }
        if reference_id:
            query["reference_id"] = str(reference_id)

        existing = logs_col.find_one(query)
        return existing is not None

    def log_email_dispatch(
        self,
        user_id: str,
        recipient_email: str,
        event_type: str,
        subject: str,
        status: str,
        date_key: str,
        reference_id: Optional[str] = None,
        error_message: Optional[str] = None
    ) -> str:
        """
        Records the email dispatch event in MongoDB.
        """
        logs_col = get_db_collection("sent_email_logs")
        log_id = str(uuid.uuid4())
        doc = {
            "_id": log_id,
            "user_id": str(user_id),
            "recipient_email": recipient_email,
            "event_type": event_type,
            "subject": subject,
            "status": status,
            "date_key": date_key,
            "reference_id": str(reference_id) if reference_id else None,
            "error_message": error_message,
            "sent_at": datetime.utcnow().isoformat()
        }
        logs_col.insert_one(doc)
        return log_id

    # ========================================================
    # 2. LOW-LEVEL SMTP DISPATCH
    # ========================================================

    def send_smtp_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transmits email via configured SMTP server.
        If SMTP credentials are not configured or email is disabled, safely logs and simulates success.
        """
        if not settings.EMAIL_ENABLED:
            return {
                "status": "simulated",
                "message": "Email sending disabled via EMAIL_ENABLED=false setting."
            }

        # If no SMTP credentials provided, gracefully simulate sending (Dev / Test Mode)
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            print(f"[EmailService SIMULATED] To: {to_email} | Subject: '{subject}' | Host: {settings.SMTP_HOST}")
            return {
                "status": "simulated",
                "message": f"SMTP credentials not set. Simulated email to {to_email} logged successfully."
            }

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = to_email

            if text_content:
                msg.attach(MIMEText(text_content, "plain", "utf-8"))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            if settings.SMTP_SSL:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
                if settings.SMTP_TLS:
                    server.starttls()

            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
            server.quit()

            return {
                "status": "sent",
                "message": f"Email successfully delivered to {to_email}"
            }
        except Exception as e:
            print(f"❌ [EmailService Error] Failed to send email to {to_email}: {e}")
            return {
                "status": "failed",
                "error": str(e)
            }

    # ========================================================
    # 3. HTML BASE WRAPPER TEMPLATE
    # ========================================================

    def _base_html_template(self, title: str, badge: str, body_html: str, action_url: str = "http://localhost:5173", action_label: str = "Open StudyMate AI") -> str:
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      color: #1E293B;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .container {{
      max-width: 580px;
      margin: 30px auto;
      background: #FFFFFF;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #E2E8F0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }}
    .header {{
      background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
      padding: 32px 28px;
      color: #FFFFFF;
      text-align: left;
    }}
    .brand {{
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      opacity: 0.85;
      margin-bottom: 8px;
    }}
    .header-title {{
      font-size: 24px;
      font-weight: 800;
      margin: 0;
      line-height: 1.3;
    }}
    .badge {{
      display: inline-block;
      margin-top: 10px;
      background: rgba(255,255,255,0.2);
      backdrop-filter: blur(8px);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }}
    .content {{
      padding: 32px 28px;
    }}
    .card {{
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 24px;
    }}
    .btn {{
      display: inline-block;
      background: #4F46E5;
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 14px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
    }}
    .footer {{
      padding: 24px 28px;
      background: #F1F5F9;
      text-align: center;
      font-size: 12px;
      color: #64748B;
      border-top: 1px solid #E2E8F0;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">📚 StudyMate AI Notification</div>
      <h1 class="header-title">{title}</h1>
      <span class="badge">{badge}</span>
    </div>
    <div class="content">
      {body_html}
      <div style="text-align: center; margin-top: 28px;">
        <a href="{action_url}" class="btn">{action_label} &rarr;</a>
      </div>
    </div>
    <div class="footer">
      <p style="margin:0 0 6px 0;">Multi-Agent Study Assistant &copy; {datetime.utcnow().year} StudyMate AI</p>
      <p style="margin:0;">You can customize your notification preferences in your Profile & Settings.</p>
    </div>
  </div>
</body>
</html>"""

    # ========================================================
    # 4. HIGH-LEVEL TEMPLATE BUILDERS & DISPATCH METHODS
    # ========================================================

    # --------------------------------------------------------
    # Feature 1: Daily Routine Email
    # --------------------------------------------------------
    def send_daily_routine_email(
        self,
        user_id: str,
        to_email: str,
        user_name: str,
        routine_name: str,
        activity: str,
        scheduled_time: str,
        force: bool = False
    ) -> Dict[str, Any]:
        """
        Sends a daily routine reminder.
        Requires user.email_verified == True and daily_routine enabled.
        Enforces daily duplicate prevention.
        """
        allowed, reason, user_doc = self.can_send_notification(user_id, notification_type="daily_routine")
        if not allowed:
            return {
                "status": "skipped",
                "reason": reason,
                "message": f"Daily routine email not sent: {reason}"
            }

        date_key = datetime.utcnow().strftime("%Y-%m-%d")
        if not force and self.is_already_sent(user_id, "daily_routine", date_key):
            return {
                "status": "skipped",
                "message": f"Daily routine email already sent to {to_email} for today ({date_key})."
            }

        subject = f"⏰ Daily Routine Reminder: {routine_name} at {scheduled_time}"
        body_html = f"""
        <p style="font-size:15px; margin-top:0;">Hi <strong>{user_name}</strong>,</p>
        <p style="font-size:14px; color:#475569; line-height:1.6;">
          It's time for your scheduled daily study routine! Consistent daily practice is the fastest way to build lasting mastery.
        </p>

        <div class="card">
          <div style="font-size:12px; color:#6366F1; font-weight:700; text-transform:uppercase; margin-bottom:6px;">Scheduled Session</div>
          <div style="font-size:18px; font-weight:800; color:#0F172A; margin-bottom:8px;">{routine_name}</div>
          <div style="font-size:13px; color:#334155; margin-bottom:12px;"><strong>Scheduled Time:</strong> {scheduled_time}</div>
          <div style="font-size:13px; color:#334155;"><strong>Focus Activity:</strong><br><span style="color:#475569;">{activity}</span></div>
        </div>

        <p style="font-size:13px; color:#64748B;">
          💡 <em>Tip: Even a focused 25-minute Pomodoro session will keep your study streak active today.</em>
        </p>
        """

        html = self._base_html_template(
            title="Daily Study Routine",
            badge=f"⏰ {scheduled_time}",
            body_html=body_html,
            action_label="Start Daily Session"
        )
        text = f"Hi {user_name},\n\nIt's time for your scheduled study routine: {routine_name}\nTime: {scheduled_time}\nActivity: {activity}\n\nStart your session now at StudyMate AI."

        result = self.send_smtp_email(to_email, subject, html, text)
        status = result.get("status", "failed")
        self.log_email_dispatch(
            user_id=user_id,
            recipient_email=to_email,
            event_type="daily_routine",
            subject=subject,
            status=status,
            date_key=date_key,
            error_message=result.get("error")
        )
        return result

    # --------------------------------------------------------
    # Feature 2: Weekly Exam Email
    # --------------------------------------------------------
    def send_weekly_exam_email(
        self,
        user_id: str,
        to_email: str,
        user_name: str,
        exam_name: str,
        exam_date: str,
        subjects: List[str],
        topics: List[str],
        question_count: int = 15,
        difficulty: str = "Adaptive",
        target_score: int = 80,
        days_remaining: Optional[int] = None,
        force: bool = False
    ) -> Dict[str, Any]:
        """
        Sends a weekly exam reminder with exam name, date/time, subjects/topics, question count, and difficulty.
        Requires user.email_verified == True.
        """
        allowed, reason, user_doc = self.can_send_notification(user_id, notification_type="weekly_exam")
        if not allowed:
            return {
                "status": "skipped",
                "reason": reason,
                "message": f"Weekly exam reminder not sent: {reason}"
            }

        date_key = datetime.utcnow().strftime("%Y-%m-%d")
        if not force and self.is_already_sent(user_id, "weekly_exam", date_key, reference_id=exam_name):
            return {
                "status": "skipped",
                "message": f"Weekly exam reminder already sent to {to_email} for {exam_name} today."
            }

        days_text = f"in {days_remaining} day(s)" if days_remaining is not None else f"on {exam_date}"
        subject = f"📝 Weekly Exam Reminder: {exam_name} ({days_text})"

        subjects_str = ", ".join(subjects) if subjects else "Core Curriculum"
        topics_str = ", ".join(topics[:6]) if topics else "Key Roadmap Objectives"

        body_html = f"""
        <p style="font-size:15px; margin-top:0;">Hi <strong>{user_name}</strong>,</p>
        <p style="font-size:14px; color:#475569; line-height:1.6;">
          This is your reminder for your upcoming target exam. Review the test parameters below and take a quick practice quiz to calibrate your readiness.
        </p>

        <div class="card">
          <div style="font-size:12px; color:#7C3AED; font-weight:700; text-transform:uppercase; margin-bottom:6px;">Exam Details</div>
          <div style="font-size:18px; font-weight:800; color:#0F172A; margin-bottom:12px;">{exam_name}</div>
          
          <table style="width:100%; font-size:13px; border-collapse:collapse;">
            <tr>
              <td style="padding:4px 0; color:#64748B;">📅 <strong>Scheduled Date:</strong></td>
              <td style="padding:4px 0; color:#0F172A; font-weight:600;">{exam_date}</td>
            </tr>
            <tr>
              <td style="padding:4px 0; color:#64748B;">🎯 <strong>Target Score:</strong></td>
              <td style="padding:4px 0; color:#0F172A; font-weight:600;">{target_score}%</td>
            </tr>
            <tr>
              <td style="padding:4px 0; color:#64748B;">❓ <strong>Question Count:</strong></td>
              <td style="padding:4px 0; color:#0F172A; font-weight:600;">{question_count} Questions</td>
            </tr>
            <tr>
              <td style="padding:4px 0; color:#64748B;">⚡ <strong>Difficulty Tier:</strong></td>
              <td style="padding:4px 0; color:#0F172A; font-weight:600;">{difficulty}</td>
            </tr>
            <tr>
              <td style="padding:4px 0; color:#64748B;">📚 <strong>Subjects:</strong></td>
              <td style="padding:4px 0; color:#0F172A; font-weight:600;">{subjects_str}</td>
            </tr>
          </table>

          <div style="margin-top:12px; padding-top:10px; border-top:1px dashed #CBD5E1; font-size:12px; color:#475569;">
            <strong>Target Topics:</strong> {topics_str}
          </div>
        </div>
        """

        html = self._base_html_template(
            title="Weekly Exam Reminder",
            badge="📝 Exam Prep",
            body_html=body_html,
            action_label="Take Mock Exam Now"
        )
        text = f"Hi {user_name},\n\nReminder for your upcoming exam: {exam_name}\nDate: {exam_date}\nSubjects: {subjects_str}\nTarget Score: {target_score}%\n\nLog in to StudyMate AI to take a preparatory quiz."

        result = self.send_smtp_email(to_email, subject, html, text)
        status = result.get("status", "failed")
        self.log_email_dispatch(
            user_id=user_id,
            recipient_email=to_email,
            event_type="weekly_exam",
            subject=subject,
            status=status,
            date_key=date_key,
            reference_id=exam_name,
            error_message=result.get("error")
        )
        return result

    # --------------------------------------------------------
    # Feature 3: Spaced Revision Due Email
    # --------------------------------------------------------
    def send_revision_due_email(
        self,
        user_id: str,
        to_email: str,
        user_name: str,
        due_items: List[str],
        force: bool = False
    ) -> Dict[str, Any]:
        """
        Sends spaced repetition revision reminder for topics due today.
        Requires user.email_verified == True.
        """
        allowed, reason, user_doc = self.can_send_notification(user_id, notification_type="revision_due")
        if not allowed:
            return {
                "status": "skipped",
                "reason": reason,
                "message": f"Spaced revision email not sent: {reason}"
            }

        date_key = datetime.utcnow().strftime("%Y-%m-%d")
        if not force and self.is_already_sent(user_id, "revision_due", date_key):
            return {
                "status": "skipped",
                "message": f"Revision due email already sent to {to_email} today."
            }

        count = len(due_items)
        subject = f"🔄 Spaced Revision Due: {count} Topic(s) Ready for Review Today"

        items_html = "".join([f"<li style='margin-bottom:6px; color:#1E293B;'><strong>{item}</strong></li>" for item in due_items[:6]])

        body_html = f"""
        <p style="font-size:15px; margin-top:0;">Hi <strong>{user_name}</strong>,</p>
        <p style="font-size:14px; color:#475569; line-height:1.6;">
          Your Memory Curve algorithm has detected <strong>{count} topic(s)</strong> that have reached optimal spaced repetition recall intervals today.
        </p>

        <div class="card">
          <div style="font-size:12px; color:#0284C7; font-weight:700; text-transform:uppercase; margin-bottom:8px;">Topics Due for Review</div>
          <ul style="margin:0; padding-left:20px; font-size:13px;">
            {items_html}
          </ul>
        </div>
        """

        html = self._base_html_template(
            title="Spaced Revision Due",
            badge=f"🔄 {count} Due Items",
            body_html=body_html,
            action_label="Start Spaced Review"
        )
        text = f"Hi {user_name},\n\nYou have {count} topics due for spaced revision today:\n" + "\n".join([f"- {t}" for t in due_items])

        result = self.send_smtp_email(to_email, subject, html, text)
        status = result.get("status", "failed")
        self.log_email_dispatch(
            user_id=user_id,
            recipient_email=to_email,
            event_type="revision_due",
            subject=subject,
            status=status,
            date_key=date_key,
            error_message=result.get("error")
        )
        return result

    # --------------------------------------------------------
    # Feature 4: Study Streak Reminder
    # --------------------------------------------------------
    def send_streak_reminder_email(
        self,
        user_id: str,
        to_email: str,
        user_name: str,
        current_streak: int = 1,
        force: bool = False
    ) -> Dict[str, Any]:
        """
        Sends a streak preservation reminder if the user hasn't studied today.
        Requires user.email_verified == True.
        """
        allowed, reason, user_doc = self.can_send_notification(user_id, notification_type="streak_reminder")
        if not allowed:
            return {
                "status": "skipped",
                "reason": reason,
                "message": f"Streak reminder email not sent: {reason}"
            }

        date_key = datetime.utcnow().strftime("%Y-%m-%d")
        if not force and self.is_already_sent(user_id, "streak_reminder", date_key):
            return {
                "status": "skipped",
                "message": f"Streak reminder already sent to {to_email} today."
            }

        subject = f"🔥 Keep Your {current_streak}-Day Study Streak Alive!"
        body_html = f"""
        <p style="font-size:15px; margin-top:0;">Hi <strong>{user_name}</strong>,</p>
        <p style="font-size:14px; color:#475569; line-height:1.6;">
          You currently have an active <strong>{current_streak}-day study streak</strong>! Don't let your hard work reset to zero. Complete a quick quiz or chat with your AI Tutor before midnight to keep it going.
        </p>

        <div class="card" style="text-align:center;">
          <div style="font-size:36px; margin-bottom:4px;">🔥</div>
          <div style="font-size:22px; font-weight:800; color:#0F172A;">{current_streak} Days Active</div>
          <div style="font-size:13px; color:#64748B;">Complete at least 1 study activity today</div>
        </div>
        """

        html = self._base_html_template(
            title="Study Streak Alert",
            badge="🔥 Active Streak",
            body_html=body_html,
            action_label="Protect My Streak"
        )
        text = f"Hi {user_name},\n\nKeep your {current_streak}-day study streak alive! Complete any activity on StudyMate AI today."

        result = self.send_smtp_email(to_email, subject, html, text)
        status = result.get("status", "failed")
        self.log_email_dispatch(
            user_id=user_id,
            recipient_email=to_email,
            event_type="streak_reminder",
            subject=subject,
            status=status,
            date_key=date_key,
            error_message=result.get("error")
        )
        return result

    # --------------------------------------------------------
    # Feature 5: Instant Test Email
    # --------------------------------------------------------
    def send_test_email(
        self,
        user_id: str,
        to_email: str,
        user_name: str
    ) -> Dict[str, Any]:
        """
        Sends an immediate verification test email.
        Requires user.email_verified == True.
        """
        allowed, reason, user_doc = self.can_send_notification(user_id)
        if not allowed:
            return {
                "status": "unverified",
                "reason": reason,
                "message": f"Test notification not sent: {reason}"
            }

        subject = "🧪 StudyMate AI Email Notifications Verified"
        body_html = f"""
        <p style="font-size:15px; margin-top:0;">Hi <strong>{user_name}</strong>,</p>
        <p style="font-size:14px; color:#475569; line-height:1.6;">
          This is a test notification confirming that your email notification channel with <strong>StudyMate AI</strong> is active and working properly.
        </p>

        <div class="card">
          <div style="font-size:13px; color:#0F172A; font-weight:600; margin-bottom:4px;">✅ Active Notification Channels:</div>
          <ul style="margin:0; padding-left:20px; font-size:13px; color:#475569;">
            <li>Daily Routine Reminders</li>
            <li>Weekly Exam Alerts & Mock Prep</li>
            <li>Spaced Repetition & Revision Due</li>
            <li>Study Streak Protection</li>
          </ul>
        </div>
        """

        html = self._base_html_template(
            title="Notification System Test",
            badge="🧪 System Verified",
            body_html=body_html,
            action_label="Return to Dashboard"
        )
        text = f"Hi {user_name},\n\nYour StudyMate AI email notifications are verified and active!"

        result = self.send_smtp_email(to_email, subject, html, text)
        status = result.get("status", "failed")
        self.log_email_dispatch(
            user_id=user_id,
            recipient_email=to_email,
            event_type="test_email",
            subject=subject,
            status=status,
            date_key=datetime.utcnow().strftime("%Y-%m-%d"),
            error_message=result.get("error")
        )
        return result

    # --------------------------------------------------------
    # Feature 6: Email Verification OTP (Transactional)
    # --------------------------------------------------------
    def send_otp_email(
        self,
        to_email: str,
        user_name: str,
        otp_code: str
    ) -> Dict[str, Any]:
        """
        Sends an email verification OTP code.
        Transactional email sent to unverified addresses to complete verification.
        """
        subject = f"🔐 Your StudyMate AI Verification Code: {otp_code}"
        body_html = f"""
        <p style="font-size:15px; margin-top:0;">Hi <strong>{user_name}</strong>,</p>
        <p style="font-size:14px; color:#475569; line-height:1.6;">
          Use the 6-digit verification code below to verify your email address and activate automated study notifications:
        </p>

        <div class="card" style="text-align:center; background:#EEF2FF; border-color:#C7D2FE;">
          <div style="font-size:12px; color:#4F46E5; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Verification Code</div>
          <div style="font-size:32px; font-weight:900; letter-spacing:8px; color:#1E1B4B; font-family:monospace;">{otp_code}</div>
          <div style="font-size:12px; color:#6366F1; margin-top:8px;">Valid for 10 minutes</div>
        </div>

        <p style="font-size:13px; color:#64748B;">
          If you did not request this code, you can safely ignore this message.
        </p>
        """

        html = self._base_html_template(
            title="Email Verification",
            badge="🔐 OTP Code",
            body_html=body_html,
            action_label="Verify Email"
        )
        text = f"Hi {user_name},\n\nYour StudyMate AI verification code is: {otp_code}\nValid for 10 minutes."

        return self.send_smtp_email(to_email, subject, html, text)


email_service = EmailService()
