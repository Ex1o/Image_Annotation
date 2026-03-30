from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # JWT Settings
    JWT_SECRET_KEY: str = "your-secret-key-change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24
    
    # Email Settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@visionrapid.com"
    
    # Frontend URL
    FRONTEND_URL: str = "http://localhost:5173"
    
    # App Settings
    APP_NAME: str = "VisionRapid"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
