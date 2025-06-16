"""
Health check endpoints for the Queue Management System
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime
import psutil
import os
from typing import Dict, Any

from database import get_db
from api.core.config import settings

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("/")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Queue Management System",
        "version": "1.0.0"
    }

@router.get("/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Detailed health check with database and system metrics"""
    
    health_data = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Queue Management System",
        "version": "1.0.0",
        "checks": {}
    }
    
    # Database health check
    try:
        result = await db.execute(text("SELECT 1"))
        result.fetchone()
        health_data["checks"]["database"] = {
            "status": "healthy",
            "response_time_ms": None  # Could add timing if needed
        }
    except Exception as e:
        health_data["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_data["status"] = "unhealthy"
    
    # System metrics
    try:
        health_data["checks"]["system"] = {
            "status": "healthy",
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
            "load_average": os.getloadavg() if hasattr(os, 'getloadavg') else None
        }
    except Exception as e:
        health_data["checks"]["system"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Environment check
    health_data["checks"]["environment"] = {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG
    }
    
    return health_data

@router.get("/readiness")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Readiness probe for Kubernetes deployments"""
    try:
        # Check database connectivity
        await db.execute(text("SELECT 1"))
        
        return {
            "status": "ready",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "not ready",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

@router.get("/liveness")
async def liveness_check():
    """Liveness probe for Kubernetes deployments"""
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat()
    }