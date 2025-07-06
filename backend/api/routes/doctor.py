from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc, insert
from uuid import UUID
import uuid
import logging
from datetime import datetime, timedelta

from database import get_db
from models import Patient, User, Doctor, Appointment, Queue, QueueStatus, UrgencyLevel, AppointmentStatus
from schemas import (
    Queue as QueueSchema, 
    Patient as PatientSchema,
    Appointment as AppointmentSchema,
    DoctorDashboardStats,
    Token,
    UserLogin,
    Doctor as DoctorSchema,
    PatientNote, PatientNoteCreate, PatientNoteUpdate,
    ConsultationFeedback, ConsultationFeedbackCreate, ConsultationFeedbackUpdate,
    DoctorStatusUpdate,
    DoctorProfileUpdate,
    Notification, NotificationCreate
)
from services import NotificationService, AuthService, DoctorService
from services.queue_service import QueueService
from api.dependencies import require_doctor, log_audit_event
from api.core.security import create_access_token
from api.core.config import settings
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

class PatientNotificationRequest(BaseModel):
    message: str
    subject: Optional[str] = "Message from your doctor"

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
            action="login",
            resource="user",
            details=f"Failed login attempt for doctor username {login_data.username}"
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
                    action="login",
        resource="user",
        resource_id=user.id,
        details="Successful doctor login"
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
            action="logout",
            resource="user",
            resource_id=current_user.id,
            details=f"Doctor {current_user.username} logged out"
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
            
            # Create doctor profile with a new UUID
            new_doctor_id = uuid.uuid4()
            await db.execute(insert(Doctor).values(
                id=new_doctor_id,
                user_id=current_user.id,
                specialization="General Medicine",  # Default values
                department="General Practice",
                is_available=True
            ))
            
            # Fetch the newly created doctor
            result = await db.execute(
                select(Doctor).where(Doctor.id == new_doctor_id)
            )
            doctor = result.scalar_one()
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
            # Create doctor profile automatically if it doesn't exist
            import uuid
            print(f"Creating doctor profile for user {current_user.username} ({current_user.id})")
            from sqlalchemy import insert
            new_doctor_id = uuid.uuid4()
            await db.execute(insert(Doctor).values(
                id=new_doctor_id,
                user_id=current_user.id,
                specialization="General Medicine",  # Default values
                department="General Practice",
                is_available=True
            ))
            await db.commit()
            # Fetch the newly created doctor
            result = await db.execute(
                select(Doctor).where(Doctor.id == new_doctor_id)
            )
            doctor = result.scalar_one()
            print(f"Created doctor profile with ID {doctor.id}")
        
        print(f"Found doctor: {doctor.id}")
        
        # Check if doctor has any appointments
        appointment_count_result = await db.execute(
            select(func.count(Appointment.id))
            .where(Appointment.doctor_id == doctor.id)
        )
        appointment_count = appointment_count_result.scalar() or 0
        print(f"Doctor {doctor.id} has {appointment_count} total appointments")
        
        # Check if doctor has any queue entries
        queue_count_result = await db.execute(
            select(func.count(Queue.id))
            .join(Appointment, Queue.appointment_id == Appointment.id)
            .where(Appointment.doctor_id == doctor.id)
        )
        queue_count = queue_count_result.scalar() or 0
        print(f"Doctor {doctor.id} has {queue_count} total queue entries")
        
        # Get queue entries with patient info, ordered by priority and queue number
        try:
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
                    Appointment.urgency.desc(),
                    # Then by queue number
                    Queue.queue_number
                )
            )
            print(f"Query executed successfully for doctor {doctor.id}")
        except Exception as query_error:
            print(f"Error in query execution: {str(query_error)}")
            # Try a simpler query to debug
            result = await db.execute(
                select(Queue)
                .join(Appointment, Queue.appointment_id == Appointment.id)
                .where(
                    and_(
                        Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED]),
                        Appointment.doctor_id == doctor.id
                    )
                )
            )
            print(f"Simple query executed, found {len(result.all())} queue entries")
            return []
        
        # Convert to Pydantic schemas to avoid MissingGreenlet issues
        queue_entries = []
        all_results = result.all()
        print(f"Found {len(all_results)} queue entries for doctor {doctor.id}")
        
        for queue, appointment, patient in all_results:
            # Manually construct the queue entry with relationships
            queue_entry = {
                "id": str(queue.id),
                "appointment_id": str(queue.appointment_id),
                "queue_number": queue.queue_number,
                "priority_score": queue.priority_score,
                "status": queue.status.value if hasattr(queue.status, 'value') else str(queue.status),
                "estimated_wait_time": queue.estimated_wait_time,
                "called_at": queue.called_at.isoformat() if queue.called_at else None,
                "served_at": queue.served_at.isoformat() if queue.served_at else None,
                "created_at": queue.created_at.isoformat() if queue.created_at else None,
                "updated_at": queue.updated_at.isoformat() if queue.updated_at else None,
                "appointment": {
                    "id": str(appointment.id),
                    "patient_id": str(appointment.patient_id),
                    "doctor_id": str(appointment.doctor_id) if appointment.doctor_id else None,
                    "appointment_date": appointment.appointment_date.isoformat() if appointment.appointment_date else None,
                    "urgency": appointment.urgency.value if hasattr(appointment.urgency, 'value') else str(appointment.urgency),
                    "reason": appointment.reason,
                    "status": appointment.status.value if hasattr(appointment.status, 'value') else str(appointment.status),
                    "created_at": appointment.created_at.isoformat() if appointment.created_at else None,
                    "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None,
                    "patient": {
                        "id": str(patient.id),
                        "first_name": patient.first_name,
                        "last_name": patient.last_name,
                        "phone_number": patient.phone_number,
                        "email": patient.email,
                        "gender": patient.gender,
                        "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                        "address": patient.address,
                        "emergency_contact": patient.emergency_contact,
                        "emergency_contact_name": patient.emergency_contact_name,
                        "emergency_contact_relationship": patient.emergency_contact_relationship,
                        "is_active": patient.is_active,
                        "created_at": patient.created_at.isoformat() if patient.created_at else None,
                        "updated_at": patient.updated_at.isoformat() if patient.updated_at else None
                    }
                }
            }
            queue_entries.append(queue_entry)
        
        return queue_entries
        
    except Exception as e:
        import traceback
        print(f"Error in get_doctor_queue: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch doctor queue: {str(e)}"
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
                Appointment.urgency.desc(),
                Queue.queue_number
            )
            .limit(1)
        )
        
        queue_data = result.first()
        if not queue_data:
            return None
        
        queue, appointment, patient = queue_data
        # Manually construct the queue entry with relationships
        queue_entry = {
            "id": str(queue.id),
            "appointment_id": str(queue.appointment_id),
            "queue_number": queue.queue_number,
            "priority_score": queue.priority_score,
            "status": queue.status.value if hasattr(queue.status, 'value') else str(queue.status),
            "estimated_wait_time": queue.estimated_wait_time,
            "called_at": queue.called_at.isoformat() if queue.called_at else None,
            "served_at": queue.served_at.isoformat() if queue.served_at else None,
            "created_at": queue.created_at.isoformat() if queue.created_at else None,
            "updated_at": queue.updated_at.isoformat() if queue.updated_at else None,
            "appointment": {
                "id": str(appointment.id),
                "patient_id": str(appointment.patient_id),
                "doctor_id": str(appointment.doctor_id) if appointment.doctor_id else None,
                "appointment_date": appointment.appointment_date.isoformat() if appointment.appointment_date else None,
                "urgency": appointment.urgency.value if hasattr(appointment.urgency, 'value') else str(appointment.urgency),
                "reason": appointment.reason,
                "status": appointment.status.value if hasattr(appointment.status, 'value') else str(appointment.status),
                "created_at": appointment.created_at.isoformat() if appointment.created_at else None,
                "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None,
                "patient": {
                    "id": str(patient.id),
                    "first_name": patient.first_name,
                    "last_name": patient.last_name,
                    "phone_number": patient.phone_number,
                    "email": patient.email,
                    "gender": patient.gender,
                    "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                    "address": patient.address,
                    "emergency_contact": patient.emergency_contact,
                    "emergency_contact_name": patient.emergency_contact_name,
                    "emergency_contact_relationship": patient.emergency_contact_relationship,
                    "is_active": patient.is_active,
                    "created_at": patient.created_at.isoformat() if patient.created_at else None,
                    "updated_at": patient.updated_at.isoformat() if patient.updated_at else None
                }
            }
        }
        return queue_entry
        
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
        
        # Mark queue as served
        await QueueService.update_queue_status(db, queue_id, QueueStatus.COMPLETED)
        
        # Update appointment status
        appointment.status = AppointmentStatus.COMPLETED
        # Note: appointment.completed_at field doesn't exist, so we'll use updated_at
        appointment.updated_at = datetime.utcnow()
        if notes:
            appointment.notes = notes
        
        # Commit the transaction
        await db.commit()
        
        # Update queue positions and send notifications
        background_tasks.add_task(
            QueueService.update_queue_positions,
            db=db,
            doctor_id=doctor.id,
            notification_service=None
        )
        
        # Send completion notification
        # TODO: Implement this method in NotificationService
        # background_tasks.add_task(
        #     NotificationService.send_appointment_completion_notification,
        #     patient.phone_number,
        #     {
        #         'patient_name': patient.full_name,
        #         'doctor_name': f"Dr. {doctor.full_name}",
        #         'queue_number': queue_entry.queue_number
        #     }
        # )
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="update",
            resource="queue",
            resource_id=queue_id,
            details=f"Doctor {current_user.first_name} {current_user.last_name} marked patient {patient.phone_number} as served"
        )
        
        return {"message": "Patient marked as served successfully"}
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        await db.rollback()
        raise
    except ValueError as e:
        # Handle validation errors
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        # Handle all other errors
        await db.rollback()
        logger.error(f"Error marking patient as served: {str(e)}")
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
    logger.info(f"Starting get_patient_details for patient {patient_id}")
    try:
        # Get doctor info
        logger.info(f"Fetching doctor info for user {current_user.id}")
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id)
        )
        doctor = result.scalar_one_or_none()
        
        if not doctor:
            logger.error(f"Doctor profile not found for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        
        logger.info(f"Found doctor: {doctor.id}")
        
        # Get patient details directly - doctors should be able to view any patient
        logger.info(f"Fetching patient {patient_id}")
        result = await db.execute(
            select(Patient).where(Patient.id == patient_id)
        )
        
        patient = result.scalar_one_or_none()
        if not patient:
            logger.error(f"Patient {patient_id} not found in database")
            
            # Check if there are any patients at all
            count_result = await db.execute(select(func.count(Patient.id)))
            total_patients = count_result.scalar()
            logger.info(f"Total patients in database: {total_patients}")
            
            # Get a few sample patient IDs for debugging
            if total_patients > 0:
                sample_result = await db.execute(
                    select(Patient.id, Patient.first_name, Patient.last_name)
                    .limit(3)
                )
                sample_patients = sample_result.all()
                logger.info(f"Sample patients: {[(str(p.id), f'{p.first_name} {p.last_name}') for p in sample_patients]}")
            
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with ID {patient_id} not found. Please check if the patient exists or if the ID is correct."
            )
        
        logger.info(f"Found patient: {patient.id}")
        
        logger.info("Validating patient with PatientSchema")
        try:
            validated_patient = PatientSchema.model_validate(patient)
            logger.info(f"Successfully validated patient: {validated_patient.id}")
            return validated_patient
        except Exception as validation_error:
            logger.error(f"Validation error: {str(validation_error)}")
            logger.error(f"Validation error type: {type(validation_error)}")
            import traceback
            logger.error(f"Validation traceback: {traceback.format_exc()}")
            raise
        
    except HTTPException:
        logger.info("Re-raising HTTPException")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_patient_details: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
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
                    func.date(Appointment.updated_at) == func.current_date()
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
                    Appointment.urgency == UrgencyLevel.HIGH
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
                    Queue.status == QueueStatus.COMPLETED,
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

@router.put("/status", response_model=DoctorSchema)
async def update_doctor_status(
    status_data: DoctorStatusUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Update doctor availability status"""
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
        
        # Update doctor status
        updated_doctor = await DoctorService.update_doctor_status(
            db=db,
            doctor_id=doctor.id,
            status_data=status_data
        )
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="update",
            resource="doctor",
            resource_id=doctor.id,
            details=f"Doctor status updated to available={status_data.is_available}"
        )
        
        # Manually set the user attribute to avoid relationship loading errors
        updated_doctor.user = current_user
        
        return updated_doctor
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update doctor status"
        )

@router.post("/patients/{patient_id}/notes", response_model=PatientNote)
async def create_patient_note(
    patient_id: UUID,
    note_data: PatientNoteCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Create a new note for a patient"""
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
        
        # Verify patient exists and has appointment with this doctor
        result = await db.execute(
            select(Patient)
            .join(Appointment, Patient.id == Appointment.patient_id)
            .where(
                and_(
                    Patient.id == patient_id,
                    Appointment.doctor_id == doctor.id
                )
            )
        )
        
        patient = result.scalar_one_or_none()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found or not assigned to this doctor"
            )
        
        # Override patient_id and doctor_id in note_data
        note_data.patient_id = patient_id
        note_data.doctor_id = doctor.id
        
        # Create note
        note = await DoctorService.create_patient_note(
            db=db,
            note_data=note_data
        )
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="create",
            resource="patient_note",
            resource_id=note.id,
            details=f"Doctor created note for patient {patient_id}"
        )
        
        return note
        
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
            detail="Failed to create patient note"
        )

@router.get("/patients/{patient_id}/notes", response_model=List[PatientNote])
async def get_patient_notes(
    patient_id: UUID,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Get all notes for a patient"""
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
        
        # Verify patient exists and has appointment with this doctor
        result = await db.execute(
            select(Patient)
            .join(Appointment, Patient.id == Appointment.patient_id)
            .where(
                and_(
                    Patient.id == patient_id,
                    Appointment.doctor_id == doctor.id
                )
            )
        )
        
        patient = result.scalar_one_or_none()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found or not assigned to this doctor"
            )
        
        # Get notes
        notes = await DoctorService.get_patient_notes(
            db=db,
            patient_id=patient_id,
            doctor_id=doctor.id  # Only get notes by this doctor
        )
        
        return notes
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get patient notes"
        )

@router.get("/notes/{note_id}/history", response_model=List[PatientNote])
async def get_note_history(
    note_id: UUID,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Get history of a note (all versions)"""
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
        
        # Get note history
        try:
            notes = await DoctorService.get_note_history(
                db=db,
                note_id=note_id
            )
            
            # Verify this doctor has access to these notes
            if notes and notes[0].doctor_id != doctor.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this note"
                )
            
            return notes
            
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get note history"
        )

@router.post("/appointments/{appointment_id}/feedback", response_model=ConsultationFeedback)
async def create_consultation_feedback(
    appointment_id: UUID,
    feedback_data: ConsultationFeedbackCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Create consultation feedback for an appointment"""
    logger.info(f"Starting consultation feedback creation for appointment {appointment_id}")
    try:
        # Get doctor info
        logger.info(f"Fetching doctor info for user {current_user.id}")
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id)
        )
        doctor = result.scalar_one_or_none()
        
        if not doctor:
            logger.error(f"Doctor profile not found for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        
        logger.info(f"Found doctor: {doctor.id}")
        
        # Verify appointment exists and belongs to this doctor
        logger.info(f"Verifying appointment {appointment_id} belongs to doctor {doctor.id}")
        result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.id == appointment_id,
                    Appointment.doctor_id == doctor.id
                )
            )
        )
        
        appointment = result.scalar_one_or_none()
        if not appointment:
            logger.error(f"Appointment {appointment_id} not found or not assigned to doctor {doctor.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found or not assigned to this doctor"
            )
        
        logger.info(f"Found appointment: {appointment.id}")
        
        # Override appointment_id and doctor_id in feedback_data
        feedback_data.appointment_id = appointment_id
        feedback_data.doctor_id = doctor.id
        
        logger.info(f"Calling DoctorService.create_consultation_feedback with data: {feedback_data}")
        
        # Create feedback
        try:
            feedback = await DoctorService.create_consultation_feedback(
                db=db,
                feedback_data=feedback_data
            )
            
            logger.info(f"Successfully created feedback: {feedback.id}")
            
            # Log audit event
            logger.info("Adding audit event to background tasks")
            background_tasks.add_task(
                log_audit_event,
                request=request,
                user_id=current_user.id,
                user_type="user",
                action="CREATE",
                resource="consultation_feedback",
                resource_id=feedback.id,
                details=f"Doctor created consultation feedback for appointment {appointment_id}"
            )
            
            logger.info("Returning feedback object")
            return feedback
            
        except ValueError as e:
            logger.error(f"ValueError in create_consultation_feedback: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
    except HTTPException:
        logger.info("Re-raising HTTPException")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in create_consultation_feedback: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create consultation feedback"
        )

@router.get("/appointments/{appointment_id}/feedback", response_model=ConsultationFeedback)
async def get_consultation_feedback(
    appointment_id: UUID,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Get consultation feedback for an appointment"""
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
        
        # Verify appointment exists and belongs to this doctor
        result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.id == appointment_id,
                    Appointment.doctor_id == doctor.id
                )
            )
        )
        
        appointment = result.scalar_one_or_none()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found or not assigned to this doctor"
            )
        
        # Get feedback
        feedback = await DoctorService.get_consultation_feedback(
            db=db,
            appointment_id=appointment_id
        )
        
        if not feedback:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultation feedback not found for this appointment"
            )
        
        return feedback
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get consultation feedback"
        )

@router.put("/feedback/{feedback_id}", response_model=ConsultationFeedback)
async def update_consultation_feedback(
    feedback_id: UUID,
    feedback_data: ConsultationFeedbackUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Update consultation feedback"""
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
        
        # Verify feedback exists and belongs to this doctor
        result = await db.execute(
            select(ConsultationFeedback).where(
                and_(
                    ConsultationFeedback.id == feedback_id,
                    ConsultationFeedback.doctor_id == doctor.id
                )
            )
        )
        
        feedback = result.scalar_one_or_none()
        if not feedback:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultation feedback not found or not created by this doctor"
            )
        
        # Update feedback
        try:
            updated_feedback = await DoctorService.update_consultation_feedback(
                db=db,
                feedback_id=feedback_id,
                feedback_data=feedback_data
            )
            
            # Log audit event
            background_tasks.add_task(
                log_audit_event,
                request=request,
                user_id=current_user.id,
                user_type="user",
                action="update",
                resource="consultation_feedback",
                resource_id=feedback_id,
                details=f"Doctor updated consultation feedback {feedback_id}"
            )
            
            return updated_feedback
            
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update consultation feedback"
        )

@router.post("/queue/{queue_id}/skip")
async def skip_patient(
    queue_id: UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Skip patient in queue"""
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
        
        # Skip the patient using QueueService
        await QueueService.skip_patient(db, queue_id, "Skipped by doctor")
        
        # Commit the transaction
        await db.commit()
        
        # Update queue positions and send notifications
        background_tasks.add_task(
            QueueService.update_queue_positions,
            db=db,
            doctor_id=doctor.id,
            notification_service=None
        )
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="update",
            resource="queue",
            resource_id=queue_id,
            details=f"Doctor {current_user.first_name} {current_user.last_name} skipped patient {patient.phone_number}"
        )
        
        return {"message": "Patient skipped successfully"}
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        await db.rollback()
        raise
    except ValueError as e:
        # Handle validation errors
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        # Handle all other errors
        await db.rollback()
        logger.error(f"Error skipping patient: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to skip patient"
        )

@router.put("/profile", response_model=DoctorSchema)
async def update_doctor_profile(
    profile_data: DoctorProfileUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Update doctor profile"""
    try:
        # Get doctor profile
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id)
        )
        doctor = result.scalar_one_or_none()
        
        if not doctor:
            # Create doctor profile if it doesn't exist
            new_doctor_id = uuid.uuid4()
            stmt = insert(Doctor).values(
                id=new_doctor_id,
                user_id=current_user.id,
                specialization=profile_data.specialization or "General Medicine",
                department=profile_data.department or "General Practice",
                is_available=True
            )
            
            await db.execute(stmt)
            await db.commit()
            
            # Fetch the newly created doctor
            result = await db.execute(
                select(Doctor).where(Doctor.id == new_doctor_id)
            )
            doctor = result.scalar_one()
        else:
            # Update existing profile with new data
            if profile_data.specialization is not None:
                doctor.specialization = profile_data.specialization
            if profile_data.department is not None:
                doctor.department = profile_data.department
            if profile_data.license_number is not None:
                doctor.license_number = profile_data.license_number
            if profile_data.consultation_fee is not None:
                doctor.consultation_fee = profile_data.consultation_fee
            
            # Update the new fields in Doctor model if they exist
            # We'll need to add these fields to the Doctor model in another step
            if hasattr(doctor, 'bio') and profile_data.bio is not None:
                doctor.bio = profile_data.bio
            if hasattr(doctor, 'education') and profile_data.education is not None:
                doctor.education = profile_data.education
            if hasattr(doctor, 'experience') and profile_data.experience is not None:
                doctor.experience = profile_data.experience
        
        await db.commit()
        await db.refresh(doctor)
        
        # Log the action
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="update",
            resource="doctor",
            resource_id=doctor.id,
            details=f"Doctor profile updated"
        )
        
        return doctor
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update doctor profile: {str(e)}"
        )

@router.post("/notifications", response_model=Notification)
async def create_notification(
    notification_data: NotificationCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Create and send a notification (doctor access)"""
    try:
        notification_service = NotificationService()
        notification = await notification_service.create_notification(db, notification_data)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="create",
            resource="notification",
            resource_id=notification.id,
            details=f"Doctor {current_user.username} created notification for {notification.recipient}"
        )
        
        return notification
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create notification: {str(e)}"
        )


@router.post("/patients/{patient_id}/notify", response_model=Notification)
async def notify_patient(
    patient_id: UUID,
    notification_data: PatientNotificationRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Send a manual notification from doctor to patient"""
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
        
        # Verify patient exists - doctors should be able to notify any patient
        result = await db.execute(
            select(Patient).where(Patient.id == patient_id)
        )
        
        patient = result.scalar_one_or_none()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Create and send notification using static method
        notification = await NotificationService.send_notification(
            db=db,
            user_id=patient_id,
            title=notification_data.subject or "Message from your doctor",
            message=notification_data.message,
            notification_type="doctor_message"
        )
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send notification"
            )
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="create",
            resource="notification",
            resource_id=notification,
            details=f"Doctor sent notification to patient {patient_id}"
        )
        
        return {"id": str(notification), "message": "Notification sent successfully"}
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send notification: {str(e)}"
        )