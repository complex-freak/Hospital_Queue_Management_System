from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, insert, column
from uuid import UUID
from datetime import datetime, timedelta

from database import get_db
from models import User, Doctor, Patient, Appointment, Queue, AuditLog, UserRole, QueueStatus, Notification, NotificationType
from schemas import (
    UserCreate, DoctorCreate, UserUpdate, DoctorUpdate,
    User as UserSchema, Doctor as DoctorSchema,
    AdminDashboardStats, AuditLog as AuditLogSchema,
    SystemAnalytics, Token, UserLogin, PatientCreate, PatientSchema
)
from services import AuthService, PatientService
from services.notification_service import notification_service
from services.queue_analytics import get_queue_analytics
from services.appointment_analytics import get_appointment_analytics
from services.doctor_analytics import get_doctor_analytics
from services.system_analytics import get_system_overview
from api.dependencies import require_admin, log_audit_event
from api.core.security import create_access_token, get_password_hash
from api.core.config import settings

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_admin(
    request: Request,
    background_tasks: BackgroundTasks,
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Admin login (DEPRECATED: Use /auth/login instead)"""
    import warnings
    warnings.warn("This endpoint is deprecated. Use /auth/login for unified authentication.", DeprecationWarning)
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
        details="Successful admin login"
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/users", response_model=UserSchema)
async def create_user(
    user_data: UserCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Create a new user (unprotected)"""
    try:
        user = await AuthService.register_user(db, user_data)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=None,
            user_type="system",
            action="create",
            resource="user",
            resource_id=user.id,
            details=f"New user created: {user.username} with role {user.role}"
        )
        
        return user
        
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"User creation failed with error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"User creation failed: {str(e)}"
        )

@router.get("/users", response_model=List[UserSchema])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    role_filter: Optional[UserRole] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all users"""
    try:
        query = select(User).order_by(desc(User.created_at))
        
        if role_filter:
            query = query.where(User.role == role_filter)
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        users = result.scalars().all()
        
        return users
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )

@router.get("/users/{user_id}", response_model=UserSchema)
async def get_user(
    user_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get user by ID"""
    try:
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user"
        )

@router.put("/users/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update user"""
    try:
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update user fields directly
        if user_update.email is not None:
            user.email = user_update.email
        if user_update.first_name is not None:
            user.first_name = user_update.first_name
        if user_update.last_name is not None:
            user.last_name = user_update.last_name
        if user_update.is_active is not None:
            user.is_active = user_update.is_active
        
        # Always update the timestamp
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(user)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="update",
            resource="user",
            resource_id=user_id,
            details=f"Admin {current_user.username} updated user {user.username}"
        )
        
        return user
        
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User update failed"
        )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete user (soft delete by deactivating)"""
    try:
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
        
        # Soft delete by deactivating
        user.is_active = False
        await db.commit()
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="delete",
            resource="user",
            resource_id=user_id,
            details=f"Admin {current_user.username} deactivated user {user.username}"
        )
        
        return {"message": "User deactivated successfully"}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User deletion failed"
        )

@router.post("/doctors", response_model=DoctorSchema)
async def create_doctor(
    doctor_data: DoctorCreate,
    username: str,
    password: str,
    email: str,
    first_name: str,
    last_name: str,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new doctor"""
    try:
        # Create user first
        user_data = UserCreate(
            username=username,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=UserRole.DOCTOR
        )
        
        # Check if username already exists
        result = await db.execute(
            select(User).where(User.username == user_data.username)
        )
        if result.scalar_one_or_none():
            raise ValueError("Username already exists")
        
        # Create user with timestamps
        stmt = insert(User).values(
            username=user_data.username,
            password_hash=get_password_hash(user_data.password),
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=user_data.role,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        ).returning(User)
        
        result = await db.execute(stmt)
        user = result.scalar_one()
        
        # Create doctor profile
        doctor_stmt = insert(Doctor).values(
            user_id=user.id,
            specialization=doctor_data.specialization,
            license_number=doctor_data.license_number,
            department=doctor_data.department,
            consultation_fee=doctor_data.consultation_fee,
            is_available=True
        ).returning(Doctor)
        
        result = await db.execute(doctor_stmt)
        doctor = result.scalar_one()
        await db.commit()
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="create",
            resource="doctor",
            resource_id=doctor.id,
            details=f"Admin {current_user.username} created doctor {first_name} {last_name}"
        )
        
        return doctor
        
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Doctor creation failed"
        )

@router.get("/doctors", response_model=List[DoctorSchema])
async def get_doctors(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all doctors"""
    try:
        result = await db.execute(
            select(Doctor).join(User).order_by(User.first_name, User.last_name).offset(skip).limit(limit)
        )
        doctors = result.scalars().all()
        
        return doctors
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch doctors"
        )

@router.put("/doctors/{doctor_id}", response_model=DoctorSchema)
async def update_doctor(
    doctor_id: UUID,
    doctor_update: DoctorUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update doctor"""
    try:
        result = await db.execute(
            select(Doctor).where(Doctor.id == doctor_id)
        )
        doctor = result.scalar_one_or_none()
        
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )
        
        # Update doctor fields directly
        if doctor_update.specialization is not None:
            doctor.specialization = doctor_update.specialization
        if doctor_update.license_number is not None:
            doctor.license_number = doctor_update.license_number
        if doctor_update.department is not None:
            doctor.department = doctor_update.department
        if doctor_update.consultation_fee is not None:
            doctor.consultation_fee = doctor_update.consultation_fee
        if doctor_update.is_available is not None:
            doctor.is_available = doctor_update.is_available
        if doctor_update.shift_start is not None:
            doctor.shift_start = doctor_update.shift_start
        if doctor_update.shift_end is not None:
            doctor.shift_end = doctor_update.shift_end
            
        await db.commit()
        await db.refresh(doctor)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="update",
            resource="doctor",
            resource_id=doctor_id,
            details=f"Admin {current_user.username} updated doctor {doctor.user.first_name} {doctor.user.last_name}"
        )
        
        return doctor
        
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Doctor update failed"
        )

@router.get("/audit-logs", response_model=List[AuditLogSchema])
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    action_filter: Optional[str] = None,
    user_id_filter: Optional[UUID] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get audit logs"""
    try:
        query = select(AuditLog).order_by(desc(AuditLog.created_at))
        
        if action_filter:
            query = query.where(AuditLog.action == action_filter)
        
        if user_id_filter:
            query = query.where(AuditLog.user_id == user_id_filter)
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        logs = result.scalars().all()
        
        return logs
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch audit logs"
        )

@router.get("/dashboard/stats", response_model=AdminDashboardStats)
async def get_admin_dashboard_stats(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get admin dashboard statistics"""
    try:
        # Total users
        total_users = await db.execute(
            select(func.count(User.id)).where(User.is_active == True)
        )
        
        # Total doctors
        total_doctors = await db.execute(
            select(func.count(Doctor.id))
        )
        
        # Total patients
        total_patients = await db.execute(
            select(func.count(Patient.id))
        )
        
        # Appointments today
        appointments_today = await db.execute(
            select(func.count(Appointment.id))
            .where(func.date(Appointment.created_at) == func.current_date())
        )
        
        # Active queue length
        active_queue_length = await db.execute(
            select(func.count(Queue.id))
            .where(Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED]))
        )
        
        # System uptime (days since first user created)
        first_user = await db.execute(
            select(func.min(User.created_at))
        )
        first_user_date = first_user.scalar()
        system_uptime_days = 0
        if first_user_date:
            system_uptime_days = (datetime.utcnow() - first_user_date).days
        
        return AdminDashboardStats(
            total_users=total_users.scalar() or 0,
            total_doctors=total_doctors.scalar() or 0,
            total_patients=total_patients.scalar() or 0,
            appointments_today=appointments_today.scalar() or 0,
            active_queue_length=active_queue_length.scalar() or 0,
            system_uptime_days=system_uptime_days
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch admin dashboard stats"
        )

@router.get("/analytics", response_model=SystemAnalytics)
async def get_system_analytics(
    days: int = 30,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get system analytics for the last N days"""
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Daily appointment counts
        daily_appointments = await db.execute(
            select(
                func.date(Appointment.created_at).label('date'),
                func.count(Appointment.id).label('count')
            )
            .where(Appointment.created_at >= start_date)
            .group_by(func.date(Appointment.created_at))
            .order_by(func.date(Appointment.created_at))
        )
        
        # Average wait times by day
        daily_wait_times = await db.execute(
            select(
                func.date(Queue.created_at).label('date'),
                func.avg(
                    func.extract('epoch', Queue.updated_at - Queue.created_at) / 60
                ).label('avg_wait_time')
            )
            .where(
                and_(
                    Queue.status == QueueStatus.COMPLETED,
                    Queue.created_at >= start_date
                )
            )
            .group_by(func.date(Queue.created_at))
            .order_by(func.date(Queue.created_at))
        )
        
        # Most active doctors
        doctor_activity = await db.execute(
            select(
                User.first_name,
                User.last_name,
                func.count(Appointment.id).label('appointment_count')
            )
            .select_from(Doctor)
            .join(User, Doctor.user_id == User.id)
            .join(Appointment, Doctor.id == Appointment.doctor_id)
            .where(Appointment.created_at >= start_date)
            .group_by(Doctor.id, User.first_name, User.last_name)
            .order_by(desc(func.count(Appointment.id)))
            .limit(10)
        )
        
        # Urgency level distribution
        urgency_distribution = await db.execute(
            select(
                Appointment.urgency,
                func.count(Appointment.id).label('count')
            )
            .select_from(Appointment)
            .where(Appointment.created_at >= start_date)
            .group_by(Appointment.urgency)
        )
        
        return SystemAnalytics(
            daily_appointments=[
                {"date": str(row.date), "count": row.count}
                for row in daily_appointments.all()
            ],
            daily_wait_times=[
                {"date": str(row.date), "avg_wait_time": int(row.avg_wait_time or 0)}
                for row in daily_wait_times.all()
            ],
            doctor_activity=[
                {"doctor_name": f"{row.first_name} {row.last_name}", "appointment_count": row.appointment_count}
                for row in doctor_activity.all()
            ],
            urgency_distribution=[
                {"urgency_level": row.urgency.value if hasattr(row.urgency, 'value') else row.urgency, "count": row.count}
                for row in urgency_distribution.all()
            ]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch system analytics"
        )

@router.get("/analytics/queue", response_model=Dict[str, Any])
async def get_admin_queue_analytics(
    days: int = 30,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get queue analytics for admin dashboard"""
    try:
        return await get_queue_analytics(db, days)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch queue analytics: {str(e)}"
        )

@router.get("/analytics/appointments", response_model=Dict[str, Any])
async def get_admin_appointment_analytics(
    days: int = 30,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get appointment analytics for admin dashboard"""
    try:
        return await get_appointment_analytics(db, days)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch appointment analytics: {str(e)}"
        )

@router.get("/analytics/doctors", response_model=Dict[str, Any])
async def get_admin_doctor_analytics(
    days: int = 30,
    doctor_id: Optional[UUID] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get doctor analytics for admin dashboard"""
    try:
        return await get_doctor_analytics(db, days, doctor_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch doctor analytics: {str(e)}"
        )

@router.get("/analytics/system", response_model=Dict[str, Any])
async def get_admin_system_overview(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get system overview for admin dashboard"""
    try:
        return await get_system_overview(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch system overview: {str(e)}"
        )

@router.get("/me", response_model=UserSchema)
async def get_current_user(
    current_user: User = Depends(require_admin)
):
    """Get current authenticated user"""
    return current_user

@router.post("/patients", response_model=PatientSchema)
async def create_patient(
    patient_data: PatientCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new patient"""
    try:
        # Check if phone number exists
        result = await db.execute(
            select(Patient).where(Patient.phone_number == patient_data.phone_number)
        )
        existing_patient = result.scalar_one_or_none()
        if existing_patient:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )
            
        patient = await PatientService.create_patient(db, patient_data)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="create",
            resource="patient",
            resource_id=patient.id,
            details=f"Admin {current_user.username} created patient with phone {patient.phone_number}"
        )
        
        return patient
        
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Patient creation failed: {str(e)}"
        )

@router.post("/notifications", response_model=dict)
async def send_notification(
    notification_data: dict,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Send a notification"""
    try:
        patient_id = notification_data.get("patient_id")
        recipient = notification_data.get("recipient")
        message = notification_data.get("message")
        subject = notification_data.get("subject")
        notification_type = notification_data.get("type", "sms")
        
        if not patient_id or not message or not recipient:
            raise ValueError("Patient ID, recipient, and message are required")
        
        # Create notification directly
        stmt = insert(Notification).values(
            patient_id=patient_id,
            type=NotificationType(notification_type),
            recipient=recipient,
            message=message,
            subject=subject,
            status="pending"
        ).returning(Notification)
        
        result = await db.execute(stmt)
        notification = result.scalar_one()
        await db.commit()
        
        # Update status to sent
        notification.status = "sent"
        notification.sent_at = datetime.utcnow()
        await db.commit()
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="create",
            resource="notification",
            resource_id=notification.id,
            details=f"Admin {current_user.username} sent notification to patient {patient_id}"
        )
        
        return {"message": "Notification sent successfully", "id": str(notification.id)}
        
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send notification: {str(e)}"
        )

@router.post("/logout")
async def logout_admin(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin logout"""
    try:
        # Log successful logout
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="logout",
            resource="user",
            resource_id=current_user.id,
            details=f"Admin {current_user.username} logged out"
        )
        
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )