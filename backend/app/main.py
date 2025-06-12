from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}'
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Hospital Queue API",
    description="API for the Hospital Queue Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=lambda request: request.client.host)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Import routers after app creation to avoid circular imports
from app.api.v1.routers import health

# Include routers
app.include_router(health.router, tags=["health"])

# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """
    Root endpoint returning API information.
    """
    return {
        "app": "Hospital Queue API",
        "version": "1.0.0",
        "docs": "/docs",
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up Hospital Queue API")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Hospital Queue API") 