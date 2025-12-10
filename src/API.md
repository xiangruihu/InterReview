# InterReview 面试复盘助手 - 后端 API 文档

> 版本：v1.0.0  
> 更新时间：2025-12-09  
> 基础 URL：`https://api.interreview.com/v1`

---

## 📋 目录

1. [概述](#概述)
2. [认证方式](#认证方式)
3. [通用响应格式](#通用响应格式)
4. [错误码定义](#错误码定义)
5. [接口列表](#接口列表)
   - [用户认证](#用户认证)
   - [面试管理](#面试管理)
   - [音频处理](#音频处理)
   - [AI 分析](#ai-分析)
   - [对话交互](#对话交互)
   - [导出功能](#导出功能)
   - [搜索功能](#搜索功能)
   - [数据统计](#数据统计)
   - [反馈系统](#反馈系统)
6. [数据模型](#数据模型)
7. [Webhook 通知](#webhook-通知)

---

## 概述

InterReview 面试复盘助手后端 API 提供完整的面试录音上传、AI 分析、对话式追问、数据管理等功能。

### 技术栈
- **认证**: Supabase Auth (JWT)
- **数据库**: Supabase PostgreSQL
- **存储**: Supabase Storage
- **AI**: OpenAI GPT-4 / Whisper API

### 限流规则
- 普通用户：100 请求/分钟
- VIP 用户：500 请求/分钟
- 文件上传：5 次/小时

---

## 认证方式

所有接口（除注册/登录外）需在 HTTP Header 中携带 JWT Token：

```http
Authorization: Bearer {access_token}
```

### Token 获取方式
通过登录接口获取，有效期 1 小时，刷新 Token 有效期 30 天。

---

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "timestamp": "2025-12-09T10:30:00Z"
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_TOKEN",
    "message": "Token 无效或已过期",
    "details": "JWT expired at 2025-12-09T09:00:00Z"
  },
  "timestamp": "2025-12-09T10:30:00Z"
}
```

---

## 错误码定义

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `AUTH_INVALID_TOKEN` | 401 | Token 无效或已过期 |
| `AUTH_PERMISSION_DENIED` | 403 | 无权限访问 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `FILE_TOO_LARGE` | 413 | 文件超过大小限制 |
| `FILE_FORMAT_INVALID` | 400 | 文件格式不支持 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `AI_SERVICE_ERROR` | 500 | AI 服务调用失败 |
| `TRANSCRIPTION_FAILED` | 500 | 音频转写失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 接口列表

---

## 用户认证

### 1. 用户注册

**接口**: `POST /auth/register`

**描述**: 创建新用户账号

**请求头**:
```http
Content-Type: application/json
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "张三",
  "university": "清华大学",
  "graduationYear": 2025
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 邮箱地址，需符合邮箱格式 |
| password | string | 是 | 密码，至少 8 位，包含大小写字母和数字 |
| name | string | 是 | 用户姓名，2-20 字符 |
| university | string | 否 | 学校名称 |
| graduationYear | number | 否 | 毕业年份 |

**成功响应**: `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1a2b3c4d",
      "email": "user@example.com",
      "name": "张三",
      "university": "清华大学",
      "graduationYear": 2025,
      "createdAt": "2025-12-09T10:30:00Z"
    },
    "session": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "v1.MjAxNS0wMS0wMVQw...",
      "expiresIn": 3600,
      "tokenType": "Bearer"
    }
  },
  "message": "注册成功"
}
```

**错误响应示例**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "邮箱已被注册",
    "details": {
      "field": "email",
      "value": "user@example.com"
    }
  }
}
```

---

### 2. 用户登录

**接口**: `POST /auth/login`

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**成功响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1a2b3c4d",
      "email": "user@example.com",
      "name": "张三",
      "avatar": "https://storage.interreview.com/avatars/usr_1a2b3c4d.jpg"
    },
    "session": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "v1.MjAxNS0wMS0wMVQw...",
      "expiresIn": 3600,
      "tokenType": "Bearer"
    }
  },
  "message": "登录成功"
}
```

---

### 3. 刷新 Token

**接口**: `POST /auth/refresh`

**请求体**:
```json
{
  "refreshToken": "v1.MjAxNS0wMS0wMVQw..."
}
```

**成功响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "v1.MjAxNS0wMS0wMVQw...",
    "expiresIn": 3600
  }
}
```

---

### 4. 登出

**接口**: `POST /auth/logout`

**请求头**:
```http
Authorization: Bearer {access_token}
```

**成功响应**: `200 OK`
```json
{
  "success": true,
  "message": "登出成功"
}
```

---

### 5. 获取当前用户信息

**接口**: `GET /auth/me`

**请求头**:
```http
Authorization: Bearer {access_token}
```

**成功响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "usr_1a2b3c4d",
    "email": "user@example.com",
    "name": "张三",
    "avatar": "https://storage.interreview.com/avatars/usr_1a2b3c4d.jpg",
    "university": "清华大学",
    "graduationYear": 2025,
    "plan": "free",
    "createdAt": "2025-12-09T10:30:00Z",
    "stats": {
      "totalInterviews": 15,
      "storageUsed": 524288000,
      "storageLimit": 1073741824
    }
  }
}
```

---

## 面试管理

### 6. 创建面试记录

**接口**: `POST /interviews`

**描述**: 创建一条新的面试记录（不包含音频上传）

**请求头**:
```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求体**:
```json
{
  "title": "字节跳动 - 前端工程师一面",
  "company": "字节跳动",
  "position": "前端工程师",
  "type": "技术面",
  "interviewDate": "2025-12-08T14:00:00Z",
  "notes": "一面，主要考察 React 和算法"
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 面试标题，1-100 字符 |
| company | string | 是 | 公司名称 |
| position | string | 是 | 应聘岗位 |
| type | string | 是 | 面试类型：`技术面` / `行为面` / `HR面` / `其他` |
| interviewDate | string | 是 | 面试时间，ISO 8601 格式 |
| notes | string | 否 | 备注信息，最多 500 字符 |

**成功响应**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "itv_5f6g7h8i",
    "title": "字节跳动 - 前端工程师一面",
    "company": "字节跳动",
    "position": "前端工程师",
    "type": "技术面",
    "interviewDate": "2025-12-08T14:00:00Z",
    "status": "pending_upload",
    "notes": "一面，主要考察 React 和算法",
    "createdAt": "2025-12-09T10:30:00Z",
    "updatedAt": "2025-12-09T10:30:00Z"
  },
  "message": "创建成功"
}
```

---

### 7. 获取面试列表

**接口**: `GET /interviews`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20，最大 100 |
| status | string | 否 | 筛选状态：`pending_upload` / `transcribing` / `analyzing` / `completed` |
| company | string | 否 | 筛选公司 |
| sortBy | string | 否 | 排序字段：`createdAt` / `interviewDate` / `rating`，默认 `createdAt` |
| order | string | 否 | 排序方向：`asc` / `desc`，默认 `desc` |

**请求示例**:
```http
GET /interviews?page=1&pageSize=20&status=completed&sortBy=interviewDate&order=desc
```

**成功响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "itv_5f6g7h8i",
        "title": "字节跳动 - 前端工程师一面",
        "company": "字节跳动",
        "position": "前端工程师",
        "type": "技术面",
        "interviewDate": "2025-12-08T14:00:00Z",
        "status": "completed",
        "rating": 4,
        "overallScore": 85,
        "createdAt": "2025-12-09T10:30:00Z",
        "updatedAt": "2025-12-09T11:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### 8. 获取面试详情

**接口**: `GET /interviews/{interviewId}`

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| interviewId | string | 面试 ID |

**成功响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "itv_5f6g7h8i",
    "title": "字节跳动 - 前端工程师一面",
    "company": "字节跳动",
    "position": "前端工程师",
    "type": "技术面",
    "interviewDate": "2025-12-08T14:00:00Z",
    "status": "completed",
    "rating": 4,
    "notes": "一面，主要考察 React 和算法",
    "audioUrl": "https://storage.interreview.com/audio/itv_5f6g7h8i.m4a",
    "audioDuration": 3600,
    "audioSize": 52428800,
    "transcript": "面试官：请介绍一下你自己...",
    "analysis": {
      "overallScore": 85,
      "strengthAnalysis": "技术基础扎实，React 掌握较好...",
      "weaknessAnalysis": "对于性能优化的理解还不够深入...",
      "improvements": [
        "加强对 React 性能优化的学习",
        "多做算法题，提升编码速度"
      ],
      "questions": [
        {
          "question": "请介绍一下你自己",
          "answer": "我是一名...",
          "score": 90,
          "feedback": "自我介绍清晰，亮点突出"
        }
      ],
      "nextRoundPrediction": "二面可能会深入考察项目经验和系统设计能力"
    },
    "createdAt": "2025-12-09T10:30:00Z",
    "updatedAt": "2025-12-09T11:00:00Z"
  }
}
```

---

### 9. 更新面试信息

**接口**: `PATCH /interviews/{interviewId}`

**请求体**:
```json
{
  "title": "字节跳动 - 前端工程师一面（已通过）",
  "rating": 5,
  "notes": "表现不错，已进入二面"
}
```

**可更新字段**:
| 字段 | 类型 | 说明 |
|------|------|------|
| title | string | 面试标题 |
| company | string | 公司名称 |
| position | string | 应聘岗位 |
| type | string | 面试类型 |
| interviewDate | string | 面试时间 |
| rating | number | 自评分数，1-5 星 |
| notes | string | 备注信息 |

**成功响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "itv_5f6g7h8i",
    "title": "字节跳动 - 前端工程师一面（已通过）",
    "rating": 5,
    "notes": "表现不错，已进入二面",
    "updatedAt": "2025-12-09T12:00:00Z"
  },
  "message": "更新成功"
}
```

---

### 10. 删除面试记录

**接口**: `DELETE /interviews/{interviewId}`

**请求头**:
```http
Authorization: Bearer {access_token}
```

**成功响应**: `200 OK`
```json
{
  "success": true,
  "message": "删除成功"
}
```

**说明**: 删除操作会同时删除关联的音频文件、转写文本、分析报告、对话历史等所有数据，不可恢复。

---

## 音频处理

### 11. 上传音频文件

**接口**: `POST /interviews/{interviewId}/upload`

**描述**: 上传面试录音文件

**请求头**:
```http
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**请求体**:
```
multipart/form-data
- audio: File (音频文件)
```

**支持的音频格式**:
- `.mp3`
- `.m4a`
- `.wav`
- `.flac`
- `.ogg`

**文件大小限制**:
- 免费用户：最大 100MB
- VIP 用户：最大 500MB

**请求示例** (使用 FormData):
```javascript
const formData = new FormData();
formData.append('audio', audioFile);

fetch('/interviews/itv_5f6g7h8i/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer {access_token}'
  },
  body: formData
});
```

**成功响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "interviewId": "itv_5f6g7h8i",
    "audioUrl": "https://storage.interreview.com/audio/itv_5f6g7h8i.m4a",
    "audioSize": 52428800,
    "audioDuration": 3600,
    "status": "uploaded",
    "uploadedAt": "2025-12-09T10:30:00Z"
  },
  "message": "上传成功，正在转写..."
}
```

**错误响应示例**:
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "文件大小超过限制",
    "details": {
      "maxSize": 104857600,
      "actualSize": 157286400
    }
  }
}
```

---

### 12. 音频转写

**接口**: `POST /interviews/{interviewId}/transcribe`

**描述**: 将音频转换为文本（通常在上传后自动触发）

**请求体**:
```json
{
  "language": "zh-CN",
  "enableTimestamps": true,
  "speakerDiarization": true
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| language | string | 否 | 语言代码，默认 `zh-CN`，支持 `en-US` |
| enableTimestamps | boolean | 否 | 是否生成时间戳，默认 `true` |
| speakerDiarization | boolean | 否 | 是否区分说话人，默认 `true` |

**成功响应**: `202 Accepted`
```json
{
  "success": true,
  "data": {
    "taskId": "tsk_9i8u7y6t",
    "status": "processing",
    "estimatedTime": 180
  },
  "message": "转写任务已创建，预计需要 3 分钟"
}
```

**转写完成后的数据格式**:
```json
{
  "transcript": "面试官：请介绍一下你自己。\n候选人：我是一名...",
  "segments": [
    {
      "speaker": "interviewer",
      "text": "请介绍一下你自己。",
      "startTime": 0.5,
      "endTime": 3.2
    },
    {
      "speaker": "candidate",
      "text": "我是一名...",
      "startTime": 3.5,
      "endTime": 15.8
    }
  ],
  "confidence": 0.92,
  "language": "zh-CN",
  "duration": 3600
}
```

---

### 13. 获取转写状态

**接口**: `GET /interviews/{interviewId}/transcription/status`

**成功响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "processing",
    "progress": 45,
    "startedAt": "2025-12-09T10:30:00Z",
    "estimatedCompletion": "2025-12-09T10:33:00Z"
  }
}
```

**状态值**:
- `pending`: 等待转写
- `processing`: 转写中
- `completed`: 转写完成
- `failed`: 转写失败

---

## AI 分析

### 14. 生成面试分析报告

**接口**: `POST /interviews/{interviewId}/analyze`

**描述**: 基于转写文本生成 AI 分析报告

**请求体**:
```json
{
  "analyzeDepth": "detailed",
  "focusAreas": ["technical", "communication", "problem_solving"],
  "customPrompt": "请特别关注候选人的 React 技术栈掌握情况"
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| analyzeDepth | string | 否 | 分析深度：`basic` / `detailed` / `comprehensive`，默认 `detailed` |
| focusAreas | array | 否 | 关注领域数组 |
| customPrompt | string | 否 | 自定义分析提示词 |

**成功响应**: `202 Accepted`
```json
{
  "success": true,
  "data": {
    "taskId": "tsk_7h6g5f4d",
    "status": "processing",
    "estimatedTime": 60
  },
  "message": "分析任务已创建，预计需要 1 分钟"
}
```

---

### 15. 获取分析报告

**接口**: `GET /interviews/{interviewId}/analysis`

**成功响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "interviewId": "itv_5f6g7h8i",
    "overallScore": 85,
    "strengthAnalysis": "## 优势分析\n\n1. **技术基础扎实**：对 React 核心概念理解透彻...\n2. **表达清晰**：回答问题逻辑性强...",
    "weaknessAnalysis": "## 待改进方向\n\n1. **性能优化经验不足**：对于 React 性能优化手段了解有限...\n2. **算法能力需提升**：编码速度较慢...",
    "improvements": [
      "深入学习 React.memo、useMemo、useCallback 等性能优化 API",
      "每日刷 1-2 道 LeetCode 算法题，提升编码速度",
      "阅读《React 设计原理》，理解虚拟 DOM 和 Fiber 架构"
    ],
    "questions": [
      {
        "id": "q_1",
        "question": "请介绍一下你自己",
        "answer": "我是一名前端工程师，毕业于清华大学...",
        "score": 90,
        "feedback": "自我介绍清晰完整，突出了技术栈和项目经验，时间控制得当（2 分钟）。建议：可以更多强调解决过的复杂问题。",
        "tags": ["自我介绍", "基础问题"]
      },
      {
        "id": "q_2",
        "question": "说说 React Hooks 的原理",
        "answer": "React Hooks 是基于 Fiber 架构实现的...",
        "score": 80,
        "feedback": "对 Hooks 基本原理理解正确，但对闭包陷阱的解释不够深入。建议：学习 useEffect 的依赖项机制和清理函数。",
        "tags": ["React", "技术深度"]
      }
    ],
    "nextRoundPrediction": "## 下一轮预测\n\n基于本次面试表现，二面可能会：\n\n1. **深入考察项目经验**：准备 2-3 个有挑战性的项目案例...\n2. **系统设计题**：可能会问如何设计一个前端监控系统...\n3. **跨端技术**：可能涉及 React Native 或小程序开发经验",
    "keywordCloud": [
      { "text": "React", "weight": 15 },
      { "text": "性能优化", "weight": 8 },
      { "text": "算法", "weight": 6 }
    ],
    "analyzedAt": "2025-12-09T10:35:00Z",
    "version": "1.0"
  }
}
```

---

### 16. 重新生成分析报告

**接口**: `POST /interviews/{interviewId}/analysis/regenerate`

**请求体**:
```json
{
  "reason": "need_more_detail",
  "customPrompt": "请更详细分析算法题的解题思路"
}
```

**成功响应**: `202 Accepted`
```json
{
  "success": true,
  "data": {
    "taskId": "tsk_3d2c1b0a",
    "status": "processing"
  },
  "message": "正在重新生成分析报告..."
}
```

---

## 对话交互

### 17. 发送对话消息

**接口**: `POST /interviews/{interviewId}/chat`

**描述**: 向 AI 助手发送问题，获取针对性的分析回答

**请求体**:
```json
{
  "message": "请详细分析第 5 个问题的回答，给出改进建议",
  "stream": false
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | 是 | 用户消息内容，1-2000 字符 |
| stream | boolean | 否 | 是否流式返回，默认 `false` |

**成功响应（非流式）**: `200 OK`
```json
{
  "success": true,
  "data": {
    "messageId": "msg_9x8w7v6u",
    "role": "assistant",
    "content": "## 第 5 题详细分析\n\n**问题**：实现一个 debounce 函数\n\n**你的回答**：\n```javascript\nfunction debounce(fn, delay) {\n  let timer;\n  return function(...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n}\n```\n\n**评分**：75/100\n\n**分析**：\n- ✅ 基本逻辑正确\n- ❌ 未处理 this 绑定\n- ❌ 缺少立即执行模式\n- ❌ 未考虑返回值\n\n**改进建议**：\n```javascript\nfunction debounce(fn, delay, immediate = false) {\n  let timer;\n  return function(...args) {\n    const context = this;\n    const callNow = immediate && !timer;\n    \n    clearTimeout(timer);\n    timer = setTimeout(() => {\n      timer = null;\n      if (!immediate) fn.apply(context, args);\n    }, delay);\n    \n    if (callNow) fn.apply(context, args);\n  };\n}\n```",
    "timestamp": "2025-12-09T10:40:00Z",
    "usage": {
      "promptTokens": 1250,
      "completionTokens": 380,
      "totalTokens": 1630
    }
  }
}
```

**成功响应（流式）**: `200 OK`
```
Content-Type: text/event-stream

data: {"type":"start","messageId":"msg_9x8w7v6u"}

data: {"type":"content","delta":"## 第"}

data: {"type":"content","delta":" 5 题"}

data: {"type":"content","delta":"详细分析\n\n"}

...

data: {"type":"done","usage":{"totalTokens":1630}}
```

---

### 18. 获取对话历史

**接口**: `GET /interviews/{interviewId}/chat/history`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| limit | number | 否 | 返回消息数量，默认 50 |
| before | string | 否 | 消息 ID，获取该消息之前的历史 |

**成功响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_1a2b3c4d",
        "role": "user",
        "content": "帮我总结本场面试的优缺点",
        "timestamp": "2025-12-09T10:35:00Z"
      },
      {
        "id": "msg_5e6f7g8h",
        "role": "assistant",
        "content": "## 优点\n\n1. 技术基础扎实...",
        "timestamp": "2025-12-09T10:35:05Z",
        "feedback": {
          "type": "like",
          "timestamp": "2025-12-09T10:36:00Z"
        }
      }
    ],
    "hasMore": false
  }
}
```

---

### 19. 清空对话历史

**接口**: `DELETE /interviews/{interviewId}/chat/history`

**成功响应**: `200 OK`
```json
{
  "success": true,
  "message": "对话历史已清空"
}
```

---

## 导出功能

### 20. 导出为 PDF

**接口**: `GET /interviews/{interviewId}/export/pdf`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| template | string | 否 | 模板类型：`simple` / `detailed` / `professional`，默认 `detailed` |
| includeTranscript | boolean | 否 | 是否包含完整转写文本，默认 `false` |
| includeChatHistory | boolean | 否 | 是否包含对话历史，默认 `false` |

**成功响应**: `200 OK`
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="字节跳动-前端工程师一面-分析报告.pdf"

[PDF Binary Data]
```

---

### 21. 导出为 Word

**接口**: `GET /interviews/{interviewId}/export/word`

**查询参数**: 同 PDF 导出

**成功响应**: `200 OK`
```
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="字节跳动-前端工程师一面-分析报告.docx"

[Word Binary Data]
```

---

### 22. 导出为 Markdown

**接口**: `GET /interviews/{interviewId}/export/markdown`

**查询参数**: 同 PDF 导出

**成功响应**: `200 OK`
```
Content-Type: text/markdown; charset=utf-8
Content-Disposition: attachment; filename="字节跳动-前端工程师一面-分析报告.md"

# 字节跳动 - 前端工程师一面

## 基本信息
- 公司：字节跳动
- 岗位：前端工程师
- 类型：技术面
- 时间：2025-12-08 14:00
- 评分：⭐⭐⭐⭐⭐

## 综合评分
85 / 100

...
```

---

### 23. 批量导出

**接口**: `POST /interviews/export/batch`

**请求体**:
```json
{
  "interviewIds": ["itv_1", "itv_2", "itv_3"],
  "format": "pdf",
  "mergeIntoOne": true
}
```

**成功响应**: `202 Accepted`
```json
{
  "success": true,
  "data": {
    "taskId": "exp_5t4r3e2w",
    "status": "processing",
    "estimatedTime": 30
  },
  "message": "导出任务已创建"
}
```

**下载地址获取**: `GET /export/tasks/{taskId}`

---

## 搜索功能

### 24. 全局搜索

**接口**: `GET /search`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 是 | 搜索关键词 |
| type | string | 否 | 搜索类型：`all` / `title` / `company` / `content`，默认 `all` |
| limit | number | 否 | 返回数量，默认 10 |

**请求示例**:
```http
GET /search?q=React性能优化&type=content&limit=20
```

**成功响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "interviewId": "itv_5f6g7h8i",
        "title": "字节跳动 - 前端工程师一面",
        "company": "字节跳动",
        "matchType": "question",
        "matchedText": "...说说 **React** **性能优化** 有哪些手段...",
        "score": 0.92,
        "timestamp": "2025-12-08T14:00:00Z"
      }
    ],
    "total": 5,
    "query": "React性能优化",
    "searchTime": 0.05
  }
}
```

---

### 25. 搜索建议

**接口**: `GET /search/suggestions`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 是 | 搜索前缀 |
| limit | number | 否 | 返回数量，默认 5 |

**请求示例**:
```http
GET /search/suggestions?q=React&limit=5
```

**成功响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "React 性能优化",
      "React Hooks 原理",
      "React 生命周期",
      "React 虚拟 DOM",
      "React 状态管理"
    ]
  }
}
```

---

## 数据统计

### 26. 获取用户统计数据

**接口**: `GET /stats/overview`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 否 | 起始日期，ISO 8601 格式 |
| endDate | string | 否 | 结束日期，ISO 8601 格式 |

**成功响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "totalInterviews": 45,
    "completedInterviews": 38,
    "averageScore": 82.5,
    "totalDuration": 162000,
    "storageUsed": 524288000,
    "monthlyTrend": [
      {
        "month": "2025-10",
        "count": 8,
        "avgScore": 78
      },
      {
        "month": "2025-11",
        "count": 15,
        "avgScore": 81
      },
      {
        "month": "2025-12",
        "count": 22,
        "avgScore": 85
      }
    ],
    "topCompanies": [
      {
        "name": "字节跳动",
        "count": 12,
        "avgScore": 84
      },
      {
        "name": "阿里巴巴",
        "count": 10,
        "avgScore": 82
      }
    ],
    "interviewTypeDistribution": {
      "技术面": 28,
      "行为面": 12,
      "HR面": 8
    },
    "mostFrequentQuestions": [
      {
        "question": "请介绍一下你自己",
        "frequency": 38
      },
      {
        "question": "说说 React Hooks 的原理",
        "frequency": 15
      }
    ]
  }
}
```

---

### 27. 获取成长曲线

**接口**: `GET /stats/growth`

**成功响应**: `200 OK`
```json
{
  "success": true,
  "data": {
    "scoreHistory": [
      {
        "interviewId": "itv_1",
        "date": "2025-10-01",
        "score": 70,
        "company": "美团"
      },
      {
        "interviewId": "itv_2",
        "date": "2025-10-15",
        "score": 75,
        "company": "腾讯"
      }
    ],
    "trend": "improving",
    "improvementRate": 15.5
  }
}
```

---

## 反馈系统

### 28. 提交消息反馈

**接口**: `POST /feedback`

**请求体**:
```json
{
  "interviewId": "itv_5f6g7h8i",
  "messageId": "msg_9x8w7v6u",
  "type": "like",
  "comment": "分析很详细，帮助很大"
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| interviewId | string | 是 | 面试 ID |
| messageId | string | 是 | 消息 ID |
| type | string | 是 | 反馈类型：`like` / `dislike` |
| comment | string | 否 | 文字反馈，最多 500 字符 |

**成功响应**: `201 Created`
```json
{
  "success": true,
  "data": {
    "feedbackId": "fb_7y6x5w4v",
    "type": "like",
    "createdAt": "2025-12-09T10:45:00Z"
  },
  "message": "反馈已提交"
}
```

---

### 29. 撤销反馈

**接口**: `DELETE /feedback/{feedbackId}`

**成功响应**: `200 OK`
```json
{
  "success": true,
  "message": "反馈已撤销"
}
```

---

## 数据模型

### Interview（面试记录）

```typescript
interface Interview {
  id: string;                    // 面试 ID
  userId: string;                // 用户 ID
  title: string;                 // 面试标题
  company: string;               // 公司名称
  position: string;              // 应聘岗位
  type: InterviewType;           // 面试类型
  interviewDate: string;         // 面试时间（ISO 8601）
  status: InterviewStatus;       // 状态
  rating?: number;               // 自评分数（1-5）
  notes?: string;                // 备注
  audioUrl?: string;             // 音频文件 URL
  audioDuration?: number;        // 音频时长（秒）
  audioSize?: number;            // 音频大小（字节）
  transcript?: string;           // 转写文本
  analysis?: Analysis;           // 分析报告
  createdAt: string;             // 创建时间
  updatedAt: string;             // 更新时间
}

type InterviewType = '技术面' | '行为面' | 'HR面' | '其他';

type InterviewStatus = 
  | 'pending_upload'    // 待上传
  | 'uploaded'          // 已上传
  | 'transcribing'      // 转写中
  | 'analyzing'         // 分析中
  | 'completed'         // 已完成
  | 'failed';           // 失败
```

### Analysis（分析报告）

```typescript
interface Analysis {
  overallScore: number;          // 综合评分（0-100）
  strengthAnalysis: string;      // 优势分析（Markdown）
  weaknessAnalysis: string;      // 劣势分析（Markdown）
  improvements: string[];        // 改进建议列表
  questions: QuestionAnalysis[]; // 问题分析列表
  nextRoundPrediction: string;   // 下轮预测（Markdown）
  keywordCloud?: KeywordItem[];  // 关键词云
  analyzedAt: string;            // 分析时间
  version: string;               // 版本号
}

interface QuestionAnalysis {
  id: string;                    // 问题 ID
  question: string;              // 问题内容
  answer: string;                // 回答内容
  score: number;                 // 得分（0-100）
  feedback: string;              // 反馈建议
  tags: string[];                // 标签
}

interface KeywordItem {
  text: string;                  // 关键词
  weight: number;                // 权重
}
```

### Message（对话消息）

```typescript
interface Message {
  id: string;                    // 消息 ID
  interviewId: string;           // 面试 ID
  role: 'user' | 'assistant';    // 角色
  content: string;               // 消息内容（Markdown）
  timestamp: string;             // 时间戳
  feedback?: Feedback;           // 反馈
  usage?: TokenUsage;            // Token 使用量
}

interface Feedback {
  type: 'like' | 'dislike';      // 反馈类型
  comment?: string;              // 文字反馈
  timestamp: string;             // 反馈时间
}

interface TokenUsage {
  promptTokens: number;          // 输入 Token 数
  completionTokens: number;      // 输出 Token 数
  totalTokens: number;           // 总 Token 数
}
```

### User（用户）

```typescript
interface User {
  id: string;                    // 用户 ID
  email: string;                 // 邮箱
  name: string;                  // 姓名
  avatar?: string;               // 头像 URL
  university?: string;           // 学校
  graduationYear?: number;       // 毕业年份
  plan: 'free' | 'vip';         // 会员类型
  createdAt: string;             // 注册时间
  stats: UserStats;              // 统计信息
}

interface UserStats {
  totalInterviews: number;       // 总面试数
  storageUsed: number;           // 已用存储（字节）
  storageLimit: number;          // 存储限制（字节）
}
```

---

## Webhook 通知

对于耗时操作（转写、分析），可配置 Webhook 接收完成通知。

### 配置 Webhook

**接口**: `POST /webhooks`

**请求体**:
```json
{
  "url": "https://your-app.com/webhooks/interreview",
  "events": ["transcription.completed", "analysis.completed"],
  "secret": "whsec_abc123"
}
```

### Webhook 事件格式

```json
{
  "event": "transcription.completed",
  "timestamp": "2025-12-09T10:35:00Z",
  "data": {
    "interviewId": "itv_5f6g7h8i",
    "status": "completed",
    "transcript": "面试官：请介绍一下你自己..."
  },
  "signature": "sha256=..."
}
```

**支持的事件类型**:
- `transcription.started` - 转写开始
- `transcription.completed` - 转写完成
- `transcription.failed` - 转写失败
- `analysis.started` - 分析开始
- `analysis.completed` - 分析完成
- `analysis.failed` - 分析失败

---

## 附录

### 环境变量配置

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Whisper (如果使用单独的转写服务)
WHISPER_API_KEY=...

# 应用配置
MAX_FILE_SIZE_MB=100
MAX_AUDIO_DURATION_SECONDS=7200
RATE_LIMIT_PER_MINUTE=100
```

### 费率限制响应头

所有 API 响应都会包含限流信息：

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702123456
```

### Postman Collection

完整的 Postman Collection 可从以下地址下载：
```
https://api.interreview.com/v1/postman-collection.json
```

---

## 更新日志

### v1.0.0 (2025-12-09)
- ✅ 初始版本
- ✅ 支持用户认证
- ✅ 支持音频上传和转写
- ✅ 支持 AI 分析报告
- ✅ 支持对话式追问
- ✅ 支持导出功能（PDF/Word/Markdown）
- ✅ 支持全局搜索
- ✅ 支持数据统计

---

**技术支持**: support@interreview.com  
**开发者社区**: https://community.interreview.com
