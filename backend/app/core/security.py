from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import uuid

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Generate a password hash.
    """
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    """
    to_encode = data.copy()
    
    # Set expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Add claims to token payload
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4())  # Unique token ID
    })
    
    # Encode with JWT
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.JWT_SECRET_KEY, 
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Validate and decode JWT token to get current user.
    This will be implemented with the User model.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode JWT token
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        # Extract sub (user ID) from payload
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
        # Future: fetch user from database
        # For now, return the payload as placeholder
        return payload
        
    except JWTError:
        raise credentials_exception

async def get_current_active_user(current_user = Depends(get_current_user)):
    """
    Check if the current user is active.
    Will be extended when User model is implemented.
    """
    # Placeholder for now - will check active status in real implementation
    return current_user

async def get_current_active_staff(current_user = Depends(get_current_active_user)):
    """
    Check if the current user is staff.
    """
    # Placeholder: Check role from JWT payload
    role = current_user.get("role", "")
    if role not in ["receptionist", "doctor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    return current_user

async def get_current_active_admin(current_user = Depends(get_current_active_user)):
    """
    Check if the current user is an admin.
    """
    # Placeholder: Check role from JWT payload
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user 