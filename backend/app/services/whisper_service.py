"""
Whisper 本地转录服务
基于 whisper_transcript.py 的完整实现
支持本地 Whisper 模型进行音频/视频转录
"""
import os
import subprocess
import tempfile
import logging
import asyncio
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime

try:
    import whisper
    WHISPER_LOCAL_AVAILABLE = True
except ImportError:
    WHISPER_LOCAL_AVAILABLE = False

try:
    from faster_whisper import WhisperModel
    FASTER_WHISPER_AVAILABLE = True
except ImportError:
    FASTER_WHISPER_AVAILABLE = False

from .transcription_service import (
    ChunkTranscription,
    TranscriptionResult,
    TranscriptionSummary,
    TranscriptionProgress,
    ProgressCallback,
    ChunkStatus
)

logger = logging.getLogger(__name__)


class WhisperTranscriptionService:
    """
    本地 Whisper 转录服务
    使用本地 Whisper 模型进行转录，不依赖在线 API
    """

    def __init__(self, model_size: str = "base", method: str = "local"):
        """
        初始化 Whisper 转录服务

        Args:
            model_size: Whisper 模型大小 ('tiny', 'base', 'small', 'medium', 'large')
            method: 转录方法 ('local' 使用 openai-whisper, 'faster' 使用 faster-whisper)
        """
        self.model_size = model_size
        self.method = method
        self.model = None

        # 检查依赖
        if method == "local":
            if not WHISPER_LOCAL_AVAILABLE:
                raise ImportError(
                    "本地 Whisper 不可用，请安装: pip install openai-whisper"
                )
            logger.info("正在加载 Whisper 模型: %s...", model_size)
            self.model = whisper.load_model(model_size)
            logger.info("Whisper 模型加载成功")

        elif method == "faster":
            if not FASTER_WHISPER_AVAILABLE:
                raise ImportError(
                    "faster-whisper 不可用，请安装: pip install faster-whisper"
                )
            logger.info("正在加载 faster-whisper 模型: %s...", model_size)
            self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
            logger.info("faster-whisper 模型加载成功")

        else:
            raise ValueError(f"不支持的转录方法: {method}")

    def check_audio_stream(self, video_path: Path) -> Optional[bool]:
        """检查视频文件是否有音频流"""
        try:
            cmd = [
                'ffprobe',
                '-v', 'error',
                '-select_streams', 'a:0',
                '-show_entries', 'stream=codec_type,codec_name',
                '-of', 'json',
                str(video_path)
            ]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore'
            )
            if result.returncode == 0:
                import json
                data = json.loads(result.stdout)
                streams = data.get('streams', [])
                return len(streams) > 0
            return False
        except Exception as e:
            logger.warning("无法检查音频流: %s", e)
            return None  # 无法确定

    def extract_audio(self, video_path: Path, audio_path: Path) -> bool:
        """从视频中提取音频"""
        logger.info("正在从视频提取音频: %s", video_path.name)

        # 先检查是否有音频流
        has_audio = self.check_audio_stream(video_path)
        if has_audio is False:
            logger.error("该视频文件没有音频流，无法转录")
            return False

        try:
            # 使用 ffmpeg 提取音频
            cmd = [
                'ffmpeg',
                '-i', str(video_path),
                '-map', '0:a:0',  # 明确选择第一个音频流
                '-acodec', 'pcm_s16le',  # 使用 PCM 16位
                '-ar', '16000',  # 采样率 16kHz
                '-ac', '1',  # 单声道
                '-y',  # 覆盖输出文件
                str(audio_path)
            ]

            result = subprocess.run(
                cmd,
                check=True,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore'
            )
            logger.info("音频已提取: %s", audio_path.name)
            return True

        except subprocess.CalledProcessError as e:
            error_output = e.stderr if isinstance(e.stderr, str) else str(e)
            logger.error("音频提取失败: %s", error_output)
            return False

        except FileNotFoundError:
            logger.error("未找到 ffmpeg，请先安装: brew install ffmpeg (macOS) 或 sudo apt install ffmpeg (Ubuntu)")
            return False

        except Exception as e:
            logger.exception("音频提取失败: %s", e)
            return False

    def transcribe_with_local(self, audio_path: Path) -> Optional[str]:
        """使用本地 Whisper 模型转录"""
        logger.info("正在使用本地 Whisper 模型进行转录...")
        try:
            result = self.model.transcribe(
                str(audio_path),
                language="zh",  # 中文
                task="transcribe"
            )
            text = result["text"].strip()
            logger.info("本地转录完成，文本长度: %d 字符", len(text))
            return text
        except Exception as e:
            logger.exception("本地转录失败: %s", e)
            return None

    def transcribe_with_faster(self, audio_path: Path) -> Optional[str]:
        """使用 faster-whisper 转录"""
        logger.info("正在使用 faster-whisper 进行转录...")
        try:
            segments, info = self.model.transcribe(
                str(audio_path),
                language="zh",  # 中文
                beam_size=5
            )

            # 合并所有片段
            text_parts = []
            for segment in segments:
                text_parts.append(segment.text)

            text = " ".join(text_parts).strip()
            logger.info("faster-whisper 转录完成，文本长度: %d 字符", len(text))
            return text
        except Exception as e:
            logger.exception("faster-whisper 转录失败: %s", e)
            return None

    async def transcribe_audio(
        self,
        file_path: Path,
        model: Optional[str] = None,
        *,
        task_id: Optional[str] = None,
        progress_callback: Optional[ProgressCallback] = None
    ) -> TranscriptionResult:
        """
        转录音频/视频文件

        Args:
            file_path: 文件路径
            model: 模型名称（本地转录时忽略此参数）
            task_id: 任务ID
            progress_callback: 进度回调函数

        Returns:
            TranscriptionResult: 转录结果
        """
        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        current_task_id = task_id or f"whisper-{file_path.stem}"

        logger.info(
            "开始本地转录: file=%s, method=%s, model=%s",
            file_path.name,
            self.method,
            self.model_size
        )

        # 发送初始进度
        if progress_callback:
            await progress_callback(TranscriptionProgress(
                task_id=current_task_id,
                status="uploaded",
                total_chunks=1,
                completed_chunks=0,
                failed_chunks=0,
                progress=0.0,
                stage="init",
                message="准备开始本地转录"
            ))

        # 准备临时音频文件路径
        audio_path = None
        try:
            # 如果是视频文件，需要提取音频
            video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv']
            audio_extensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg']

            if file_path.suffix.lower() in video_extensions:
                # 创建临时音频文件
                audio_path = file_path.parent / f"{file_path.stem}_temp_audio.wav"

                # 发送提取音频进度
                if progress_callback:
                    await progress_callback(TranscriptionProgress(
                        task_id=current_task_id,
                        status="transcribing",
                        total_chunks=1,
                        completed_chunks=0,
                        failed_chunks=0,
                        progress=0.1,
                        stage="extracting_audio",
                        message="正在从视频提取音频"
                    ))

                # 在线程池中执行音频提取
                success = await asyncio.to_thread(
                    self.extract_audio,
                    file_path,
                    audio_path
                )

                if not success:
                    raise RuntimeError("音频提取失败")

                transcription_file = audio_path
            elif file_path.suffix.lower() in audio_extensions:
                # 直接使用音频文件
                transcription_file = file_path
            else:
                raise ValueError(f"不支持的文件格式: {file_path.suffix}")

            # 发送转录进度
            if progress_callback:
                await progress_callback(TranscriptionProgress(
                    task_id=current_task_id,
                    status="transcribing",
                    total_chunks=1,
                    completed_chunks=0,
                    failed_chunks=0,
                    progress=0.3,
                    stage="transcribing",
                    message="正在使用 Whisper 模型转录"
                ))

            # 在线程池中执行转录
            if self.method == "faster":
                text = await asyncio.to_thread(
                    self.transcribe_with_faster,
                    transcription_file
                )
            else:  # local
                text = await asyncio.to_thread(
                    self.transcribe_with_local,
                    transcription_file
                )

            if not text:
                raise RuntimeError("转录失败，未获得文本结果")

            # 构造转录结果
            chunk = ChunkTranscription(
                index=0,
                filename=file_path.name,
                status="ok",
                text=text,
                error=None,
                retry_count=0
            )

            summary = TranscriptionSummary(
                task_id=current_task_id,
                total_chunks=1,
                success_chunks=1,
                failed_chunks=0,
                failure_ratio=0.0,
                status="completed",
                error_message=None
            )

            result = TranscriptionResult(
                chunks=[chunk],
                merged_text=text,
                overall_status="completed",
                failed_chunks=[],
                summary=summary
            )

            # 发送完成进度
            if progress_callback:
                await progress_callback(TranscriptionProgress(
                    task_id=current_task_id,
                    status="completed",
                    total_chunks=1,
                    completed_chunks=1,
                    failed_chunks=0,
                    progress=1.0,
                    stage="completed",
                    message="本地转录完成"
                ))

            logger.info(
                "本地转录完成: file=%s, text_length=%d",
                file_path.name,
                len(text)
            )

            return result

        except Exception as e:
            logger.exception("本地转录失败: file=%s, error=%s", file_path.name, e)

            # 发送失败进度
            if progress_callback:
                await progress_callback(TranscriptionProgress(
                    task_id=current_task_id,
                    status="failed",
                    total_chunks=1,
                    completed_chunks=0,
                    failed_chunks=1,
                    progress=0.0,
                    stage="failed",
                    message="本地转录失败",
                    error_message=str(e)
                ))

            # 返回失败结果
            chunk = ChunkTranscription(
                index=0,
                filename=file_path.name,
                status="error",
                text="",
                error=str(e),
                retry_count=0
            )

            summary = TranscriptionSummary(
                task_id=current_task_id,
                total_chunks=1,
                success_chunks=0,
                failed_chunks=1,
                failure_ratio=1.0,
                status="failed",
                error_message=f"本地转录失败: {str(e)}"
            )

            result = TranscriptionResult(
                chunks=[chunk],
                merged_text="",
                overall_status="error",
                failed_chunks=[chunk],
                summary=summary
            )

            return result

        finally:
            # 清理临时音频文件
            if audio_path and audio_path.exists():
                try:
                    audio_path.unlink()
                    logger.info("已删除临时音频文件: %s", audio_path.name)
                except Exception as e:
                    logger.warning("删除临时音频文件失败: %s", e)

    async def transcribe_chunk_subset(
        self,
        file_path: Path,
        indices: List[int],
        model: Optional[str] = None
    ) -> Dict[int, ChunkTranscription]:
        """
        重试失败的分片（本地转录不支持分片，直接重新转录整个文件）

        Args:
            file_path: 文件路径
            indices: 分片索引列表
            model: 模型名称（忽略）

        Returns:
            Dict[int, ChunkTranscription]: 分片转录结果
        """
        logger.info("本地转录不支持分片重试，将重新转录整个文件")

        result = await self.transcribe_audio(file_path, model)

        # 返回第一个分片的结果
        if result.chunks:
            return {0: result.chunks[0]}
        else:
            return {}
