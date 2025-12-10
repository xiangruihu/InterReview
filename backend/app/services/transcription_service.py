import os
import requests
from typing import Optional
from pathlib import Path
import aiohttp
import asyncio

class TranscriptionService:
    """语音转文字服务 - 使用 SiliconFlow API"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.siliconflow.cn/v1/audio/transcriptions"

    async def transcribe_audio(
        self,
        file_path: Path,
        model: str = "FunAudioLLM/SenseVoiceSmall"
    ) -> Optional[str]:
        """
        转录音频/视频文件为文本

        Args:
            file_path: 音频文件路径
            model: 转录模型，默认使用 SenseVoiceSmall

        Returns:
            转录文本，失败返回 None
        """
        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        # 验证文件大小 (最大 10MB)
        max_size = 10 * 1024 * 1024
        if file_path.stat().st_size > max_size:
            raise ValueError(f"文件过大，最大支持 10MB")

        # 支持的文件格式
        supported_extensions = ['.mp3', '.wav', '.m4a', '.mp4', '.avi', '.mov', '.flac', '.ogg']
        if file_path.suffix.lower() not in supported_extensions:
            raise ValueError(f"不支持的文件格式: {file_path.suffix}")

        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }

        data = {
            "model": model
        }

        try:
            async with aiohttp.ClientSession() as session:
                with open(file_path, 'rb') as f:
                    form_data = aiohttp.FormData()
                    form_data.add_field('file', f, filename=file_path.name)
                    form_data.add_field('model', model)

                    async with session.post(
                        self.base_url,
                        headers=headers,
                        data=form_data
                    ) as response:

                        if response.status == 200:
                            result = await response.json()
                            return result.get('text', '').strip()
                        else:
                            error_text = await response.text()
                            print(f"转录失败: {response.status} - {error_text}")
                            return None

        except Exception as e:
            print(f"转录错误: {e}")
            return None

    async def transcribe_audio_sync(
        self,
        file_path: Path,
        model: str = "FunAudioLLM/SenseVoiceSmall"
    ) -> Optional[str]:
        """
        同步版本的转录方法（用于不支持 async 的场景）
        """
        return await self.transcribe_audio(file_path, model)

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
