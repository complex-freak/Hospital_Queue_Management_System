from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
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
from services import AuthService, PatientService, NotificationService
from api.dependencies import require_admin, log_audit_event
from api.core.security import create_access_token
from api.core.config import settings

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_admin(
    request: Request,
    background_tasks: BackgroundTasks,
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Admin login"""
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
            action="LOGIN_FAILED",
            resource="user",
            details=f"Failed login attempt for username {login_data.username}",
            db=db
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
        action="LOGIN",
        resource="user",
        resource_id=user.id,
        details="Successful admin login",
        db=db
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
            action="CREATE_USER",
            resource="user",
            resource_id=user.id,
            details=f"New user created: {user.username} with role {user.role}",
            db=db
        )
        
        return user
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
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
        
        user = await AuthService.update_user(db, user_id, user_update)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="UPDATE_USER",
            resource="user",
            resource_id=user_id,
            details=f"Admin {current_user.username} updated user {user.username}",
            db=db
        )
        
        return user
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
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
            action="DELETE_USER",
            resource="user",
            resource_id=user_id,
            details=f"Admin {current_user.username} deactivated user {user.username}",
            db=db
        )
        
        return {"message": "User deactivated successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User deletion failed"
        )

@router.post("/doctors", response_model=DoctorSchema)
async def create_doctor(
    doctor_data: DoctorCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new doctor"""
    try:
        doctor = await AuthService.create_doctor(db, doctor_data)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="CREATE_DOCTOR",
            resource="doctor",
            resource_id=doctor.id,
            details=f"Admin {current_user.username} created doctor {doctor.full_name}",
            db=db
        )
        
        return doctor
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
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
            select(Doctor).order_by(Doctor.full_name).offset(skip).limit(limit)
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
        
        doctor = await AuthService.update_doctor(db, doctor_id, doctor_update)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="UPDATE_DOCTOR",
            resource="doctor",
            resource_id=doctor_id,
            details=f"Admin {current_user.username} updated doctor {doctor.full_name}",
            db=db
        )
        
        return doctor
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
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
        query = select(AuditLog).order_by(desc(AuditLog.timestamp))
        
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
                    Queue.status == QueueStatus.SERVED,
                    Queue.created_at >= start_date
                )
            )
            .group_by(func.date(Queue.created_at))
            .order_by(func.date(Queue.created_at))
        )
        
        # Most active doctors
        doctor_activity = await db.execute(
            select(
                Doctor.full_name,
                func.count(Appointment.id).label('appointment_count')
            )
            .join(Appointment, Doctor.id == Appointment.doctor_id)
            .where(Appointment.created_at >= start_date)
            .group_by(Doctor.id, Doctor.full_name)
            .order_by(desc(func.count(Appointment.id)))
            .limit(10)
        )
        
        # Urgency level distribution
        urgency_distribution = await db.execute(
            select(
                Appointment.urgency_level,
                func.count(Appointment.id).label('count')
            )
            .where(Appointment.created_at >= start_date)
            .group_by(Appointment.urgency_level)
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
                {"doctor_name": row.full_name, "appointment_count": row.appointment_count}
                for row in doctor_activity.all()
            ],
            urgency_distribution=[
                {"urgency_level": row.urgency_level.value, "count": row.count}
                for row in urgency_distribution.all()
            ]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch system analytics"
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
            action="CREATE_PATIENT",
            resource="patient",
            resource_id=patient.id,
            details=f"Admin {current_user.username} created patient with phone {patient.phone_number}",
            db=db
        )
        
        return patient
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException as e:
        raise e
    except Exception as e:
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
        notification = Notification(
            patient_id=patient_id,
            type=NotificationType(notification_type),
            recipient=recipient,
            message=message,
            subject=subject,
            status="pending"
        )
        
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        
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
            action="SEND_NOTIFICATION",
            resource="notification",
            resource_id=notification.id,
            details=f"Admin {current_user.username} sent notification to patient {patient_id}",
            db=db
        )
        
        return {"message": "Notification sent successfully", "id": str(notification.id)}
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send notification: {str(e)}"
        )