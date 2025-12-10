from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserProfile(BaseModel):
    userId: str
    username: str
    email: EmailStr
    createdAt: datetime
    version: int = 1

class UserCreate(BaseModel):
    userId: Optional[str] = None
    username: str
    email: EmailStr
    createdAt: Optional[datetime] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
