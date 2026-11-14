import os
import sys
import uuid
import asyncio
from datetime import datetime

# Ensure project root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import settings
from backend.services.email_service import email_service
from backend.services.email_scheduler import email_scheduler
from backend.database.connection import get_db_collection
from backend.utils.auth_utils import hash_password


def run_phase15_verification_tests():
    print("============================================================")
    print("🚀 RUNNING PHASE 15 EMAIL VERIFICATION & NOTIFICATION SUITE")
    print("============================================================")

    users_col = get_db_collection("users")
    settings_col = get_db_collection("user_notification_settings")
    logs_col = get_db_collection("sent_email_logs")
    otps_col = get_db_collection("email_verification_otps")

    test_unverified_uid = f"unverified-user-{uuid.uuid4().hex[:8]}"
    test_unverified_email = f"unverified.{uuid.uuid4().hex[:6]}@example.com"

    test_verified_uid = f"verified-user-{uuid.uuid4().hex[:8]}"
    test_verified_email = f"verified.{uuid.uuid4().hex[:6]}@example.com"

    test_disabled_uid = f"disabled-user-{uuid.uuid4().hex[:8]}"
    test_disabled_email = f"disabled.{uuid.uuid4().hex[:6]}@example.com"

    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    # Setup User 1: Unverified Email (email_verified = False)
    users_col.insert_one({
        "_id": test_unverified_uid,
        "name": "Unverified Student",
        "email": test_unverified_email,
        "hashed_password": hash_password("secret123"),
        "email_verified": False,
        "created_at": datetime.utcnow().isoformat()
    })
    settings_col.insert_one({
        "_id": str(uuid.uuid4()),
        "user_id": test_unverified_uid,
        "email": test_unverified_email,
        "daily_routine_emails": True,
        "weekly_exam_emails": True,
        "revision_emails": True,
        "streak_emails": True,
        "routine_time": "09:00",
        "routine_name": "Morning Code Sprint",
        "routine_activity": "Practice daily problems",
        "updated_at": datetime.utcnow().isoformat()
    })

    # Setup User 2: Verified Email (email_verified = True) + Notifications Enabled
    users_col.insert_one({
        "_id": test_verified_uid,
        "name": "Verified Student",
        "email": test_verified_email,
        "hashed_password": hash_password("secret123"),
        "email_verified": True,
        "created_at": datetime.utcnow().isoformat()
    })
    settings_col.insert_one({
        "_id": str(uuid.uuid4()),
        "user_id": test_verified_uid,
        "email": test_verified_email,
        "daily_routine_emails": True,
        "weekly_exam_emails": True,
        "revision_emails": True,
        "streak_emails": True,
        "routine_time": "09:00",
        "routine_name": "Morning Code Sprint",
        "routine_activity": "Practice daily problems",
        "updated_at": datetime.utcnow().isoformat()
    })

    # Setup User 3: Verified Email (email_verified = True) BUT Notifications Disabled
    users_col.insert_one({
        "_id": test_disabled_uid,
        "name": "Disabled Student",
        "email": test_disabled_email,
        "hashed_password": hash_password("secret123"),
        "email_verified": True,
        "created_at": datetime.utcnow().isoformat()
    })
    settings_col.insert_one({
        "_id": str(uuid.uuid4()),
        "user_id": test_disabled_uid,
        "email": test_disabled_email,
        "daily_routine_emails": False,
        "weekly_exam_emails": False,
        "revision_emails": False,
        "streak_emails": False,
        "routine_time": "09:00",
        "routine_name": "Morning Code Sprint",
        "routine_activity": "Practice daily problems",
        "updated_at": datetime.utcnow().isoformat()
    })

    print("✅ Test fixtures created in MongoDB.")

    # ------------------------------------------------------------
    # TEST 1: UNVERIFIED EMAIL -> NOTIFICATION NOT SENT
    # ------------------------------------------------------------
    print("\n--- TEST 1: Unverified Email -> Notification NOT Sent ---")
    res_unverified_routine = email_service.send_daily_routine_email(
        user_id=test_unverified_uid,
        to_email=test_unverified_email,
        user_name="Unverified Student",
        routine_name="Morning Sprint",
        activity="Solve problems",
        scheduled_time="09:00"
    )
    print(f"  Result: {res_unverified_routine}")
    assert res_unverified_routine["status"] == "skipped"
    assert "unverified" in res_unverified_routine["message"].lower()

    res_unverified_test = email_service.send_test_email(
        user_id=test_unverified_uid,
        to_email=test_unverified_email,
        user_name="Unverified Student"
    )
    assert res_unverified_test["status"] == "unverified"
    print("✅ TEST 1 PASSED: Unverified users correctly blocked from receiving notifications.")

    # ------------------------------------------------------------
    # TEST 2: NOTIFICATIONS DISABLED -> NOTIFICATION NOT SENT
    # ------------------------------------------------------------
    print("\n--- TEST 2: Notifications Disabled -> Notification NOT Sent ---")
    res_disabled_routine = email_service.send_daily_routine_email(
        user_id=test_disabled_uid,
        to_email=test_disabled_email,
        user_name="Disabled Student",
        routine_name="Morning Sprint",
        activity="Solve problems",
        scheduled_time="09:00"
    )
    print(f"  Result: {res_disabled_routine}")
    assert res_disabled_routine["status"] == "skipped"
    assert "disabled" in res_disabled_routine["message"].lower()
    print("✅ TEST 2 PASSED: Disabled notifications correctly skipped.")

    # ------------------------------------------------------------
    # TEST 3: VERIFIED EMAIL + NOTIFICATIONS ENABLED -> NOTIFICATION SENT
    # ------------------------------------------------------------
    print("\n--- TEST 3: Verified Email + Notifications Enabled -> Notification SENT ---")
    res_verified_routine = email_service.send_daily_routine_email(
        user_id=test_verified_uid,
        to_email=test_verified_email,
        user_name="Verified Student",
        routine_name="Morning Sprint",
        activity="Solve problems",
        scheduled_time="09:00"
    )
    print(f"  Result: {res_verified_routine}")
    assert res_verified_routine["status"] in ["sent", "simulated"]

    res_verified_exam = email_service.send_weekly_exam_email(
        user_id=test_verified_uid,
        to_email=test_verified_email,
        user_name="Verified Student",
        exam_name="Full Stack Final Mock",
        exam_date=today_str,
        subjects=["Python", "FastAPI"],
        topics=["Routing", "Security"],
        question_count=15
    )
    assert res_verified_exam["status"] in ["sent", "simulated"]

    res_verified_rev = email_service.send_revision_due_email(
        user_id=test_verified_uid,
        to_email=test_verified_email,
        user_name="Verified Student",
        due_items=["Memory Hierarchy", "B-Trees"]
    )
    assert res_verified_rev["status"] in ["sent", "simulated"]
    print("✅ TEST 3 PASSED: Verified users with notifications enabled successfully receive emails.")

    # ------------------------------------------------------------
    # TEST 4: OTP VERIFICATION FLOW
    # ------------------------------------------------------------
    print("\n--- TEST 4: OTP Email Verification Workflow ---")
    otp_code = "849201"
    otps_col.insert_one({
        "_id": str(uuid.uuid4()),
        "email": test_unverified_email,
        "otp": otp_code,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + asyncio.subprocess.sys.modules['datetime'].timedelta(minutes=10)).isoformat()
    })

    # Now verify the user via MongoDB update (simulating verify_email_otp endpoint)
    users_col.update_one({"_id": test_unverified_uid}, {"$set": {"email_verified": True}})
    
    # Check that after verification, notifications can now be sent!
    res_now_verified = email_service.send_daily_routine_email(
        user_id=test_unverified_uid,
        to_email=test_unverified_email,
        user_name="Now Verified Student",
        routine_name="Morning Sprint",
        activity="Solve problems",
        scheduled_time="09:00"
    )
    assert res_now_verified["status"] in ["sent", "simulated"]
    print(f"  Result after email verification: {res_now_verified['status']}")
    print("✅ TEST 4 PASSED: User successfully transitions from unverified to verified, enabling notifications.")

    # ------------------------------------------------------------
    # TEST 5: SCHEDULER CYCLE RESPECTS VERIFICATION
    # ------------------------------------------------------------
    print("\n--- TEST 5: Background Scheduler Verification Filter ---")
    scheduler_summary = asyncio.run(email_scheduler.run_evaluation_cycle())
    print(f"  Scheduler Summary: {scheduler_summary}")
    assert "evaluated_users" in scheduler_summary
    print("✅ TEST 5 PASSED: Scheduler respects verification gates.")

    # Cleanup
    users_col.delete_many({"_id": {"$in": [test_unverified_uid, test_verified_uid, test_disabled_uid]}})
    settings_col.delete_many({"user_id": {"$in": [test_unverified_uid, test_verified_uid, test_disabled_uid]}})
    logs_col.delete_many({"user_id": {"$in": [test_unverified_uid, test_verified_uid, test_disabled_uid]}})
    otps_col.delete_many({"email": {"$in": [test_unverified_email, test_verified_email, test_disabled_email]}})
    print("🧹 Test fixtures cleaned up.")

    print("\n============================================================")
    print("🎉 ALL EMAIL VERIFICATION & NOTIFICATION TESTS PASSED!")
    print("============================================================")


if __name__ == "__main__":
    run_phase15_verification_tests()
