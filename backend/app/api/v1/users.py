from fastapi import APIRouter, HTTPException, Body
from typing import Optional, List, Dict, Any
from app.models.user import UserProfile, UserCreate
from app.services.storage_service import StorageService
import uuid
from datetime import datetime

router = APIRouter(prefix="/users", tags=["users"])
storage = StorageService()

@router.post("/register", response_model=dict)
async def register_user(user_data: UserCreate):
    """
    注册用户
    """
    try:
        user_id = user_data.userId or str(uuid.uuid4())
        created_at = user_data.createdAt or datetime.utcnow()

        user = UserProfile(
            userId=user_id,
            username=user_data.username,
            email=user_data.email,
            createdAt=created_at
        )

        user_payload = user.model_dump(mode="json")

        if storage.save_user(user_id, user_payload):
            return {
                "success": True,
                "data": user_payload
            }
        else:
            raise HTTPException(status_code=500, detail="保存用户数据失败")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"注册失败: {str(e)}")

@router.get("/{user_id}", response_model=dict)
async def get_user(user_id: str):
    """
    获取用户信息
    """
    user_data = storage.get_user(user_id)

    if not user_data:
        raise HTTPException(status_code=404, detail="用户不存在")

    return {
        "success": True,
        "data": user_data
    }

@router.get("/{user_id}/interviews", response_model=dict)
async def get_user_interviews(user_id: str):
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

@router.put("/{user_id}/interviews", response_model=dict)
async def save_user_interviews(user_id: str, interviews: List[Dict[str, Any]] = Body(...)):
    """
    保存用户的面试列表
    """
    try:
        if storage.save_interviews(user_id, interviews):
            return {
                "success": True,
                "data": interviews
            }
        raise HTTPException(status_code=500, detail="保存面试列表失败")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存面试列表失败: {str(e)}")

@router.get("/{user_id}/messages", response_model=dict)
async def get_user_messages(user_id: str):
    """
    获取用户所有面试的对话消息
    """
    try:
        messages = storage.get_messages(user_id)
        return {
            "success": True,
            "data": messages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取对话消息失败: {str(e)}")

@router.put("/{user_id}/messages", response_model=dict)
async def save_user_messages(user_id: str, messages: Dict[str, List[Dict[str, Any]]] = Body(...)):
    """
    保存用户所有面试的对话消息
    """
    try:
        if storage.save_messages(user_id, messages):
            return {
                "success": True,
                "data": messages
            }
        raise HTTPException(status_code=500, detail="保存对话消息失败")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存对话消息失败: {str(e)}")

@router.get("/{user_id}/analysis", response_model=dict)
async def get_user_analysis(user_id: str):
    """
    获取某个用户的全部面试分析数据
    """
    try:
        analysis = storage.get_analysis(user_id) or {}
        return {
            "success": True,
            "data": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取分析数据失败: {str(e)}")

@router.put("/{user_id}/analysis", response_model=dict)
async def save_user_analysis(user_id: str, analysis: Dict[str, Any] = Body(...)):
    """
    保存某个用户的全部面试分析数据
    """
    try:
        if storage.save_analysis_map(user_id, analysis):
            return {
                "success": True,
                "data": analysis
            }
        raise HTTPException(status_code=500, detail="保存分析数据失败")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存分析数据失败: {str(e)}")
