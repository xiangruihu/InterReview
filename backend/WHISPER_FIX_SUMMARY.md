# Whisper 本地转录服务初始化修复

## 问题描述

用户反馈服务器启动时没有看到转录服务初始化的日志，导致本地 Whisper 转录服务未正确加载。

## 根本原因

FastAPI 的路由模块只有在被导入时才会执行模块级别的代码。虽然 `interviews.py` 在 `main.py` 中被导入，但模块级别的初始化代码（第 22-48 行）可能在某些情况下不会按预期执行或日志不可见。

## 解决方案

采用**全局转录服务**模式，将转录服务的初始化从路由模块移到专门的核心模块，并在 FastAPI 的 startup 事件中显式初始化。

## 实施的更改

### 1. 创建全局转录服务模块

**新文件**: `backend/app/core/transcription.py`

```python
"""
全局转录服务实例
在应用启动时初始化
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# 全局转录服务实例
transcriber = None

def initialize_transcription_service():
    """初始化转录服务"""
    global transcriber

    from app.config import settings

    logger.info("=" * 60)
    logger.info("初始化转录服务...")
    logger.info("TRANSCRIPTION_METHOD: %s", settings.TRANSCRIPTION_METHOD)
    logger.info("WHISPER_MODEL_SIZE: %s", settings.WHISPER_MODEL_SIZE)

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
        except Exception as e:
            logger.error("✗ 无法加载 Whisper 转录服务: %s", e, exc_info=True)
            logger.warning("回退到在线 API 转录服务")
            from app.services.transcription_service import TranscriptionService
            transcriber = TranscriptionService(settings.SILICONFLOW_API_KEY)
    else:
        logger.info("使用在线 API 转录服务")
        from app.services.transcription_service import TranscriptionService
        transcriber = TranscriptionService(settings.SILICONFLOW_API_KEY)

    logger.info("=" * 60)
    return transcriber

def get_transcriber():
    """获取转录服务实例"""
    if transcriber is None:
        raise RuntimeError("转录服务未初始化，请先调用 initialize_transcription_service()")
    return transcriber
```

**新文件**: `backend/app/core/__init__.py`

### 2. 修改 main.py

在 `backend/app/main.py` 中添加 startup 事件处理器：

```python
import logging
from app.core.transcription import initialize_transcription_service

logger = logging.getLogger(__name__)

# 应用启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动时初始化服务"""
    logger.info("=" * 60)
    logger.info("InterReview 应用启动中...")
    logger.info("=" * 60)

    # 初始化转录服务
    initialize_transcription_service()

    logger.info("=" * 60)
    logger.info("InterReview 应用启动完成")
    logger.info("=" * 60)
```

### 3. 修改 interviews.py

在 `backend/app/api/v1/interviews.py` 中：

**移除**：模块级别的转录服务初始化代码（原第 22-48 行）

**添加**：导入全局转录服务获取函数
```python
from app.core.transcription import get_transcriber
```

**修改**：在需要使用转录服务的地方调用 `get_transcriber()`
- `transcribe_interview` 函数（第 355 行）
- `retry_failed_chunks` 函数（第 473 行）

```python
# 修改前
transcription_result = await transcriber.transcribe_audio(...)

# 修改后
transcriber = get_transcriber()
transcription_result = await transcriber.transcribe_audio(...)
```

## 优势

1. **可靠的初始化时机**：在 FastAPI startup 事件中显式初始化，确保在应用启动时执行
2. **清晰的日志输出**：启动日志会明确显示转录服务的初始化过程
3. **单一职责**：将转录服务初始化逻辑从路由模块分离到核心模块
4. **全局访问**：通过 `get_transcriber()` 函数在任何地方都能获取转录服务实例
5. **错误处理**：如果服务未初始化就尝试使用，会抛出明确的错误信息

## 验证步骤

1. 重启服务器
2. 查看启动日志，应该看到：
   ```
   INFO:     Application startup complete.
   ============================================================
   InterReview 应用启动中...
   ============================================================
   ============================================================
   初始化转录服务...
   TRANSCRIPTION_METHOD: whisper
   WHISPER_MODEL_SIZE: tiny
   尝试加载本地 Whisper 转录服务...
   正在加载 Whisper 模型: tiny...
   Whisper 模型加载成功
   ✓ 成功加载本地 Whisper 转录服务
     - 模型大小: tiny
     - 转录方法: local
   ============================================================
   ============================================================
   InterReview 应用启动完成
   ============================================================
   ```
3. 上传视频并转录，应该看到本地转录的日志

## 测试结果

已创建测试脚本 `backend/test_startup.py` 并验证：
- ✓ 转录服务初始化成功
- ✓ 应用启动事件正确注册
- ✓ Whisper 模型正确加载（tiny 模型）

## 相关文件

- `backend/app/core/transcription.py` - 新建，全局转录服务
- `backend/app/core/__init__.py` - 新建
- `backend/app/main.py` - 修改，添加 startup 事件
- `backend/app/api/v1/interviews.py` - 修改，使用全局转录服务
- `backend/test_startup.py` - 新建，测试脚本
