#!/usr/bin/env python3
"""
测试 Whisper 转录服务是否正确加载
"""
import sys
import os

# 确保使用正确的 Python 路径
sys.path.insert(0, '/Users/xiangrui/code/InterReview/InterReview/backend')

print("=" * 60)
print("测试 Whisper 转录服务加载")
print("=" * 60)

# 1. 测试配置
print("\n1. 测试配置加载...")
from app.config import settings
print(f"   TRANSCRIPTION_METHOD: {settings.TRANSCRIPTION_METHOD}")
print(f"   WHISPER_MODEL_SIZE: {settings.WHISPER_MODEL_SIZE}")

# 2. 测试 Whisper 服务导入
print("\n2. 测试 Whisper 服务导入...")
try:
    from app.services.whisper_service import WhisperTranscriptionService
    print("   ✓ WhisperTranscriptionService 导入成功")
except Exception as e:
    print(f"   ✗ 导入失败: {e}")
    sys.exit(1)

# 3. 模拟 interviews.py 的初始化逻辑
print("\n3. 模拟 interviews.py 的初始化逻辑...")
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if settings.TRANSCRIPTION_METHOD.lower() == "whisper":
    try:
        logger.info("尝试加载本地 Whisper 转录服务...")
        from app.services.whisper_service import WhisperTranscriptionService

        transcriber = WhisperTranscriptionService(
            model_size=settings.WHISPER_MODEL_SIZE,
            method="local"
        )
        logger.info("✓ 成功加载本地 Whisper 转录服务")
        logger.info("  - 模型大小: %s", settings.WHISPER_MODEL_SIZE)
        logger.info("  - 转录方法: local")
        logger.info("  - transcriber 类型: %s", type(transcriber).__name__)
    except Exception as e:
        logger.error("✗ 无法加载 Whisper 转录服务: %s", e, exc_info=True)
        from app.services.transcription_service import TranscriptionService
        transcriber = TranscriptionService(settings.SILICONFLOW_API_KEY)
        logger.warning("回退到在线 API 转录服务")
else:
    logger.info("使用在线 API 转录服务")
    from app.services.transcription_service import TranscriptionService
    transcriber = TranscriptionService(settings.SILICONFLOW_API_KEY)

# 4. 检查 transcriber 类型
print("\n4. 检查 transcriber 对象...")
print(f"   类型: {type(transcriber).__name__}")
print(f"   模块: {type(transcriber).__module__}")

# 5. 检查是否有 transcribe_audio 方法
print("\n5. 检查方法...")
if hasattr(transcriber, 'transcribe_audio'):
    print("   ✓ 有 transcribe_audio 方法")
else:
    print("   ✗ 没有 transcribe_audio 方法")

print("\n" + "=" * 60)
print("测试完成！")
print("=" * 60)
