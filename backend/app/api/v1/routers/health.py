from fastapi import APIRouter, Depends, status
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
import datetime

router = APIRouter(prefix="/health", tags=["health"])

@router.get("")
async def health_check():
    """
    Basic health check endpoint.
    Returns the current time and status.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.now().isoformat(),
    }

@router.get("/db")
async def db_health_check(db: AsyncSession = Depends(get_db)):
    """
    Database health check endpoint.
    Verifies the database connection is working.
    """
    try:
        # Execute simple query to check DB connection
        result = await db.execute("SELECT 1")
        if result:
            return {
                "status": "database connected",
                "timestamp": datetime.datetime.now().isoformat(),
            }
    except Exception as e:
        return {
            "status": "database error",
            "error": str(e),
            "timestamp": datetime.datetime.now().isoformat(),
        } 