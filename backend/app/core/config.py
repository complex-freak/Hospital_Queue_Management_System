from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    DATABASE_URL: str = Field(..., env='DATABASE_URL')
    JWT_SECRET_KEY: str = Field(..., env='JWT_SECRET_KEY')
    JWT_ALGORITHM: str = Field("HS256", env='JWT_ALGORITHM')
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(60, env='ACCESS_TOKEN_EXPIRE_MINUTES')
    CELERY_BROKER_URL: str = Field(..., env='CELERY_BROKER_URL')
    CELERY_RESULT_BACKEND: str = Field(..., env='CELERY_RESULT_BACKEND')
    TWILIO_ACCOUNT_SID: str = Field(..., env='TWILIO_ACCOUNT_SID')
    TWILIO_AUTH_TOKEN: str = Field(..., env='TWILIO_AUTH_TOKEN')
    TWILIO_PHONE_NUMBER: str = Field(..., env='TWILIO_PHONE_NUMBER')
    SENTRY_DSN: str = Field(None, env='SENTRY_DSN')
    ALLOWED_ORIGINS: list[str] = Field(['*'], env='ALLOWED_ORIGINS')
    API_V1_STR: str = Field("/api/v1", env='API_V1_STR')
    PROJECT_NAME: str = Field("Hospital Queue API", env='PROJECT_NAME')

    class Config:
        env_file = '.env'
        case_sensitive = True


settings = Settings() 