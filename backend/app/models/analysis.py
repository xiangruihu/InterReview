from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class QAAnswer(BaseModel):
    question: str
    yourAnswer: str
    score: int
    category: str
    aiSuggestion: Optional[str] = None
    improvedAnswer: Optional[str] = None

class AnalysisResult(BaseModel):
    interviewId: str
    duration: str
    rounds: int
    score: float
    passRate: int
    strengths: List[dict]
    weaknesses: List[dict]
    qaList: List[QAAnswer]
    suggestions: List[dict]
    createdAt: datetime
    updatedAt: datetime
