from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from database import get_db
from models import User, UserRole
from schemas import Token, UserLogin, User as UserSchema
from services import AuthService
from api.dependencies import log_audit_event, get_current_user
from api.core.security import create_access_token
from api.core.config import settings

router = APIRouter()

@router.post("/login", response_model=dict)
async def unified_login(
    request: Request,
    background_tasks: BackgroundTasks,
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Unified login endpoint for all user types"""
    user = await AuthService.authenticate_user(
        db, login_data.username, login_data.password
    )
    
    if not user:
        # Log failed login attempt
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=None,
            user_type="user",
            action="login",
            resource="user",
            details=f"Failed login attempt for username {login_data.username}"
        )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    
    # Log successful login
    background_tasks.add_task(
        log_audit_event,
        request=request,
        user_id=user.id,
        user_type="user",
        action="login",
        resource="user",
        resource_id=user.id,
        details=f"Successful {user.role} login"
    )
    
    # Return token and user role for frontend redirection
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_role": user.role,
        "user_id": str(user.id),
        "username": user.username
    }

@router.post("/logout")
async def unified_logout(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Unified logout endpoint"""
    try:
        # Log successful logout if user is authenticated
        if current_user:
            background_tasks.add_task(
                log_audit_event,
                request=request,
                user_id=current_user.id,
                user_type="user",
                action="logout",
                resource="user",
                resource_id=current_user.id,
                details=f"User {current_user.username} logged out"
            )
        
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

@router.get("/me", response_model=UserSchema)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current authenticated user profile"""
    return current_user 