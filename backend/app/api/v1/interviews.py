from fastapi import APIRouter, HTTPException, Body
from typing import Optional
from pathlib import Path
from datetime import datetime
from pydantic import BaseModel
import logging
from app.models.interview import InterviewData, InterviewCreate, InterviewUpdate
from app.models.user import UserProfile
from app.services.storage_service import StorageService
from app.services.transcription_service import TranscriptionService
from app.services.llm_service import LLMService
from app.config import settings
import uuid

router = APIRouter(prefix="/interviews", tags=["interviews"])
storage = StorageService()
transcriber = TranscriptionService(settings.SILICONFLOW_API_KEY)
llm_service = LLMService(settings.DASHSCOPE_API_KEY, default_model=settings.DEFAULT_LLM_MODEL)
logger = logging.getLogger(__name__)

class TranscriptionRequest(BaseModel):
    model: Optional[str] = None

class AnalysisRequest(BaseModel):
    model: Optional[str] = None
    max_pairs: Optional[int] = 12

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

@router.post("/{interview_id}/transcribe", response_model=dict)
async def transcribe_interview(
    user_id: str,
    interview_id: str,
    payload: TranscriptionRequest = Body(default=TranscriptionRequest())
):
    """
    对指定面试的上传文件执行转录
    """
    interviews = storage.get_interviews(user_id)
    interview = next((i for i in interviews if i.get('id') == interview_id), None)

    if not interview:
        raise HTTPException(status_code=404, detail="面试不存在")

    file_url = interview.get('fileUrl')
    if not file_url:
        raise HTTPException(status_code=400, detail="尚未上传面试文件，无法转录")

    file_path = Path(file_url)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="上传文件不存在，请重新上传")

    model = payload.model or settings.TRANSCRIPTION_MODEL

    try:
        transcript_text = await transcriber.transcribe_audio(file_path, model=model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"转录失败: {str(e)}")

    if not transcript_text:
        raise HTTPException(status_code=500, detail="转录失败，请稍后重试")

    transcript_payload = {
        "interviewId": interview_id,
        "text": transcript_text,
        "model": model,
        "filePath": str(file_path),
        "createdAt": datetime.utcnow().isoformat()
    }

    storage.save_transcript(user_id, interview_id, transcript_payload)
    storage.update_interview(user_id, interview_id, {"transcriptText": transcript_text})
    logger.info(
        "[Transcribe] user=%s interview=%s len=%d preview=%s",
        user_id,
        interview_id,
        len(transcript_text or ""),
        (transcript_text or "")[:200]
    )

    return {
        "success": True,
        "data": transcript_payload
    }

@router.get("/{interview_id}/transcription", response_model=dict)
async def get_transcription(user_id: str, interview_id: str):
    """
    获取指定面试的最新转录结果
    """
    transcript = storage.get_transcript(user_id, interview_id)

    if not transcript:
        interviews = storage.get_interviews(user_id)
        interview = next((i for i in interviews if i.get('id') == interview_id), None)
        fallback_text = interview.get("transcriptText") if interview else None

        if fallback_text:
            transcript = {
                "interviewId": interview_id,
                "text": fallback_text,
                "model": "unknown",
                "filePath": interview.get("fileUrl"),
                "createdAt": interview.get("updatedAt")
            }
        else:
            return {
                "success": True,
                "data": None,
                "message": "尚未生成转录"
            }

    return {
        "success": True,
        "data": transcript
    }

@router.post("/{interview_id}/analyze", response_model=dict)
async def analyze_interview_endpoint(
    user_id: str,
    interview_id: str,
    payload: AnalysisRequest = Body(default=AnalysisRequest())
):
    """
    调用 LLM 对转录文本进行分析
    """
    if not settings.DASHSCOPE_API_KEY:
        raise HTTPException(status_code=500, detail="尚未配置 DASHSCOPE_API_KEY，无法执行分析")

    interviews = storage.get_interviews(user_id)
    interview = next((i for i in interviews if i.get('id') == interview_id), None)

    if not interview:
        raise HTTPException(status_code=404, detail="面试不存在")

    transcript_record = storage.get_transcript(user_id, interview_id)
    transcript_text = (transcript_record or {}).get("text") or interview.get("transcriptText")

    if not transcript_text:
        raise HTTPException(status_code=400, detail="暂无转录文本，无法进行分析")

    info = {
        "title": interview.get("title"),
        "company": interview.get("company"),
        "position": interview.get("position"),
        "durationText": interview.get("durationText"),
    }

    try:
        analysis_result = await llm_service.analyze_interview(
            transcript_text,
            info,
            model=payload.model,
            max_pairs=payload.max_pairs or 12
        )
    except RuntimeError as llm_error:
        logger.exception("LLM 分析失败 user=%s interview=%s", user_id, interview_id)
        raise HTTPException(status_code=500, detail=str(llm_error))
    except Exception as e:
        logger.exception("分析面试失败 user=%s interview=%s", user_id, interview_id)
        raise HTTPException(status_code=500, detail=f"分析面试失败: {str(e)}")

    storage.save_analysis(user_id, interview_id, analysis_result)
    storage.update_interview(user_id, interview_id, {
        "status": "已完成",
        "analysisUpdatedAt": datetime.utcnow().isoformat()
    })

    return {
        "success": True,
        "data": analysis_result
    }
