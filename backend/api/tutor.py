import uuid
from fastapi import APIRouter, Depends
from backend.schemas.schemas import TutorChatRequest, TutorChatResponse
from backend.services.ai_bridge import ai_bridge
from backend.utils.auth_utils import get_current_user

router = APIRouter(prefix="/tutor", tags=["AI Tutor"])

@router.post("/chat", response_model=TutorChatResponse)
def chat_with_tutor(
    payload: TutorChatRequest,
    current_user: dict = Depends(get_current_user)
):
    conv_id = payload.conversation_id or str(uuid.uuid4())
    
    response_text = ai_bridge.chat_tutor(
        message=payload.message,
        topic=payload.topic or "General Study",
        subject_category=payload.subject_category or "General",
        knowledge_level=payload.knowledge_level or "Intermediate",
        learning_style=payload.learning_style or "Visual"
    )
    
    return TutorChatResponse(
        response=response_text,
        conversation_id=conv_id
    )
