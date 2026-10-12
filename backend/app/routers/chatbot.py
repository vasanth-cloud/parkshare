from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_optional_current_user
from app.models.user import User
from app.schemas.listing import ListingOut
from app.services.chatbot_service import ChatbotService

router = APIRouter(prefix="/chatbot", tags=["AI Chatbot"])

class ChatMessageRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []

class ChatMessageResponse(BaseModel):
    reply: str
    recommended_listings: List[ListingOut] = []
    suggestions: List[str] = []

@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(
    payload: ChatMessageRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    result = await ChatbotService.chat(
        db=db,
        message=payload.message,
        history=payload.history,
        current_user_id=user_id
    )
    return result

@router.get("/suggestions")
def get_chat_suggestions():
    return {
        "suggestions": [
            "I am going to Whitefield and need parking space",
            "Show spots with EV charging",
            "Find parking near BTM Layout",
            "How does key handover work?",
            "What are the rates and payment options?"
        ]
    }
