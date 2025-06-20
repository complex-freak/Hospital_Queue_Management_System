from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from uuid import UUID
from datetime import datetime, timedelta
from database import get_db
from models import Patient, User, Appointment, Queue, QueueStatus, UrgencyLevel, UserRole
from schemas import (
    PatientCreate, AppointmentCreate, AppointmentUpdate,
    Patient as PatientSchema, Appointment as AppointmentSchema,
    Queue as QueueSchema, QueueUpdate, DashboardStats, QueueCreate,
    Token, UserLogin, User as UserSchema
)
from services import AuthService, AppointmentService, QueueService, NotificationService
from api.dependencies import require_staff, log_audit_event
from api.core.security import create_access_token
from api.core.config import settings

router = APIRouter()

@router.post("/patients/register", response_model=PatientSchema)
async def register_patient_by_staff(
    request: Request,
    background_tasks: BackgroundTasks,
    patient_data: PatientCreate,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Register a new patient (staff only)"""
    try:
        patient = await AuthService.register_patient(db, patient_data)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="REGISTER_PATIENT",
            resource="patient",
            resource_id=patient.id,
            details=f"Staff {current_user.username} registered patient {patient.phone_number}",
            db=db
        )
        
        return patient
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Patient registration failed"
        )

@router.post("/appointments", response_model=AppointmentSchema)
async def create_appointment(
    request: Request,
    background_tasks: BackgroundTasks,
    appointment_data: AppointmentCreate,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Create new appointment"""
    try:
        # Verify patient exists
        result = await db.execute(
            select(Patient).where(Patient.id == appointment_data.patient_id)
        )
        patient = result.scalar_one_or_none()
        
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        appointment = await AppointmentService.create_appointment(
            db, appointment_data, current_user.id
        )
        
        # Add to queue
        queue_entry = await QueueService.add_to_queue(
            db, appointment.id, appointment.urgency_level
        )
        
        # Send notification
        background_tasks.add_task(
            NotificationService.send_appointment_confirmation,
            patient.phone_number,
            {
                'patient_name': patient.full_name,
                'queue_number': queue_entry.queue_number,
                'appointment_id': str(appointment.id)
            }
        )
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="CREATE_APPOINTMENT",
            resource="appointment",
            resource_id=appointment.id,
            details=f"Staff {current_user.username} created appointment for patient {patient.phone_number}",
            db=db
        )
        
        return appointment
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Appointment creation failed"
        )

@router.get("/appointments", response_model=List[AppointmentSchema])
async def get_appointments(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get all appointments (staff view)"""
    try:
        query = select(Appointment).order_by(desc(Appointment.created_at))
        
        if status_filter:
            query = query.where(Appointment.status == status_filter)
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        appointments = result.scalars().all()
        
        return appointments
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch appointments"
        )

@router.put("/appointments/{appointment_id}", response_model=AppointmentSchema)
async def update_appointment(
    appointment_id: UUID,
    appointment_update: AppointmentUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Update appointment details"""
    try:
        result = await db.execute(
            select(Appointment).where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one_or_none()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        appointment = await AppointmentService.update_appointment(
            db, appointment_id, appointment_update
        )
        
        # If urgency changed, update queue priority
        if appointment_update.urgency_level:
            await QueueService.update_queue_priority(
                db, appointment_id, appointment_update.urgency_level
            )
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="UPDATE_APPOINTMENT",
            resource="appointment",
            resource_id=appointment.id,
            details=f"Staff {current_user.username} updated appointment {appointment_id}",
            db=db
        )
        
        return appointment
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Appointment update failed"
        )

@router.get("/queue", response_model=List[QueueSchema])
async def get_queue_status(
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get current queue status"""
    try:
        return await QueueService.get_queue_status(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch queue status"
        )

@router.put("/queue/{queue_id}", response_model=QueueSchema)
async def update_queue_entry(
    queue_id: UUID,
    queue_update: QueueUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Update queue entry (reorder, change priority)"""
    try:
        queue_entry = await QueueService.update_queue_entry(
            db, queue_id, queue_update
        )
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="UPDATE_QUEUE",
            resource="queue",
            resource_id=queue_id,
            details=f"Staff {current_user.username} updated queue entry {queue_id}",
            db=db
        )
        
        return queue_entry
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Queue update failed"
        )

@router.post("/queue/{queue_id}/call-next")
async def call_next_patient(
    queue_id: UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Call next patient in queue"""
    try:
        # Get queue entry with appointment and patient data
        result = await db.execute(
            select(Queue, Appointment, Patient)
            .join(Appointment, Queue.appointment_id == Appointment.id)
            .join(Patient, Appointment.patient_id == Patient.id)
            .where(Queue.id == queue_id)
        )
        queue_data = result.first()
        
        if not queue_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Queue entry not found"
            )
        
        queue_entry, appointment, patient = queue_data
        
        # Update queue status to called
        await QueueService.call_patient(db, queue_id)
        
        # Send notification to patient
        background_tasks.add_task(
            NotificationService.send_patient_called_notification,
            patient.phone_number,
            {
                'patient_name': patient.full_name,
                'queue_number': queue_entry.queue_number
            }
        )
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="CALL_PATIENT",
            resource="queue",
            resource_id=queue_id,
            details=f"Staff {current_user.username} called patient {patient.phone_number}",
            db=db
        )
        
        return {"message": "Patient called successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to call patient"
        )

@router.get("/patients/search")
async def search_patients(
    q: str,
    limit: int = 10,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Search patients by phone number or name"""
    try:
        if len(q) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Search query must be at least 2 characters"
            )
        
        # Search by phone number or full name
        result = await db.execute(
            select(Patient).where(
                and_(
                    Patient.phone_number.ilike(f"%{q}%") |
                    Patient.full_name.ilike(f"%{q}%")
                )
            ).limit(limit)
        )
        patients = result.scalars().all()
        
        return patients
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Patient search failed"
        )

@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard statistics for staff"""
    try:
        # Total patients today
        today_patients = await db.execute(
            select(func.count(Appointment.id))
            .where(func.date(Appointment.created_at) == func.current_date())
        )
        
        # Current queue length
        queue_length = await db.execute(
            select(func.count(Queue.id))
            .where(Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED]))
        )
        
        # Urgent cases
        urgent_cases = await db.execute(
            select(func.count(Queue.id))
            .join(Appointment, Queue.appointment_id == Appointment.id)
            .where(
                and_(
                    Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED]),
                    Appointment.urgency_level == UrgencyLevel.URGENT
                )
            )
        )
        
        # Average wait time (in minutes)
        avg_wait_time = await db.execute(
            select(func.avg(
                func.extract('epoch', Queue.updated_at - Queue.created_at) / 60
            ))
            .where(
                and_(
                    Queue.status == QueueStatus.SERVED,
                    func.date(Queue.created_at) == func.current_date()
                )
            )
        )
        
        return DashboardStats(
            total_patients_today=today_patients.scalar() or 0,
            current_queue_length=queue_length.scalar() or 0,
            urgent_cases=urgent_cases.scalar() or 0,
            average_wait_time=int(avg_wait_time.scalar() or 0)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard stats"
        )

@router.post("/queue", response_model=QueueSchema)
async def create_queue(
    queue_data: QueueCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Create a new queue"""
    try:
        queue = await QueueService.create_queue(db, queue_data)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="CREATE_QUEUE",
            resource="queue",
            resource_id=queue.id,
            details=f"Staff {current_user.username} created queue",
            db=db
        )
        
        return queue
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Queue creation failed: {str(e)}"
        )

@router.post("/queue/entries", response_model=QueueSchema)
async def create_queue_entry(
    entry_data: dict,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Add a patient to the queue"""
    try:
        # Extract data
        queue_id = entry_data.get("queue_id")
        patient_id = entry_data.get("patient_id")
        priority = entry_data.get("priority", "normal")
        estimated_duration = entry_data.get("estimated_duration_minutes", 15)
        
        # Create queue entry
        queue_entry = await QueueService.add_to_queue(
            db, 
            patient_id=patient_id,
            queue_id=queue_id,
            priority=priority,
            estimated_duration=estimated_duration
        )
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="CREATE_QUEUE_ENTRY",
            resource="queue_entry",
            resource_id=queue_entry.id,
            details=f"Staff {current_user.username} added patient to queue",
            db=db
        )
        
        return queue_entry
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Queue entry creation failed: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login_staff(
    request: Request,
    background_tasks: BackgroundTasks,
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Staff/Receptionist login"""
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
            details=f"Failed login attempt for staff username {login_data.username}",
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
    
    # Verify user is staff or receptionist
    if user.role not in [UserRole.STAFF, UserRole.RECEPTIONIST]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. User is not staff or receptionist."
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
        details=f"Successful {user.role} login",
        db=db
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout_staff(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Staff/Receptionist logout"""
    try:
        # Log successful logout
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="LOGOUT",
            resource="user",
            resource_id=current_user.id,
            details=f"{current_user.role} {current_user.username} logged out",
            db=db
        )
        
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

@router.get("/me", response_model=UserSchema)
async def get_current_staff(
    current_user: User = Depends(require_staff)
):
    """Get current authenticated staff/receptionist profile"""
    return current_user