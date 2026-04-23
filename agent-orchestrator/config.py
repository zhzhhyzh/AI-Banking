from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Spring Boot Banking Core
    banking_core_url: str = "http://localhost:8081/api/v1"

    # Ollama LLM
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    # Redis
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
