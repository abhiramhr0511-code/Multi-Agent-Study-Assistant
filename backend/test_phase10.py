import sys
import os
import json
import uuid

# Ensure root directory is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.main import app
from backend.utils.auth_utils import create_access_token

client = TestClient(app)

def run_tests():
    print("==================================================")
    print("🚀 PHASE 10: AI VIVA & INTERVIEW COACH VERIFICATION")
    print("==================================================")

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("✅ 1. API Health Check Passed")

    # 2. Test User Setup
    user_a_id = f"test_user_a_{uuid.uuid4().hex[:6]}"
    user_b_id = f"test_user_b_{uuid.uuid4().hex[:6]}"

    token_a = create_access_token({"sub": user_a_id, "email": "usera@test.com", "id": user_a_id})
    token_b = create_access_token({"sub": user_b_id, "email": "userb@test.com", "id": user_b_id})

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Test Interview Start (Technical Track)
    start_payload = {
        "interview_type": "Technical Interview",
        "subject": "Python Concurrency & AsyncIO",
        "difficulty": "Intermediate",
        "num_questions": 3,
        "include_learning_context": True
    }

    start_res = client.post("/api/interview/start", json=start_payload, headers=headers_a)
    assert start_res.status_code == 201, f"Interview start failed: {start_res.text}"
    session_data = start_res.json()

    assert session_data["user_id"] == user_a_id
    assert session_data["interview_type"] == "Technical Interview"
    assert session_data["total_questions"] == 3
    assert len(session_data["questions"]) == 3
    assert session_data["status"] == "in_progress"

    session_id = session_data["id"]
    print(f"✅ 2. Technical Interview Start Passed (Session ID: {session_id}, Questions: {len(session_data['questions'])})")

    # 4. Test Evaluate Answer for Question 1
    q1 = session_data["questions"][0]
    q1_id = q1["id"]

    eval_payload = {
        "question_id": q1_id,
        "student_answer": "In Python, concurrency with asyncio uses an event loop with non-blocking coroutines using async and await syntax. For CPU-bound tasks we use multiprocessing to avoid GIL bottlenecks, whereas for IO-bound network calls asyncio handles multiple concurrent connections efficiently without thread overhead."
    }

    eval_res = client.post(f"/api/interview/{session_id}/evaluate", json=eval_payload, headers=headers_a)
    assert eval_res.status_code == 200, f"Evaluation failed: {eval_res.text}"
    eval_data = eval_res.json()

    assert eval_data["question_id"] == q1_id
    assert 0.0 <= eval_data["score"] <= 100.0
    assert eval_data["rating"] in ["Excellent", "Good", "Needs Improvement", "Inadequate"]
    assert len(eval_data["feedback"]) > 5
    assert len(eval_data["suggested_model_answer"]) > 10
    print(f"✅ 3. Instant Answer Evaluation Passed (Score: {eval_data['score']}%, Rating: {eval_data['rating']})")

    # Evaluate Question 2
    q2_id = session_data["questions"][1]["id"]
    eval_res2 = client.post(
        f"/api/interview/{session_id}/evaluate",
        json={"question_id": q2_id, "student_answer": "We use try/except blocks and proper timeout contexts with asyncio.wait_for to prevent leaked connections."},
        headers=headers_a
    )
    assert eval_res2.status_code == 200

    # Evaluate Question 3
    q3_id = session_data["questions"][2]["id"]
    eval_res3 = client.post(
        f"/api/interview/{session_id}/evaluate",
        json={"question_id": q3_id, "student_answer": "Thread pools and process pools can be integrated with loop.run_in_executor to execute blocking libraries without stalling the main loop."},
        headers=headers_a
    )
    assert eval_res3.status_code == 200

    # 5. Test Complete Interview Session
    complete_res = client.post(f"/api/interview/{session_id}/complete", headers=headers_a)
    assert complete_res.status_code == 200
    comp_data = complete_res.json()

    assert comp_data["status"] == "completed"
    assert comp_data["overall_score"] is not None
    assert comp_data["performance_tier"] in ["Outstanding", "Strong Candidate", "Needs Preparation", "Requires Practice"]
    assert len(comp_data["topic_breakdown"]) > 0
    assert len(comp_data["improvement_suggestions"]) > 0
    print(f"✅ 4. Interview Finalization & Scoring Passed (Overall: {comp_data['overall_score']}%, Tier: {comp_data['performance_tier']})")

    # 6. Test Interview History
    hist_res = client.get("/api/interview/history", headers=headers_a)
    assert hist_res.status_code == 200
    history = hist_res.json()["history"]
    assert any(h["id"] == session_id for h in history)
    print(f"✅ 5. Interview History Listing Passed (User A Sessions Count: {len(history)})")

    # 7. Test Data Isolation
    hist_b_res = client.get("/api/interview/history", headers=headers_b)
    assert hist_b_res.status_code == 200
    assert not any(h["id"] == session_id for h in hist_b_res.json()["history"]), "User B saw User A's interview session!"

    get_b_res = client.get(f"/api/interview/{session_id}", headers=headers_b)
    assert get_b_res.status_code == 404, "User B was able to fetch User A's session by ID!"
    print("✅ 6. Multi-User Interview Isolation Verified")

    # 8. Test Project Viva Track with linked project
    proj_res = client.post(
        "/api/projects/generate",
        json={
            "title": "Cloud File Sharing",
            "description": "Secure file storage with encryption and signed URLs",
            "tech_stack": ["React", "FastAPI", "AWS S3"]
        },
        headers=headers_a
    )
    assert proj_res.status_code == 201
    created_proj_id = proj_res.json()["id"]

    viva_res = client.post(
        "/api/interview/start",
        json={
            "interview_type": "Project Viva",
            "project_id": created_proj_id,
            "difficulty": "Intermediate",
            "num_questions": 3
        },
        headers=headers_a
    )
    assert viva_res.status_code == 201
    viva_data = viva_res.json()
    assert viva_data["interview_type"] == "Project Viva"
    assert viva_data["project_title"] == "Cloud File Sharing"
    print(f"✅ 7. Project Viva Integration with Project Mentor Passed (Project: '{viva_data['project_title']}')")

    print("\n🎉 ALL PHASE 10 VERIFICATION CHECKS PASSED SUCCESSFULLY!\n")

if __name__ == "__main__":
    run_tests()
