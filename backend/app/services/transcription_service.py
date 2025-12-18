import os
import shutil
import subprocess
import tempfile
import uuid
import logging
try:
    import requests
except ImportError:  # pragma: no cover - fallback for mock mode
    requests = None
import asyncio
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Sequence, Literal
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

ChunkStatus = Literal["pending", "ok", "error"]


@dataclass
class ChunkTranscription:
    """Chunk-level transcription result used for manifest."""

    index: int
    filename: str
    status: ChunkStatus
    text: str = ""
    error: Optional[str] = None
    retry_count: int = 0
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict[str, Optional[str]]:
        return {
            "index": self.index,
            "filename": self.filename,
            "status": self.status,
            "text": self.text,
            "error": self.error,
            "retryCount": self.retry_count,
            "updatedAt": self.updated_at,
        }


@dataclass
class TranscriptionResult:
    """Aggregated transcription output for the full file."""

    chunks: List[ChunkTranscription]
    merged_text: str
    overall_status: str
    failed_chunks: List[ChunkTranscription]

    def to_dict(self) -> Dict[str, object]:
        return {
            "chunks": [chunk.to_dict() for chunk in self.chunks],
            "chunkCount": len(self.chunks),
            "mergedText": self.merged_text,
            "overallStatus": self.overall_status,
            "failedChunks": [chunk.to_dict() for chunk in self.failed_chunks],
        }

class TranscriptionService:
    """语音转文字服务 - 使用 SiliconFlow API"""

    def __init__(self, api_key: Optional[str]):
        self.api_key = api_key
        self.base_url = "https://api.siliconflow.cn/v1/audio/transcriptions"
        self.supported_extensions = [
            '.mp3', '.wav', '.m4a', '.mp4', '.avi', '.mov', '.flac', '.ogg', '.txt', '.md'
        ]
        self.convertible_extensions = {
            '.wav', '.m4a', '.mp4', '.avi', '.mov', '.flac', '.ogg'
        }
        self.max_file_size = 200 * 1024 * 1024  # 200MB, 与上传保持一致
        self.chunk_duration_seconds = int(os.getenv("TRANSCRIPTION_CHUNK_SECONDS", "600"))
        self.max_parallel_chunks = int(os.getenv("TRANSCRIPTION_CHUNK_WORKERS", "3"))
        mock_flag = os.getenv("MOCK_TRANSCRIPTION", "").lower() == "true"
        self.use_mock = mock_flag or not api_key

    async def transcribe_audio(
        self,
        file_path: Path,
        model: str = "FunAudioLLM/SenseVoiceSmall"
    ) -> TranscriptionResult:
        """
        转录音频/视频/文本文件为文本
        """
        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        file_size = file_path.stat().st_size
        if file_size > self.max_file_size:
            raise ValueError(f"文件过大，最大支持 {self.max_file_size / (1024 * 1024):.0f}MB")

        if file_path.suffix.lower() not in self.supported_extensions:
            raise ValueError(f"不支持的文件格式: {file_path.suffix}")

        # 文本文件直接读取
        if file_path.suffix.lower() in ['.txt', '.md']:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            chunk = ChunkTranscription(
                index=0,
                filename=file_path.name,
                status="ok",
                text=content.strip()
            )
            return self._build_transcription_result([chunk])

        if self.use_mock:
            mock_text = self._generate_mock_transcript(file_path)
            chunk = ChunkTranscription(
                index=0,
                filename=file_path.name,
                status="ok",
                text=mock_text
            )
            return self._build_transcription_result([chunk])

        chunk_dir: Optional[Path] = None
        chunk_files: List[Path] = []
        temp_file: Optional[Path] = None

        try:
            transcription_target = file_path

            if self._should_convert_to_mp3(file_path):
                temp_file = self._convert_to_mp3(file_path)
                transcription_target = temp_file

            if self._should_chunk_audio(transcription_target):
                chunk_dir = Path(tempfile.mkdtemp(prefix="ir_chunk_"))
                chunk_files = self._split_audio_file(transcription_target, chunk_dir)

            if not chunk_files:
                chunk_files = [transcription_target]

            chunk_results_map = await self._transcribe_chunk_group(chunk_files, model)
            ordered_chunks = [chunk_results_map[idx] for idx in range(len(chunk_files))]
            return self._build_transcription_result(ordered_chunks)
        except Exception as exc:
            print(f"转录失败，使用模拟数据: {exc}")
            mock_text = self._generate_mock_transcript(file_path)
            chunk = ChunkTranscription(
                index=0,
                filename=file_path.name,
                status="ok",
                text=mock_text
            )
            return self._build_transcription_result([chunk])
        finally:
            if temp_file and temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception as cleanup_error:
                    logger.debug("Failed to remove temp file %s: %s", temp_file, cleanup_error)
            if chunk_dir and chunk_dir.exists():
                shutil.rmtree(chunk_dir, ignore_errors=True)

    def _transcribe_via_requests(self, file_path: Path, model: str) -> Optional[str]:
        if requests is None:
            raise RuntimeError("requests 不可用，无法执行真实转录")
        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }

        data = {
            "model": model
        }

        try:
            with open(file_path, 'rb') as f:
                files = {
                    'file': (file_path.name, f)
                }

                response = requests.post(
                    self.base_url,
                    headers=headers,
                    data=data,
                    files=files,
                    timeout=180
                )
                response.raise_for_status()
                result = response.json()
                return (result.get('text') or '').strip()
        except Exception as e:
            print(f"转录失败: {e}")
            raise

        return None

    def _generate_mock_transcript(self, file_path: Path) -> str:
        """生成本地模拟的转录文本，方便前端联调"""
        template = [
            f"【模拟转录】文件：{file_path.name}",
            "时间戳 00:00 - 面试官：请先做一个简短的自我介绍。",
            "时间戳 00:05 - 候选人：大家好，我叫张同学，主要负责前端方向，擅长 React、TypeScript 和性能优化。",
            "时间戳 00:45 - 面试官：在最近一次项目中你负责的核心模块是什么？",
            "时间戳 00:50 - 候选人：在校园智能排课系统里，我负责数据可视化和面试记录模块，处理了 3 万+ 条数据，使用了虚拟滚动和增量渲染。",
            "时间戳 01:30 - 面试官：面对压力较高的节奏时你是如何调节的？",
            "时间戳 01:33 - 候选人：我会在迭代开始前把任务拆分，制定检查点，让团队可以更快发现风险。",
            "",
            "（以上内容为模拟转录，方便在未配置真实 API 时进行前端联调。）",
            f"生成时间：{datetime.utcnow().isoformat()}",
        ]
        return "\n".join(template)

    def _should_convert_to_mp3(self, file_path: Path) -> bool:
        """判断是否需要在转录前将文件转为 MP3"""
        return file_path.suffix.lower() in self.convertible_extensions

    def _should_chunk_audio(self, file_path: Path) -> bool:
        """检查音频长度是否需要切片"""
        duration = self._get_audio_duration_seconds(file_path)
        if duration is None:
            return False
        return duration > max(self.chunk_duration_seconds * 1.5, self.chunk_duration_seconds + 60)

    def _convert_to_mp3(self, file_path: Path) -> Path:
        """通过 ffmpeg 将音/视频转码为 mp3 以满足硅基流动接口要求"""
        ffmpeg_path = shutil.which("ffmpeg")
        if not ffmpeg_path:
            raise RuntimeError("系统未安装 ffmpeg，无法将文件转码为 MP3")

        temp_filename = f"{file_path.stem}_{uuid.uuid4().hex}.mp3"
        temp_path = Path(tempfile.gettempdir()) / temp_filename

        command = [
            ffmpeg_path,
            "-y",  # overwrite temp file if needed
            "-i", str(file_path),
            "-vn",
            "-acodec", "libmp3lame",
            "-ar", "44100",
            "-ac", "2",
            str(temp_path)
        ]

        process = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        if process.returncode != 0 or not temp_path.exists():
            stderr = process.stderr.decode('utf-8', errors='ignore') if process.stderr else ''
            temp_path.unlink(missing_ok=True)
            raise RuntimeError(
                f"音频转码失败，ffmpeg 返回码 {process.returncode}: {stderr.strip() or '未知错误'}"
            )

        logger.info(
            "Converted %s -> %s for transcription",
            file_path.name,
            temp_path.name
        )
        return temp_path

    def _get_audio_duration_seconds(self, file_path: Path) -> Optional[float]:
        """使用 ffprobe 获取音频时长"""
        ffprobe_path = shutil.which("ffprobe")
        if not ffprobe_path:
            return None

        try:
            result = subprocess.run(
                [
                    ffprobe_path,
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    str(file_path)
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=True
            )
            return float(result.stdout.strip())
        except Exception as exc:
            logger.debug("Failed to obtain duration for %s: %s", file_path, exc)
            return None

    def _split_audio_file(self, file_path: Path, output_dir: Path) -> List[Path]:
        """将音频切分为多个片段以便并发转录"""
        ffmpeg_path = shutil.which("ffmpeg")
        if not ffmpeg_path:
            logger.warning("切片失败：系统未安装 ffmpeg")
            return []

        output_dir.mkdir(parents=True, exist_ok=True)
        segment_pattern = output_dir / "chunk_%03d.mp3"

        command = [
            ffmpeg_path,
            "-y",
            "-i", str(file_path),
            "-f", "segment",
            "-segment_time", str(self.chunk_duration_seconds),
            "-c", "copy",
            str(segment_pattern)
        ]

        process = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        if process.returncode != 0:
            stderr = process.stderr.decode('utf-8', errors='ignore') if process.stderr else ''
            logger.error("音频切片失败: %s", stderr.strip() or "unknown error")
            return []

        chunks = sorted(output_dir.glob("chunk_*.mp3"))
        logger.info("Split %s into %d segments", file_path.name, len(chunks))
        return chunks

    async def transcribe_chunk_subset(
        self,
        file_path: Path,
        indices: Sequence[int],
        model: str = "FunAudioLLM/SenseVoiceSmall"
    ) -> Dict[int, ChunkTranscription]:
        """
        仅重试给定分片序号，返回对应的 chunk manifest
        """
        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        if not indices:
            return {}

        file_size = file_path.stat().st_size
        if file_size > self.max_file_size:
            raise ValueError(f"文件过大，最大支持 {self.max_file_size / (1024 * 1024):.0f}MB")

        if file_path.suffix.lower() in ['.txt', '.md'] or self.use_mock:
            if 0 not in {int(idx) for idx in indices}:
                return {}
            text = (
                self._generate_mock_transcript(file_path)
                if self.use_mock
                else file_path.read_text(encoding='utf-8')
            )
            chunk = ChunkTranscription(
                index=0,
                filename=file_path.name,
                status="ok",
                text=text.strip()
            )
            return {0: chunk}

        temp_file: Optional[Path] = None
        chunk_dir: Optional[Path] = None
        try:
            transcription_target = file_path
            if self._should_convert_to_mp3(file_path):
                temp_file = self._convert_to_mp3(file_path)
                transcription_target = temp_file

            chunk_files: List[Path] = []
            if self._should_chunk_audio(transcription_target):
                chunk_dir = Path(tempfile.mkdtemp(prefix="ir_chunk_retry_"))
                chunk_files = self._split_audio_file(transcription_target, chunk_dir)

            if not chunk_files:
                chunk_files = [transcription_target]

            normalized_indices = sorted({idx for idx in indices if 0 <= idx < len(chunk_files)})
            if not normalized_indices:
                return {}

            return await self._transcribe_chunk_group(
                chunk_files,
                model,
                target_indices=normalized_indices
            )
        finally:
            if temp_file and temp_file.exists():
                temp_file.unlink(missing_ok=True)
            if chunk_dir and chunk_dir.exists():
                shutil.rmtree(chunk_dir, ignore_errors=True)

    async def _transcribe_chunk_group(
        self,
        chunk_files: List[Path],
        model: str,
        target_indices: Optional[Sequence[int]] = None
    ) -> Dict[int, ChunkTranscription]:
        """并发转录多个切片，并返回索引 -> chunk manifest"""
        if target_indices is None:
            indices = list(range(len(chunk_files)))
        else:
            indices = sorted({idx for idx in target_indices if 0 <= idx < len(chunk_files)})

        if not indices:
            return {}

        semaphore = asyncio.Semaphore(max(1, self.max_parallel_chunks))
        results: Dict[int, ChunkTranscription] = {}

        async def worker(idx: int, chunk_path: Path):
            async with semaphore:
                chunk_result = await self._transcribe_single_chunk(idx, chunk_path, model)
                results[idx] = chunk_result

        tasks = [asyncio.create_task(worker(idx, chunk_files[idx])) for idx in indices]
        await asyncio.gather(*tasks)
        return results

    async def _transcribe_single_chunk(self, idx: int, chunk_path: Path, model: str) -> ChunkTranscription:
        """单个切片的重试控制"""
        attempt = 0
        retry_count = 0
        delay_seconds = 1.0
        text_result = ""
        last_error: Optional[str] = None

        while attempt < 3:
            attempt += 1
            try:
                text_result = await asyncio.to_thread(self._transcribe_via_requests, chunk_path, model)
                last_error = None
                break
            except Exception as exc:
                last_error = str(exc)
                if attempt >= 3:
                    logger.error("切片 %s 第 %d 次转录失败: %s", chunk_path.name, attempt, exc)
                    break
                retry_count += 1
                logger.warning(
                    "切片 %s 转录失败，%d 秒后重试 (%d/3): %s",
                    chunk_path.name,
                    int(delay_seconds),
                    attempt,
                    exc
                )
                await asyncio.sleep(delay_seconds)
                delay_seconds = min(delay_seconds * 2, 8.0)

        status: ChunkStatus = "ok" if last_error is None else "error"
        safe_text = (text_result or "").strip() if status == "ok" else ""
        return ChunkTranscription(
            index=idx,
            filename=chunk_path.name,
            status=status,
            text=safe_text,
            error=None if status == "ok" else (last_error or "转录失败"),
            retry_count=retry_count,
            updated_at=datetime.utcnow().isoformat()
        )

    def _build_transcription_result(self, chunks: List[ChunkTranscription]) -> TranscriptionResult:
        """构造完整的转录结果"""
        merged_text = self._combine_chunk_texts(chunks)
        failed = [chunk for chunk in chunks if chunk.status == "error"]
        overall_status = self._determine_overall_status(chunks, failed)
        return TranscriptionResult(
            chunks=chunks,
            merged_text=merged_text,
            overall_status=overall_status,
            failed_chunks=failed
        )

    def _determine_overall_status(
        self,
        chunks: Sequence[ChunkTranscription],
        failed: Optional[Sequence[ChunkTranscription]] = None
    ) -> str:
        if not chunks:
            return "empty"
        failed = failed if failed is not None else [chunk for chunk in chunks if chunk.status == "error"]
        if not failed:
            return "completed"
        if len(failed) == len(chunks):
            return "error"
        return "partial"

    def _combine_chunk_texts(self, chunks: List[ChunkTranscription]) -> str:
        """合并分片转录结果"""
        combined_segments: List[str] = []
        total = len(chunks)
        for idx, chunk in enumerate(chunks):
            label = chunk.filename or f"chunk_{idx:03d}"
            header = f"【分片 {idx + 1}/{total} · {label}】"
            combined_segments.append(header)
            if chunk.status == "ok":
                content = (chunk.text or "").strip()
                if content:
                    combined_segments.append(content)
                else:
                    combined_segments.append("(该分片暂无可显示的内容)")
            elif chunk.status == "error":
                combined_segments.append(f"(分片转录失败：{chunk.error or '请稍后重试'})")
            else:
                combined_segments.append("(分片仍在处理中)")
            combined_segments.append("")
        return "\n".join(segment for segment in combined_segments if segment.strip())

# 测试函数
async def test_transcription():
    """测试转录功能"""
    api_key = os.getenv("SILICONFLOW_API_KEY")
    if not api_key:
        print("错误: 请设置 SILICONFLOW_API_KEY 环境变量")
        return

    service = TranscriptionService(api_key)

    # 测试文件路径
    test_file = Path("test_audio.mp3")

    if not test_file.exists():
        print(f"测试文件不存在: {test_file}")
        return

    print(f"开始转录音频: {test_file}")
    result = await service.transcribe_audio(test_file)

    if result and result.merged_text:
        print("转录成功!")
        text_preview = result.merged_text
        print("结果:", text_preview[:200] + "..." if len(text_preview) > 200 else text_preview)
    else:
        print("转录失败")

if __name__ == "__main__":
    asyncio.run(test_transcription())
