from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Spring Boot Banking Core
    banking_core_url: str = "http://localhost:8081/api/v1"

    # LLM Provider: "ollama" (local) or "groq" (cloud, free tier)
    llm_provider: str = "ollama"

    # Ollama (local dev)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    # Groq (production - free tier)
    groq_api_key: str = ""
    groq_model: str = "llama3-70b-8192"

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
        env_file = ".env"


settings = Settings()
