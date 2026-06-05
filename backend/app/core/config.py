from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    PINECONE_API_KEY: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    GOOGLE_API_KEY: str
    DEFAULT_MODEL: str
    FRONTEND_URL: str
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    GCS_BUCKET_NAME: str = "my-enterprise-hr-docs"

    ENCRYPTION_KEY: str

    SYSTEM_EMAIL_ADDRESS: str
    SYSTEM_EMAIL_APP_PASSWORD: SecretStr
    HR_DEPARTMENT_EMAIL: str

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()