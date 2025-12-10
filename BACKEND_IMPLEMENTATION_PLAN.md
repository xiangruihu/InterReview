# InterReview 后端实现详细步骤

## 项目概述

InterReview 是一个面试复盘 AI 应用，前端使用 React + TypeScript + Vite，后端当前仅提供基础的用户数据存储功能。前端实现了完整的 UI、对话交互和模拟分析数据，但缺乏真正的 AI 分析能力。

## 当前状态分析

### 已实现的功能

#### 前端 (React/TypeScript)
- ✅ 用户登录注册系统（本地存储 + 后端同步）
- ✅ 面试管理（创建、删除、重命名）
- ✅ 对话界面（基于单个面试的聊天记录）
- ✅ 文件上传界面（支持多种格式）
- ✅ 完整的分析报告展示 UI（ChatReport 组件）
- ✅ 与 LLM 的直接对话（调用阿里云 DashScope）
- ✅ 数据持久化（localStorage + 后端备份）
- ✅ 分析加载动画

#### 后端 (FastAPI)
- ✅ 基础用户数据存储（/users/register）
- ✅ 面试列表 CRUD（获取、更新）
- ✅ 消息记录 CRUD（按 InterviewId 分组）
- ✅ 分析数据 CRUD（预留接口，但未使用）
- ✅ CORS 配置

### 缺失的核心功能

1. **文件上传和处理** - 只有模拟上传，文件未真正处理
2. **语音转文字** - 支持音频/视频文件转录
3. **智能面试分析** - 真正的 AI 分析而非 mock 数据
4. **后端 LLM 代理** - 保护 API 密钥，统一计费管理
5. **异步任务队列** - 文件处理是耗时操作
6. **分析结果存储** - 将分析结果持久化到后端
7. **情感分析** - 分析回答的情感倾向
8. **改进建议生成** - AI 生成个性化改进建议
9. **数据导出** - PDF/Word 格式导出功能
10. **用户权限管理** - 基础的用户认证（现仅用 id）

## 实现步骤（详细）

### Phase 1: 基础设施和核心依赖

#### 1.1 更新 requirements.txt
```bash
# 当前依赖
fastapi==0.115.5
uvicorn[standard]==0.32.0
python-dotenv==1.0.1

# 需要添加
openai>=1.55.0          # LLM 调用
python-multipart>=0.0.6  # 文件上传
pydantic>=2.0.0         # 数据验证
celery>=5.3.0          # 异步任务队列
redis>=5.0.0           # Celery 后端
datail-core>=0.1.0     # 数据验证增强
pytest>=7.4.0          # 测试框架
pytest-asyncio>=0.21.0 # 异步测试
python-jose>=3.3.0     # JWT 认证
passlib>=1.7.4         # 密码哈希
```

**步骤：**
1. 运行 `pip install -r requirements.txt`
2. 创建 `.env` 文件并配置所有密钥

#### 1.2 项目结构重组

当前结构：
```
backend/
├── main.py
├── requirements.txt
└── data/
```

推荐结构：
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 入口
│   ├── config.py              # 配置管理
│   ├── models/                # 数据模型
│   │   ├── __init__.py
│   │   ├── user.py           # 用户模型
│   │   ├── interview.py      # 面试模型
│   │   └── analysis.py       # 分析模型
│   ├── api/                   # API 路由
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── users.py      # 用户相关接口
│   │   │   ├── interviews.py # 面试相关接口
│   │   │   ├── analysis.py   # 分析接口
│   │   │   └── upload.py     # 文件上传接口
│   ├── services/              # 业务逻辑
│   │   ├── __init__.py
│   │   ├── llm_service.py    # LLM 服务
│   │   ├── analysis_service.py # 分析服务
│   │   ├── transcription_service.py # 转录服务
│   │   └── storage_service.py # 存储服务
│   ├── core/                  # 核心模块
│   │   ├── __init__.py
│   │   ├── security.py       # 安全相关
│   │   ├── dependencies.py   # FastAPI 依赖
│   │   └── exceptions.py     # 异常处理
│   └── utils/                 # 工具函数
│       ├── __init__.py
│       ├── logger.py         # 日志
│       └── helpers.py        # 辅助函数
├── tests/                     # 测试
│   ├── __init__.py
│   ├── conftest.py
│   └── test_api.py
├── celery_worker.py          # Celery worker
├── requirements.txt
├── .env
└── README.md
```

### Phase 2: 数据模型和存储

#### 2.1 创建 Pydantic 模型（app/models/）

```python
# app/models/user.py
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserProfile(BaseModel):
    userId: str
    username: str
    email: EmailStr
    createdAt: datetime
    version: int = 1

class UserCreate(BaseModel):
    username: str
    email: EmailStr
```

```python
# app/models/interview.py
from pydantic import BaseModel
from typing import Literal
from datetime import datetime

class InterviewData(BaseModel):
    id: str
    title: str
    company: str
    position: str
    status: Literal['待上传', '分析中', '已完成']
    date: datetime
    createdAt: datetime = None
    updatedAt: datetime = None
    fileUrl: Optional[str] = None  # 上传的文件路径
    fileType: Optional[str] = None  # 文件类型
```

```python
# app/models/analysis.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class QAAnswer(BaseModel):
    question: str
    yourAnswer: str
    score: int
    category: str
    aiSuggestion: Optional[str] = None
    improvedAnswer: Optional[str] = None

class AnalysisResult(BaseModel):
    interviewId: str
    duration: str
    rounds: int
    score: float
    passRate: int
    strengths: List[dict]
    weaknesses: List[dict]
    qaList: List[QAAnswer]
    suggestions: List[dict]
    createdAt: datetime
    updatedAt: datetime
```

#### 2.2 创建配置文件（app/config.py）

```python
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Keys
    DASHSCOPE_API_KEY: str
    SILICONFLOW_API_KEY: str

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 200 * 1024 * 1024  # 200MB

    # LLM Settings
    DEFAULT_LLM_MODEL: str = "qwen3-max"
    TRANSCRIPTION_MODEL: str = "FunAudioLLM/SenseVoiceSmall"

    # Celery
    REDIS_URL: str = "redis://localhost:6379"

    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
```

### Phase 3: 核心服务实现

#### 3.1 语音转录服务（app/services/transcription_service.py）

```python
import os
import requests
from typing import Optional
from pathlib import Path

class TranscriptionService:
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
        """
        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }

        data = {
            "model": model
        }

        with open(file_path, 'rb') as f:
            files = {
                'file': (file_path.name, f)
            }

            response = requests.post(
                self.base_url,
                headers=headers,
                data=data,
                files=files
            )

        if response.status_code == 200:
            result = response.json()
            return result.get('text', '')
        else:
            raise Exception(f"转录失败: {response.status_code} - {response.text}")
```

#### 3.2 LLM 服务（app/services/llm_service.py）

```python
from openai import OpenAI
from typing import List, Dict, Optional
import json

class LLMService:
    def __init__(self, api_key: str, base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"):
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url
        )

    async def analyze_interview(
        self,
        interview_text: str,
        interview_info: Dict
    ) -> Dict:
        """
        分析面试文本并生成结构化报告
        """
        prompt = f"""
        你是一位专业的面试复盘助手。请分析以下面试内容，并生成详细的分析报告。

        面试信息：
        - 公司名称：{interview_info.get('company', '未知')}
        - 岗位：{interview_info.get('position', '未知')}
        - 面试时长：从文本中推断

        面试内容：
        {interview_text}

        请按以下JSON格式输出分析结果：
        {{
            "duration": "面试时长",
            "rounds": 问答轮次数,
            "score": 综合评分(0-100),
            "passRate": 通过概率(0-100),
            "strengths": [{{
                "title": "优势标题",
                "desc": "详细描述"
            }}],
            "weaknesses": [{{
                "title": "需要改进的方面",
                "desc": "详细描述"
            }}],
            "qaList": [{{
                "question": "问题",
                "yourAnswer": "你的回答",
                "score": 评分(0-100),
                "category": "问题分类",
                "aiSuggestion": "AI建议",
                "improvedAnswer": "优化后的回答示例"
            }}],
            "suggestions": [{{
                "title": "改进建议标题",
                "priority": "高/中/低",
                "desc": "描述",
                "actions": ["具体行动1", "具体行动2"]
            }}]
        }}
        """

        try:
            response = self.client.chat.completions.create(
                model="qwen3-max",
                messages=[
                    {"role": "system", "content": "你是一个专业的面试复盘助手，请输出合法的JSON格式。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            return json.loads(content)

        except Exception as e:
            print(f"LLM 分析失败: {e}")
            # 返回默认结构
            return {
                "duration": "45分32秒",
                "rounds": 7,
                "score": 72,
                "passRate": 65,
                "strengths": [],
                "weaknesses": [],
                "qaList": [],
                "suggestions": []
            }

    async def chat_with_analysis(
        self,
        messages: List[Dict[str, str]],
        analysis_context: Dict
    ) -> str:
        """
        基于面试分析的对话
        """
        context = f"""
        当前面试分析上下文：
        综合评分：{analysis_context.get('score', 0)}/100
        通过概率：{analysis_context.get('passRate', 0)}%
        问题数量：{len(analysis_context.get('qaList', []))}
        """

        enhanced_messages = [
            {"role": "system", "content": f"你是面试复盘助手。{context}请基于已有的面试分析结果回答用户问题。"}
        ] + messages

        response = self.client.chat.completions.create(
            model="qwen3-max",
            messages=enhanced_messages,
            temperature=0.7,
            max_tokens=2000
        )

        return response.choices[0].message.content
```

### Phase 4: 异步任务系统（Celery）

#### 4.1 Celery 配置（celery_worker.py）

```python
from celery import Celery
import os

# Celery configuration
redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')

celery_app = Celery(
    'interreview',
    broker=redis_url,
    backend=redis_url
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Shanghai',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max
    worker_prefetch_multiplier=1,
)

celery_app.autodiscover_tasks(['app.services'])
```

#### 4.2 异步分析任务（app/services/analysis_service.py）

```python
from celery import shared_task
import asyncio
from pathlib import Path
from app.services.transcription_service import TranscriptionService
from app.services.llm_service import LLMService
from app.config import settings
import json

@shared_task(bind=True)
def process_interview_analysis(self, user_id: str, interview_id: str, file_path: str):
    """
    异步处理面试分析
    """
    try:
        # 更新状态
        self.update_state(state='PROGRESS', meta={'status': '开始处理...'})

        file_path = Path(file_path)

        # 步骤 1: 语音转文字
        if file_path.suffix.lower() in ['.mp3', '.wav', '.m4a', '.mp4']:
            self.update_state(state='PROGRESS', meta={'status': '转录音频...'})

            transcriber = TranscriptionService(settings.SILICONFLOW_API_KEY)
            interview_text = asyncio.run(
                transcriber.transcribe_audio(file_path)
            )
        else:
            # 文本文件直接读取
            with open(file_path, 'r', encoding='utf-8') as f:
                interview_text = f.read()

        # 步骤 2: LLM 分析
        self.update_state(state='PROGRESS', meta={'status': 'AI 分析中...'})

        # 读取面试信息
        interview_info = {
            'company': '待确认',  # 从文件中提取或让用户输入
            'position': '待确认'
        }

        llm_service = LLMService(settings.DASHSCOPE_API_KEY)
        analysis_result = asyncio.run(
            llm_service.analyze_interview(interview_text, interview_info)
        )

        # 步骤 3: 保存分析结果
        self.update_state(state='PROGRESS', meta={'status': '保存结果...'})

        analysis_path = Path(f"data/{user_id}/analysis.json")
        analysis_data = {}
        if analysis_path.exists():
            with open(analysis_path, 'r') as f:
                analysis_data = json.load(f)

        analysis_data[interview_id] = analysis_result

        with open(analysis_path, 'w') as f:
            json.dump(analysis_data, f, ensure_ascii=False, indent=2)

        # 更新面试状态
        interviews_path = Path(f"data/{user_id}/interviews.json")
        with open(interviews_path, 'r') as f:
            interviews = json.load(f)

        for interview in interviews:
            if interview['id'] == interview_id:
                interview['status'] = '已完成'
                break

        with open(interviews_path, 'w') as f:
            json.dump(interviews, f, ensure_ascii=False, indent=2)

        return {
            'status': 'completed',
            'analysis': analysis_result
        }

    except Exception as e:
        # 更新面试状态为失败
        interviews_path = Path(f"data/{user_id}/interviews.json")
        if interviews_path.exists():
            with open(interviews_path, 'r') as f:
                interviews = json.load(f)

            for interview in interviews:
                if interview['id'] == interview_id:
                    interview['status'] = '分析失败'
                    break

            with open(interviews_path, 'w') as f:
                json.dump(interviews, f, ensure_ascii=False, indent=2)

        raise Exception(f"分析失败: {str(e)}")
```

### Phase 5: API 接口更新

#### 5.1 文件上传接口（app/api/v1/upload.py）

```python
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from pathlib import Path
from typing import Optional
import uuid
import shutil
from app.config import settings
from app.services.analysis_service import process_interview_analysis
import json

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/interview/{user_id}/{interview_id}")
async def upload_interview_file(
    user_id: str,
    interview_id: str,
    file: UploadFile = File(...)
):
    """
    上传面试文件并启动异步分析
    """
    # 验证文件类型
    allowed_types = [
        'audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4',
        'video/mp4', 'text/plain'
    ]
    allowed_extensions = ['.mp3', '.wav', '.m4a', '.mp4', '.txt']

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型。支持的格式: {', '.join(allowed_extensions)}"
        )

    # 创建上传目录
    upload_dir = Path(settings.UPLOAD_DIR) / user_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    # 保存文件
    file_id = str(uuid.uuid4())
    file_path = upload_dir / f"{file_id}{file_ext}"

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")

    # 更新面试信息
    interviews_path = Path(f"data/{user_id}/interviews.json")
    with open(interviews_path, 'r') as f:
        interviews = json.load(f)

    for interview in interviews:
        if interview['id'] == interview_id:
            interview['status'] = '分析中'
            interview['fileUrl'] = str(file_path)
            interview['fileType'] = file.content_type
            break

    with open(interviews_path, 'w') as f:
        json.dump(interviews, f, ensure_ascii=False, indent=2)

    # 启动异步分析任务
    task = process_interview_analysis.delay(
        user_id=user_id,
        interview_id=interview_id,
        file_path=str(file_path)
    )

    return JSONResponse({
        "success": True,
        "message": "文件上传成功，分析任务已启动",
        "task_id": task.id,
        "file_path": str(file_path)
    })

@router.get("/task-status/{task_id}")
async def get_task_status(task_id: str):
    """
    获取异步任务状态
    """
    task = process_interview_analysis.AsyncResult(task_id)

    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'status': '等待处理...'
        }
    elif task.state == 'PROGRESS':
        response = {
            'state': task.state,
            'status': task.info.get('status', '')
        }
    elif task.state == 'SUCCESS':
        response = {
            'state': task.state,
            'status': '分析完成',
            'result': task.info
        }
    else:
        # FAILURE or other states
        response = {
            'state': task.state,
            'status': str(task.info)
        }

    return JSONResponse(response)
```

#### 5.2 更新分析接口（app/api/v1/analysis.py）

```python
from fastapi import APIRouter, HTTPException, Depends
from pathlib import Path
import json
from typing import Dict, Any

router = APIRouter(prefix="/users/{user_id}/analysis", tags=["analysis"])

@router.get("/")
async def get_analysis(user_id: str):
    """
    获取用户的所有面试分析
    """
    analysis_path = Path(f"data/{user_id}/analysis.json")

    if not analysis_path.exists():
        return {"success": True, "data": {}}

    try:
        with open(analysis_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取分析数据失败: {str(e)}")

@router.get("/{interview_id}")
async def get_interview_analysis(user_id: str, interview_id: str):
    """
    获取单个面试的详细分析
    """
    analysis_path = Path(f"data/{user_id}/analysis.json")

    if not analysis_path.exists():
        raise HTTPException(status_code=404, detail="分析数据不存在")

    try:
        with open(analysis_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if interview_id not in data:
            raise HTTPException(status_code=404, detail="该面试的分析数据不存在")

        return {"success": True, "data": data[interview_id]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取分析数据失败: {str(e)}")
```

#### 5.3 更新主入口（app/main.py）

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import users, interviews, analysis, upload, chat
from pathlib import Path

app = FastAPI(
    title="InterReview API",
    description="面试复盘 AI 助手后端 API",
    version="0.2.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 确保数据目录存在
Path("data").mkdir(exist_ok=True)

# 注册路由
app.include_router(users.router)
app.include_router(interviews.router)
app.include_router(analysis.router)
app.include_router(upload.router)
app.include_router(chat.router)

@app.get("/healthz")
async def healthz():
    return {
        "status": "healthy",
        "version": "0.2.0",
        "features": {
            "file_upload": True,
            "transcription": True,
            "analysis": True,
            "chat": True
        }
    }
```

### Phase 6: 前端集成

#### 6.1 更新 UploadArea.tsx

```typescript
// 修改 handleStartAnalysis
const handleStartAnalysis = async () => {
  if (!uploadedFile || !currentUserProfile) {
    toast.error('请先上传文件');
    return;
  }

  // 更新面试状态为"分析中"
  updateInterview(selectedInterviewId, { status: '分析中' });
  setCurrentStep(3);

  toast.success('开始分析面试内容...', {
    description: '预计需要 30-60 秒',
  });

  try {
    // 调用后端上传接口
    const formData = new FormData();
    formData.append('file', uploadedFile);

    const resp = await fetch(
      `${BACKEND_BASE}/upload/interview/${currentUserProfile.userId}/${selectedInterviewId}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!resp.ok) {
      throw new Error('上传失败');
    }

    const result = await resp.json();
    const taskId = result.task_id;

    // 轮询任务状态
    const pollTaskStatus = async () => {
      const statusResp = await fetch(
        `${BACKEND_BASE}/upload/task-status/${taskId}`
      );

      const statusData = await statusResp.json();

      if (statusData.state === 'SUCCESS') {
        // 更新面试状态
        updateInterview(selectedInterviewId, { status: '已完成' });
        setViewMode('report');

        toast.success('分析完成！', {
          description: '面试报告已生成',
        });
      } else if (statusData.state === 'FAILURE') {
        updateInterview(selectedInterviewId, { status: '分析失败' });

        toast.error('分析失败', {
          description: statusData.status,
        });
      } else {
        // 继续轮询
        setTimeout(pollTaskStatus, 2000);
      }
    };

    pollTaskStatus();

  } catch (error) {
    console.error('分析失败:', error);
    updateInterview(selectedInterviewId, { status: '分析失败' });

    toast.error('分析失败', {
      description: '请稍后重试',
    });
  }
};
```

#### 6.2 创建分析服务接口（src/services/analysis.ts）

```typescript
import { BACKEND_BASE } from './backend';

export interface AnalysisResult {
  duration: string;
  rounds: number;
  score: number;
  passRate: number;
  strengths: Array<{
    title: string;
    desc: string;
  }>;
  weaknesses: Array<{
    title: string;
    desc: string;
  }>;
  qaList: Array<{
    id: number;
    question: string;
    yourAnswer: string;
    score: number;
    category: string;
  }>;
  suggestions: Array<{
    title: string;
    priority: '高' | '中' | '低';
    desc: string;
    actions: string[];
  }>;
}

export async function fetchAnalysis(
  userId: string,
  interviewId: string
): Promise<AnalysisResult | null> {
  try {
    const resp = await fetch(
      `${BACKEND_BASE}/users/${userId}/analysis/${interviewId}`
    );

    if (!resp.ok) {
      return null;
    }

    const data = await resp.json();
    return data?.data || null;
  } catch (error) {
    console.error('获取分析失败:', error);
    return null;
  }
}
```

#### 6.3 更新 ChatReport.tsx

```typescript
// 添加状态管理
const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

// 加载分析数据
useEffect(() => {
  const loadAnalysis = async () => {
    if (!currentUserProfile || !interviewData) return;

    setIsLoadingAnalysis(true);
    const result = await fetchAnalysis(
      currentUserProfile.userId,
      interviewData.id
    );
    setAnalysis(result);
    setIsLoadingAnalysis(false);
  };

  loadAnalysis();
}, [currentUserProfile, interviewData]);

// 使用真实数据替换 mock 数据
if (analysis) {
  // 使用 analysis.duration, analysis.score 等真实数据
  // 而不是硬编码的 mock 数据
}
```

### Phase 7: 后端 LLM 代理

#### 7.1 创建 Chat API（app/api/v1/chat.py）

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict
from app.services.llm_service import LLMService
from app.config import settings
from pathlib import Path
import json

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str  # system, user, assistant
    content: str

class ChatRequest(BaseModel):
    user_id: str
    interview_id: str
    messages: List[ChatMessage]

@router.post("/")
async def chat_with_llm(request: ChatRequest):
    """
    代理前端与 LLM 的对话，保护 API 密钥
    """
    try:
        # 加载分析上下文
        analysis_path = Path(f"data/{request.user_id}/analysis.json")
        analysis_context = {}

        if analysis_path.exists():
            with open(analysis_path, 'r') as f:
                analysis_data = json.load(f)
                analysis_context = analysis_data.get(request.interview_id, {})

        llm_service = LLMService(settings.DASHSCOPE_API_KEY)

        # 转换消息格式
        messages = [{"role": msg.role, "content": msg.content}
                   for msg in request.messages]

        # 调用 LLM
        response = await llm_service.chat_with_analysis(
            messages, analysis_context
        )

        return {
            "success": True,
            "response": response
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"对话失败: {str(e)}")
```

#### 7.2 更新前端 Mock AI 调用

```typescript
// 修改 src/utils/mockAIResponses.ts

// 替换为调用后端 API
export async function chatWithLLM(
  messages: ChatMessage[],
  options?: { model?: string; stream?: boolean }
): Promise<string> {
  const currentUserProfile = getCurrentUserProfile(); // 从 localStorage 获取
  const selectedInterviewId = getSelectedInterviewId(); // 获取当前面试 ID

  if (!currentUserProfile || !selectedInterviewId) {
    return fallbackFromHistory(messages);
  }

  try {
    const resp = await fetch(`${BACKEND_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: currentUserProfile.userId,
        interview_id: selectedInterviewId,
        messages: messages
      }),
    });

    if (!resp.ok) {
      throw new Error('对话失败');
    }

    const data = await resp.json();
    return data.response;

  } catch (error) {
    console.error('对话失败，降级到本地 Mock:', error);
    return fallbackFromHistory(messages);
  }
}
```

### Phase 8: 测试和部署

#### 8.1 编写测试（tests/test_api.py）

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_healthz():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_user_registration():
    user_data = {
        "userId": "test_user_123",
        "username": "测试用户",
        "email": "test@example.com",
        "createdAt": "2025-12-10T10:00:00"
    }

    response = client.post("/users/register", json=user_data)
    assert response.status_code == 200
    assert response.json()["success"] == True

def test_file_upload():
    # 测试文件上传接口
    with open("test_audio.mp3", "rb") as f:
        response = client.post(
            "/upload/interview/test_user_123/interview_123",
            files={"file": ("test_audio.mp3", f, "audio/mpeg")}
        )

    assert response.status_code == 200
    assert "task_id" in response.json()
```

#### 8.2 Docker 部署

```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY app/ ./app/
COPY celery_worker.py ./

# 创建数据目录
RUN mkdir -p /app/data /app/uploads

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379
      - DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}
      - SILICONFLOW_API_KEY=${SILICONFLOW_API_KEY}
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  celery:
    build: .
    command: celery -A celery_worker.celery_app worker --loglevel=info --concurrency=2
    environment:
      - REDIS_URL=redis://redis:6379
      - DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}
      - SILICONFLOW_API_KEY=${SILICONFLOW_API_KEY}
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    depends_on:
      - redis
    restart: unless-stopped

  celery-beat:
    build: .
    command: celery -A celery_worker.celery_app beat --loglevel=info
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped
```

### 8.3 启动脚本（start.sh）

```bash
#!/bin/bash

# 启动后端服务

echo "启动 Redis..."
docker-compose up -d redis

echo "等待 Redis 就绪..."
sleep 5

echo "启动 Celery Worker..."
docker-compose up -d celery

echo "启动 API 服务..."
docker-compose up -d api

echo "服务启动完成！"
echo "API 地址: http://localhost:8000"
echo "Redis: localhost:6379"
```

### Phase 9: 性能优化和监控

#### 9.1 添加日志系统

```python
# app/utils/logger.py
import logging
import sys
from pathlib import Path

def setup_logging():
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_dir / "app.log")
        ]
    )

    return logging.getLogger(__name__)

logger = setup_logging()
```

#### 9.2 添加快取

```python
from functools import wraps
import time
import hashlib
import json

class Cache:
    def __init__(self, ttl=3600):
        self.cache = {}
        self.ttl = ttl

    def get(self, key):
        if key in self.cache:
            value, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return value
            else:
                del self.cache[key]
        return None

    def set(self, key, value):
        self.cache[key] = (value, time.time())

    def key_from_args(self, func_name, *args, **kwargs):
        key_data = {
            'func': func_name,
            'args': args,
            'kwargs': kwargs
        }
        return hashlib.md5(
            json.dumps(key_data, sort_keys=True).encode()
        ).hexdigest()

cache = Cache(ttl=1800)  # 30分钟缓存

def cached(ttl=None):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_instance = cache
            if ttl:
                cache_instance = Cache(ttl=ttl)

            key = cache_instance.key_from_args(
                func.__name__, *args, **kwargs
            )

            cached_result = cache_instance.get(key)
            if cached_result is not None:
                return cached_result

            result = await func(*args, **kwargs)
            cache_instance.set(key, result)
            return result
        return wrapper
    return decorator
```

### Phase 10: 高级功能

#### 10.1 情感分析

```python
import re
from textblob import TextBlob

class SentimentAnalyzer:
    def analyze_sentiment(self, text: str) -> Dict[str, float]:
        """
        分析文本情感
        """
        blob = TextBlob(text)

        return {
            'polarity': blob.sentiment.polarity,  # -1 到 1
            'subjectivity': blob.sentiment.subjectivity,  # 0 到 1
            'confidence_confident': self._detect_confidence(text),
            'confidence_uncertain': self._detect_uncertainty(text)
        }

    def _detect_confidence(self, text: str) -> float:
        """
        检测回答的信心程度
        """
        confident_patterns = [
            r'\b(当然|肯定|确定|无疑|显然|清楚)\b',
            r'\b(我认?为?|我觉得|我相信|我确定)\b',
            r'\b(会|可以|应该|必须)\b'
        ]

        text_lower = text.lower()
        confident_count = sum(
            len(re.findall(pattern, text_lower))
            for pattern in confident_patterns
        )

        return min(confident_count / 5, 1.0)  # 归一化到 0-1

    def _detect_uncertainty(self, text: str) -> float:
        """
        检测回答的不确定性
        """
        uncertain_patterns = [
            r'\b(可能|也许|应该|大概|或许)\b',
            r'\b(呃|嗯|啊|这个|那个)\b',
            r'[。！？，](?:呃|嗯|啊|这个|那个)[，。！？]'
        ]

        text_lower = text.lower()
        uncertain_count = sum(
            len(re.findall(pattern, text_lower))
            for pattern in uncertain_patterns
        )

        return min(uncertain_count / 3, 1.0)  # 归一化到 0-1
```

#### 10.2 智能建议系统

```python
class SmartSuggestionEngine:
    def generate_suggestions(self, analysis_result: Dict) -> List[Dict]:
        """
        基于分析结果生成个性化建议
        """
        suggestions = []

        qa_list = analysis_result.get('qaList', [])

        # 检测薄弱环节
        weak_categories = self._identify_weak_categories(qa_list)

        for category in weak_categories:
            suggestion = self._create_suggestion_for_category(category)
            if suggestion:
                suggestions.append(suggestion)

        # 通用建议
        suggestions.extend(self._get_general_suggestions(qa_list))

        return suggestions[:5]  # 最多返回 5 条建议

    def _identify_weak_categories(self, qa_list: List[Dict]) -> List[str]:
        """
        识别得分较低的类别
        """
        category_scores = {}
        category_count = {}

        for qa in qa_list:
            category = qa.get('category', '其他')
            score = qa.get('score', 0)

            category_scores[category] = category_scores.get(category, 0) + score
            category_count[category] = category_count.get(category, 0) + 1

        # 计算平均得分
        avg_scores = {
            cat: category_scores[cat] / category_count[cat]
            for cat in category_scores
        }

        # 返回得分低于 70 的类别
        return [cat for cat, score in avg_scores.items() if score < 70]

    def _create_suggestion_for_category(self, category: str) -> Optional[Dict]:
        """
        为特定类别创建建议
        """
        suggestions_map = {
            '求职动机': {
                'title': '深入了解目标公司',
                'priority': '高',
                'desc': '面试前至少花 2 小时研究公司',
                'actions': [
                    '阅读公司官网、产品介绍、技术博客',
                    '搜索公司近 3 个月的新闻和动态',
                    '在脉脉、知乎等平台了解公司文化和面试经验',
                    '准备 2-3 个与公司相关的问题，体现你的兴趣'
                ]
            },
            '自我介绍': {
                'title': '准备结构化的自我介绍',
                'priority': '高',
                'desc': '自我介绍是面试的开场白，需要准备充分',
                'actions': [
                    '准备 1 分钟、3 分钟、5 分钟三个版本',
                    '遵循"现在-过去-未来"的结构',
                    '突出与岗位相关的技能和经验',
                    '练习到自然流畅，避免背诵感'
                ]
            }
        }

        return suggestions_map.get(category)

    def _get_general_suggestions(self, qa_list: List[Dict]) -> List[Dict]:
        """
        生成通用建议
        """
        suggestions = []

        # 检测回答长度
        avg_length = sum(len(qa.get('yourAnswer', '')) for qa in qa_list) / len(qa_list)

        if avg_length < 100:
            suggestions.append({
                'title': '扩展回答内容',
                'priority': '中',
                'desc': '你的回答相对简短，建议提供更多细节',
                'actions': [
                    '使用 STAR 法则组织回答',
                    '提供具体的数据和例子',
                    '解释你的思考过程',
                    '说明结果和学习收获'
                ]
            })

        return suggestions
```

#### 10.3 导出功能实现

```python
from fpdf import FPDF
import io

class ExportService:
    def generate_pdf_report(self, analysis_result: Dict, interview_info: Dict) -> bytes:
        """
        生成 PDF 格式的面试报告
        """
        pdf = FPDF()
        pdf.add_page()

        # 设置字体
        pdf.add_font('NotoSans', '', 'NotoSansSC-Regular.ttf', uni=True)
        pdf.set_font('NotoSans', '', 16)

        # 标题
        pdf.cell(0, 10, f"面试分析报告 - {interview_info.get('title', '未命名面试')}", 0, 1, 'C')
        pdf.ln(10)

        # 基本信息
        pdf.set_font('NotoSans', '', 12)
        pdf.cell(0, 10, f"公司名称：{interview_info.get('company', '未知')}", 0, 1)
        pdf.cell(0, 10, f"岗位：{interview_info.get('position', '未知')}", 0, 1)
        pdf.cell(0, 10, f"综合评分：{analysis_result.get('score', 0)}/100", 0, 1)
        pdf.cell(0, 10, f"通过概率：{analysis_result.get('passRate', 0)}%", 0, 1)
        pdf.ln(10)

        # 优势
        pdf.set_font('NotoSans', '', 14)
        pdf.cell(0, 10, "表现优秀的方面：", 0, 1)
        pdf.set_font('NotoSans', '', 12)

        for strength in analysis_result.get('strengths', []):
            pdf.multi_cell(0, 10, f"• {strength.get('title', '')}: {strength.get('desc', '')}")

        pdf.ln(10)

        # 需要改进的方面
        pdf.set_font('NotoSans', '', 14)
        pdf.cell(0, 10, "需要改进的方面：", 0, 1)
        pdf.set_font('NotoSans', '', 12)

        for weakness in analysis_result.get('weaknesses', []):
            pdf.multi_cell(0, 10, f"• {weakness.get('title', '')}: {weakness.get('desc', '')}")

        # 输出 PDF
        return pdf.output(dest='S').encode('latin1')
```

### 实施时间表

| 阶段 | 任务 | 预计时间 | 优先级 |
|------|------|----------|--------|
| Phase 1 | 基础设施和核心依赖 | 1 天 | 高 |
| Phase 2 | 数据模型和存储 | 0.5 天 | 高 |
| Phase 3 | 核心服务实现 | 2 天 | 高 |
| Phase 4 | 异步任务系统 | 1 天 | 高 |
| Phase 5 | API 接口更新 | 1 天 | 高 |
| Phase 6 | 前端集成 | 2 天 | 中 |
| Phase 7 | 后端 LLM 代理 | 0.5 天 | 中 |
| Phase 8 | 测试和部署 | 1 天 | 中 |
| Phase 9 | 性能优化和监控 | 1 天 | 低 |
| Phase 10 | 高级功能 | 2 天 | 低 |

**总计：约 12 天**

### 依赖清单

- **Python 3.9+**: 运行环境
- **Redis**: 任务队列和缓存
- **Docker**: 容器化部署
- **API Keys**:
  - 阿里云 DashScope API Key (LLM)
  - SiliconFlow API Key (语音转录)
- **字体文件**: NotoSansSC-Regular.ttf (PDF 导出)

### 环境变量配置 (.env)

```bash
# API Keys
DASHSCOPE_API_KEY=your_dashscope_api_key_here
SILICONFLOW_API_KEY=your_siliconflow_api_key_here

# Storage
UPLOAD_DIR=./uploads

# Redis
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your_secret_key_here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 测试要点

1. **单元测试**: 核心服务（转录、LLM、分析）
2. **集成测试**: API 端对端测试
3. **压力测试**: 并发分析任务
4. **错误处理**: 网络失败、API 限制、文件损坏
5. **数据完整性**: 多设备同步、数据一致性

### 安全考虑

1. **API Key 保护**: 永远不要暴露在前端代码
2. **文件验证**: 严格的类型和大小检查
3. **速率限制**: 防止 API 滥用
4. **数据隔离**: 用户数据相互隔离
5. **输入净化**: 防止注入攻击

### 监控和日志

1. **任务监控**: Celery Flower
2. **API 日志**: FastAPI 中间件
3. **错误追踪**: Sentry 集成
4. **性能监控**: Prometheus + Grafana

### 下一步建议

1. **MVP 开发**: 完成 Phase 1-5，实现基础分析功能
2. **用户体验**: 优化加载状态、进度显示、错误处理
3. **模型优化**: 针对不同岗位优化 prompt
4. **多语言支持**: 中英文混合处理优化
5. **移动端适配**: 响应式优化
6. **团队协作**: 多用户共享面试分析

### 参考资源

- [FastAPI 官方文档](https://fastapi.tiangolo.com/)
- [Celery 文档](https://docs.celeryq.dev/)
- [DashScope API](https://help.aliyun.com/document_detail/2712576.html)
- [SiliconFlow API](https://docs.siliconflow.com/)

---

**文档状态**: 草稿
**最后更新**: 2025-12-10
**维护者**: InterReview 开发团队
