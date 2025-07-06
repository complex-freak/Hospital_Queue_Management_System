from typing import Optional, List, Tuple
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert
from database import get_db, AsyncSessionLocal
from models import User, Patient, UserRole
from api.core.security import verify_token, create_credentials_exception
from uuid import UUID
import logging

logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    subject = verify_token(credentials.credentials)
    if subject is None:
        raise create_credentials_exception()
    
    try:
        user_id = UUID(subject)
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if user is None or not user.is_active:
            raise create_credentials_exception()
        
        return user
    except ValueError:
        raise create_credentials_exception()


async def get_current_patient(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Patient:
    """Get current authenticated patient"""
    subject = verify_token(credentials.credentials)
    if subject is None:
        raise create_credentials_exception()
    
    try:
        patient_id = UUID(subject)
        result = await db.execute(select(Patient).where(Patient.id == patient_id))
        patient = result.scalar_one_or_none()
        
        if patient is None or not patient.is_active:
            raise create_credentials_exception()
        
        return patient
    except ValueError:
        raise create_credentials_exception()


class RoleChecker:
    """Role-based access control checker"""
    
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles
    
    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            logger.warning(f"Access denied for user {current_user.username} with role {current_user.role}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user


# Role-based dependencies
require_admin = RoleChecker([UserRole.ADMIN])
require_staff = RoleChecker([UserRole.ADMIN, UserRole.STAFF, UserRole.RECEPTIONIST])
require_doctor = RoleChecker([UserRole.ADMIN, UserRole.DOCTOR])
require_admin_or_staff = RoleChecker([UserRole.ADMIN, UserRole.STAFF, UserRole.RECEPTIONIST])
require_staff_or_doctor = RoleChecker([UserRole.ADMIN, UserRole.STAFF, UserRole.RECEPTIONIST, UserRole.DOCTOR])


async def log_audit_event(
    request: Request,
    user_id: Optional[UUID] = None,
    user_type: str = "user",
    action: str = "",
    resource: str = "",
    resource_id: Optional[UUID] = None,
    details: Optional[str] = None
):
    """Log audit events (to be used with BackgroundTasks)"""
    from models import AuditLog
    
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
    
    try:
        # Create a new database session for the background task
        async with AsyncSessionLocal() as db:  # type: ignore
            await db.execute(select(1))  # Ensure connection is established
            await db.execute(insert(AuditLog).values(
                user_id=user_id,
                user_type=user_type,
                action=action,
                resource=resource,
                resource_id=resource_id,
                details=details,
                ip_address=client_ip,
                user_agent=request.headers.get("user-agent", "")
            ))
            await db.commit()
            logger.info(f"Audit log created: {action} on {resource} by {user_type}:{user_id}")
    except Exception as e:
        logger.error(f"Failed to create audit log: {e}")


async def get_current_user_or_patient(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Tuple[Optional[User], Optional[Patient]]:
    """Get current authenticated user (either User or Patient)"""
    subject = verify_token(credentials.credentials)
    if subject is None:
        raise create_credentials_exception()
    
    try:
        entity_id = UUID(subject)
        
        # Try to find as User first
        result = await db.execute(select(User).where(User.id == entity_id))
        user = result.scalar_one_or_none()
        
        if user and user.is_active:
            return user, None
        
        # Try to find as Patient
        result = await db.execute(select(Patient).where(Patient.id == entity_id))
        patient = result.scalar_one_or_none()
        
        if patient and patient.is_active:
            return None, patient
        
        raise create_credentials_exception()
        
    except ValueError:
        raise create_credentials_exception()