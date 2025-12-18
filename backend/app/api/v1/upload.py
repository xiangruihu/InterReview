from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
from datetime import datetime
import uuid
import shutil
import logging
from app.config import settings
from app.services.storage_service import StorageService
from app.services.transcription_service import TranscriptionService, TranscriptionResult

router = APIRouter(prefix="/upload", tags=["upload"])
storage = StorageService()
transcriber = TranscriptionService(settings.SILICONFLOW_API_KEY)
logger = logging.getLogger(__name__)


def _build_transcript_payload(
    interview_id: str,
    file_path: Path,
    model: str,
    result: TranscriptionResult
):
    timestamp = datetime.utcnow().isoformat()
    return {
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

@router.post("/interview/{user_id}/{interview_id}")
async def upload_interview_file(
    user_id: str,
    interview_id: str,
    file: UploadFile = File(...)
):
    """
    上传面试文件并保存到服务器
    支持的文件类型: .mp3, .wav, .m4a, .mp4, .avi, .mov, .txt
    """
    # 验证文件类型
    allowed_extensions = ['.mp3', '.wav', '.m4a', '.mp4', '.avi', '.mov', '.txt', '.md']
    allowed_mime_types = [
        'audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4', 'audio/x-wav',
        'video/mp4', 'video/avi', 'video/quicktime',
        'text/plain', 'text/markdown'
    ]

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型。支持的格式: {', '.join(allowed_extensions)}"
        )

    if file.content_type not in allowed_mime_types:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的 MIME 类型: {file.content_type}"
        )

    # 创建上传目录
    upload_dir = Path(settings.UPLOAD_DIR) / user_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    # 保存文件
    file_id = str(uuid.uuid4())
    file_path = upload_dir / f"{file_id}{file_ext}"
    try:
        storage.update_interview(user_id, interview_id, {"status": "上传中"})
    except Exception as status_error:
        logger.warning("预更新面试状态失败 user=%s interview=%s err=%s", user_id, interview_id, status_error)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        storage.update_interview(user_id, interview_id, {"status": "待上传"})
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")
    finally:
        file.file.close()

    # 更新面试信息 (稍后改为异步)
    transcript_payload = None
    try:
        update_data = {
            "status": "已上传文件",
            "fileUrl": str(file_path),
            "fileType": file.content_type
        }
        storage.update_interview(user_id, interview_id, update_data)
    except Exception as e:
        # 更新面试信息失败，但不删除已上传的文件
        logger.warning("更新面试信息失败 user=%s interview=%s err=%s", user_id, interview_id, e)

    # 自动执行转录
    try:
        transcription_result = await transcriber.transcribe_audio(
            file_path,
            model=settings.TRANSCRIPTION_MODEL
        )
        transcript_payload = _build_transcript_payload(
            interview_id=interview_id,
            file_path=file_path,
            model=settings.TRANSCRIPTION_MODEL,
            result=transcription_result
        )
        storage.save_transcript(user_id, interview_id, transcript_payload)
        storage.update_interview(
            user_id,
            interview_id,
            {
                "status": "已上传文件",
                "transcriptText": transcript_payload.get("text")
            }
        )
        transcript_text = transcript_payload.get("text") or ""
        logger.info(
            "[Upload][Transcribe] user=%s interview=%s chunks=%d status=%s len=%d",
            user_id,
            interview_id,
            len(transcription_result.chunks),
            transcription_result.overall_status,
            len(transcript_text)
        )
    except Exception as e:
        logger.error(
            "[Upload][Transcribe] 失败 user=%s interview=%s err=%s",
            user_id,
            interview_id,
            e
        )

    response = {
        "success": True,
        "message": "文件上传成功",
        "file_path": str(file_path),
        "file_name": file.filename,
        "file_size": file_path.stat().st_size if file_path.exists() else 0
    }

    if transcript_payload:
        response["transcript"] = transcript_payload
        response["message"] = "文件上传并转录成功"

    return response

@router.post("/test/{user_id}/{interview_id}")
async def test_upload(
    user_id: str,
    interview_id: str,
    file: UploadFile = File(...)
):
    """
    测试文件上传接口
    """
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "user_id": user_id,
        "interview_id": interview_id
    }
