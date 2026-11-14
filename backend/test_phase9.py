import sys
import os
import json
import uuid

# Ensure root directory is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.main import app
from backend.utils.auth_utils import create_access_token
from backend.database.connection import get_db_collection

client = TestClient(app)

def run_tests():
    print("==================================================")
    print("🚀 PHASE 9: AI PROJECT MENTOR VERIFICATION TESTS")
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

    # 3. Test Project Generation for User A
    proj_payload = {
        "title": "Microservices Distributed Cache",
        "description": "Building a high throughput in-memory caching system with consistent hashing, LRU eviction, and REST metrics.",
        "tech_stack": ["Python", "FastAPI", "Redis", "Docker"],
        "goal": "Master distributed systems and caching",
        "difficulty_level": "Advanced",
        "timeline": "3 Weeks"
    }

    gen_res = client.post("/api/projects/generate", json=proj_payload, headers=headers_a)
    assert gen_res.status_code == 201, f"Project generation failed: {gen_res.text}"
    proj_data = gen_res.json()

    assert proj_data["title"] == proj_payload["title"]
    assert proj_data["user_id"] == user_a_id
    assert len(proj_data["phases"]) >= 3, "Phases count should be >= 3"
    assert proj_data["progress"] == 0.0, f"Initial progress should be 0.0, got {proj_data['progress']}"
    assert len(proj_data["testing_checklist"]) > 0, "Testing checklist should not be empty"
    assert len(proj_data["deployment_checklist"]) > 0, "Deployment checklist should not be empty"
    assert len(proj_data["chat_messages"]) >= 1, "Initial mentor message should be present"

    project_id = proj_data["id"]
    print(f"✅ 2. Project Plan Generation Passed (ID: {project_id}, Phases: {len(proj_data['phases'])})")

    # 4. Test List Projects for User A
    list_res = client.get("/api/projects", headers=headers_a)
    assert list_res.status_code == 200
    projects_list = list_res.json()["projects"]
    assert any(p["id"] == project_id for p in projects_list)
    print(f"✅ 3. Project Listing Passed (Count for User A: {len(projects_list)})")

    # 5. Test Data Isolation: User B should NOT see User A's project
    list_b_res = client.get("/api/projects", headers=headers_b)
    assert list_b_res.status_code == 200
    projects_b = list_b_res.json()["projects"]
    assert not any(p["id"] == project_id for p in projects_b), "User B saw User A's project!"

    get_b_res = client.get(f"/api/projects/{project_id}", headers=headers_b)
    assert get_b_res.status_code == 404, "User B was able to fetch User A's project!"
    print("✅ 4. User Data Isolation Verified")

    # 6. Test Task Status Update & Dynamic Progress Recalculation
    first_phase = proj_data["phases"][0]
    first_task = first_phase["tasks"][0]
    task_id = first_task["id"]

    # Mark first task 'In Progress'
    patch_res1 = client.patch(
        f"/api/projects/{project_id}/tasks/{task_id}",
        json={"status": "In Progress"},
        headers=headers_a
    )
    assert patch_res1.status_code == 200
    updated1 = patch_res1.json()
    assert updated1["phases"][0]["tasks"][0]["status"] == "In Progress"
    assert updated1["progress"] == 0.0

    # Mark first task 'Completed'
    patch_res2 = client.patch(
        f"/api/projects/{project_id}/tasks/{task_id}",
        json={"status": "Completed"},
        headers=headers_a
    )
    assert patch_res2.status_code == 200
    updated2 = patch_res2.json()
    assert updated2["phases"][0]["tasks"][0]["status"] == "Completed"
    assert updated2["progress"] > 0.0, f"Progress should be > 0.0 after completing a task, got {updated2['progress']}"
    print(f"✅ 5. Task Status Update & Progress Calculation Passed (New Progress: {updated2['progress']}%)")

    # 7. Test AI Project Mentor Chat
    chat_payload = {"message": "How should I design the consistent hashing algorithm for the cache ring?"}
    chat_res = client.post(
        f"/api/projects/{project_id}/chat",
        json={**chat_payload},
        headers=headers_a
    )
    assert chat_res.status_code == 200
    chat_proj = chat_res.json()
    assert len(chat_proj["chat_messages"]) >= 3, "Chat should contain initial greeting + user query + AI reply"
    last_msg = chat_proj["chat_messages"][-1]
    assert last_msg["sender"] == "assistant"
    assert len(last_msg["message"]) > 10
    print(f"✅ 6. AI Project Mentor Chat Interaction Passed (Response length: {len(last_msg['message'])})")

    # 8. Test Project Deletion
    del_res = client.delete(f"/api/projects/{project_id}", headers=headers_a)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify deleted
    get_del_res = client.get(f"/api/projects/{project_id}", headers=headers_a)
    assert get_del_res.status_code == 404
    print("✅ 7. Project Deletion Passed")

    print("\n🎉 ALL PHASE 9 VERIFICATION CHECKS PASSED SUCCESSFULLY!\n")

if __name__ == "__main__":
    run_tests()
