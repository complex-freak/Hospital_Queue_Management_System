from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from uuid import UUID
import uuid
from datetime import datetime, timedelta

from database import get_db
from models import Patient, User, Doctor, Appointment, Queue, QueueStatus, UrgencyLevel
from schemas import (
    Queue as QueueSchema, 
    Patient as PatientSchema,
    Appointment as AppointmentSchema,
    DoctorDashboardStats,
    Token,
    UserLogin,
    Doctor as DoctorSchema
)
from services import QueueService, NotificationService, AuthService
from api.dependencies import require_doctor, log_audit_event
from api.core.security import create_access_token
from api.core.config import settings

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_doctor(
    request: Request,
    background_tasks: BackgroundTasks,
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Doctor login"""
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
            details=f"Failed login attempt for doctor username {login_data.username}",
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
    
    # Verify user is a doctor
    if user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. User is not a doctor."
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
        details="Successful doctor login",
        db=db
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout_doctor(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Doctor logout"""
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
            details=f"Doctor {current_user.username} logged out",
            db=db
        )
        
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

@router.get("/me", response_model=DoctorSchema)
async def get_current_doctor(
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Get current authenticated doctor profile"""
    try:
        # Get doctor info with user relationship
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id)
        )
        doctor = result.scalar_one_or_none()
        
        # If doctor profile doesn't exist, create one automatically
        if not doctor:
            print(f"Creating doctor profile for user {current_user.username} ({current_user.id})")
            doctor = Doctor(
                id=uuid.uuid4(),
                user_id=current_user.id,
                specialization="General Medicine",  # Default values
                department="General Practice",
                is_available=True
            )
            
            db.add(doctor)
            await db.commit()
            await db.refresh(doctor)
            print(f"Created doctor profile with ID {doctor.id}")
        
        # Manually set the user attribute to avoid relationship loading errors
        doctor.user = current_user
        
        return doctor
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch doctor profile"
        )

@router.get("/queue", response_model=List[QueueSchema])
async def get_doctor_queue(
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Get queue for current doctor (prioritized view)"""
    try:
        # Get doctor info
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id)
        )
        doctor = result.scalar_one_or_none()
        
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        
        # Get queue entries with patient info, ordered by priority and queue number
        result = await db.execute(
            select(Queue, Appointment, Patient)
            .join(Appointment, Queue.appointment_id == Appointment.id)
            .join(Patient, Appointment.patient_id == Patient.id)
            .where(
                and_(
                    Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED]),
                    Appointment.doctor_id == doctor.id
                )
            )
            .order_by(
                # Urgent cases first
                Appointment.urgency_level.desc(),
                # Then by queue number
                Queue.queue_number
            )
        )
        
        queue_entries = []
        for queue, appointment, patient in result.all():
            queue_schema = QueueSchema.model_validate(queue)
            # Add patient and appointment info to the response
            queue_schema.patient = PatientSchema.model_validate(patient)
            queue_schema.appointment = AppointmentSchema.model_validate(appointment)
            queue_entries.append(queue_schema)
        
        return queue_entries
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch doctor queue"
        )

@router.get("/queue/next", response_model=Optional[QueueSchema])
async def get_next_patient(
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Get next patient in queue for current doctor"""
    try:
        # Get doctor info
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id)
        )
        doctor = result.scalar_one_or_none()
        
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        
        # Get next patient (highest priority, lowest queue number)
        result = await db.execute(
            select(Queue, Appointment, Patient)
            .join(Appointment, Queue.appointment_id == Appointment.id)
            .join(Patient, Appointment.patient_id == Patient.id)
            .where(
                and_(
                    Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED]),
                    Appointment.doctor_id == doctor.id
                )
            )
            .order_by(
                Appointment.urgency_level.desc(),
                Queue.queue_number
            )
            .limit(1)
        )
        
        queue_data = result.first()
        if not queue_data:
            return None
        
        queue, appointment, patient = queue_data
        queue_schema = QueueSchema.model_validate(queue)
        queue_schema.patient = PatientSchema.model_validate(patient)
        queue_schema.appointment = AppointmentSchema.model_validate(appointment)
        
        return queue_schema
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch next patient"
        )

@router.post("/queue/{queue_id}/serve")
async def mark_patient_served(
    queue_id: UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    notes: Optional[str] = None,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Mark patient as served"""
    try:
        # Get doctor info
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id)
        )
        doctor = result.scalar_one_or_none()
        
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        
        # Verify queue entry exists and belongs to this doctor
        result = await db.execute(
            select(Queue, Appointment, Patient)
            .join(Appointment, Queue.appointment_id == Appointment.id)
            .join(Patient, Appointment.patient_id == Patient.id)
            .where(
                and_(
                    Queue.id == queue_id,
                    Appointment.doctor_id == doctor.id
                )
            )
        )
        
        queue_data = result.first()
        if not queue_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Queue entry not found or not assigned to this doctor"
            )
        
        queue_entry, appointment, patient = queue_data
        
        # Mark as served
        await QueueService.mark_served(db, queue_id)
        
        # Update appointment status
        appointment.status = "completed"
        appointment.completed_at = datetime.utcnow()
        if notes:
            appointment.notes = notes
        
        await db.commit()
        
        # Send completion notification
        background_tasks.add_task(
            NotificationService.send_appointment_completion_notification,
            patient.phone_number,
            {
                'patient_name': patient.full_name,
                'doctor_name': f"Dr. {doctor.full_name}",
                'queue_number': queue_entry.queue_number
            }
        )
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="MARK_SERVED",
            resource="queue",
            resource_id=queue_id,
            details=f"Doctor {doctor.full_name} marked patient {patient.phone_number} as served",
            db=db
        )
        
        return {"message": "Patient marked as served successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark patient as served"
        )

@router.get("/patients/{patient_id}", response_model=PatientSchema)
async def get_patient_details(
    patient_id: UUID,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Get patient details for doctor view"""
    try:
        # Get doctor info
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id)
        )
        doctor = result.scalar_one_or_none()
        
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        
        # Verify patient has appointment with this doctor
        result = await db.execute(
            select(Patient, Appointment)
            .join(Appointment, Patient.id == Appointment.patient_id)
            .where(
                and_(
                    Patient.id == patient_id,
                    Appointment.doctor_id == doctor.id
                )
            )
        )
        
        patient_data = result.first()
        if not patient_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found or not assigned to this doctor"
            )
        
        patient, _ = patient_data
        return PatientSchema.model_validate(patient)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch patient details"
        )

@router.get("/appointments/history")
async def get_appointment_history(
    skip: int = 0,
    limit: int = 50,
    patient_id: Optional[UUID] = None,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Get appointment history for current doctor"""
    try:
        # Get doctor info
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id)
        )
        doctor = result.scalar_one_or_none()
        
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        
        query = (
            select(Appointment, Patient)
            .join(Patient, Appointment.patient_id == Patient.id)
            .where(Appointment.doctor_id == doctor.id)
            .order_by(desc(Appointment.created_at))
        )
        
        if patient_id:
            query = query.where(Appointment.patient_id == patient_id)
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        
        appointments = []
        for appointment, patient in result.all():
            appointment_schema = AppointmentSchema.model_validate(appointment)
            appointment_schema.patient = PatientSchema.model_validate(patient)
            appointments.append(appointment_schema)
        
        return appointments
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch appointment history"
        )

@router.get("/dashboard/stats", response_model=DoctorDashboardStats)
async def get_doctor_dashboard_stats(
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard statistics for doctor"""
    try:
        # Get doctor info
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id)
        )
        doctor = result.scalar_one_or_none()
        
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        
        # Patients served today
        patients_served_today = await db.execute(
            select(func.count(Appointment.id))
            .where(
                and_(
                    Appointment.doctor_id == doctor.id,
                    Appointment.status == "completed",
                    func.date(Appointment.completed_at) == func.current_date()
                )
            )
        )
        
        # Current queue length for this doctor
        current_queue_length = await db.execute(
            select(func.count(Queue.id))
            .join(Appointment, Queue.appointment_id == Appointment.id)
            .where(
                and_(
                    Appointment.doctor_id == doctor.id,
                    Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED])
                )
            )
        )
        
        # Urgent cases in queue
        urgent_cases = await db.execute(
            select(func.count(Queue.id))
            .join(Appointment, Queue.appointment_id == Appointment.id)
            .where(
                and_(
                    Appointment.doctor_id == doctor.id,
                    Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED]),
                    Appointment.urgency_level == UrgencyLevel.URGENT
                )
            )
        )
        
        # Average consultation time today (in minutes)
        avg_consultation_time = await db.execute(
            select(func.avg(
                func.extract('epoch', Queue.updated_at - Queue.created_at) / 60
            ))
            .join(Appointment, Queue.appointment_id == Appointment.id)
            .where(
                and_(
                    Appointment.doctor_id == doctor.id,
                    Queue.status == QueueStatus.SERVED,
                    func.date(Queue.created_at) == func.current_date()
                )
            )
        )
        
        return DoctorDashboardStats(
            patients_served_today=patients_served_today.scalar() or 0,
            current_queue_length=current_queue_length.scalar() or 0,
            urgent_cases=urgent_cases.scalar() or 0,
            average_consultation_time=int(avg_consultation_time.scalar() or 0)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch doctor dashboard stats"
        )