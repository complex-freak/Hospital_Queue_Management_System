from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc, asc, insert
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import datetime, timedelta, timezone
from database import get_db
from models import (
    Patient, User, Appointment, Queue, QueueStatus, UrgencyLevel, UserRole, 
    AppointmentStatus, NotificationType, DeviceToken, Doctor
)
from schemas import (
    PatientCreate, AppointmentCreate, AppointmentUpdate,
    Patient as PatientSchema, Appointment as AppointmentSchema,
    Queue as QueueSchema, QueueUpdate, DashboardStats, QueueCreate,
    Token, UserLogin, User as UserSchema, DraftRegistration,
    NotificationCreate, NotificationBulkCreate, Notification,
    NotificationTemplateCreate, NotificationTemplate, NotificationTemplateUpdate,
    NotificationFromTemplate
)
from services.queue_service import QueueService
from services import NotificationService
from services import AuthService, AppointmentService, PatientService
from api.dependencies import require_staff, log_audit_event
from api.core.security import create_access_token
from api.core.config import settings
from pydantic import BaseModel
from utils.datetime_utils import get_timezone_aware_now
import uuid

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
            action="register",
            resource="patient",
            resource_id=patient.id,
            details=f"Staff {current_user.username} registered patient {patient.phone_number}"
        )
        
        return patient
        
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
        
        # If doctor not specified, automatically assign one with the least queue
        if not appointment_data.doctor_id:
            doctor_id = await QueueService.get_doctor_with_least_queue(db)
            if doctor_id:
                appointment_data.doctor_id = doctor_id
                print(f"Automatically assigned doctor with ID: {doctor_id}")
        
        # Create appointment directly
        print("Creating appointment directly")
        appointment_values = {
            "id": UUID(str(uuid.uuid4())),  # Generate a new UUID explicitly
            "patient_id": appointment_data.patient_id,
            "doctor_id": appointment_data.doctor_id,
            "appointment_date": appointment_data.appointment_date or get_timezone_aware_now(),
            "reason": appointment_data.reason,
            "urgency": appointment_data.urgency,
            "status": AppointmentStatus.SCHEDULED,
            "created_by": current_user.id
        }
        
        # Insert and get just the ID
        result = await db.execute(
            insert(Appointment)
            .values(**appointment_values)
            .returning(Appointment.id)
        )
        appointment_id = result.scalar_one()
        await db.commit()

        print(f"Appointment created with ID: {appointment_id}")
        
        # Fetch the full appointment object with relationships
        result = await db.execute(
            select(Appointment)
            .options(
                selectinload(Appointment.patient), 
                selectinload(Appointment.doctor).selectinload(Doctor.user)
            )
            .where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one()
        
        # Log audit event for appointment creation
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="create",
            resource="appointment",
            resource_id=appointment.id,
            details=f"Staff {current_user.username} created appointment for patient {patient.phone_number}"
        )
        
        # Add to queue
        try:
            queue_entry = await QueueService.add_to_queue(db, appointment.id)
            print(f"Added to queue with ID: {queue_entry.id}")
            
            # Send notification to patient
            async def send_notification_task(patient, appointment, queue_number):
                from database import AsyncSessionLocal
                async with AsyncSessionLocal() as db:  # type: ignore
                    await NotificationService.notify_appointment_booked(
                        db, patient, appointment, queue_number
                    )
            
            background_tasks.add_task(
                send_notification_task,
                patient,
                appointment,
                queue_entry.queue_number
            )
        except Exception as queue_error:
            print(f"Error adding to queue: {str(queue_error)}")
            # Continue with appointment creation even if queue fails
        
        # Re-fetch the appointment with relationships loaded before returning
        result = await db.execute(
            select(Appointment)
            .options(
                selectinload(Appointment.patient), 
                selectinload(Appointment.doctor).selectinload(Doctor.user)
            )
            .where(Appointment.id == appointment.id)
        )
        appointment = result.scalar_one()
        # Convert to Pydantic schema to avoid MissingGreenlet issues
        return AppointmentSchema.from_orm(appointment)
        
    except ValueError as e:
        await db.rollback()
        print(f"Value error in appointment creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        print(f"Error in appointment creation: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Appointment creation failed: {str(e)}"
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
        query = select(Appointment).options(
            selectinload(Appointment.patient),
            selectinload(Appointment.doctor).selectinload(Doctor.user)
        ).order_by(desc(Appointment.created_at))
        
        if status_filter:
            query = query.where(Appointment.status == status_filter)
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        appointments = result.scalars().all()
        
        # Convert to Pydantic schemas to avoid MissingGreenlet issues
        return [AppointmentSchema.from_orm(appointment) for appointment in appointments]
        
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
        
        # Update appointment fields
        for field, value in appointment_update.model_dump(exclude_unset=True).items():
            setattr(appointment, field, value)
        
        appointment.updated_at = get_timezone_aware_now()
        await db.commit()
        
        # Re-fetch the appointment with relationships loaded
        result = await db.execute(
            select(Appointment)
            .options(
                selectinload(Appointment.patient), 
                selectinload(Appointment.doctor).selectinload(Doctor.user)
            )
            .where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one()
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="update",
            resource="appointment",
            resource_id=appointment.id,
            details=f"Staff {current_user.username} updated appointment {appointment_id}"
        )
        
        # Convert to Pydantic schema to avoid MissingGreenlet issues
        return AppointmentSchema.from_orm(appointment)
        
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
            detail="Appointment update failed"
        )

@router.get("/queue", response_model=List[QueueSchema])
async def get_queue_status(
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get current queue status"""
    try:
        # Get all queue entries for today with relationships
        result = await db.execute(
            select(Queue, Appointment, Patient)
            .join(Appointment, Queue.appointment_id == Appointment.id)
            .join(Patient, Appointment.patient_id == Patient.id)
            .where(func.date(Queue.created_at) == func.current_date())
            .order_by(desc(Queue.priority_score), asc(Queue.queue_number))
        )
        
        queue_entries = []
        all_results = result.all()
        
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
        print(f"Error fetching queue status: {str(e)}")  # Add logging for debugging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch queue status"
        )

@router.put("/queue/{appointment_id}")
async def update_queue_entry(
    appointment_id: UUID,
    queue_update: QueueUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Update queue entry by appointment ID"""
    try:
        # Find queue entry by appointment ID
        result = await db.execute(
            select(Queue).where(Queue.appointment_id == appointment_id)
        )
        queue_entry = result.scalar_one_or_none()
        
        if not queue_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Queue entry not found for this appointment"
            )
        
        # Update queue fields
        update_data = queue_update.model_dump(exclude_unset=True)
        print(f"Updating queue with data: {update_data}")  # Debug logging
        
        for field, value in update_data.items():
            if hasattr(queue_entry, field):
                setattr(queue_entry, field, value)
            else:
                print(f"Warning: Queue model does not have field '{field}'")
        
        # Update timestamp
        queue_entry.updated_at = get_timezone_aware_now()
        
        await db.commit()
        
        # Re-fetch the queue entry with relationships loaded
        result = await db.execute(
            select(Queue)
            .options(
                selectinload(Queue.appointment).selectinload(Appointment.patient),
                selectinload(Queue.appointment).selectinload(Appointment.doctor)
            )
            .where(Queue.appointment_id == appointment_id)
        )
        queue_entry = result.scalar_one()
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="update",
            resource="queue",
            resource_id=queue_entry.id,
            details=f"Staff {current_user.username} updated queue entry for appointment {appointment_id}"
        )
        
        # If status changed, update queue positions and send notifications
        if "status" in queue_update.model_dump(exclude_unset=True):
            # Update queue positions and send notifications
            async def update_queue_positions_task(doctor_id):
                from database import AsyncSessionLocal
                async with AsyncSessionLocal() as db:  # type: ignore
                    await QueueService.update_queue_positions(
                        db, doctor_id, notification_service=None
                    )
            
            background_tasks.add_task(
                update_queue_positions_task,
                queue_entry.doctor_id
            )
        
        # Return data in format expected by frontend transformer
        try:
            return {
                "id": str(queue_entry.id),
                "appointment_id": str(queue_entry.appointment_id),
                "queue_number": queue_entry.queue_number,
                "priority_score": queue_entry.priority_score,
                "status": queue_entry.status.value if hasattr(queue_entry.status, 'value') else str(queue_entry.status),
                "estimated_wait_time": queue_entry.estimated_wait_time,
                "created_at": queue_entry.created_at.isoformat() if queue_entry.created_at else None,
                "updated_at": queue_entry.updated_at.isoformat() if queue_entry.updated_at else None,
                "appointment": {
                    "id": str(queue_entry.appointment.id),
                    "urgency": queue_entry.appointment.urgency.value if hasattr(queue_entry.appointment.urgency, 'value') else str(queue_entry.appointment.urgency),
                    "reason": queue_entry.appointment.reason,
                    "status": queue_entry.appointment.status.value if hasattr(queue_entry.appointment.status, 'value') else str(queue_entry.appointment.status),
                    "created_at": queue_entry.appointment.created_at.isoformat() if queue_entry.appointment.created_at else None,
                    "patient": {
                        "first_name": queue_entry.appointment.patient.first_name,
                        "last_name": queue_entry.appointment.patient.last_name,
                        "gender": queue_entry.appointment.patient.gender,
                        "date_of_birth": queue_entry.appointment.patient.date_of_birth.isoformat() if queue_entry.appointment.patient.date_of_birth else None,
                        "phone_number": queue_entry.appointment.patient.phone_number
                    },
                    "doctor": {
                        "user": {
                            "first_name": queue_entry.appointment.doctor.user.first_name if queue_entry.appointment.doctor and queue_entry.appointment.doctor.user else None,
                            "last_name": queue_entry.appointment.doctor.user.last_name if queue_entry.appointment.doctor and queue_entry.appointment.doctor.user else None
                        }
                    } if queue_entry.appointment.doctor else None
                }
            }
        except Exception as response_error:
            print(f"Error formatting response: {str(response_error)}")
            # Fallback to basic response if formatting fails
            return {
                "id": str(queue_entry.id),
                "appointment_id": str(queue_entry.appointment_id),
                "queue_number": queue_entry.queue_number,
                "priority_score": queue_entry.priority_score,
                "status": str(queue_entry.status),
                "estimated_wait_time": queue_entry.estimated_wait_time,
                "created_at": queue_entry.created_at.isoformat() if queue_entry.created_at else None,
                "updated_at": queue_entry.updated_at.isoformat() if queue_entry.updated_at else None
            }
        
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        print(f"Queue update error: {str(e)}")  # Add logging for debugging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update queue entry: {str(e)}"
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
        queue_entry.status = QueueStatus.CALLED
        now = get_timezone_aware_now()
        queue_entry.called_at = now
        queue_entry.updated_at = now
        await db.commit()
        await db.refresh(queue_entry)
        
        # Send notification to patient
        async def send_turn_ready_notification(patient, queue_number):
            from database import AsyncSessionLocal
            async with AsyncSessionLocal() as db:  # type: ignore
                await NotificationService.notify_turn_ready(
                    db, patient, queue_number
                )
        
        background_tasks.add_task(
            send_turn_ready_notification,
            patient,
            queue_entry.queue_number
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
            details=f"Staff {current_user.username} called patient {patient.phone_number}"
        )
        
        return {"message": "Patient called successfully"}
        
    except Exception as e:
        await db.rollback()
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
                    (Patient.first_name + " " + Patient.last_name).ilike(f"%{q}%")
                )
            ).limit(limit)
        )
        patients = result.scalars().all()
        
        # Convert to Pydantic schemas to avoid MissingGreenlet issues
        return [PatientSchema.from_orm(patient) for patient in patients]
        
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
                    Appointment.urgency == UrgencyLevel.HIGH
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
                    Queue.status == QueueStatus.COMPLETED,
                    func.date(Queue.created_at) == func.current_date()
                )
            )
        )
        
        # Get count of completed appointments today
        served_today = await db.execute(
            select(func.count(Queue.id))
            .where(
                and_(
                    Queue.status == QueueStatus.COMPLETED,
                    func.date(Queue.created_at) == func.current_date()
                )
            )
        )
        
        return DashboardStats(
            total_patients_today=today_patients.scalar() or 0,
            total_served_today=served_today.scalar() or 0,
            current_queue_length=queue_length.scalar() or 0,
            average_wait_time=int(avg_wait_time.scalar() or 0)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard stats"
        )

@router.get("/queue/stats")
async def get_queue_stats(
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get queue statistics for staff"""
    try:
        # Get queue counts by status
        waiting_count_result = await db.execute(
            select(func.count(Queue.id))
            .where(
                and_(
                    Queue.status == QueueStatus.WAITING,
                    func.date(Queue.created_at) == func.current_date()
                )
            )
        )
        waiting_count = waiting_count_result.scalar() or 0
        
        called_count_result = await db.execute(
            select(func.count(Queue.id))
            .where(
                and_(
                    Queue.status == QueueStatus.CALLED,
                    func.date(Queue.created_at) == func.current_date()
                )
            )
        )
        called_count = called_count_result.scalar() or 0
        
        completed_count_result = await db.execute(
            select(func.count(Queue.id))
            .where(
                and_(
                    Queue.status == QueueStatus.COMPLETED,
                    func.date(Queue.created_at) == func.current_date()
                )
            )
        )
        completed_count = completed_count_result.scalar() or 0
        
        cancelled_count_result = await db.execute(
            select(func.count(Queue.id))
            .where(
                and_(
                    Queue.status == QueueStatus.CANCELLED,
                    func.date(Queue.created_at) == func.current_date()
                )
            )
        )
        cancelled_count = cancelled_count_result.scalar() or 0
        
        # Average wait time
        avg_wait_time_result = await db.execute(
            select(func.avg(
                func.extract('epoch', Queue.served_at - Queue.created_at) / 60
            ))
            .where(
                and_(
                    Queue.status == QueueStatus.COMPLETED,
                    Queue.served_at.isnot(None),
                    func.date(Queue.created_at) == func.current_date()
                )
            )
        )
        avg_wait_time = avg_wait_time_result.scalar() or 0
        
        # Get available doctors count
        available_doctors_result = await db.execute(
            select(func.count(Doctor.id))
            .where(Doctor.is_available == True)
        )
        available_doctors = available_doctors_result.scalar() or 0
        
        # Get total doctors count
        total_doctors_result = await db.execute(
            select(func.count(Doctor.id))
        )
        total_doctors = total_doctors_result.scalar() or 0
        
        # Get high priority count - using appointment urgency instead of queue urgency
        try:
            high_priority_result = await db.execute(
                select(func.count(Queue.id))
                .where(
                    and_(
                        Queue.status == QueueStatus.WAITING,
                        Queue.appointment.has(Appointment.urgency.in_(['high', 'emergency'])),
                        func.date(Queue.created_at) == func.current_date()
                    )
                )
            )
            high_priority_count = high_priority_result.scalar() or 0
        except Exception as e:
            print(f"Error getting high priority count: {str(e)}")
            high_priority_count = 0
        
        return {
            'date': datetime.now().date().isoformat(),
            'waiting': waiting_count,
            'called': called_count,
            'completed': completed_count,
            'cancelled': cancelled_count,
            'total': waiting_count + called_count + completed_count + cancelled_count,
            'average_wait_time': round(avg_wait_time, 2),
            'total_waiting': waiting_count,
            'average_wait_time_minutes': round(avg_wait_time, 2),
            'high_priority_count': high_priority_count,
            'available_doctors': available_doctors,
            'total_doctors': total_doctors
        }
    except Exception as e:
        # Log the exception for debugging
        print(f"Queue stats error: {str(e)}")
        # Return default values instead of raising an exception
        return {
            'date': datetime.now().date().isoformat(),
            'waiting': 0,
            'called': 0,
            'completed': 0,
            'cancelled': 0,
            'total': 0,
            'average_wait_time': 0,
            'total_waiting': 0,
            'average_wait_time_minutes': 0,
            'high_priority_count': 0,
            'available_doctors': 0,
            'total_doctors': 0
        }

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
        # Create queue entry
        queue_values = queue_data.model_dump()
        result = await db.execute(insert(Queue).values(**queue_values).returning(Queue.id))
        queue_id = result.scalar_one()
        await db.commit()
        
        # Re-fetch the queue entry with relationships loaded
        result = await db.execute(
            select(Queue)
            .options(
                selectinload(Queue.appointment).selectinload(Appointment.patient),
                selectinload(Queue.appointment).selectinload(Appointment.doctor)
            )
            .where(Queue.id == queue_id)
        )
        queue = result.scalar_one()
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="create",
            resource="queue",
            resource_id=queue.id,
            details=f"Staff {current_user.username} created queue"
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
        appointment_id = entry_data.get("appointment_id")
        if not appointment_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="appointment_id is required"
            )
            
        # Get the appointment to check its urgency
        result = await db.execute(
            select(Appointment).where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one_or_none()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Create queue entry
        queue_entry = await QueueService.add_to_queue(
            db, appointment.id, appointment.urgency
        )
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="create",
            resource="queue_entry",
            resource_id=queue_entry.id,
            details=f"Staff {current_user.username} added patient to queue"
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
            action="login",
            resource="user",
            details=f"Failed login attempt for staff username {login_data.username}"
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
                    action="login",
        resource="user",
        resource_id=user.id,
        details=f"Successful {user.role} login"
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
            action="logout",
            resource="user",
            resource_id=current_user.id,
            details=f"{current_user.role} {current_user.username} logged out"
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
    """Get current authenticated staff"""
    return current_user

@router.get("/patients", response_model=List[PatientSchema])
async def get_all_patients(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get all patients (both queued and historical)"""
    try:
        query = select(Patient).order_by(desc(Patient.created_at)).offset(skip).limit(limit)
        result = await db.execute(query)
        patients = result.scalars().all()
        
        # Convert to Pydantic schemas to avoid MissingGreenlet issues
        return [PatientSchema.from_orm(patient) for patient in patients]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch patients"
        )

@router.post("/patients/drafts", response_model=DraftRegistration)
async def save_patient_draft(
    draft_data: DraftRegistration,
    request: Request,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Save draft patient registration"""
    try:
        # For now, we'll just return the data as if it was saved
        # In a production environment, you would store this in the database
        draft_data.last_updated = get_timezone_aware_now()
        return draft_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save draft registration"
        )

@router.get("/patients/drafts/{draft_id}", response_model=DraftRegistration)
async def get_patient_draft(
    draft_id: str,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get draft patient registration"""
    try:
        # This would be replaced with actual database lookup in a full implementation
        # For now, we'll return a not found error as the frontend will fall back to localStorage
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found"
        )
        
    except HTTPException:
        # Pass through the HTTP exception
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch draft registration"
        )

@router.patch("/appointments/{appointment_id}/priority")
async def update_appointment_priority(
    appointment_id: UUID,
    priority_data: dict,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Update patient appointment priority"""
    try:
        result = await db.execute(
            select(Appointment)
            .options(selectinload(Appointment.queue_entry))
            .where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one_or_none()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Update urgency level
        urgency = priority_data.get("urgency")
        if not urgency or urgency not in [e.value for e in UrgencyLevel]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid urgency level"
            )
        
        appointment.urgency = UrgencyLevel(urgency)
        
        # Update queue priority if in queue
        if appointment.queue_entry:
            # Temporarily update appointment urgency for priority calculation
            original_urgency = appointment.urgency
            appointment.urgency = UrgencyLevel(urgency)
            appointment.queue_entry.priority_score = await QueueService._calculate_priority_score(
                db, appointment, None
            )
            # Restore original urgency
            appointment.urgency = original_urgency
            
        # Save changes
        appointment.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(appointment)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="update",
            resource="appointment",
            resource_id=appointment.id,
            details=f"Staff {current_user.username} updated priority for appointment {appointment_id}"
        )
        
        return {
            "id": appointment_id,
            "urgency": appointment.urgency.value,
            "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None
        }
        
    except HTTPException:
        # Pass through the HTTP exception
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update appointment priority: {str(e)}"
        )

@router.patch("/appointments/{appointment_id}/assign")
async def assign_patient_to_doctor(
    appointment_id: UUID,
    assign_data: dict,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Assign a patient to a specific doctor"""
    try:
        result = await db.execute(
            select(Appointment)
            .options(selectinload(Appointment.queue_entry))
            .where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one_or_none()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Get doctor info
        doctor_id = assign_data.get("doctor_id")
        if not doctor_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="doctor_id is required"
            )
        
        # Verify doctor exists
        result = await db.execute(
            select(Doctor).where(Doctor.id == doctor_id)
        )
        doctor = result.scalar_one_or_none()
        
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )
        
        # Update appointment with new doctor
        appointment.doctor_id = doctor_id
        appointment.updated_at = get_timezone_aware_now()
        
        # If appointment is in queue, update queue entry
        if appointment.queue_entry:
            appointment.queue_entry.doctor_id = doctor_id
            appointment.queue_entry.updated_at = get_timezone_aware_now()
        
        await db.commit()
        
        # Re-fetch the appointment with relationships loaded
        result = await db.execute(
            select(Appointment)
            .options(selectinload(Appointment.patient), selectinload(Appointment.doctor).selectinload(Doctor.user))
            .where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one()
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="update",
            resource="appointment",
            resource_id=appointment.id,
            details=f"Staff {current_user.username} assigned appointment {appointment_id} to doctor {doctor_id}"
        )
        
        return {
            "id": str(appointment_id),
            "doctor_id": str(doctor_id),
            "assigned_at": appointment.updated_at.isoformat() if appointment.updated_at else None
        }
        
    except HTTPException:
        # Pass through the HTTP exception
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign patient to doctor: {str(e)}"
        )

@router.post("/appointments/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: UUID,
    cancel_data: dict,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Cancel an appointment and remove from queue"""
    try:
        result = await db.execute(
            select(Appointment)
            .options(selectinload(Appointment.queue_entry))
            .where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one_or_none()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Update appointment status
        appointment.status = AppointmentStatus.CANCELLED
        appointment.updated_at = get_timezone_aware_now()
        
        # Add cancellation reason if provided
        reason = cancel_data.get("reason", "Cancelled by staff")
        appointment.notes = f"Cancelled: {reason}" if not appointment.notes else f"{appointment.notes}\nCancelled: {reason}"
        
        # Remove from queue if in queue
        if appointment.queue_entry:
            appointment.queue_entry.status = QueueStatus.CANCELLED
            appointment.queue_entry.updated_at = get_timezone_aware_now()
        
        # Save changes
        await db.commit()
        
        # Re-fetch the appointment with relationships loaded
        result = await db.execute(
            select(Appointment)
            .options(selectinload(Appointment.patient), selectinload(Appointment.doctor).selectinload(Doctor.user))
            .where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one()
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="update",
            resource="appointment",
            resource_id=appointment.id,
            details=f"Staff {current_user.username} cancelled appointment {appointment_id}"
        )
        
        # Notify patient if needed
        if hasattr(appointment, 'patient') and appointment.patient:
            # Inline notification implementation
            async def send_cancellation_notification(patient, reason):
                from database import AsyncSessionLocal
                async with AsyncSessionLocal() as db:  # type: ignore
                    await NotificationService.notify_appointment_cancelled(
                        db, patient, reason
                    )
            
            background_tasks.add_task(
                send_cancellation_notification,
                appointment.patient,
                reason
            )
        
        return {
            "id": str(appointment_id),
            "status": appointment.status.value,
            "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None
        }
        
    except HTTPException:
        # Pass through the HTTP exception
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel appointment: {str(e)}"
        )

@router.post("/notifications", response_model=Notification)
async def create_notification(
    notification_data: NotificationCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Create and send a notification"""
    try:
        notification_service = NotificationService()
        notification = await notification_service.create_notification(db, notification_data)
        
        # Send notification based on type
        if notification.type == NotificationType.SMS:
            success = await NotificationService.send_sms_notification(
                notification.recipient,
                notification.message
            )
        elif notification.type == NotificationType.PUSH:
            # Get device token if patient_id is provided
            if notification.patient_id:
                result = await db.execute(
                    select(DeviceToken)
                    .where(
                        and_(
                            DeviceToken.patient_id == notification.patient_id,
                            DeviceToken.is_active == True
                        )
                    )
                    .order_by(desc(DeviceToken.created_at))
                    .limit(1)
                )
                device_token = result.scalar_one_or_none()
                
                if device_token:
                    success = await NotificationService.send_push_notification(
                        device_token.token,
                        notification.subject or "Notification",
                        notification.message
                    )
                else:
                    success = False
                    notification.error_message = "No active device token found"
            else:
                success = False
                notification.error_message = "Patient ID required for push notifications"
        else:
            # For other notification types (email, system)
            success = True  # Assume success for now
        
        # Update notification status
        notification.status = "sent" if success else "failed"
        notification.sent_at = get_timezone_aware_now() if success else None
        await db.commit()
        await db.refresh(notification)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="create",
            resource="notification",
            resource_id=notification.id,
            details=f"Staff {current_user.username} created notification for {notification.recipient}"
        )
        
        return notification
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create notification: {str(e)}"
        )

@router.post("/notifications/bulk", response_model=List[Notification])
async def create_bulk_notifications(
    bulk_data: NotificationBulkCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Create and send multiple notifications"""
    try:
        notification_service = NotificationService()
        notifications = []
        
        # Create notifications one by one
        for notification_data in bulk_data.notifications:
            notification = await notification_service.create_notification(db, notification_data)
            notifications.append(notification)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="create",
            resource="notification",
            details=f"Staff {current_user.username} created {len(notifications)} bulk notifications"
        )
        
        return notifications
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create bulk notifications: {str(e)}"
        )

@router.get("/notifications", response_model=List[Notification])
async def get_notifications(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get all notifications"""
    try:
        notifications = await NotificationService.get_notifications(db, skip=skip, limit=limit)
        return notifications
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get notifications: {str(e)}"
        )

@router.get("/notifications/patient/{patient_id}", response_model=List[Notification])
async def get_patient_notifications(
    patient_id: UUID,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get notifications for a specific patient"""
    try:
        # Check if patient exists
        patient = await PatientService.get_patient(db, patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        notifications = await NotificationService.get_notifications(
            db, patient_id=patient_id, skip=skip, limit=limit
        )
        return notifications
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get patient notifications: {str(e)}"
        )

@router.post("/notifications/templates", response_model=NotificationTemplate)
async def create_notification_template(
    template_data: NotificationTemplateCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Create a notification template"""
    try:
        template = await NotificationService.create_template(
            db, template_data, created_by=current_user.id
        )
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="create",
            resource="notification_template",
            resource_id=template.id,
            details=f"Staff {current_user.username} created notification template '{template.name}'"
        )
        
        return template
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create notification template: {str(e)}"
        )

@router.get("/notifications/templates", response_model=List[NotificationTemplate])
async def get_notification_templates(
    skip: int = 0,
    limit: int = 50,
    active_only: bool = True,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get all notification templates"""
    try:
        templates = await NotificationService.get_templates(
            db, skip=skip, limit=limit, active_only=active_only
        )
        return templates
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get notification templates: {str(e)}"
        )

@router.get("/notifications/templates/{template_id}", response_model=NotificationTemplate)
async def get_notification_template(
    template_id: UUID,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific notification template"""
    try:
        template = await NotificationService.get_template(db, template_id)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification template not found"
            )
        return template
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get notification template: {str(e)}"
        )

@router.put("/notifications/templates/{template_id}", response_model=NotificationTemplate)
async def update_notification_template(
    template_id: UUID,
    template_data: NotificationTemplateUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Update a notification template"""
    try:
        template = await NotificationService.update_template(db, template_id, template_data)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification template not found"
            )
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="update",
            resource="notification_template",
            resource_id=template.id,
            details=f"Staff {current_user.username} updated notification template '{template.name}'"
        )
        
        return template
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update notification template: {str(e)}"
        )

@router.delete("/notifications/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification_template(
    template_id: UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Delete a notification template (soft delete)"""
    try:
        success = await NotificationService.delete_template(db, template_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification template not found"
            )
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="delete",
            resource="notification_template",
            resource_id=template_id,
            details=f"Staff {current_user.username} deleted notification template"
        )
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete notification template: {str(e)}"
        )

@router.post("/notifications/send-from-template", response_model=Notification)
async def send_notification_from_template(
    template_request: NotificationFromTemplate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Send a notification using a template"""
    try:
        notification = await NotificationService.send_notification_from_template(
            db, template_request
        )
        
        # Log audit event
        notification_id = notification.id if notification else None
        recipient = notification.recipient if notification else "unknown"
        
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_user.id,
            user_type="user",
            action="create",
            resource="notification",
            resource_id=notification_id,
            details=f"Staff {current_user.username} sent notification from template to {recipient}"
        )
        
        return notification
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send notification from template: {str(e)}"
        )

@router.get("/doctors", response_model=List[dict])
async def get_all_doctors(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get all doctors with their availability status"""
    try:
        # Query doctors with their user information
        result = await db.execute(
            select(Doctor, User)
            .join(User, Doctor.user_id == User.id)
            .where(User.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        
        doctor_data = result.all()
        
        # Format the response
        doctors = []
        for doctor, user in doctor_data:
            # Count active appointments for this doctor
            appointment_count_result = await db.execute(
                select(func.count(Appointment.id))
                .where(
                    and_(
                        Appointment.doctor_id == doctor.id,
                        Appointment.status.in_([
                            AppointmentStatus.WAITING,
                            AppointmentStatus.IN_PROGRESS,
                            AppointmentStatus.SCHEDULED
                        ])
                    )
                )
            )
            patient_count = appointment_count_result.scalar() or 0
            
            doctors.append({
                "id": str(doctor.id),
                "user_id": str(user.id),
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": f"Dr. {user.first_name} {user.last_name}",
                "email": user.email,
                "specialization": doctor.specialization,
                "department": doctor.department,
                "license_number": doctor.license_number,
                "is_available": doctor.is_available,
                "shift_start": doctor.shift_start,
                "shift_end": doctor.shift_end,
                "patient_count": patient_count,
                "bio": doctor.bio,
                "education": doctor.education,
                "experience": doctor.experience
            })
        
        return doctors
        
    except Exception as e:
        print(f"Error fetching doctors: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch doctors"
        )