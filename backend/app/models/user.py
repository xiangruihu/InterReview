from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserProfile(BaseModel):
    userId: str
    username: str
    email: EmailStr
    createdAt: datetime
    passwordHash: str
    version: int = 1

class UserRegisterRequest(BaseModel):
    userId: Optional[str] = None
    username: str
    email: EmailStr
    password: str = Field(min_length=6)
    createdAt: Optional[datetime] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str
