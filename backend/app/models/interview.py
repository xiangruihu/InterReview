from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime

class InterviewData(BaseModel):
    id: str
    title: str
    company: str
    position: str
    status: Literal['待上传', '上传中', '已上传文件', '分析中', '已完成', '分析失败']
    date: datetime
    createdAt: datetime
    updatedAt: datetime
    fileUrl: Optional[str] = None
    fileType: Optional[str] = None
    transcriptText: Optional[str] = None

class InterviewCreate(BaseModel):
    title: str
    company: str
    position: str
    date: datetime

class InterviewUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    status: Optional[Literal['待上传', '上传中', '已上传文件', '分析中', '已完成', '分析失败']] = None
