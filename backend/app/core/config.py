from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DB_URI: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    AI_DEFAULT_MODEL: str
    GOOGLE_API_KEY: str

    class Config:
        env_file = ".env"

SETTINGS = Settings()

