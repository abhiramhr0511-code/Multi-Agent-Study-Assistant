import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from backend.schemas.schemas import (
    ProjectGenerateRequest,
    ProjectTaskUpdateRequest,
    ProjectChatRequest,
    ProjectResponse,
    ProjectListResponse,
    ProjectPhase,
    ProjectTask,
    ProjectChatMessage,
    SuggestedTechItem
)
from backend.utils.auth_utils import get_current_user
from backend.database.connection import get_db_collection
from backend.services.ai_bridge import ai_bridge

router = APIRouter(prefix="/projects", tags=["AI Project Mentor"])


def _calculate_progress(phases: List[Dict[str, Any]]) -> float:
    total_tasks = 0
    completed_tasks = 0
    for phase in phases:
        for task in phase.get("tasks", []):
            total_tasks += 1
            if task.get("status") == "Completed":
                completed_tasks += 1
    if total_tasks == 0:
        return 0.0
    return round((completed_tasks / total_tasks) * 100, 1)


def _doc_to_response(doc: Dict[str, Any]) -> ProjectResponse:
    phases_raw = doc.get("phases", [])
    phases_list: List[ProjectPhase] = []
    for p in phases_raw:
        tasks_list: List[ProjectTask] = []
        for t in p.get("tasks", []):
            tasks_list.append(ProjectTask(
                id=str(t.get("id")),
                title=t.get("title", ""),
                description=t.get("description", ""),
                priority=t.get("priority", "Medium"),
                status=t.get("status", "Not Started"),
                estimated_hours=t.get("estimated_hours"),
                resources=t.get("resources", [])
            ))
        phases_list.append(ProjectPhase(
            id=str(p.get("id")),
            phase_number=p.get("phase_number", 1),
            name=p.get("name", ""),
            duration=p.get("duration", "1-2 Weeks"),
            description=p.get("description", ""),
            tasks=tasks_list
        ))

    tech_raw = doc.get("suggested_technologies", [])
    suggested_tech = []
    for st in tech_raw:
        if isinstance(st, dict):
            suggested_tech.append(SuggestedTechItem(
                category=st.get("category", "General"),
                name=st.get("name", ""),
                reason=st.get("reason")
            ))

    chat_raw = doc.get("chat_messages", [])
    chat_msgs: List[ProjectChatMessage] = []
    for m in chat_raw:
        chat_msgs.append(ProjectChatMessage(
            id=str(m.get("id", "")),
            sender=m.get("sender", "user"),
            message=m.get("message", ""),
            timestamp=m.get("timestamp", "")
        ))

    return ProjectResponse(
        id=str(doc.get("_id")),
        user_id=str(doc.get("user_id")),
        title=doc.get("title", "Project"),
        description=doc.get("description", ""),
        tech_stack=doc.get("tech_stack", []),
        goal=doc.get("goal"),
        difficulty_level=doc.get("difficulty_level", "Intermediate"),
        timeline=doc.get("timeline"),
        summary=doc.get("summary", ""),
        architecture_overview=doc.get("architecture_overview", ""),
        suggested_technologies=suggested_tech,
        phases=phases_list,
        testing_checklist=doc.get("testing_checklist", []),
        deployment_checklist=doc.get("deployment_checklist", []),
        progress=float(doc.get("progress", 0.0)),
        chat_messages=chat_msgs,
        created_at=str(doc.get("created_at", "")),
        updated_at=str(doc.get("updated_at", ""))
    )


@router.post("/generate", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def generate_project(
    payload: ProjectGenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generates a new AI project roadmap and persists it for the current student.
    """
    user_id = current_user["id"]
    now_iso = datetime.utcnow().isoformat()
    project_id = str(uuid.uuid4())

    # Generate plan with AI
    plan = ai_bridge.generate_project_plan(
        title=payload.title,
        description=payload.description,
        tech_stack=payload.tech_stack,
        goal=payload.goal,
        difficulty_level=payload.difficulty_level or "Intermediate",
        timeline=payload.timeline
    )

    phases = plan.get("phases", [])
    progress = _calculate_progress(phases)

    # Welcome mentor chat message
    initial_chat = [
        {
            "id": f"msg-{uuid.uuid4().hex[:6]}",
            "sender": "assistant",
            "message": f"👋 Hello! I'm your AI Project Mentor for **{payload.title}**.\n\nI have generated your project roadmap with {len(phases)} development phases. Feel free to ask me for architecture suggestions, code snippets, library recommendations, or debugging help at any point!",
            "timestamp": now_iso
        }
    ]

    project_doc = {
        "_id": project_id,
        "user_id": user_id,
        "title": payload.title,
        "description": payload.description,
        "tech_stack": payload.tech_stack or [],
        "goal": payload.goal,
        "difficulty_level": payload.difficulty_level or "Intermediate",
        "timeline": payload.timeline,
        "summary": plan.get("summary", ""),
        "architecture_overview": plan.get("architecture_overview", ""),
        "suggested_technologies": plan.get("suggested_technologies", []),
        "phases": phases,
        "testing_checklist": plan.get("testing_checklist", []),
        "deployment_checklist": plan.get("deployment_checklist", []),
        "progress": progress,
        "chat_messages": initial_chat,
        "created_at": now_iso,
        "updated_at": now_iso
    }

    projects_col = get_db_collection("projects")
    projects_col.insert_one(project_doc)

    return _doc_to_response(project_doc)


@router.get("", response_model=ProjectListResponse)
def get_user_projects(current_user: dict = Depends(get_current_user)):
    """
    Returns all projects created by the authenticated student.
    """
    user_id = current_user["id"]
    projects_col = get_db_collection("projects")
    docs = list(projects_col.find({"user_id": user_id}).sort("updated_at", -1))
    
    return ProjectListResponse(
        projects=[_doc_to_response(d) for d in docs]
    )


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project_by_id(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns a specific project by ID.
    """
    user_id = current_user["id"]
    projects_col = get_db_collection("projects")
    doc = projects_col.find_one({"_id": project_id, "user_id": user_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied."
        )
    return _doc_to_response(doc)


@router.patch("/{project_id}/tasks/{task_id}", response_model=ProjectResponse)
def update_task_status(
    project_id: str,
    task_id: str,
    payload: ProjectTaskUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Updates the status ('Not Started', 'In Progress', 'Completed') of a task within a project.
    """
    user_id = current_user["id"]
    valid_statuses = {"Not Started", "In Progress", "Completed"}
    if payload.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{payload.status}'. Must be one of: {', '.join(valid_statuses)}"
        )

    projects_col = get_db_collection("projects")
    doc = projects_col.find_one({"_id": project_id, "user_id": user_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    phases = doc.get("phases", [])
    task_found = False

    for phase in phases:
        for task in phase.get("tasks", []):
            if task.get("id") == task_id:
                task["status"] = payload.status
                task_found = True
                break
        if task_found:
            break

    if not task_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found in project."
        )

    new_progress = _calculate_progress(phases)
    now_iso = datetime.utcnow().isoformat()

    projects_col.update_one(
        {"_id": project_id},
        {
            "$set": {
                "phases": phases,
                "progress": new_progress,
                "updated_at": now_iso
            }
        }
    )

    doc["phases"] = phases
    doc["progress"] = new_progress
    doc["updated_at"] = now_iso

    return _doc_to_response(doc)


@router.post("/{project_id}/chat", response_model=ProjectResponse)
def send_project_chat(
    project_id: str,
    payload: ProjectChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Interacts with the AI Project Mentor for the specific project context.
    """
    user_id = current_user["id"]
    projects_col = get_db_collection("projects")
    doc = projects_col.find_one({"_id": project_id, "user_id": user_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    chat_messages = doc.get("chat_messages", [])
    now_iso = datetime.utcnow().isoformat()

    # User message
    user_msg_id = f"msg-{uuid.uuid4().hex[:6]}"
    chat_messages.append({
        "id": user_msg_id,
        "sender": "user",
        "message": payload.message,
        "timestamp": now_iso
    })

    # AI Mentor Reply
    project_ctx = {
        "title": doc.get("title", ""),
        "description": doc.get("description", ""),
        "tech_stack": doc.get("tech_stack", []),
        "difficulty_level": doc.get("difficulty_level", "Intermediate"),
        "progress": doc.get("progress", 0.0)
    }

    ai_reply = ai_bridge.chat_project_mentor(
        project_context=project_ctx,
        message_history=chat_messages,
        user_message=payload.message
    )

    ai_msg_id = f"msg-{uuid.uuid4().hex[:6]}"
    chat_messages.append({
        "id": ai_msg_id,
        "sender": "assistant",
        "message": ai_reply,
        "timestamp": datetime.utcnow().isoformat()
    })

    now_updated = datetime.utcnow().isoformat()
    projects_col.update_one(
        {"_id": project_id},
        {
            "$set": {
                "chat_messages": chat_messages,
                "updated_at": now_updated
            }
        }
    )

    doc["chat_messages"] = chat_messages
    doc["updated_at"] = now_updated

    return _doc_to_response(doc)


@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Deletes a project belonging to the current user.
    """
    user_id = current_user["id"]
    projects_col = get_db_collection("projects")
    res = projects_col.delete_one({"_id": project_id, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or already deleted."
        )
    return {"success": True, "message": "Project successfully deleted."}
