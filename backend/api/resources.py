from fastapi import APIRouter, Depends
from backend.schemas.schemas import ResourceSearchRequest, ResourceSearchResponse, ResourceItem
from backend.services.ai_bridge import ai_bridge
from backend.utils.auth_utils import get_current_user

router = APIRouter(prefix="/resources", tags=["Resource Finder"])

@router.post("/search", response_model=ResourceSearchResponse)
def search_resources(
    payload: ResourceSearchRequest,
    current_user: dict = Depends(get_current_user)
):
    items = ai_bridge.search_resources(
        topic=payload.topic,
        skill=payload.skill or "",
        learning_goal=payload.learning_goal or "",
        difficulty=payload.difficulty or "Intermediate",
        learning_preference=payload.learning_preference or "Visual"
    )
    
    resource_objects = [ResourceItem(**item) for item in items]
    return ResourceSearchResponse(resources=resource_objects)
