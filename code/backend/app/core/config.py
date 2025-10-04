"""
Configuration settings for the Drone Imagery API
"""

from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Server Configuration
    PORT: int = 8001
    HOST: str = "0.0.0.0"
    DEBUG: bool = True
    
    # CORS Configuration
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 104857600  # 100MB in bytes
    
    # Supported file formats
    SUPPORTED_FORMATS: List[str] = ["image/jpeg", "image/png", "image/tiff"]
    
    # Node ODM Configuration
    NODEODM_URL: str = "http://localhost:3000"
    NODEODM_TIMEOUT: int = 3600  # 1 hour
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
