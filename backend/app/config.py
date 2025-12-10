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
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
