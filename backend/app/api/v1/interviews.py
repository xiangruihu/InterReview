from fastapi import APIRouter, HTTPException
from typing import Optional
from app.models.interview import InterviewData, InterviewCreate, InterviewUpdate
from app.models.user import UserProfile
from app.services.storage_service import StorageService
import uuid
from datetime import datetime

router = APIRouter(prefix="/interviews", tags=["interviews"])
storage = StorageService()

@router.post("/", response_model=dict)
async def create_interview(user_id: str, interview_data: InterviewCreate):
    """
    创建面试
    """
    try:
        # Check if user exists
        user = storage.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")

        interview_id = str(uuid.uuid4())
        now = datetime.utcnow()

        interview = InterviewData(
            id=interview_id,
            title=interview_data.title,
            company=interview_data.company,
            position=interview_data.position,
            status="待上传",
            date=interview_data.date,
            createdAt=now,
            updatedAt=now
        )

        result = storage.create_interview(user_id, interview.model_dump())

        if result:
            return {
                "success": True,
                "data": interview.model_dump()
            }
        else:
            raise HTTPException(status_code=500, detail="创建面试失败")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建面试失败: {str(e)}")

@router.get("/{interview_id}", response_model=dict)
async def get_interview(user_id: str, interview_id: str):
    """
    获取单个面试详情
    """
    try:
        interviews = storage.get_interviews(user_id)

        interview = next((i for i in interviews if i.get('id') == interview_id), None)

        if not interview:
            raise HTTPException(status_code=404, detail="面试不存在")

        return {
            "success": True,
            "data": interview
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取面试失败: {str(e)}")

@router.patch("/{interview_id}", response_model=dict)
async def update_interview(user_id: str, interview_id: str, updates: InterviewUpdate):
    """
    更新面试信息
    """
    try:
        # 将 Pydantic model 转换为 dict，并排除未设置的字段
        update_data = updates.model_dump(exclude_unset=True)

        if storage.update_interview(user_id, interview_id, update_data):
            return {
                "success": True,
                "message": "面试更新成功"
            }
        else:
            raise HTTPException(status_code=404, detail="面试不存在或更新失败")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新面试失败: {str(e)}")

@router.delete("/{interview_id}", response_model=dict)
async def delete_interview(user_id: str, interview_id: str):
    """
    删除面试
    """
    try:
        if storage.delete_interview(user_id, interview_id):
            return {
                "success": True,
                "message": "面试删除成功"
            }
        else:
            raise HTTPException(status_code=404, detail="面试不存在或删除失败")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除面试失败: {str(e)}")

@router.get("/", response_model=dict)
async def get_all_interviews(user_id: str):
    """
    获取用户的所有面试
    """
    try:
        interviews = storage.get_interviews(user_id)

        return {
            "success": True,
            "data": interviews
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取面试列表失败: {str(e)}")
