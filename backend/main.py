from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
import logging
import time
from contextlib import asynccontextmanager

from api.core.config import settings
from api.routes import patient, staff, doctor, admin
from api.routes.sync import router as sync_router
from api.routes.notifications import router as notifications_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info(f"Starting {settings.API_NAME}...")
    yield
    # Shutdown
    logger.info("Shutting down...")

# Create FastAPI app
app = FastAPI(
    title=settings.API_NAME,
    description="A comprehensive queue management system for healthcare facilities",
    version=settings.API_VERSION,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url}")
    
    response = await call_next(request)
    
    # Log response
    process_time = time.time() - start_time
    logger.info(
        f"Response: {response.status_code} - "
        f"Process time: {process_time:.4f}s"
    )
    
    return response

# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"HTTP Exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error",
            "status_code": 500
        }
    )

# Health check endpoint
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "timestamp": time.time()
    }

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": settings.API_NAME,
        "version": settings.API_VERSION,
        "docs": "/docs",
        "health": "/api/v1/health"
    }

# Include routers with prefixes
app.include_router(
    patient.router,
    prefix=f"{settings.API_V1_STR}/patient",
    tags=["Patients"]
)

app.include_router(
    staff.router,
    prefix=f"{settings.API_V1_STR}/staff",
    tags=["Staff"]
)

app.include_router(
    doctor.router,
    prefix=f"{settings.API_V1_STR}/doctor",
    tags=["Doctors"]
)

app.include_router(
    admin.router,
    prefix=f"{settings.API_V1_STR}/admin",
    tags=["Admin"]
)

app.include_router(
    sync_router,
    prefix=f"{settings.API_V1_STR}/sync",
    tags=["Sync"]
)

app.include_router(
    notifications_router,
    prefix=f"{settings.API_V1_STR}/notifications",
    tags=["Notifications"]
)

# Custom OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=settings.API_NAME,
        version=settings.API_VERSION,
        description="A comprehensive queue management system for healthcare facilities",
        routes=app.routes,
    )
    
    # Add security scheme
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower()
    )