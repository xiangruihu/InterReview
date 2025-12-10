from pydantic import BaseModel
from typing import List, Optional

class ChatMessage(BaseModel):
    id: Optional[str] = None
    role: str
    content: str
    timestamp: Optional[str] = None

class ChatHistory(BaseModel):
    interviewId: str
    messages: List[ChatMessage]
