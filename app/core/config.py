from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./ergonomia.db"
    secret_key: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    openai_api_key: str = ""
    upload_dir: str = "uploads"
    # Orígenes CORS separados por coma (Vite, Tauri dev, Capacitor, etc.)
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:1420,http://127.0.0.1:1420,"
        "capacitor://localhost,http://localhost,https://localhost"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
