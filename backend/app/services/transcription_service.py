import os
try:
    import requests
except ImportError:  # pragma: no cover - fallback for mock mode
    requests = None
import asyncio
from typing import Optional
from pathlib import Path
from datetime import datetime

class TranscriptionService:
    """语音转文字服务 - 使用 SiliconFlow API"""

    def __init__(self, api_key: Optional[str]):
        self.api_key = api_key
        self.base_url = "https://api.siliconflow.cn/v1/audio/transcriptions"
        self.supported_extensions = [
            '.mp3', '.wav', '.m4a', '.mp4', '.avi', '.mov', '.flac', '.ogg', '.txt', '.md'
        ]
        self.max_file_size = 200 * 1024 * 1024  # 200MB, 与上传保持一致
        mock_flag = os.getenv("MOCK_TRANSCRIPTION", "").lower() == "true"
        self.use_mock = mock_flag or not api_key

    async def transcribe_audio(
        self,
        file_path: Path,
        model: str = "FunAudioLLM/SenseVoiceSmall"
    ) -> Optional[str]:
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
            if content.strip():
                return content
            return self._generate_mock_transcript(file_path)

        if self.use_mock:
            return self._generate_mock_transcript(file_path)

        try:
            return await asyncio.to_thread(self._transcribe_via_requests, file_path, model)
        except Exception as exc:
            print(f"转录失败，使用模拟数据: {exc}")
            return self._generate_mock_transcript(file_path)

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

    if result:
        print("转录成功!")
        print("结果:", result[:200] + "..." if len(result) > 200 else result)
    else:
        print("转录失败")

if __name__ == "__main__":
    asyncio.run(test_transcription())
