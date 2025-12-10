# InterReview 后端 - 设置和测试指南

## 快速开始

### 1. 选择虚拟环境

你有两个虚拟环境：
- `.venv` (旧的，可能有问题)
- `.venv_new` (新的，刚创建的)

**使用旧的虚拟环境**:
```bash
source .venv/bin/activate
```

**使用新的虚拟环境**:
```bash
source .venv_new/bin/activate
```

### 2. 安装依赖

```bash
# 确保你在 backend/ 目录
pip install -r requirements.txt
```

**如果安装失败**，可以逐个安装：
```bash
pip install fastapi uvicorn python-dotenv openai python-multipart pydantic celery redis pytest pytest-asyncio python-jose passlib requests aiofiles
```

### 3. 配置环境变量

确保 `backend/.env` 文件包含：

```bash
# 来自阿里云 DashScope
DASHSCOPE_API_KEY=sk-edcb432be46347a8881cdc1d76f16363

# 来自 SiliconFlow
SILICONFLOW_API_KEY=sk-sfifiqelobuqndcehwoaqwdiwvpakfbducqlmvoepwczoejp

# Redis (稍后使用)
REDIS_URL=redis://localhost:6379

# Secret Key (任意随机字符串)
SECRET_KEY=your-secret-key-change-this-in-production
```

### 4. 启动后端

```bash
# 方式 1: 直接运行
python -m app

# 方式 2: 使用 uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 方式 3: 后台运行
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
```

如果启动成功，你会看到：
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [...] using StatReload
INFO:     Started server process [...]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 5. 访问 API 文档

打开浏览器：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- 健康检查: http://localhost:8000/healthz

## 手动测试 API

### 测试 1: 注册新用户

```bash
curl -X POST http://localhost:8000/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "测试用户",
    "email": "test@example.com"
  }'
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "userId": "some-uuid-here",
    "username": "测试用户",
    "email": "test@example.com",
    "createdAt": "2025-12-11T...",
    "version": 1
  }
}
```

**保存 userId**，后续测试需要用到。

### 测试 2: 查询用户信息

```bash
curl http://localhost:8000/users/{user_id}
```

### 测试 3: 创建面试

```bash
curl -X POST "http://localhost:8000/interviews/?user_id={user_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "小红书前端面试",
    "company": "小红书科技有限公司",
    "position": "高级前端工程师",
    "date": "2025-12-15T14:00:00"
  }'
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "id": "interview-uuid-here",
    "title": "小红书前端面试",
    "company": "小红书科技有限公司",
    "position": "高级前端工程师",
    "status": "待上传",
    "date": "2025-12-15T14:00:00",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**保存 interview_id**。

### 测试 4: 查询用户所有面试

```bash
curl "http://localhost:8000/users/{user_id}/interviews"
```

### 测试 5: 上传文件

准备测试文件（audio.mp3 或 test.txt）：

```bash
# 音频文件
curl -X POST "http://localhost:8000/upload/interview/{user_id}/{interview_id}" \
  -F "file=@/path/to/your/interview.mp3"

# 文本文件
curl -X POST "http://localhost:8000/upload/interview/{user_id}/{interview_id}" \
  -F "file=@/path/to/interview.txt"
```

**预期响应**:
```json
{
  "success": true,
  "message": "文件上传成功",
  "file_path": "uploads/{user_id}/{file_id}.mp3",
  "file_name": "interview.mp3",
  "file_size": 1234567
}
```

## Python 测试脚本

创建测试文件 `test_backend.py`:

```python
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_health():
    """测试健康检查"""
    print("\n=== 测试健康检查 ===")
    resp = requests.get(f"{BASE_URL}/healthz")
    print(f"状态码: {resp.status_code}")
    print(f"响应: {resp.json()}")
    return resp.status_code == 200

def test_register_user():
    """测试注册新用户"""
    print("\n=== 测试注册新用户 ===")
    data = {
        "username": "测试用户Python",
        "email": "python-test@example.com"
    }
    resp = requests.post(f"{BASE_URL}/users/register", json=data)
    print(f"状态码: {resp.status_code}")
    print(f"响应: {json.dumps(resp.json(), ensure_ascii=False, indent=2)}")

    if resp.status_code == 200:
        result = resp.json()
        if result.get("success"):
            return result["data"]["userId"]
    return None

def test_create_interview(user_id):
    """测试创建面试"""
    print("\n=== 测试创建面试 ===")
    data = {
        "title": "字节跳动面试(Python测试)",
        "company": "字节跳动",
        "position": "高级前端工程师",
        "date": "2025-12-20T10:00:00"
    }
    resp = requests.post(f"{BASE_URL}/interviews/?user_id={user_id}", json=data)
    print(f"状态码: {resp.status_code}")
    print(f"响应: {json.dumps(resp.json(), ensure_ascii=False, indent=2)}")

    if resp.status_code == 200:
        result = resp.json()
        if result.get("success"):
            return result["data"]["id"]
    return None

def test_upload_file(user_id, interview_id, file_path):
    """测试文件上传"""
    print(f"\n=== 测试上传文件: {file_path} ===")

    with open(file_path, 'rb') as f:
        files = {'file': f}
        resp = requests.post(
            f"{BASE_URL}/upload/interview/{user_id}/{interview_id}",
            files=files
        )

    print(f"状态码: {resp.status_code}")
    print(f"响应: {json.dumps(resp.json(), ensure_ascii=False, indent=2)}")
    return resp.status_code == 200

def main():
    print("开始测试 InterReview 后端 API...")

    # 1. 测试健康检查
    if not test_health():
        print("❌ 健康检查失败，后端可能未启动")
        sys.exit(1)

    # 2. 注册用户
    user_id = test_register_user()
    if not user_id:
        print("❌ 注册用户失败")
        sys.exit(1)

    print(f"\n✅ 用户注册成功! user_id: {user_id}")

    # 3. 创建面试
    interview_id = test_create_interview(user_id)
    if not interview_id:
        print("❌ 创建面试失败")
        sys.exit(1)

    print(f"\n✅ 面试创建成功! interview_id: {interview_id}")

    # 4. 测试文件上传 (可选)
    # 创建测试文件
    test_file = "/tmp/test_interview.txt"
    with open(test_file, 'w') as f:
        f.write("这是一个模拟的面试内容测试文件。\n")

    if test_upload_file(user_id, interview_id, test_file):
        print(f"\n✅ 文件上传成功!")
    else:
        print(f"\n⚠️ 文件上传失败（但这不是致命错误）")

    print(f"\n" + "="*60)
    print("所有测试完成!")
    print(f"user_id: {user_id}")
    print(f"interview_id: {interview_id}")
    print(f"API文档: http://localhost:8000/docs")
    print("="*60)

if __name__ == "__main__":
    main()
```

运行测试：
```bash
python test_backend.py
```

## 验证数据存储

后端会将数据保存在 `backend/data/` 目录：

```bash
# 查看数据结构
tree data/

# 应该能看到类似：
# data/
# └── {user_id}/
#     ├── user.json
#     └── interviews.json

# 查看用户数据
cat data/{user_id}/user.json

# 查看面试列表
cat data/{user_id}/interviews.json
```

## 查看上传的文件

上传的文件保存在 `backend/uploads/`：

```bash
ls -lh uploads/{user_id}/
```

## 调试问题

### 问题 1: 端口被占用

```bash
# 查看占用端口的进程
lsof -i :8000

# 停止后端
kill -9 <PID>

# 换个端口启动
uvicorn app.main:app --reload --port 8001
```

### 问题 2: 依赖安装失败

```bash
# 升级 pip
python -m pip install --upgrade pip

# 安装核心依赖（最小集）
pip install fastapi uvicorn python-dotenv pydantic python-multipart requests

# 测试启动
uvicorn app.main:app --reload
```

### 问题 3: 环境变量问题

```bash
# 检查环境变量
cat .env

# 测试环境变量读取
python -c "from app.config import settings; print(settings.DASHSCOPE_API_KEY)"
```

### 问题 4: API 调用失败

```bash
# 检查后端日志
# 如果后台启动：tail -f backend.log

# 直接启动查看日志
uvicorn app.main:app --reload --log-level debug
```

## 下一步：集成测试

完成基础测试后，可以使用以下脚本测试完整流程：

```python
# test_full_flow.py
"""
完整流程测试：上传文件 -> 语音转录 -> AI分析
"""
import asyncio
from pathlib import Path
from app.services.storage_service import StorageService
from app.services.transcription_service import TranscriptionService
from app.services.llm_service import LLMService
import os

async def test_full_flow():
    """测试完整流程"""
    # 1. 准备测试数据
    user_id = "test_user_001"
    interview_id = "test_interview001"

    # 2. 初始化服务
    storage = StorageService()

    silicon_key = os.getenv("SILICONFLOW_API_KEY")
    if not silicon_key:
        print("错误: 没有 SiliconFlow API Key")
        return

    dashscope_key = os.getenv("DASHSCOPE_API_KEY")
    if not dashscope_key:
        print("错误: 没有 DashScope API Key")
        return

    # 3. 获取上传的文件
    interview = storage.get_interviews(user_id)
    if not interview:
        print("没有找到面试")
        return

    # 4. 语音转文字
    print("开始语音转文字...")
    transcribor = TranscriptionService(silicon_key)

    # 假设文件已上传
    file_path = Path(f"uploads/{user_id}/test.mp3")
    if not file_path.exists():
        print("测试文件不存在，跳过转录")
        return

    text = await transcribor.transcribe_audio(file_path)
    print(f"转录完成: {text[:100]}...")

    # 5. AI 分析
    print("开始AI分析...")
    llm = LLMService(dashscope_key)

    analysis = await llm.analyze_interview(
        text,
        {"company": "测试公司", "position": "测试岗位"}
    )

    print("分析完成:")
    print(f"综合评分: {analysis['score']}/100")
    print(f"通过概率: {analysis['passRate']}%")
    print(f"问答轮次: {analysis['rounds']}")

    # 6. 保存分析结果
    storage.save_analysis(user_id, interview_id, analysis)
    print("分析结果已保存")

if __name__ == "__main__":
    asyncio.run(test_full_flow())
```

## 总结

### 快速操作清单

```bash
cd backend

# 1. 激活虚拟环境
source .venv/bin/activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置 API Keys (检查 .env 文件)
cat .env

# 4. 启动后端
python -m app

# 5. 测试（新开终端）
# 测试健康检查
curl http://localhost:8000/healthz

# 注册用户
python test_backend.py

# 6. 查看 API 文档
open http://localhost:8000/docs
```

### 预期结果

如果一切正常，你应该能够：
- ✅ 访问 http://localhost:8000/healthz
- ✅ 注册用户并返回 user_id
- ✅ 创建面试并返回 interview_id
- ✅ 上传文件成功
- ✅ 查看数据文件在 `data/` 目录
- ✅ 查看上传文件在 `uploads/` 目录

### 遇到问题？

查看:
- `backend.log` - 后端日志
- API 文档: http://localhost:8000/docs
- 直接测试各个端点

## 准备好后...

如果基础测试通过，下一步：
- 测试语音转录服务
- 测试 LLM 面试分析
- 创建完整的异步分析流程
- 前端集成

需要我帮你创建 Redis 或 Celery 配置吗？
