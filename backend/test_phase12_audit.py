import sys
import os
import uuid
import datetime

# Ensure root directory is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.main import app
from backend.utils.auth_utils import create_access_token

client = TestClient(app)

def run_system_audit():
    print("==================================================================")
    print("🔍 PHASE 12 — COMPREHENSIVE MULTI-AGENT STUDY ASSISTANT SYSTEM AUDIT")
    print("==================================================================")

    # -------------------------------------------------------------
    # 1. API HEALTH CHECK
    # -------------------------------------------------------------
    health_res = client.get("/api/health")
    assert health_res.status_code == 200, f"Health check failed: {health_res.text}"
    assert health_res.json()["status"] == "healthy"
    print("✅ 1. API Health Check Verified")

    # -------------------------------------------------------------
    # 2. AUTHENTICATION & JWT SECURITY
    # -------------------------------------------------------------
    user_email = f"audit_student_{uuid.uuid4().hex[:6]}@example.com"
    user_pwd = "SecurePassword123!"
    
    # Registration
    reg_res = client.post("/api/auth/register", json={
        "name": "Audit Student",
        "email": user_email,
        "password": user_pwd
    })
    assert reg_res.status_code == 200, f"Register failed: {reg_res.text}"
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == user_email.lower()
    
    token_a = reg_data["access_token"]
    user_a_id = reg_data["user"]["id"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Duplicate registration check
    dup_res = client.post("/api/auth/register", json={
        "name": "Duplicate Student",
        "email": user_email,
        "password": user_pwd
    })
    assert dup_res.status_code == 400, "Duplicate registration should return 400 Bad Request"

    # Login
    login_res = client.post("/api/auth/login", json={
        "email": user_email,
        "password": user_pwd
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

    # /auth/me
    me_res = client.get("/api/auth/me", headers=headers_a)
    assert me_res.status_code == 200
    assert me_res.json()["id"] == user_a_id
    print("✅ 2. Authentication, Registration, Login & JWT Flow Verified")

    # -------------------------------------------------------------
    # 3. SECOND USER FOR DATA ISOLATION TESTING
    # -------------------------------------------------------------
    user_b_email = f"audit_isolated_{uuid.uuid4().hex[:6]}@example.com"
    reg_b_res = client.post("/api/auth/register", json={
        "name": "Isolated User",
        "email": user_b_email,
        "password": user_pwd
    })
    token_b = reg_b_res.json()["access_token"]
    user_b_id = reg_b_res.json()["user"]["id"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    print("✅ 3. Multi-User Credentials & Session Isolation Initialized")

    # -------------------------------------------------------------
    # 4. UNAUTHENTICATED PROTECTION (ALL 14 CORE ENDPOINTS)
    # -------------------------------------------------------------
    protected_endpoints = [
        ("GET", "/api/auth/me"),
        ("GET", "/api/progress"),
        ("GET", "/api/learning-twin"),
        ("GET", "/api/revision"),
        ("GET", "/api/projects"),
        ("GET", "/api/interview/history"),
        ("GET", "/api/quiz/history"),
        ("GET", "/api/assessment/history"),
        ("GET", "/api/mistakes/summary"),
        ("GET", "/api/documents"),
        ("POST", "/api/tutor/chat", {"message": "hi"}),
        ("POST", "/api/quiz/generate", {"num_questions": 5}),
        ("POST", "/api/assessment/generate", {"subject": "Python", "num_questions": 5})
    ]

    for item in protected_endpoints:
        method = item[0]
        url = item[1]
        body = item[2] if len(item) > 2 else None

        if method == "GET":
            unauth_res = client.get(url)
        else:
            unauth_res = client.post(url, json=body or {})

        assert unauth_res.status_code == 401, f"Unprotected endpoint detected: {method} {url} returned {unauth_res.status_code}"

    print("✅ 4. Unauthenticated Access Protection Verified (401 Unauthorized across all endpoints)")

    # -------------------------------------------------------------
    # 5. NEW USER EMPTY STATES AUDIT
    # -------------------------------------------------------------
    twin_empty = client.get("/api/learning-twin", headers=headers_a).json()
    assert twin_empty["has_data"] is False
    assert twin_empty["overall_progress"] == 0.0

    rev_empty = client.get("/api/revision", headers=headers_a).json()
    assert rev_empty["has_data"] is False
    assert rev_empty["due_today_count"] == 0

    proj_empty = client.get("/api/projects", headers=headers_a).json()
    assert len(proj_empty["projects"]) == 0

    inter_empty = client.get("/api/interview/history", headers=headers_a).json()
    assert len(inter_empty["history"]) == 0
    print("✅ 5. New User Graceful Empty State Handling Verified")

    # -------------------------------------------------------------
    # 6. PHASE 1: SKILL GAP ASSESSMENT
    # -------------------------------------------------------------
    gen_ass_res = client.post("/api/assessment/generate", json={
        "subject": "Full-Stack Web Development",
        "learning_goal": "Master modern web architectures",
        "topics": ["React Hooks", "REST APIs", "SQL Joins", "Authentication"],
        "difficulty_level": "intermediate",
        "num_questions": 4
    }, headers=headers_a)
    assert gen_ass_res.status_code == 200, f"Assessment generation failed: {gen_ass_res.text}"
    ass_questions = gen_ass_res.json()["questions"]
    assert len(ass_questions) == 4

    # Submit Assessment
    sub_ass_res = client.post("/api/assessment/submit", json={
        "subject": "Full-Stack Web Development",
        "learning_goal": "Master modern web architectures",
        "topics": ["React Hooks", "REST APIs", "SQL Joins", "Authentication"],
        "total_questions": 4,
        "score": 2,
        "percentage": 50.0,
        "time_taken_seconds": 120,
        "topic_breakdown": [
            {"topic": "React Hooks", "total_questions": 1, "correct_count": 1, "incorrect_count": 0, "percentage": 100.0, "mastery_level": "Strong"},
            {"topic": "REST APIs", "total_questions": 1, "correct_count": 1, "incorrect_count": 0, "percentage": 100.0, "mastery_level": "Strong"},
            {"topic": "SQL Joins", "total_questions": 1, "correct_count": 0, "incorrect_count": 1, "percentage": 0.0, "mastery_level": "Weak"},
            {"topic": "Authentication", "total_questions": 1, "correct_count": 0, "incorrect_count": 1, "percentage": 0.0, "mastery_level": "Weak"}
        ],
        "weak_topics": ["SQL Joins", "Authentication"],
        "moderate_topics": [],
        "strong_topics": ["React Hooks", "REST APIs"],
        "details": []
    }, headers=headers_a)
    assert sub_ass_res.status_code == 200
    ass_result = sub_ass_res.json()
    assert ass_result["weak_topics"] == ["SQL Joins", "Authentication"]
    assert ass_result["strong_topics"] == ["React Hooks", "REST APIs"]
    print(f"✅ 6. Phase 1 (Skill Assessment Generation & Submission) Verified (Score: {ass_result['percentage']}%)")

    # -------------------------------------------------------------
    # 7. PHASE 2: PERSONALIZED LEARNING ROADMAP
    # -------------------------------------------------------------
    road_res = client.post("/api/roadmap/generate", json={
        "goal": "Full-Stack Web Development",
        "current_skill_level": "Beginner",
        "target_skill": "Senior Engineer",
        "available_study_time": "10 hours/week",
        "preferred_learning_style": "Visual",
        "use_latest_assessment": True
    }, headers=headers_a)
    assert road_res.status_code == 200
    road_data = road_res.json()
    assert road_data["personalization"]["personalized"] is True
    assert "SQL Joins" in road_data["personalization"]["priority_topics"] or "Authentication" in road_data["personalization"]["priority_topics"]
    assert len(road_data["roadmap_markdown"]) > 50
    print("✅ 7. Phase 2 (Personalized Roadmap with Assessment Bridge) Verified")

    # -------------------------------------------------------------
    # 8. PHASE 3: ADAPTIVE PERSONALIZED QUIZ
    # -------------------------------------------------------------
    adapt_res = client.post("/api/quiz/generate", json={
        "subject": "Full-Stack Web Development",
        "difficulty_level": "intermediate",
        "num_questions": 4,
        "adaptive": True
    }, headers=headers_a)
    assert adapt_res.status_code == 200
    quiz_data = adapt_res.json()
    assert quiz_data["adaptive"] is True
    assert len(quiz_data["questions"]) == 4

    # Submit Quiz Results with a simulated mistake on "SQL Joins"
    quiz_submit_res = client.post("/api/quiz/results", json={
        "topic": "Full-Stack Web Development",
        "difficulty": "intermediate",
        "score": 3,
        "total_questions": 4,
        "percentage": 75.0,
        "weak_areas": ["SQL Joins"],
        "is_adaptive": True,
        "details": [
            {
                "question": "Which SQL join returns all rows from the left table and matched rows from the right table?",
                "user_answer": "INNER JOIN",
                "correct_answer": "LEFT JOIN",
                "is_correct": False,
                "topic": "SQL Joins",
                "difficulty": "intermediate"
            },
            {
                "question": "What hook is used for side-effects in React?",
                "user_answer": "useEffect",
                "correct_answer": "useEffect",
                "is_correct": True,
                "topic": "React Hooks",
                "difficulty": "intermediate"
            }
        ]
    }, headers=headers_a)
    assert quiz_submit_res.status_code == 200
    print("✅ 8. Phase 3 (Adaptive Quiz Generation & Results Submission) Verified")

    # -------------------------------------------------------------
    # 9. PHASE 4: AI MISTAKE ANALYZER & MISCONCEPTION TRACKING
    # -------------------------------------------------------------
    mistake_summary_res = client.get("/api/mistakes/summary", headers=headers_a)
    assert mistake_summary_res.status_code == 200
    mistake_summary = mistake_summary_res.json()
    assert mistake_summary["total_mistakes"] >= 1
    assert any(m["topic"] == "SQL Joins" for m in mistake_summary["recent_mistakes"])
    print(f"✅ 9. Phase 4 (Mistake Analyzer & Misconception Diagnostics) Verified (Total Logged: {mistake_summary['total_mistakes']})")

    # -------------------------------------------------------------
    # 10. PHASE 5: STUDENT LEARNING TWIN
    # -------------------------------------------------------------
    twin_res = client.get("/api/learning-twin", headers=headers_a)
    assert twin_res.status_code == 200
    twin_profile = twin_res.json()
    assert twin_profile["has_data"] is True
    assert twin_profile["overall_progress"] > 0
    assert len(twin_profile["skills"]) > 0
    assert any(s["topic"] == "React Hooks" for s in twin_profile["skills"])
    print(f"✅ 10. Phase 5 (Student Learning Twin Synthesis) Verified (Overall Progress: {twin_profile['overall_progress']}%)")

    # -------------------------------------------------------------
    # 11. PHASE 6: KNOWLEDGE GRAPH DATA FEED
    # -------------------------------------------------------------
    # Knowledge Graph uses /api/learning-twin endpoints and skill properties
    assert len(twin_profile["skills"]) > 0
    sample_skill = twin_profile["skills"][0]
    assert "score" in sample_skill
    assert "mastery" in sample_skill
    assert "trend" in sample_skill
    assert "priority" in sample_skill
    print(f"✅ 11. Phase 6 (Knowledge Graph Skill Attributes) Verified ({len(twin_profile['skills'])} Topics Indexed)")

    # -------------------------------------------------------------
    # 12. PHASE 7: PERSONALIZED REVISION SCHEDULER
    # -------------------------------------------------------------
    rev_res = client.get("/api/revision", headers=headers_a)
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert rev_data["has_data"] is True
    assert rev_data["due_today_count"] >= 1 or rev_data["upcoming_count"] >= 1

    # Mark topic reviewed
    mark_rev_res = client.post("/api/revision/review", json={
        "topic": "SQL Joins",
        "subject": "Full-Stack Web Development",
        "ease_rating": "Good",
        "notes": "Practiced outer and inner joins."
    }, headers=headers_a)
    assert mark_rev_res.status_code == 200
    review_record = mark_rev_res.json()
    assert review_record["topic"] == "SQL Joins"
    assert review_record["review_count"] >= 1
    print(f"✅ 12. Phase 7 (Revision Scheduler & Spaced Review Logging) Verified (Interval: {review_record['interval_days']} days)")

    # -------------------------------------------------------------
    # 14. PHASE 9: AI PROJECT MENTOR
    # -------------------------------------------------------------
    proj_gen_res = client.post("/api/projects/generate", json={
        "title": "Study Dashboard Microservice",
        "description": "Real-time analytics and spaced repetition backend",
        "tech_stack": ["React", "FastAPI", "MongoDB"],
        "goal": "Build robust scalable student command center",
        "difficulty_level": "Intermediate",
        "timeline": "3 Weeks"
    }, headers=headers_a)
    assert proj_gen_res.status_code == 201
    proj_data = proj_gen_res.json()
    project_id = proj_data["id"]
    assert len(proj_data["phases"]) > 0
    assert len(proj_data["chat_messages"]) >= 1

    # Task update
    task_id = proj_data["phases"][0]["tasks"][0]["id"]
    task_up_res = client.patch(f"/api/projects/{project_id}/tasks/{task_id}", json={
        "status": "Completed"
    }, headers=headers_a)
    assert task_up_res.status_code == 200
    assert task_up_res.json()["progress"] > 0

    # Project Mentor Chat
    chat_proj_res = client.post(f"/api/projects/{project_id}/chat", json={
        "message": "What database indexing strategies do you recommend for this project?"
    }, headers=headers_a)
    assert chat_proj_res.status_code == 200
    assert len(chat_proj_res.json()["chat_messages"]) >= 3
    print(f"✅ 14. Phase 9 (AI Project Mentor Roadmap, Tasks & Chat) Verified (Project ID: {project_id})")

    # -------------------------------------------------------------
    # 15. PHASE 10: AI VIVA & INTERVIEW COACH
    # -------------------------------------------------------------
    viva_start_res = client.post("/api/interview/start", json={
        "interview_type": "Project Viva",
        "project_id": project_id,
        "difficulty": "Intermediate",
        "num_questions": 2,
        "include_learning_context": True
    }, headers=headers_a)
    assert viva_start_res.status_code == 201
    interview_session = viva_start_res.json()
    session_id = interview_session["id"]
    assert len(interview_session["questions"]) == 2

    # Answer Question 1
    eval_res = client.post(f"/api/interview/{session_id}/evaluate", json={
        "question_id": interview_session["questions"][0]["id"],
        "student_answer": "We ensure high performance by adding compound indexes on user_id and created_at timestamps, using connection pooling, and caching frequently queried Learning Twin summaries."
    }, headers=headers_a)
    assert eval_res.status_code == 200
    assert eval_res.json()["score"] >= 0

    # Complete Viva
    viva_comp_res = client.post(f"/api/interview/{session_id}/complete", headers=headers_a)
    assert viva_comp_res.status_code == 200
    assert viva_comp_res.json()["status"] == "completed"
    assert viva_comp_res.json()["overall_score"] is not None
    print(f"✅ 15. Phase 10 (AI Viva Defense & Answer Evaluation) Verified (Score: {viva_comp_res.json()['overall_score']}%)")

    # -------------------------------------------------------------
    # 16. PHASE 11: UNIFIED AI LEARNING DASHBOARD INTEGRATION
    # -------------------------------------------------------------
    # Verify that all 5 services queried by Dashboard.jsx return active data for User A
    dash_twin = client.get("/api/learning-twin", headers=headers_a).json()
    dash_rev = client.get("/api/revision", headers=headers_a).json()
    dash_proj = client.get("/api/projects", headers=headers_a).json()
    dash_inter = client.get("/api/interview/history", headers=headers_a).json()
    dash_prog = client.get("/api/progress", headers=headers_a).json()

    assert dash_twin["has_data"] is True
    assert dash_rev["has_data"] is True
    assert len(dash_proj["projects"]) >= 1
    assert len(dash_inter["history"]) >= 1
    assert dash_prog["quizzes_completed"] >= 1

    print("✅ 16. Phase 11 (Unified Learning Dashboard Live Data Aggregation) Verified")

    # -------------------------------------------------------------
    # 17. MULTI-USER DATA ISOLATION INTEGRITY AUDIT
    # -------------------------------------------------------------
    # User B must NOT see any of User A's data
    b_twin = client.get("/api/learning-twin", headers=headers_b).json()
    assert b_twin["has_data"] is False
    assert len(b_twin["skills"]) == 0

    b_rev = client.get("/api/revision", headers=headers_b).json()
    assert b_rev["has_data"] is False
    assert b_rev["due_today_count"] == 0

    b_proj = client.get("/api/projects", headers=headers_b).json()
    assert len(b_proj["projects"]) == 0

    b_proj_get = client.get(f"/api/projects/{project_id}", headers=headers_b)
    assert b_proj_get.status_code == 404, "Security Violation: User B was able to view User A's project!"

    b_inter_get = client.get(f"/api/interview/{session_id}", headers=headers_b)
    assert b_inter_get.status_code == 404, "Security Violation: User B was able to view User A's interview session!"

    print("✅ 17. Cross-User Data Isolation & Security Boundaries Verified (Strict Zero-Leakage)")

    # -------------------------------------------------------------
    # 18. RESOURCE FINDER & AI TUTOR REGRESSION CHECK
    # -------------------------------------------------------------
    tutor_res = client.post("/api/tutor/chat", json={
        "message": "Explain how React useMemo optimizes rendering.",
        "topic": "React Optimization"
    }, headers=headers_a)
    assert tutor_res.status_code == 200
    assert len(tutor_res.json()["response"]) > 10

    res_search = client.post("/api/resources/search", json={
        "topic": "SQL Joins",
        "difficulty": "Intermediate"
    }, headers=headers_a)
    assert res_search.status_code == 200
    assert len(res_search.json()["resources"]) > 0
    print("✅ 18. AI Tutor & Curated Resource Finder Regression Checks Passed")

    print("==================================================================")
    print("🎉 FULL SYSTEM AUDIT COMPLETE: ALL 18 INTEGRITY CHECKS PASSED 100%!")
    print("==================================================================")

if __name__ == "__main__":
    run_system_audit()
