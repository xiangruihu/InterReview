from fastapi import APIRouter, HTTPException, Body
from typing import Optional, List, Dict, Any
from app.models.user import UserProfile, UserRegisterRequest, UserLoginRequest
from app.services.storage_service import StorageService
import uuid
from datetime import datetime
from passlib.context import CryptContext
from app.config import settings

router = APIRouter(prefix="/users", tags=["users"])
storage = StorageService()
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto"
)

def sanitize_user_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    clean = dict(payload)
    clean.pop("passwordHash", None)
    return clean

@router.post("/register", response_model=dict)
async def register_user(user_data: UserRegisterRequest):
    """
    注册用户
    """
    try:
        normalized_email = user_data.email.strip().lower()
        if not normalized_email:
            raise HTTPException(status_code=400, detail="邮箱格式不正确")

        existing = storage.find_user_by_email(normalized_email)
        is_demo_account = storage.is_demo_user(email=normalized_email)

        if existing and existing.get("passwordHash") and not is_demo_account:
            raise HTTPException(status_code=409, detail="该邮箱已注册，请直接登录")

        if is_demo_account:
            demo_hash = existing.get("passwordHash") if existing else pwd_context.hash(settings.DEMO_USER_PASSWORD)
            storage.prepare_demo_user(password_hash=demo_hash, reset=existing is None)
            demo_user = storage.get_user(storage.demo_user_id) if storage.demo_user_id else None
            if not demo_user:
                raise HTTPException(status_code=500, detail="初始化演示账号失败")
            return {
                "success": True,
                "data": sanitize_user_payload(demo_user)
            }

        def _parse_created_at(value: Any) -> datetime:
            if isinstance(value, datetime):
                return value
            if isinstance(value, str):
                try:
                    if value.endswith("Z"):
                        value = value.replace("Z", "+00:00")
                    return datetime.fromisoformat(value)
                except Exception:
                    return datetime.utcnow()
            return datetime.utcnow()

        if existing:
            user_id = existing.get("userId") or str(uuid.uuid4())
            created_at = _parse_created_at(existing.get("createdAt"))
        else:
            user_id = user_data.userId or str(uuid.uuid4())
            created_at = user_data.createdAt or datetime.utcnow()

        password_hash = pwd_context.hash(user_data.password)

        user = UserProfile(
            userId=user_id,
            username=user_data.username.strip() or "未命名用户",
            email=normalized_email,
            createdAt=created_at,
            passwordHash=password_hash
        )

        user_payload = user.model_dump(mode="json")

        if storage.save_user(user_id, user_payload):
            return {
                "success": True,
                "data": sanitize_user_payload(user_payload)
            }
        else:
            raise HTTPException(status_code=500, detail="保存用户数据失败")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"注册失败: {str(e)}")

@router.post("/login", response_model=dict)
async def login_user(credentials: UserLoginRequest):
    """
    用户登录
    """
    normalized_email = credentials.email.strip().lower()
    is_demo_account = storage.is_demo_user(email=normalized_email)
    user_record = storage.find_user_by_email(normalized_email)

    if is_demo_account and not user_record:
        demo_hash = pwd_context.hash(settings.DEMO_USER_PASSWORD)
        storage.prepare_demo_user(password_hash=demo_hash, reset=True)
        user_record = storage.find_user_by_email(normalized_email)

    if not user_record:
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    password_hash = user_record.get("passwordHash")
    if not password_hash or not pwd_context.verify(credentials.password, password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    if is_demo_account:
        refreshed = storage.prepare_demo_user(password_hash=password_hash, reset=True)
        if refreshed:
            user_record = refreshed

    return {
        "success": True,
        "data": sanitize_user_payload(user_record)
    }

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
        "data": sanitize_user_payload(user_data)
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
