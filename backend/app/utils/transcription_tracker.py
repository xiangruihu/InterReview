import asyncio
import logging
from typing import Optional, Dict, Any

from app.services.storage_service import StorageService
from app.services.transcription_service import TranscriptionProgress


class InterviewTranscriptionTracker:
    """Persist transcription progress/heartbeat info for a given interview."""

    def __init__(
        self,
        storage: StorageService,
        user_id: str,
        interview_id: str,
        logger: Optional[logging.Logger] = None
    ):
        self.storage = storage
        self.user_id = user_id
        self.interview_id = interview_id
        self.logger = logger or logging.getLogger(__name__)
        self._lock = asyncio.Lock()

    async def __call__(self, progress: TranscriptionProgress) -> None:
        payload = progress.to_dict()
        updates: Dict[str, Any] = {
            "transcriptionTask": payload,
            "transcriptionUpdatedAt": progress.updated_at,
            "transcriptionTotalChunks": progress.total_chunks,
            "transcriptionCompletedChunks": progress.completed_chunks,
            "transcriptionFailedChunks": progress.failed_chunks,
            "transcriptionPercent": progress.progress,
            "transcriptionProgress": {
                "completed": progress.completed_chunks,
                "failed": progress.failed_chunks,
                "total": progress.total_chunks,
                "ratio": progress.progress,
                "stage": progress.stage,
                "status": progress.status,
                "message": progress.message,
                "errorMessage": progress.error_message,
                "chunkIndex": progress.chunk_index,
                "chunkStatus": progress.chunk_status,
                "updatedAt": progress.updated_at,
            }
        }
        if progress.error_message:
            updates["lastTranscriptionError"] = progress.error_message
        elif progress.status == "completed":
            updates["lastTranscriptionError"] = None

        if progress.status == "failed":
            updates["status"] = "分析失败"
        elif progress.status == "completed":
            updates["status"] = "已上传文件"

        async with self._lock:
            try:
                self.storage.update_interview(self.user_id, self.interview_id, updates)
            except Exception as exc:  # pragma: no cover - persistence best effort
                self.logger.warning(
                    "[Transcribe][Progress] 持久化失败 user=%s interview=%s err=%s",
                    self.user_id,
                    self.interview_id,
                    exc
                )
