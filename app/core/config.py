from functools import lru_cache

import warnings



from pydantic_settings import BaseSettings, SettingsConfigDict





class Settings(BaseSettings):

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")



    database_url: str = "sqlite:///./ergonomia.db"

    secret_key: str = "dev-secret-change-in-production"

    jwt_algorithm: str = "HS256"

    access_token_expire_minutes: int = 60

    openai_api_key: str = ""

    upload_dir: str = "uploads"

    environment: str = "development"

    cors_origins: str = (

        "http://localhost:5173,http://127.0.0.1:5173,"

        "http://localhost:1420,http://127.0.0.1:1420,"

        "capacitor://localhost,http://localhost,https://localhost"

    )



    # local | s3

    storage_backend: str = "local"

    s3_bucket: str = ""

    s3_prefix: str = "OYA-APP"

    s3_public_base_url: str = ""

    aws_region: str = "us-east-1"

    # Validez (segundos) de las URLs prefirmadas de lectura de S3.

    s3_url_expiry_seconds: int = 3600





@lru_cache

def get_settings() -> Settings:

    s = Settings()

    if s.environment == "production":

        if s.secret_key == "dev-secret-change-in-production":

            raise RuntimeError(

                "SECRET_KEY insegura en producción. Define SECRET_KEY en el despliegue Lightsail."

            )

    elif s.secret_key == "dev-secret-change-in-production":

        warnings.warn(

            "SECRET_KEY por defecto. Define SECRET_KEY en .env antes de desplegar.",

            stacklevel=2,

        )

    return s


