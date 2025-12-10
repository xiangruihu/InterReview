"""
InterReview Backend

启动命令:
    开发模式: python -m app
    或者: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

环境变量配置 (在 backend/.env):
    DASHSCOPE_API_KEY=your_dashscope_api_key
    SILICONFLOW_API_KEY=your_siliconflow_api_key
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
