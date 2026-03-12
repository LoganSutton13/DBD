"""
Drone Imagery Backend API
Main FastAPI application entry point
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.upload import router as upload_router
from app.api.v1.results import router as results_router
from app.api.v1.pathing import router as pathing_router
from app.api.v1.prescription import router as prescription_router
from app.core.config import settings
from app.schemas.common import HealthResponse, RootResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Create FastAPI app
app = FastAPI(
    title="Drone Imagery API",
    description="Backend API for drone imagery processing with Node ODM",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS if not settings.DEBUG else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoints
@app.get("/", response_model=RootResponse)
async def root():
    """Root endpoint - health check"""
    return RootResponse(message="Drone Imagery API is running", status="healthy")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="healthy", service="drone-imagery-api")

# Include API routers
app.include_router(upload_router, prefix="/api/v1/upload", tags=["upload"])
app.include_router(results_router, prefix="/api/v1/results", tags=["results"])
app.include_router(pathing_router, prefix="/api/v1/pathing", tags=["pathing"])
app.include_router(prescription_router, prefix="/api/v1/prescription", tags=["prescription"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
