#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
视频转录脚本
将下载的 MP4 视频转录为文本文件
支持使用本地 Whisper 模型或 API
"""

import os
import sys
import argparse
from pathlib import Path
import subprocess

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

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


class VideoTranscriber:
    """视频转录器"""
    
    def __init__(self, method='local', model_size='base', api_key=None, base_url=None):
        """
        初始化转录器
        
        Args:
            method: 转录方法 ('local', 'faster', 'api')
            model_size: 模型大小 ('tiny', 'base', 'small', 'medium', 'large')
            api_key: API密钥（用于API方法）
            base_url: API基础URL（用于API方法）
        """
        self.method = method
        self.model_size = model_size
        self.api_key = api_key
        self.base_url = base_url
        self.model = None
        self.client = None
        
        if method == 'api':
            if not OPENAI_AVAILABLE:
                raise ImportError("需要安装 openai 库: pip install openai")
            if not api_key:
                raise ValueError("使用API方法需要提供 api_key")
            self.client = OpenAI(api_key=api_key, base_url=base_url)
        elif method == 'faster':
            if not FASTER_WHISPER_AVAILABLE:
                raise ImportError("需要安装 faster-whisper 库: pip install faster-whisper")
            print(f"正在加载 faster-whisper 模型: {model_size}...")
            self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
        elif method == 'local':
            if not WHISPER_LOCAL_AVAILABLE:
                raise ImportError("需要安装 openai-whisper 库: pip install openai-whisper")
            print(f"正在加载 Whisper 模型: {model_size}...")
            self.model = whisper.load_model(model_size)
    
    def check_audio_stream(self, video_path):
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
        except:
            return None  # 无法确定
    
    def extract_audio(self, video_path, audio_path):
        """从视频中提取音频"""
        print(f"正在从视频提取音频: {video_path}")
        
        # 先检查是否有音频流
        has_audio = self.check_audio_stream(video_path)
        if has_audio is False:
            print("✗ 该视频文件没有音频流，无法转录")
            print("\n解决方案：")
            print("  1. 重新下载视频（新版本下载器会自动合并音频和视频）")
            print("     python downloader.py <视频URL>")
            print("  2. 或者使用B站的字幕文件（如果有的话）")
            return False
        
        try:
            # 使用 ffmpeg 提取音频
            # 注意：使用 str() 确保路径是字符串，避免编码问题
            # 移除 -vn 参数，让 ffmpeg 自动选择音频流
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
            
            # 运行命令并捕获输出
            result = subprocess.run(
                cmd, 
                check=True, 
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore'
            )
            print(f"✓ 音频已提取: {audio_path}")
            return True
        except subprocess.CalledProcessError as e:
            # 显示完整的错误信息
            if isinstance(e.stderr, bytes):
                error_output = e.stderr.decode('utf-8', errors='ignore')
            elif isinstance(e.stderr, str):
                error_output = e.stderr
            else:
                error_output = str(e)
            
            stdout_output = ""
            if e.stdout:
                if isinstance(e.stdout, bytes):
                    stdout_output = e.stdout.decode('utf-8', errors='ignore')
                else:
                    stdout_output = str(e.stdout)
            
            print(f"✗ 音频提取失败:")
            print(f"  返回码: {e.returncode}")
            if stdout_output:
                print(f"  标准输出: {stdout_output}")
            if error_output:
                print(f"  错误输出: {error_output}")
            return False
        except FileNotFoundError:
            print("✗ 未找到 ffmpeg，请先安装:")
            print("  macOS: brew install ffmpeg")
            print("  Ubuntu: sudo apt install ffmpeg")
            print("  Windows: https://ffmpeg.org/download.html")
            return False
        except Exception as e:
            print(f"✗ 音频提取失败: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def transcribe_with_api(self, audio_path):
        """使用 API 转录"""
        print("正在使用 API 进行转录...")
        try:
            with open(audio_path, 'rb') as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text",
                    language="zh"  # 中文
                )
            return str(transcript).strip()
        except Exception as e:
            print(f"✗ API 转录失败: {e}")
            return None
    
    def transcribe_with_local(self, audio_path):
        """使用本地 Whisper 模型转录"""
        print("正在使用本地模型进行转录...")
        try:
            result = self.model.transcribe(
                audio_path,
                language="zh",  # 中文
                task="transcribe"
            )
            return result["text"].strip()
        except Exception as e:
            print(f"✗ 本地转录失败: {e}")
            return None
    
    def transcribe_with_faster(self, audio_path):
        """使用 faster-whisper 转录"""
        print("正在使用 faster-whisper 进行转录...")
        try:
            segments, info = self.model.transcribe(
                audio_path,
                language="zh",  # 中文
                beam_size=5
            )
            
            # 合并所有片段
            text_parts = []
            for segment in segments:
                text_parts.append(segment.text)
            
            return " ".join(text_parts).strip()
        except Exception as e:
            print(f"✗ faster-whisper 转录失败: {e}")
            return None
    
    def transcribe_video(self, video_path, output_path=None, keep_audio=False):
        """转录视频"""
        video_path = Path(video_path)
        if not video_path.exists():
            print(f"✗ 视频文件不存在: {video_path}")
            return False
        
        # 准备临时音频文件路径（使用绝对路径避免编码问题）
        audio_path = video_path.parent / f"{video_path.stem}_temp_audio.wav"
        
        # 提取音频
        if not self.extract_audio(str(video_path), str(audio_path)):
            return False
        
        try:
            # 根据方法选择转录函数
            if self.method == 'api':
                text = self.transcribe_with_api(str(audio_path))
            elif self.method == 'faster':
                text = self.transcribe_with_faster(str(audio_path))
            else:  # local
                text = self.transcribe_with_local(str(audio_path))
            
            if not text:
                return False
            
            # 保存转录结果
            if output_path is None:
                output_path = video_path.with_suffix('.txt')
            else:
                output_path = Path(output_path)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(text)
            
            print(f"✓ 转录完成: {output_path}")
            print(f"  文本长度: {len(text)} 字符")
            
            return True
            
        finally:
            # 清理临时音频文件
            if not keep_audio and audio_path.exists():
                audio_path.unlink()
                print(f"已删除临时音频文件: {audio_path}")


def main():
    parser = argparse.ArgumentParser(
        description='视频转录工具 - 将 MP4 视频转录为文本',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 使用本地 Whisper 模型（默认）
  python transcribe.py video.mp4
  
  # 使用 faster-whisper（更快）
  python transcribe.py video.mp4 --method faster --model small
  
  # 使用 API（需要 API key）
  python transcribe.py video.mp4 --method api --api-key YOUR_KEY
  
  # 指定输出文件
  python transcribe.py video.mp4 -o output.txt
  
  # 保留临时音频文件
  python transcribe.py video.mp4 --keep-audio
        """
    )
    
    parser.add_argument('video', help='视频文件路径')
    parser.add_argument('-o', '--output', help='输出文本文件路径（默认：视频文件名.txt）')
    parser.add_argument('-m', '--method', 
                       choices=['local', 'faster', 'api'],
                       default='local',
                       help='转录方法 (默认: local)')
    parser.add_argument('--model', 
                       choices=['tiny', 'base', 'small', 'medium', 'large'],
                       default='base',
                       help='模型大小 (默认: base)')
    parser.add_argument('--api-key', help='API密钥（用于API方法）')
    parser.add_argument('--base-url', help='API基础URL（用于API方法，可选）')
    parser.add_argument('--keep-audio', action='store_true', help='保留临时音频文件')
    
    args = parser.parse_args()
    
    # 检查视频文件
    if not os.path.exists(args.video):
        print(f"✗ 视频文件不存在: {args.video}")
        sys.exit(1)
    
    # 创建转录器
    try:
        transcriber = VideoTranscriber(
            method=args.method,
            model_size=args.model,
            api_key=args.api_key,
            base_url=args.base_url
        )
    except Exception as e:
        print(f"✗ 初始化转录器失败: {e}")
        sys.exit(1)
    
    # 开始转录
    success = transcriber.transcribe_video(
        video_path=args.video,
        output_path=args.output,
        keep_audio=args.keep_audio
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

# python subscribe.py /Users/xiangrui/code/subscriber/非科班转码如何拿下大厂offer-前期准备篇_非科班转码如何拿下大厂offer-前期准备篇.mp4
# python transcribe.py /Users/xiangrui/code/subscriber/非科班转码如何拿下大厂offer-前期准备篇_非科班转码如何拿下大厂offer-前期准备篇.mp4
