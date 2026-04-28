from pathlib import Path

from pydantic_settings import BaseSettings


# Resolve the repo-root .env regardless of the process CWD
# (uvicorn is usually launched from agent-orchestrator/).
_ROOT_ENV = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    # Spring Boot Banking Core
    banking_core_url: str = "http://localhost:8081/api/v1"

    # LLM Provider: "ollama" (local) or "groq" (cloud, free tier)
    llm_provider: str = "ollama"

    # Ollama (local dev)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1"

    # Groq (production - free tier)
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-70b-versatile"

    # Redis
    redis_url: str = ""  # Use REDIS_URL for Upstash/production
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0

    # JWT
    jwt_secret: str = "change-me-in-production"

    # CORS
    cors_allowed_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000"

    class Config:
        env_file = str(_ROOT_ENV) if _ROOT_ENV.exists() else ".env"
        extra = "ignore"


settings = Settings()
