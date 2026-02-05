"""
全局转录服务实例
在应用启动时初始化
"""
import logging
import threading
from typing import Optional

logger = logging.getLogger(__name__)

# 全局转录服务实例
_transcriber = None
_lock = threading.Lock()
_initialized = False


def initialize_transcription_service(force: bool = False):
    """
    初始化转录服务

    Args:
        force: 是否强制重新初始化
    """
    global _transcriber, _initialized

    # 如果已经初始化且不强制重新初始化，直接返回
    if _initialized and not force:
        logger.info("转录服务已初始化，跳过")
        return _transcriber

    with _lock:
        # 双重检查锁定模式
        if _initialized and not force:
            return _transcriber

        from app.config import settings

        logger.info("=" * 60)
        logger.info("初始化转录服务...")
        logger.info("TRANSCRIPTION_METHOD: %s", settings.TRANSCRIPTION_METHOD)
        logger.info("WHISPER_MODEL_SIZE: %s", settings.WHISPER_MODEL_SIZE)

        method_setting = (settings.TRANSCRIPTION_METHOD or "").strip().lower()
        if method_setting in {"whisper", "local", "local-whisper", "local_whisper"}:
            try:
                logger.info("尝试加载本地 Whisper 转录服务...")
                from app.services.whisper_service import WhisperTranscriptionService

                _transcriber = WhisperTranscriptionService(
                    model_size=settings.WHISPER_MODEL_SIZE,
                    method="local"
                )
                logger.info("✓ 成功加载本地 Whisper 转录服务")
                logger.info("  - 模型大小: %s", settings.WHISPER_MODEL_SIZE)
                logger.info("  - 转录方法: local")
            except Exception as e:
                logger.error("✗ 无法加载 Whisper 转录服务: %s", e, exc_info=True)
                logger.warning("回退到在线 API 转录服务")
                from app.services.transcription_service import TranscriptionService
                _transcriber = TranscriptionService(settings.SILICONFLOW_API_KEY)
        elif method_setting in {"faster", "faster-whisper", "faster_whisper"}:
            try:
                logger.info("尝试加载 faster-whisper 转录服务...")
                from app.services.whisper_service import WhisperTranscriptionService

                _transcriber = WhisperTranscriptionService(
                    model_size=settings.WHISPER_MODEL_SIZE,
                    method="faster"
                )
                logger.info("✓ 成功加载 faster-whisper 转录服务")
                logger.info("  - 模型大小: %s", settings.WHISPER_MODEL_SIZE)
                logger.info("  - 转录方法: faster")
            except Exception as e:
                logger.error("✗ 无法加载 faster-whisper 转录服务: %s", e, exc_info=True)
                logger.warning("回退到在线 API 转录服务")
                from app.services.transcription_service import TranscriptionService
                _transcriber = TranscriptionService(settings.SILICONFLOW_API_KEY)
        else:
            logger.info("使用在线 API 转录服务")
            from app.services.transcription_service import TranscriptionService
            _transcriber = TranscriptionService(settings.SILICONFLOW_API_KEY)

        _initialized = True
        logger.info("=" * 60)
        return _transcriber


def get_transcriber():
    """
    获取转录服务实例（懒加载）
    如果未初始化，会自动初始化
    """
    global _transcriber, _initialized

    # 如果未初始化，自动初始化
    if not _initialized or _transcriber is None:
        logger.info("转录服务未初始化，正在自动初始化...")
        return initialize_transcription_service()

    return _transcriber
