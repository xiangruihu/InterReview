# InterReview 后端 API 文档

## 环境要求

```bash
cd backend

# 激活虚拟环境
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动后端
uvicorn app.main:app --reload
# 或者: python -m app
```

## API 端点

### 健康检查

```http
GET /healthz
```

Response:
```json
{
  "status": "healthy",
  "version": "0.2.0"
}
```

### 用户管理

#### 注册用户

```http
POST /users/register
```

Request Body:
```json
{
  "username": "张三",
  "email": "zhangsan@example.com"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "userId": "uuid-here",
    "username": "张三",
    "email": "zhangsan@example.com",
    "createdAt": "2025-12-10T16:00:00",
    "version": 1
  }
}
```

#### 获取用户信息

```http
GET /users/{user_id}
```

Response:
```json
{
  "success": true,
  "data": {
    "userId": "uuid-here",
    "username": "张三",
    "email": "zhangsan@example.com",
    "createdAt": "2025-12-10T16:00:00",
    "version": 1
  }
}
```

#### 获取用户的所有面试

```http
GET /users/{user_id}/interviews
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "interview-uuid-here",
      "title": "小红书前端面试",
      "company": "小红书科技有限公司",
      "position": "高级前端工程师",
      "status": "已完成",
      "date": "2025-12-08T10:00:00",
      "createdAt": "2025-12-10T16:00:00"
    }
  ]
}
```

### 面试管理

#### 创建面试

```http
POST /interviews/?user_id={user_id}
```

Request Body:
```json
{
  "title": "小红书前端面试",
  "company": "小红书科技有限公司",
  "position": "高级前端工程师",
  "date": "2025-12-08T10:00:00"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "interview-uuid-here",
    "title": "小红书前端面试",
    "company": "小红书科技有限公司",
    "position": "高级前端工程师",
    "status": "待上传",
    "date": "2025-12-08T10:00:00",
    "createdAt": "2025-12-10T16:00:00",
    "updatedAt": "2025-12-10T16:00:00"
  }
}
```

#### 获取面试详情

```http
GET /interviews/{interview_id}?user_id={user_id}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "interview-uuid-here",
    "title": "小红书前端面试",
    "company": "小红书科技有限公司",
    "position": "高级前端工程师",
    "status": "已上传文件",
    "date": "2025-12-08T10:00:00",
    "createdAt": "2025-12-10T16:00:00",
    "updatedAt": "2025-12-10T16:00:00",
    "fileUrl": "/uploads/user-id/filename.mp3",
    "fileType": "audio/mpeg"
  }
}
```

#### 更新面试

```http
PATCH /interviews/{interview_id}?user_id={user_id}
```

Request Body:
```json
{
  "title": "更新后的标题（可选）",
  "company": "更新后的公司（可选）",
  "status": "分析中（可选）"
}
```

Response:
```json
{
  "success": true,
  "message": "面试更新成功"
}
```

#### 删除面试

```http
DELETE /interviews/{interview_id}?user_id={user_id}
```

Response:
```json
{
  "success": true,
  "message": "面试删除成功"
}
```

#### 获取用户的所有面试

```http
GET /interviews/?user_id={user_id}
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "interview-uuid-here",
      "title": "小红书前端面试",
      "company": "小红书科技有限公司",
      "position": "高级前端工程师",
      "status": "已完成",
      "date": "2025-12-08T10:00:00",
      "createdAt": "2025-12-10T16:00:00",
      "updatedAt": "2025-12-10T16:00:00"
    }
  ]
}
```

## 状态说明

面试状态说明:
- 待上传: 刚创建，等待上传文件
- 分析中: 文件已上传，AI正在分析
- 已完成: AI分析完成，可查看报告
- 分析失败: AI分析出错

## 下一步开发

待实现的功能:
1. 文件上传 API (`POST /upload/interview/{user_id}/{interview_id}`)
2. 分析结果 API (`GET /users/{user_id}/analysis/{interview_id}`)
3. 语音转录服务
4. LLM 面试分析服务
5. 异步任务队列 (Celery + Redis)
6. 后端 LLM 对话代理
7. Supabase 数据库迁移（当前使用本地 JSON 存储）

## 完整 API 文档

启动后端后，访问 Swagger UI:
http://localhost:8000/docs
