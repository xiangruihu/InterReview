from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os
from app.api.v1 import users, interviews, upload

app = FastAPI(
    title="InterReview API",
    description="面试复盘 AI 助手后端 API",
    version="0.2.0"
)

# CORS - 允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 确保必要的目录存在
Path("data").mkdir(exist_ok=True)
Path("uploads").mkdir(exist_ok=True)

# 注册路由
app.include_router(users.router)
app.include_router(interviews.router)
app.include_router(upload.router)

# 健康检查接口
@app.get("/healthz")
async def healthz():
    return {
        "status": "healthy",
        "version": "0.2.0",
        "message": "InterReview Backend is running"
    }

@app.get("/")
async def root():
    return {"message": "InterReview API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
