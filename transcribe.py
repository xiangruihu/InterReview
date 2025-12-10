import requests
import os
from dotenv import load_dotenv

# 加载 .env 文件中的环境变量
load_dotenv()

# 1. 设置你的 API 密钥
# 推荐通过环境变量设置: export SILICONFLOW_API_KEY='你的密钥'
api_key = os.getenv("SILICONFLOW_API_KEY")
if not api_key:
    raise ValueError("请设置 SILICONFLOW_API_KEY 环境变量或在代码中直接提供密钥")

# 2. API 的 URL
url = "https://api.siliconflow.cn/v1/audio/transcriptions"

# 3. 设置请求头
headers = {
    "Authorization": f"Bearer {api_key}"
}

# 4. 指定要使用的模型
data = {
    "model": "FunAudioLLM/SenseVoiceSmall"
}

# 5. 指定你的音频文件路径 (请替换成你的真实文件路径)
audio_file_path = '/Users/xiangrui/code/InterReview/data/uploads/1.mp3'  # <--- 修改这里

# 检查文件是否存在
if not os.path.exists(audio_file_path):
    print(f"错误：找不到文件 '{audio_file_path}'")
    print("请创建一个名为 'example.wav' 的音频文件，或修改脚本中的 audio_file_path 变量为你的文件路径。")
else:
    try:
        # 6. 打开文件并发送请求
        with open(audio_file_path, 'rb') as f:
            files = {
                'file': (os.path.basename(audio_file_path), f)
            }
            
            print(f"正在上传文件 '{audio_file_path}' 进行转录...")
            response = requests.post(url, headers=headers, data=data, files=files)
            
            # 7. 处理响应
            response.raise_for_status()  # 如果请求失败 (例如 4xx 或 5xx 错误), 会抛出异常
            
            result = response.json()
            print("\n转录成功！结果如下：")
            print(result)

    except requests.exceptions.RequestException as e:
        print(f"\n请求失败: {e}")
    except Exception as e:
        print(f"\n处理过程中发生错误: {e}")
