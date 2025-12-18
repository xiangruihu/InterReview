from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict, Any
from pathlib import Path
from datetime import datetime
import json
from pydantic import BaseModel
import logging
from app.models.interview import InterviewData, InterviewCreate, InterviewUpdate
from app.models.user import UserProfile
from app.services.storage_service import StorageService
from app.services.transcription_service import TranscriptionService, TranscriptionResult
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

class TranscriptRetryRequest(BaseModel):
    model: Optional[str] = None
    chunk_indices: Optional[List[int]] = None


def _normalize_chunk_manifest(
    raw_chunks: Optional[List[Dict[str, Any]]],
    fallback_text: Optional[str],
    fallback_filename: Optional[str]
) -> List[Dict[str, Any]]:
    now = datetime.utcnow().isoformat()
    normalized: List[Dict[str, Any]] = []
    if isinstance(raw_chunks, list) and raw_chunks:
        for idx, chunk in enumerate(raw_chunks):
            if not isinstance(chunk, dict):
                continue
            normalized.append({
                "index": int(chunk.get("index", idx)),
                "filename": chunk.get("filename") or fallback_filename or f"chunk_{idx:03d}",
                "status": chunk.get("status") or ("error" if chunk.get("error") else "ok"),
                "text": chunk.get("text") or "",
                "error": chunk.get("error"),
                "retryCount": chunk.get("retryCount", chunk.get("retry_count", 0)) or 0,
                "updatedAt": chunk.get("updatedAt") or chunk.get("updated_at") or now,
            })
    else:
        normalized.append({
            "index": 0,
            "filename": fallback_filename or "chunk_000.mp3",
            "status": "ok" if fallback_text is not None else "pending",
            "text": fallback_text or "",
            "error": None,
            "retryCount": 0,
            "updatedAt": now,
        })

    normalized.sort(key=lambda item: item.get("index", 0))
    return normalized


def _compose_text_from_chunks(chunks: List[Dict[str, Any]]) -> str:
    combined: List[str] = []
    total = len(chunks) or 1
    for idx, chunk in enumerate(chunks):
        filename = chunk.get("filename") or f"chunk_{idx:03d}"
        header = f"【分片 {idx + 1}/{total} · {filename}】"
        status = chunk.get("status") or "pending"
        text = (chunk.get("text") or "").strip()
        error = chunk.get("error")
        if status == "ok" and text:
            body = text
        elif status == "ok":
            body = "(该分片暂无可显示的内容)"
        elif status == "error":
            body = f"(分片转录失败：{error or '请稍后重试'})"
        else:
            body = "(分片仍在处理中)"
        combined.extend([header, body, ""])
    return "\n".join(part for part in combined if part.strip())


def _determine_overall_status_from_chunks(chunks: List[Dict[str, Any]]) -> str:
    if not chunks:
        return "empty"
    has_error = any(chunk.get("status") == "error" for chunk in chunks)
    has_ok = any(chunk.get("status") == "ok" for chunk in chunks)
    if has_error and not has_ok:
        return "error"
    if has_error:
        return "partial"
    return "completed"


def _build_transcript_payload(
    interview_id: str,
    file_path: Path,
    model: str,
    result: TranscriptionResult
) -> Dict[str, Any]:
    timestamp = datetime.utcnow().isoformat()
    payload = {
        "interviewId": interview_id,
        "text": result.merged_text,
        "model": model,
        "filePath": str(file_path),
        "createdAt": timestamp,
        "updatedAt": timestamp,
        "chunks": [chunk.to_dict() for chunk in result.chunks],
        "failedChunks": [chunk.to_dict() for chunk in result.failed_chunks],
        "overallStatus": result.overall_status,
    }
    return payload


def _merge_chunk_dicts(
    original_chunks: List[Dict[str, Any]],
    updates: Dict[int, Dict[str, Any]]
) -> List[Dict[str, Any]]:
    merged = {chunk["index"]: {**chunk} for chunk in original_chunks}
    for idx, chunk in updates.items():
        merged[idx] = {**chunk}
    ordered = sorted(merged.values(), key=lambda item: item.get("index", 0))
    return ordered


def _build_response_from_transcript(
    interview_id: str,
    transcript: Dict[str, Any],
    interview: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    fallback_filename = None
    if interview and interview.get("fileUrl"):
        fallback_filename = Path(interview["fileUrl"]).name
    fallback_text = transcript.get("text") or (interview.get("transcriptText") if interview else None)
    chunks = _normalize_chunk_manifest(transcript.get("chunks"), fallback_text, fallback_filename)
    text = transcript.get("text") or _compose_text_from_chunks(chunks)
    failed_chunks = [chunk for chunk in chunks if chunk.get("status") == "error"]
    payload = {
        **transcript,
        "interviewId": interview_id,
        "text": text,
        "chunks": chunks,
        "failedChunks": failed_chunks,
        "overallStatus": transcript.get("overallStatus") or _determine_overall_status_from_chunks(chunks),
        "updatedAt": datetime.utcnow().isoformat(),
    }
    if "createdAt" not in payload:
        payload["createdAt"] = transcript.get("updatedAt") or (
            interview.get("updatedAt") if interview else datetime.utcnow().isoformat()
        )
    if "filePath" not in payload and interview and interview.get("fileUrl"):
        payload["filePath"] = interview.get("fileUrl")
    return payload

class AnalysisRequest(BaseModel):
    model: Optional[str] = None
    max_pairs: Optional[int] = 100

class ChatRequest(BaseModel):
    question: str
    model: Optional[str] = None
    stream: Optional[bool] = False

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
        transcription_result = await transcriber.transcribe_audio(file_path, model=model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"转录失败: {str(e)}")

    transcript_payload = _build_transcript_payload(
        interview_id=interview_id,
        file_path=file_path,
        model=model,
        result=transcription_result
    )

    storage.save_transcript(user_id, interview_id, transcript_payload)
    storage.update_interview(user_id, interview_id, {"transcriptText": transcript_payload.get("text")})
    logger.info(
        "[Transcribe] user=%s interview=%s chunks=%d status=%s",
        user_id,
        interview_id,
        len(transcription_result.chunks),
        transcription_result.overall_status
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
    interviews = storage.get_interviews(user_id)
    interview = next((i for i in interviews if i.get('id') == interview_id), None)

    if not transcript:
        fallback_text = interview.get("transcriptText") if interview else None
        if fallback_text:
            transcript = {
                "interviewId": interview_id,
                "text": fallback_text,
                "model": "unknown",
                "filePath": interview.get("fileUrl") if interview else None,
                "createdAt": interview.get("updatedAt") if interview else datetime.utcnow().isoformat(),
            }
        else:
            return {
                "success": True,
                "data": None,
                "message": "尚未生成转录"
            }

    payload = _build_response_from_transcript(interview_id, transcript, interview)
    return {
        "success": True,
        "data": payload
    }

@router.post("/{interview_id}/transcript/retry_failed", response_model=dict)
async def retry_failed_chunks(
    user_id: str,
    interview_id: str,
    payload: TranscriptRetryRequest = Body(default=TranscriptRetryRequest())
):
    """
    对失败的分片重新转录
    """
    interviews = storage.get_interviews(user_id)
    interview = next((i for i in interviews if i.get('id') == interview_id), None)
    if not interview:
        raise HTTPException(status_code=404, detail="面试不存在")

    file_url = interview.get("fileUrl")
    if not file_url:
        raise HTTPException(status_code=400, detail="尚未上传面试文件，无法重试分片")

    transcript = storage.get_transcript(user_id, interview_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="尚未生成转录，无法重试")

    existing_chunks = _normalize_chunk_manifest(
        transcript.get("chunks"),
        transcript.get("text"),
        Path(file_url).name if file_url else None
    )
    target_indices_raw = payload.chunk_indices or [
        chunk["index"] for chunk in existing_chunks if chunk.get("status") == "error"
    ]
    target_indices = [int(idx) for idx in target_indices_raw]
    if not target_indices:
        raise HTTPException(status_code=400, detail="没有可重试的分片")

    model = payload.model or transcript.get("model") or settings.TRANSCRIPTION_MODEL
    file_path = Path(file_url)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="上传文件不存在，请重新上传")

    try:
        subset_results = await transcriber.transcribe_chunk_subset(file_path, target_indices, model=model)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"分片重试失败: {exc}")

    if not subset_results:
        raise HTTPException(status_code=500, detail="未获得新的分片结果")

    updated_chunk_dict = {idx: chunk.to_dict() for idx, chunk in subset_results.items()}
    merged_chunks = _merge_chunk_dicts(existing_chunks, updated_chunk_dict)
    merged_text = _compose_text_from_chunks(merged_chunks)
    failed_chunks = [chunk for chunk in merged_chunks if chunk.get("status") == "error"]
    overall_status = _determine_overall_status_from_chunks(merged_chunks)

    updated_payload = {
        **transcript,
        "interviewId": interview_id,
        "text": merged_text,
        "chunks": merged_chunks,
        "failedChunks": failed_chunks,
        "overallStatus": overall_status,
        "updatedAt": datetime.utcnow().isoformat(),
        "model": model,
    }

    storage.save_transcript(user_id, interview_id, updated_payload)
    storage.update_interview(user_id, interview_id, {"transcriptText": merged_text})
    logger.info(
        "[Transcribe][Retry] user=%s interview=%s indices=%s status=%s",
        user_id,
        interview_id,
        target_indices,
        overall_status
    )

    return {
        "success": True,
        "data": updated_payload
    }

@router.post("/{interview_id}/chat", response_model=dict)
async def chat_with_interview(
    user_id: str,
    interview_id: str,
    payload: ChatRequest = Body(...)
):
    """
    基于当前面试上下文的智能问讯
    """
    question = (payload.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="问题不能为空")

    interviews = storage.get_interviews(user_id)
    interview = next((i for i in interviews if i.get('id') == interview_id), None)
    if not interview:
        raise HTTPException(status_code=404, detail="面试不存在")

    transcript_record = storage.get_transcript(user_id, interview_id) or {}
    transcript_text = (
        transcript_record.get("text")
        or interview.get("transcriptText")
        or ""
    )

    analysis = storage.get_analysis(user_id, interview_id) or {}
    qa_pairs = analysis.get("qaList") or analysis.get("qa_pairs") or []

    interview_meta = {
        "interviewId": interview_id,
        "title": interview.get("title"),
        "company": interview.get("company"),
        "position": interview.get("position"),
        "status": interview.get("status"),
        "date": interview.get("date"),
        "roundType": interview.get("roundType") or interview.get("round"),
        "duration": analysis.get("duration") or interview.get("durationText"),
        "rounds": analysis.get("rounds") or len(qa_pairs) or interview.get("rounds"),
        "score": analysis.get("score"),
        "passRate": analysis.get("passRate"),
    }

    messages_map = storage.get_messages(user_id)
    interview_history = messages_map.get(interview_id, [])
    llm_history = [
        {
            "role": msg.get("role"),
            "content": msg.get("content")
        }
        for msg in interview_history
        if msg.get("role") in {"user", "assistant"} and msg.get("content")
    ]

    try:
        answer = await llm_service.chat_with_interview_context(
            question=question,
            history=llm_history,
            transcript_text=transcript_text,
            qa_pairs=qa_pairs,
            interview_meta=interview_meta,
            model=payload.model or settings.DEFAULT_LLM_MODEL
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成回答失败: {str(e)}")

    timestamp = datetime.utcnow().isoformat()
    user_message = {
        "id": str(uuid.uuid4()),
        "role": "user",
        "content": question,
        "timestamp": timestamp
    }
    assistant_message = {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "content": answer,
        "timestamp": datetime.utcnow().isoformat()
    }

    updated_history = interview_history + [user_message, assistant_message]
    messages_map[interview_id] = updated_history
    storage.save_messages(user_id, messages_map)

    return {
        "success": True,
        "data": {
            "answer": answer,
            "assistantMessage": assistant_message,
            "userMessage": user_message,
            "history": updated_history
        }
    }

@router.post("/{interview_id}/chat/stream")
async def chat_with_interview_stream(
    user_id: str,
    interview_id: str,
    payload: ChatRequest = Body(...)
):
    """
    流式返回面试智能问讯结果 (SSE)
    """
    question = (payload.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="问题不能为空")

    interviews = storage.get_interviews(user_id)
    interview = next((i for i in interviews if i.get('id') == interview_id), None)
    if not interview:
        raise HTTPException(status_code=404, detail="面试不存在")

    transcript_record = storage.get_transcript(user_id, interview_id) or {}
    transcript_text = (
        transcript_record.get("text")
        or interview.get("transcriptText")
        or ""
    )

    analysis = storage.get_analysis(user_id, interview_id) or {}
    qa_pairs = analysis.get("qaList") or analysis.get("qa_pairs") or []

    interview_meta = {
        "interviewId": interview_id,
        "title": interview.get("title"),
        "company": interview.get("company"),
        "position": interview.get("position"),
        "status": interview.get("status"),
        "date": interview.get("date"),
        "roundType": interview.get("roundType") or interview.get("round"),
        "duration": analysis.get("duration") or interview.get("durationText"),
        "rounds": analysis.get("rounds") or len(qa_pairs) or interview.get("rounds"),
        "score": analysis.get("score"),
        "passRate": analysis.get("passRate"),
    }

    messages_map = storage.get_messages(user_id)
    interview_history = messages_map.get(interview_id, [])
    llm_history = [
        {
            "role": msg.get("role"),
            "content": msg.get("content")
        }
        for msg in interview_history
        if msg.get("role") in {"user", "assistant"} and msg.get("content")
    ]

    def sse(data: Dict[str, Any]) -> str:
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

    def event_stream():
        yield sse({"type": "start"})
        chunks: List[str] = []
        try:
            for piece in llm_service.stream_chat_with_interview_context(
                question=question,
                history=llm_history,
                transcript_text=transcript_text,
                qa_pairs=qa_pairs,
                interview_meta=interview_meta,
                model=payload.model or settings.DEFAULT_LLM_MODEL
            ):
                if not piece:
                    continue
                chunks.append(piece)
                yield sse({"type": "chunk", "content": piece})
        except Exception as exc:
            logger.exception("[ChatStream] 生成回答失败 user=%s interview=%s", user_id, interview_id)
            yield sse({
                "type": "error",
                "message": f"生成回答失败: {exc}"
            })
            yield sse({"type": "end"})
            return

        answer = "".join(chunks).strip()
        if not answer:
            yield sse({"type": "error", "message": "LLM 未返回内容"})
            yield sse({"type": "end"})
            return

        user_message = {
            "id": str(uuid.uuid4()),
            "role": "user",
            "content": question,
            "timestamp": datetime.utcnow().isoformat()
        }
        assistant_message = {
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": answer,
            "timestamp": datetime.utcnow().isoformat()
        }
        updated_history = interview_history + [user_message, assistant_message]
        messages_map[interview_id] = updated_history
        storage.save_messages(user_id, messages_map)

        yield sse({
            "type": "done",
            "answer": answer,
            "assistantMessage": assistant_message,
            "userMessage": user_message,
            "history": updated_history
        })
        yield sse({"type": "end"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")

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
            max_pairs=payload.max_pairs or 100
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
