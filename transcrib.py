# audio_transcriber.py

import requests
import os
import time
import threading
import sys
from dotenv import load_dotenv
from pydub.utils import mediainfo  # 推荐更通用方式
load_dotenv()

import logging
logger = logging.getLogger(__name__)


class AudioTranscriber:
    def __init__(self, model: str = "FunAudioLLM/SenseVoiceSmall", speed_ratio: float = 1.6):
        self.url = "https://api.siliconflow.cn/v1/audio/transcriptions"
        self.headers = {
            "Authorization": f"Bearer {os.getenv('SILICON')}"
        }
        self.model = model
        self.speed_ratio = speed_ratio
        self._stop_monitor = False
        self._monitor_thread = None

    def _get_audio_duration_minutes(self, audio_path: str) -> float:
        """
        获取音频文件时长（分钟）
        
        Args:
            audio_path: 音频文件路径
            
        Returns:
            float: 音频时长（分钟），获取失败时返回默认值
        """
        try:
            # 检查文件是否存在
            if not os.path.isfile(audio_path):
                logger.warning(f"音频文件不存在: {audio_path}")
                return 1.0
            
            # 方法1: 使用 pydub (推荐)
            try:
                from pydub import AudioSegment
                audio = AudioSegment.from_file(audio_path)
                duration_ms = len(audio)  # 毫秒
                duration_minutes = duration_ms / (1000 * 60)
                logger.info(f"音频时长 (pydub): {duration_minutes:.2f} 分钟")
                return duration_minutes
            except ImportError:
                logger.debug("pydub 未安装，尝试其他方法")
            except Exception as e:
                logger.debug(f"pydub 获取时长失败: {e}")
            
            # 方法2: 使用 pydub.utils.mediainfo
            try:
                from pydub.utils import mediainfo
                info = mediainfo(audio_path)
                
                # mediainfo 可能返回不同的键名
                duration_sec = None
                if isinstance(info, dict):
                    # 尝试不同的可能键名
                    for key in ['duration', 'Duration', 'length', 'Length']:
                        if key in info and info[key]:
                            try:
                                duration_sec = float(info[key])
                                break
                            except (ValueError, TypeError):
                                continue
                
                if duration_sec is not None and duration_sec > 0:
                    duration_minutes = duration_sec / 60.0
                    logger.info(f"音频时长 (mediainfo): {duration_minutes:.2f} 分钟")
                    return duration_minutes
                else:
                    logger.warning(f"mediainfo 返回的时长数据无效: {info}")
            except ImportError:
                logger.debug("pydub.mediainfo 不可用")
            except Exception as e:
                logger.debug(f"mediainfo 获取时长失败: {e}")
            
            # 方法3: 使用 mutagen (适用于常见音频格式)
            try:
                from mutagen import File
                audio_file = File(audio_path)
                if audio_file and hasattr(audio_file, 'info') and hasattr(audio_file.info, 'length'):
                    duration_sec = audio_file.info.length
                    if duration_sec and duration_sec > 0:
                        duration_minutes = duration_sec / 60.0
                        logger.info(f"音频时长 (mutagen): {duration_minutes:.2f} 分钟")
                        return duration_minutes
            except ImportError:
                logger.debug("mutagen 未安装")
            except Exception as e:
                logger.debug(f"mutagen 获取时长失败: {e}")
            
            # 方法4: 使用 ffprobe (如果系统安装了 ffmpeg)
            try:
                import subprocess
                import json
                
                cmd = [
                    'ffprobe', '-v', 'quiet', '-print_format', 'json',
                    '-show_format', audio_path
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    data = json.loads(result.stdout)
                    if 'format' in data and 'duration' in data['format']:
                        duration_sec = float(data['format']['duration'])
                        duration_minutes = duration_sec / 60.0
                        logger.info(f"音频时长 (ffprobe): {duration_minutes:.2f} 分钟")
                        return duration_minutes
            except (subprocess.TimeoutExpired, subprocess.SubprocessError, FileNotFoundError, json.JSONDecodeError) as e:
                logger.debug(f"ffprobe 获取时长失败: {e}")
            except Exception as e:
                logger.debug(f"ffprobe 意外错误: {e}")
            
            # 方法5: 根据文件大小估算 (最后的备用方案)
            try:
                file_size = os.path.getsize(audio_path)
                # 粗略估算：假设平均比特率为 128kbps
                estimated_duration_sec = file_size / (128 * 1024 / 8)  # 字节转换为秒
                estimated_duration_min = estimated_duration_sec / 60.0
                
                # 限制估算范围（避免过于离谱的数值）
                if 0.1 <= estimated_duration_min <= 1440:  # 6秒到24小时之间
                    logger.warning(f"使用文件大小估算音频时长: {estimated_duration_min:.2f} 分钟 (仅供参考)")
                    return estimated_duration_min
            except Exception as e:
                logger.debug(f"文件大小估算失败: {e}")
            
            # 所有方法都失败，返回默认值
            logger.error(f"无法获取音频文件时长: {audio_path}，使用默认值 2.0 分钟")
            return 2.0  # 提高默认值，避免预估时间过短
            
        except Exception as e:
            logger.error(f"获取音频时长时发生意外错误: {e}")
            return 2.0

    def _start_progress_monitor(self, total_estimated: float):
        start_time = time.time()
        while not self._stop_monitor:
            elapsed = time.time() - start_time
            remaining = max(0.0, total_estimated - elapsed)
            progress_msg = f"\r⏱️ 已耗时: {elapsed:.1f}s | 预计剩余: {remaining:.1f}s | 总估计: {total_estimated:.1f}s"
            
            # 使用 sys.stdout 来确保实时显示
            sys.stdout.write(progress_msg)
            sys.stdout.flush()
            
            time.sleep(0.5)

    def transcribe(self, audio_path: str) -> str:
        if not os.path.isfile(audio_path):
            raise FileNotFoundError(f"File not found: {audio_path}")

        duration_min = self._get_audio_duration_minutes(audio_path) # 14min 22
        # estimated_total = duration_min * 60 / self.speed_ratio  # 修正计算：音频时长(秒) / 速度比例
        estimated_total = duration_min * self.speed_ratio  
        print(f"🎵 音频时长: {duration_min:.1f}分钟")
        print(f"⚡ 预计处理时间: {estimated_total:.1f}秒")

        # 启动进度监控线程
        self._stop_monitor = False
        self._monitor_thread = threading.Thread(target=self._start_progress_monitor, args=(estimated_total,))
        self._monitor_thread.daemon = True  # 设置为守护线程
        self._monitor_thread.start()

        try:
            with open(audio_path, "rb") as f:
                files = {
                    "file": (os.path.basename(audio_path), f, "audio/mpeg")
                }
                data = {
                    "model": self.model
                }

                start = time.time()
                response = requests.post(self.url, headers=self.headers, data=data, files=files)
                end = time.time()

        except Exception as e:
            # 确保在异常情况下也停止监控
            self._stop_monitor = True
            if self._monitor_thread and self._monitor_thread.is_alive():
                self._monitor_thread.join(timeout=1.0)
            raise e
        finally:
            # 停止进度监控
            self._stop_monitor = True
            if self._monitor_thread and self._monitor_thread.is_alive():
                self._monitor_thread.join(timeout=1.0)

        actual_time = end - start
        print(f"\n✅ 实际耗时: {actual_time:.2f}s")
        
        # 显示速度对比
        if duration_min > 0:
            speed_factor = (duration_min * 60) / actual_time
            print(f"🚀 处理速度: {speed_factor:.1f}x 实时速度")

        if response.status_code == 200:
            return response.text
        else:
            raise RuntimeError(f"Transcription failed: {response.status_code}, {response.text}")


# # 使用示例
if __name__ == "__main__":
    speed_ration = 1.6
    transcriber = AudioTranscriber(speed_ratio=speed_ration) # speed_ratio = 转录1min 需要的时间 (估计是1.6s)

    druation = transcriber._get_audio_duration_minutes("/Users/xiangrui/code/InterReview/data/1.mp3")

    estimate_time = speed_ration * druation


    
    print(druation)
    t1 = time.time()
    result = transcriber.transcribe("/Users/xiangrui/code/InterReview/data/1.mp3")
    t2 = time.time()

    # print(f"\n📊 总耗时：{t2 - t1:.2f}秒")
    # print("🎧 语音识别结果：")
    # print(result)