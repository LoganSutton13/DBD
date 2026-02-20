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
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001", 
        "http://127.0.0.1:3002",
        "http://localhost:8080",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    
    # File Storage
    UPLOAD_DIR: str = "./uploads"
    RESULTS_DIR: str = "./results"
    MAX_FILE_SIZE: int = 104857600  # 100MB in bytes
    UPLOAD_CHUNK_SIZE_BYTES: int = 5 * 1024 * 1024  # 5MB default for chunked uploads
    
    # Supported file formats (MIME types for images)
    SUPPORTED_FORMATS: List[str] = ["image/jpeg", "image/png", "image/tiff", "image/tif"]
    # Allowed auxiliary file extensions (GNSS/IMU/sensor; validate case-insensitively)
    ALLOWED_AUXILIARY_EXTENSIONS: List[str] = [".nav", ".obs", ".bin", ".mrk"]
    # Allowed image extensions (for chunked upload finalize where content_type is not available)
    ALLOWED_IMAGE_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".tif", ".tiff"]

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
