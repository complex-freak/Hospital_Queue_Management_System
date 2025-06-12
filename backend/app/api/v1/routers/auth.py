from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import (
    create_access_token, 
    verify_password, 
    get_current_active_user
)
from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from pydantic import BaseModel, EmailStr
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])

# Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    
class TokenData(BaseModel):
    user_id: str
    role: str
    
class UserLogin(BaseModel):
    username: str
    password: str
    
class RefreshToken(BaseModel):
    refresh_token: str

@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user and provide JWT access token
    """
    # TODO: Replace with actual DB lookup once User model is fully integrated
    # This is a placeholder implementation for now
    
    # Placeholder: Hard-coded credentials for development only
    if form_data.username == "admin" and form_data.password == "admin123":
        # Create token payload
        token_data = {
            "sub": "admin-id", 
            "role": "admin",
            "username": "admin"
        }
        
        # Create access token
        access_token = create_access_token(
            data=token_data,
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    
    # If authentication fails
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: RefreshToken,
    current_user = Depends(get_current_active_user)
):
    """
    Refresh access token using refresh token
    """
    # In a real implementation, we would verify the refresh token from the database
    # For now, we just issue a new token based on the current user's data
    
    # Create access token with existing user data
    access_token = create_access_token(
        data={"sub": current_user.get("sub"), "role": current_user.get("role")},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=TokenData)
async def read_users_me(current_user = Depends(get_current_active_user)):
    """
    Get current user information from token
    """
    return {
        "user_id": current_user.get("sub"),
        "role": current_user.get("role")
    } 