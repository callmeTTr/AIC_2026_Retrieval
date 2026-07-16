from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


# Đường dẫn tuyệt đối đến thư mục backend/
BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Central configuration for the backend application."""

    app_name: str = "AIC 2026 Retrieval API"
    environment: str = "development"
    api_prefix: str = "/api/v1"

    frontend_origin: str = "http://localhost:5173"

    max_top_k: int = 1000
    max_display_results: int = 500

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()