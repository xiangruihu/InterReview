from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Keys
    DASHSCOPE_API_KEY: str = ""
    SILICONFLOW_API_KEY: str = ""

    # Demo account
    DEMO_USER_EMAIL: str = "demo@example.com"
    DEMO_USER_PASSWORD: str = "demo123"
    DEMO_USER_ID: str = "demo-user"
    DEMO_DATA_TEMPLATE_DIR: str = "./data/demo_template"

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 200 * 1024 * 1024  # 200MB

    # LLM Settings
    DEFAULT_LLM_MODEL: str = "qwen3-max"
    TRANSCRIPTION_MODEL: str = "FunAudioLLM/SenseVoiceSmall"

    # Transcription Settings
    TRANSCRIPTION_METHOD: str = "whisper"  # "whisper" for local, "api" for online
    WHISPER_MODEL_SIZE: str = "base"  # tiny, base, small, medium, large

    # Celery
    REDIS_URL: str = "redis://localhost:6379"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
