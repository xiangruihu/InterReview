

# InterReview

> 面向候选人的 AI 面试复盘工作台：把录音/文字稿上传到云端，自动完成转写、分析、总结、追问和导出，帮助团队快速定位问题、沉淀知识。

# 🚀 InterReview：一个面向程序员的「面试复盘智能体」
### —— 诚邀你一起共建

> 面试结束后，你真的知道自己哪里做得好、哪里该改吗？

**InterReview** 是一个正在积极开发中的开源项目，目标是构建一个**面向技术面试场景的智能复盘与分析系统**，帮助求职者把「一次模糊的面试体验」转化为**可复盘、可改进、可积累的能力资产**。

我们希望它不是一个“面经生成器”，而是一个**真正能帮你进步的工程级工具**。

👉 GitHub 仓库：  
https://github.com/xiangruihu/InterReview

---

## 🎯 项目愿景（Why）

当前大量面试相关工具存在几个问题：

- ❌ 只给结论，不给**过程分析**
- ❌ 泛泛而谈，缺乏**个体上下文**
- ❌ 无法积累长期能力画像
- ❌ 更像内容产品，而不是**可演进系统**

**InterReview 想做的是：**

> 把「面试复盘」变成一件**工程化、可积累、可演进**的事情。

---

## 🧠 核心功能规划（What）

目前 InterReview 聚焦在 **「面试复盘分析」** 这一核心场景，主要功能规划如下：

### 1️⃣ 面试分析（Interview Analysis）

- 🎙 音频 / 视频上传与自动转写  
- 🧩 结构化拆解面试过程（问题 → 回答 → 追问 → 评价）

### 2️⃣ QA 抽取（Question–Answer Extraction）

- 自动识别：
  - 面试官问题
  - 候选人回答
  - 追问链路
- 形成结构化 QA 数据，支持后续分析与检索

### 3️⃣ 智能追问（AI Follow-up）

- 基于原始回答，模拟面试官视角：
  - 给出可能的追问方向
  - 标注回答中的薄弱点
  - 帮助用户理解「为什么会被追问」

### 4️⃣ 智能复盘（Smart Debrief）

- 从多个维度给出复盘分析：
  - 技术深度
  - 表达清晰度
  - 逻辑结构
  - 风险点 / 模糊点
- 支持「改写建议 / 更优回答示例」

> 长期目标：构建**个人面试能力画像**，让系统“越来越懂你”


## 功能亮点
- **面试资产管理**：侧边栏集中管理多场面试，支持搜索、重命名、删除、状态跟踪（待上传/分析中/已完成等）。
- **多格式上传与自动转写**：可上传 MP3/WAV/M4A/MP4/TXT（≤200 MB），后端自动落盘至 `backend/uploads/`，并调用 SiliconFlow API（或 mock）生成文字稿。
- **AI 分析报告**：`AnalysisReport` 组件提供问答得分、优劣势、通过概率、改进建议等结构化视图，支持继续优化回答/导出等操作。
- **上下文聊天助手**：`ChatArea`、`MessageList` 结合 DashScope LLM，为每场面试提供带上下文的追问与改写建议。
- **持久化策略**：前端 localStorage 做快速缓存，后端 `StorageService` 以 JSON 存盘，可无缝切换到 Supabase（schema 见 `backend/supabase_schema.sql`）。

## 技术栈
| 模块 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | React 18 + TypeScript + Vite 6 + Tailwind v4 + Radix UI + lucide-react + sonner | 采用函数式组件 + Hooks，`vite.config.ts` 通过 alias 固定依赖版本。 |
| 后端 | FastAPI + Pydantic v2 + Uvicorn + aiofiles + requests | API 入口 `backend/app/main.py`。`StorageService` 负责本地 JSON 存储，后续可替换为 Supabase。 |
| AI 能力 | DashScope（OpenAI 兼容）+ SiliconFlow/SenseVoice 转写 | `src/utils/mockAIResponses.ts` 支持浏览器直连 + Mock，后端 `LLMService` 用于服务端分析。 |
| 任务/队列 | Celery + Redis（已列入依赖，待接入） | 目前转写/分析同步执行，可按 `BACKEND_IMPLEMENTATION_PLAN.md` 中的路线落地。 |

## 仓库结构（截取常用目录）
```
InterReview/
├── src/                     # 前端源码
│   ├── App.tsx              # 页面骨架与状态管理
│   ├── components/          # UI 组件（Sidebar、UploadArea、AnalysisReport、Chat…）
│   ├── utils/               # 与后端交互/LLM/时间格式化
│   ├── API.md               # 详细 API 规划文档
│   └── …                    # Attributions、IMPROVEMENTS 等补充资料
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 入口，CORS 配置、路由注册
│   │   ├── api/v1/          # users / interviews / upload 路由
│   │   ├── models/          # User/Interview/Analysis Pydantic Schema
│   │   └── services/        # StorageService、TranscriptionService、LLMService
│   ├── uploads/             # 用户上传文件
│   ├── data/                # per-user JSON 数据（user/interviews/messages/analysis）
│   ├── README_API.md        # 精简 API 速查
│   ├── SETUP_AND_TEST.md    # 后端部署+测试指南
│   └── supabase_schema.sql  # 可选 Supabase 方案
├── llm.py / transcribe.py   # 调用 DashScope / SiliconFlow 的脚本样例
├── vite.config.ts           # Vite 配置（含 alias）
├── package.json / package-lock.json
└── README.md                # 当前文档
```

## 本地开发指南

### 1. 环境要求
- Node.js **18.18+（推荐 20 LTS）**、npm 10。
- Python **3.10+**，建议使用 `python -m venv` 创建虚拟环境（仓库内已有 `.venv` / `.venv_new`）。
- 可选：Redis 7（后续 Celery 任务队列使用）、Supabase 账号（如需云端存储）。

### 2. 安装依赖
```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd backend
python -m venv .venv        # 如已有可跳过
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. 环境变量
创建 `.env`（根目录即可被前后端、脚本加载）。可以参考 `.env.example`，把密钥替换为自己的值再重命名为 `.env`。常用 Key 如下：

| 变量 | 用途 | 备注 |
| --- | --- | --- |
| `VITE_API_BASE` | 前端调用后端的基础地址 | 默认为 `/api`（同域反代），本地开发可在 `.env` 中改成 `http://127.0.0.1:8000`。 |
| `DASHSCOPE_API_KEY` | DashScope LLM 的唯一 Key | Vite 已配置暴露到前端，同时后端 `LLMService` / `llm.py` 也读取该值。 |
| `SILICONFLOW_API_KEY` | SenseVoice 转写 Key | 被后端 `TranscriptionService`、`transcribe.py` 使用。 |
| `MOCK_TRANSCRIPTION` | 转写 Mock 开关 | 任意 truthy 值代表强制走本地示例，便于开发。 |
| `UPLOAD_DIR` | 可选，默认 `./uploads` | 通过 `backend/app/config.py` 覆盖。 |
| `REDIS_URL` | Celery/任务队列配置 | 当前未使用，预留。 |
| `SECRET_KEY` | JWT/Session 用，默认占位 | 部署务必修改。 |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Supabase 连接参数 | `backend/test_supabase.mjs` 会读取验证。 |
| `PASSLIB_SCHEME`（可选） | 控制密码哈希方案 | 默认 `pbkdf2_sha256`，如需自定义可在后端统一配置。 |

> Key 申请入口：
> - DashScope：https://dashscope.console.aliyun.com/apiKey
> - SiliconFlow：https://cloud.siliconflow.cn/me/account/ak


### 4. 启动服务
```bash
# 终端 1：启动 FastAPI
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Swagger: http://localhost:8000/docs

# 终端 2：启动前端
npm run dev
# 浏览器默认打开 http://localhost:3000
```

### 5. 常用脚本
| 命令 | 描述 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器。 |
| `npm run build` | 生成生产构建（输出在 `build/`）。 |
| `python -m app`（backend） | 另一种后端启动方式。 |
| `pytest`（backend） | 运行 FastAPI/Pydantic 层的单测（准备中，可在 `backend/tests/` 补充）。 |
| `node backend/test_supabase.mjs` | 验证 `.env` 中的 Supabase Key 是否可用。 |
| `python llm.py` / `python transcribe.py` | 独立测试 DashScope/SiliconFlow。 |

## 核心模块与数据流

### 前端（`src/`）
- **状态集中管理**：`App.tsx` 负责登录态、面试列表、聊天记录、视图模式，利用 `localStorage` 做分用户缓存。
- **组件分层**：
  - `Sidebar`：展示面试列表、搜索、新建面试、退出登录。
  - `UploadArea`：拖拽/点击上传、文件校验、进度反馈、自动触发转写。
  - `AnalysisReport` & `ChatReport`：面试报告、问答折叠、导出占位操作。
  - `ChatArea`、`MessageList`、`TypingIndicator`：AI 交互体验。
  - `LoginPage`、`DeleteConfirmDialog`、`AnalyzingLoader` 等辅助组件。
- **后端交互**：`src/utils/backend.ts` 封装 REST API（用户、面试、消息、分析、上传、转写），`src/utils/mockAIResponses.ts` 负责 LLM 调用与 fallback。

### 后端（`backend/app`）
- `main.py`：FastAPI 实例、CORS、健康检查、目录初始化。
- `api/v1/users.py`：注册用户、读写面试/消息/分析 JSON。
- `api/v1/interviews.py`：面试 CRUD、触发转写、读取转写内容。
- `api/v1/upload.py`：校验/保存上传文件、自动调用 `TranscriptionService`。
- `services/storage_service.py`：以 `backend/data/<userId>/` 为单位保存 `user.json`、`interviews.json`、`messages.json`、`transcripts.json` 等。
- `services/transcription_service.py`：封装 SiliconFlow 请求，可切换成 mock。
- `services/llm_service.py`：服务端调用 DashScope 生成分析报告/问答建议。

### 数据流（典型路径）
```
登录 -> registerUser() -> backend/users/register -> backend/data/<user>/user.json
|
|-- 新建面试 -> 保存在 localStorage 与 backend/users/{id}/interviews
|
|-- 上传文件 -> /upload/interview/{user}/{interview} -> uploads/<user>/<file>.ext
|      |-- 自动转写 -> SiliconFlow -> transcripts.json + interview.transcriptText
|
|-- AI 分析 -> (计划) /interviews/{id}/transcribe + LLMService.analyze_interview -> analysis.json
|
|-- 与助手聊天 -> chatWithLLM() 或后端代理 -> messages.json (per interview)
```

## API 快速速查
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET /healthz` | 健康检查。 |
| `POST /users/register` | 注册/更新用户信息（无鉴权，使用 `userId` 作为键）。 |
| `GET /users/{user_id}` | 获取用户档案。 |
| `GET /users/{user_id}/interviews` / `PUT ...` | 拉取/保存面试列表。 |
| `GET /users/{user_id}/messages` / `PUT ...` | 拉取/保存聊天记录。 |
| `GET /users/{user_id}/analysis` / `PUT ...` | 拉取/保存分析结果。 |
| `POST /interviews/?user_id=` | 创建面试。 |
| `GET /interviews/{interview_id}?user_id=` | 获取面试详情。 |
| `PATCH /interviews/{interview_id}?user_id=` | 更新状态/信息。 |
| `DELETE /interviews/{interview_id}?user_id=` | 删除面试。 |
| `POST /upload/interview/{user}/{interview}` | 上传音/视频/文本文件，自动落盘与转写。 |
| `POST /interviews/{id}/transcribe?user_id=` | 主动触发转写，并保存结果。 |
| `GET /interviews/{id}/transcription?user_id=` | 获取最新转写文本（含兜底逻辑）。 |

更详细的字段、示例和未来规划请查阅：
- `backend/README_API.md`：当前实现的接口与 cURL 示例。
- `src/API.md`：完整的 v1 设计稿，包含认证、导出、统计等扩展接口。

## 数据与文件存储
- **用户数据**：`backend/data/<userId>/user.json`、`interviews.json`、`messages.json`、`analysis.json`、`transcripts.json`。
- **上传文件**：`backend/uploads/<userId>/<uuid>.<ext>`，文件名在响应中返回给前端。
- **日志**：可将 `uvicorn` 输出重定向至 `backend/backend.log`（仓库已有示例）。
- **Supabase**：`backend/supabase_schema.sql` 提供迁移脚本；`backend/test_supabase.mjs` 验证连接。准备切换时需要同步更新 `StorageService`。

## 协作规范
1. **任务分配**：在 Issue/Story 中链到 `src/IMPROVEMENTS.md`, `BACKEND_IMPLEMENTATION_PLAN.md` 中的需求，确保范围清晰。
2. **分支命名**：`feat/<scope>`、`fix/<bug>`、`chore/<task>`、`docs/<topic>`，保持全小写连字符。
3. **提交信息**：遵循 `type(scope): summary`（例如 `feat(chat): add typing indicator state`），便于后续生成变更日志。
4. **代码风格**：
   - TypeScript：保持严格类型、避免使用 `any`，组件尽量拆分至 `src/components`。
   - React：优先使用函数组件 + Hooks；涉及复杂逻辑时适度添加注释（示例见 `UploadArea`）。
   - Python：遵循 Pydantic/PEP8，API 返回统一 `{ success, data, message }` 结构。
5. **提交前自查**：
   - `npm run build`（确保 TS/JS 通过编译）。
   - `pytest backend`（如无测试可至少执行 `uvicorn` 手动验证关键接口）。
   - 如新增环境变量/配置，务必更新 README & `.env.example`。
   - UI 改动请在 PR 中附截图或 Loom。
6. **Review 流程**：至少 1 名同伴 Review，重点关注 API 兼容性、密钥管理、性能（文件上传/LLM 调用）等风险点。

## 测试与排错
- **LLM Key 缺失**：前端 console 会提示 “未检测到 DASHSCOPE_API_KEY，使用本地 Mock”，可放心用于 UI 联调。
- **转写失败**：`TranscriptionService` 会 fallback 到 mock，查看后端日志中 `[Upload][Transcribe]` 相关输出定位原因。
- **文件过大/格式错误**：`UploadArea` 和 `/upload` 均会校验（200 MB、扩展名/MIME），错误信息会通过 `toast` 返回。
- **数据未持久化**：确认 `backend/data/<userId>/` 是否有写权限；Docker/部署环境需挂载持久卷或切换到 Supabase。
- **Supabase 验证**：运行 `node backend/test_supabase.mjs`，若报错请检查 `.env`、网络和 RLS 策略。

## Roadmap / 待办
- [ ] 优化交互体验：增强上传/转写/分析进度反馈、错误提示与重试流程，减少用户迷惑。
- [x] 规划 LangGraph 多 Agent 架构（见下文），为后续智能导向交互做准备。
- [ ] 后端异步化：落地 Celery + Redis，避免上传/分析阻塞请求（详见 `BACKEND_IMPLEMENTATION_PLAN.md`）。
- [ ] 真正的分析落地：`LLMService.analyze_interview` 与前端 report/导出打通。
- [ ] 用户认证：接入 Supabase Auth or JWT，替换目前的 “userId 直接传入” 模式。
- [ ] 导出能力：实装 `ExportReportModal`、`ExportQuestionsModal`，生成 PDF/Markdown。
- [ ] 监控与配额：为 DashScope/SiliconFlow 调用增加限流和告警。

## LangGraph 多 Agent 规划（节选）
详见 [`langgraph.md`](./langgraph.md)，聚焦以下主题：

1. **整体架构**：Planner / Transcription Analyzer / Insight Synthesizer / Action Coach / Conversation Agent 的职责划分、记忆层设计、工具接口。
2. **Graph 流程**：从入口节点到回执节点的多任务子图，支持上传分析、追问、多轮更新。
3. **智能策略**：动态 Prompt、意图分类与 Tool Routing、Memory-aware 回复、质量控制与 fallback。
4. **实施计划**：原型 → 智能增强 → 产品化三阶段路线，明确每一步的目标。
5. **风险与验收**：API 成本、上下文长度、可靠性、安全隐私等风险及指标（响应时间、合规率、满意度等）。



## 🎬 演示视频

[![ExcelMind 演示视频](https://img.shields.io/badge/📺_点击观看-Bilibili视频-00A1D6?style=for-the-badge&logo=bilibili)](https://www.bilibili.com/video/BV1A8m4BeEDx/)

> 视频展示了 InterReview 的核心功能：上传转写、智能分析、AI 追问和导出等

## 更多资料
- `src/CHAT_FEATURE.md`：聊天体验与需求拆解。
- `src/IMPROVEMENTS.md`、`src/FINAL_REVIEW.md`：UI/UX 待优化事项。
- `BACKEND_IMPLEMENTATION_PLAN.md`、`backend/CORE_IMPLEMENTATION_SUMMARY.md`：系统级的后端演进计划。
- `Attributions.md`：UI 参考来源及版权说明。

欢迎随时在 Issue 中提出问题或想法，一起把 InterReview 打造成真正好用的面试复盘助手 🚀
