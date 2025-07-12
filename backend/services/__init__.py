from typing import Optional, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc, update, insert
from sqlalchemy.orm import selectinload
from uuid import UUID
import logging

from models import (
    Patient, User, Doctor, Appointment, Queue, Notification, AuditLog,
    UserRole, AppointmentStatus, QueueStatus, UrgencyLevel, NotificationType,
    DeviceToken, NotificationTemplate
)
from schemas import (
    PatientCreate, PatientUpdate, UserCreate, UserUpdate, 
    AppointmentCreate, AppointmentUpdate, QueueCreate, QueueUpdate,
    NotificationCreate, QueueStatusResponse, DashboardStats,
    NotificationBulkCreate, NotificationFromTemplate,
    NotificationTemplateCreate, NotificationTemplateUpdate
)
from api.core.config import settings
from api.core.security import get_password_hash, verify_password, create_access_token
from .doctor_service import DoctorService

# Import analytics services
from services.queue_analytics import get_queue_analytics
from services.appointment_analytics import get_appointment_analytics
from services.doctor_analytics import get_doctor_analytics
from services.system_analytics import get_system_overview

logger = logging.getLogger(__name__)


class AuthService:
    """Authentication and user management service"""
    
    @staticmethod
    async def register_patient(
        db: AsyncSession, 
        patient_data: PatientCreate
    ) -> Patient:
        """Register a new patient"""
        # Check if phone number already exists
        result = await db.execute(
            select(Patient).where(Patient.phone_number == patient_data.phone_number)
        )
        if result.scalar_one_or_none():
            raise ValueError("Phone number already registered")
        
        # Create patient
        
        await db.execute(insert(Patient).values(
            phone_number=patient_data.phone_number,
            password_hash=get_password_hash(patient_data.password),
            first_name=patient_data.first_name,
            last_name=patient_data.last_name,
            email=patient_data.email,
            date_of_birth=patient_data.date_of_birth,
            gender=patient_data.gender,
            address=patient_data.address,
            emergency_contact=patient_data.emergency_contact
        ))
        await db.commit()
        
        # Get the newly created patient
        result = await db.execute(
            select(Patient).where(Patient.phone_number == patient_data.phone_number)
        )
        patient = result.scalar_one_or_none()
        
        logger.info(f"Patient registered: {patient.phone_number}")
        return patient
    
    @staticmethod
    async def register_user(
        db: AsyncSession,
        user_data: UserCreate
    ) -> User:
        """Register a new user (staff/admin/doctor)"""
        # Check if username already exists
        result = await db.execute(
            select(User).where(User.username == user_data.username)
        )
        if result.scalar_one_or_none():
            raise ValueError("Username already exists")
        
        # Create user with timestamps
        
        await db.execute(insert(User).values(
            username=user_data.username,
            password_hash=get_password_hash(user_data.password),
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=user_data.role,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        ))
        await db.commit()
        
        # Get the newly created user
        result = await db.execute(
            select(User).where(User.username == user_data.username)
        )
        user = result.scalar_one_or_none()
        
        logger.info(f"User registered: {user.username} with role {user.role}")
        return user
    
    @staticmethod
    async def authenticate_patient(
        db: AsyncSession,
        phone_number: str,
        password: str
    ) -> Optional[Patient]:
        """Authenticate patient login"""
        result = await db.execute(
            select(Patient).where(Patient.phone_number == phone_number)
        )
        patient = result.scalar_one_or_none()
        
        if patient and verify_password(password, patient.password_hash):
            return patient
        return None
    
    @staticmethod
    async def authenticate_user(
        db: AsyncSession,
        username: str,
        password: str
    ) -> Optional[User]:
        """Authenticate user login"""
        result = await db.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one_or_none()
        
        if user and verify_password(password, user.password_hash):
            return user
        return None


class QueueService:
    """Queue management service"""
    
    @staticmethod
    async def get_next_queue_number(db: AsyncSession) -> int:
        """Get next available queue number"""
        result = await db.execute(
            select(func.max(Queue.queue_number)).where(
                func.date(Queue.created_at) == func.current_date()
            )
        )
        max_number = result.scalar_one_or_none()
        return (max_number or 0) + 1
    
    @staticmethod
    async def calculate_priority_score(
        urgency: UrgencyLevel,
        appointment_time: datetime,
        patient_age: Optional[int] = None
    ) -> int:
        """Calculate priority score for queue"""
        base_score = {
            UrgencyLevel.EMERGENCY: 1000,
            UrgencyLevel.HIGH: 100,
            UrgencyLevel.NORMAL: 10,
            UrgencyLevel.LOW: 1
        }[urgency]
        
        # Age factor (elderly get higher priority)
        age_factor = 0
        if patient_age and patient_age >= 65:
            age_factor = 50
        elif patient_age and patient_age >= 80:
            age_factor = 100
        
        # Time factor (earlier appointments get slightly higher priority)
        now = datetime.utcnow()
        if appointment_time < now:
            time_factor = 20  # Late appointments get priority
        else:
            time_factor = 0
        
        return base_score + age_factor + time_factor
    
    @staticmethod
    async def add_to_queue(
        db: AsyncSession,
        appointment_id: UUID,
        urgency: UrgencyLevel = UrgencyLevel.NORMAL,
        patient_age: Optional[int] = None
    ) -> Queue:
        """Add appointment to queue"""
        # Get appointment
        result = await db.execute(
            select(Appointment).where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one_or_none()
        if not appointment:
            raise ValueError("Appointment not found")
        
        # Get next queue number
        queue_number = await QueueService.get_next_queue_number(db)
        
        # Calculate priority score
        priority_score = await QueueService.calculate_priority_score(
            urgency, appointment.appointment_date, patient_age
        )
        
        # Create queue entry
        
        await db.execute(insert(Queue).values(
            appointment_id=appointment_id,
            queue_number=queue_number,
            priority_score=priority_score
        ))
        await db.commit()
        
        # Get the newly created queue entry
        result = await db.execute(
            select(Queue).where(
                and_(
                    Queue.appointment_id == appointment_id,
                    Queue.queue_number == queue_number
                )
            )
        )
        queue_entry = result.scalar_one_or_none()
        
        logger.info(f"Added to queue: #{queue_number} with priority {priority_score}")
        return queue_entry
    
    @staticmethod
    async def get_queue_status(
        db: AsyncSession,
        patient_id: UUID
    ) -> Optional[QueueStatusResponse]:
        """Get queue status for patient"""
        # Find patient's current queue entry
        result = await db.execute(
            select(Queue)
            .join(Appointment)
            .where(
                and_(
                    Appointment.patient_id == patient_id,
                    Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED]),
                    func.date(Queue.created_at) == func.current_date()
                )
            )
            .order_by(desc(Queue.created_at))
        )
        queue_entry = result.scalar_one_or_none()
        
        if not queue_entry:
            return None
        
        # Calculate estimated wait time
        # This is a simplified calculation - in a real app you'd use more sophisticated logic
        result = await db.execute(
            select(func.count(Queue.id))
            .where(
                and_(
                    Queue.status == QueueStatus.WAITING,
                    Queue.priority_score > queue_entry.priority_score,
                    func.date(Queue.created_at) == func.current_date()
                )
            )
        )
        patients_ahead = result.scalar_one()
        
        # Estimate 10 minutes per patient ahead
        estimated_wait_time = patients_ahead * 10
        
        return QueueStatusResponse(
            queue_number=queue_entry.queue_number,
            position=patients_ahead + 1,
            status=queue_entry.status,
            estimated_wait_time=estimated_wait_time,
            created_at=queue_entry.created_at
        )
    
    @staticmethod
    async def get_queue_list(
        db: AsyncSession,
        status: Optional[QueueStatus] = None,
        limit: int = 50
    ) -> List[Queue]:
        """Get queue list with optional status filter"""
        query = select(Queue).order_by(Queue.priority_score.desc(), Queue.created_at.asc())
        
        if status:
            query = query.where(Queue.status == status)
        
        query = query.limit(limit)
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def call_next_patient(db: AsyncSession) -> Optional[Queue]:
        """Call next patient from queue"""
        # Get the highest priority patient who is waiting
        result = await db.execute(
            select(Queue)
            .where(
                and_(
                    Queue.status == QueueStatus.WAITING,
                    func.date(Queue.created_at) == func.current_date()
                )
            )
            .order_by(Queue.priority_score.desc(), Queue.created_at.asc())
            .limit(1)
        )
        queue_entry = result.scalar_one_or_none()
        
        if queue_entry:
            queue_entry.status = QueueStatus.CALLED
            queue_entry.called_at = datetime.utcnow()
            await db.commit()
            await db.refresh(queue_entry)
            
            logger.info(f"Called patient: Queue #{queue_entry.queue_number}")
        
        return queue_entry
    
    @staticmethod
    async def mark_patient_served(
        db: AsyncSession,
        queue_id: UUID
    ) -> Queue:
        """Mark patient as served"""
        result = await db.execute(
            select(Queue).where(Queue.id == queue_id)
        )
        queue_entry = result.scalar_one_or_none()
        
        if not queue_entry:
            raise ValueError("Queue entry not found")
        
        queue_entry.status = QueueStatus.COMPLETED
        queue_entry.served_at = datetime.utcnow()
        await db.commit()
        await db.refresh(queue_entry)
        
        logger.info(f"Marked patient as served: Queue #{queue_entry.queue_number}")
        return queue_entry


class PatientService:
    """Patient management service"""
    
    @staticmethod
    async def create_patient(
        db: AsyncSession, 
        patient_data: PatientCreate
    ) -> Patient:
        """Create a new patient"""
        # Check if phone number already exists
        result = await db.execute(
            select(Patient).where(Patient.phone_number == patient_data.phone_number)
        )
        if result.scalar_one_or_none():
            raise ValueError("Phone number already registered")
        
        # Create patient
        await db.execute(insert(Patient).values(
            phone_number=patient_data.phone_number,
            password_hash=get_password_hash(patient_data.password),
            first_name=patient_data.first_name,
            last_name=patient_data.last_name,
            email=patient_data.email,
            date_of_birth=patient_data.date_of_birth,
            gender=patient_data.gender,
            address=patient_data.address,
            emergency_contact=patient_data.emergency_contact
        ))
        await db.commit()
        
        # Get the newly created patient
        result = await db.execute(
            select(Patient).where(Patient.phone_number == patient_data.phone_number)
        )
        patient = result.scalar_one_or_none()
        
        logger.info(f"Patient created: {patient.phone_number}")
        return patient
    
    @staticmethod
    async def get_patient(
        db: AsyncSession,
        patient_id: UUID
    ) -> Optional[Patient]:
        """Get patient by ID"""
        result = await db.execute(
            select(Patient).where(Patient.id == patient_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_patient(
        db: AsyncSession,
        patient_id: UUID,
        patient_update: PatientUpdate
    ) -> Optional[Patient]:
        """Update patient information"""
        result = await db.execute(
            select(Patient).where(Patient.id == patient_id)
        )
        patient = result.scalar_one_or_none()
        
        if not patient:
            return None
        
        # Update fields
        for field, value in patient_update.model_dump(exclude_unset=True).items():
            setattr(patient, field, value)
        
        patient.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(patient)
        
        return patient
    
    @staticmethod
    async def get_all_patients(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[Patient]:
        """Get all patients with pagination"""
        result = await db.execute(
            select(Patient)
            .order_by(desc(Patient.created_at))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()


# Old NotificationService class removed - using new notification_service from services/notification_service.py


class AppointmentService:
    """Appointment management service"""
    
    @staticmethod
    async def create_appointment(
        db: AsyncSession,
        appointment_data: AppointmentCreate,
        created_by_id: Optional[UUID] = None
    ) -> Appointment:
        """Create new appointment"""
        # Create appointment
        
        appointment_values = appointment_data.model_dump()
        appointment_values["created_by"] = created_by_id
        
        result = await db.execute(insert(Appointment).values(**appointment_values).returning(Appointment))
        appointment = result.scalar_one()
        await db.commit()
        
        # Add to queue
        queue_entry = await QueueService.add_to_queue(
            db,
            appointment.id,
            appointment.urgency
        )
        
        # Get patient for notification
        result = await db.execute(
            select(Patient).where(Patient.id == appointment.patient_id)
        )
        patient = result.scalar_one()
        
        # Send notification using new notification service
        from services.notification_service import notification_service
        await notification_service.send_appointment_confirmation(
            db, patient.id, appointment.id, queue_entry.queue_number
        )
        
        logger.info(f"Appointment created: {appointment.id}")
        return appointment
    
    @staticmethod
    async def get_dashboard_stats(db: AsyncSession) -> DashboardStats:
        """Get dashboard statistics"""
        today = datetime.utcnow().date()
        
        # Total patients today
        result = await db.execute(
            select(func.count(Queue.id))
            .where(func.date(Queue.created_at) == today)
        )
        total_patients_today = result.scalar_one()
        
        # Total served today
        result = await db.execute(
            select(func.count(Queue.id))
            .where(
                and_(
                    func.date(Queue.created_at) == today,
                    Queue.status == QueueStatus.COMPLETED
                )
            )
        )
        total_served_today = result.scalar_one()
        
        # Current queue length
        result = await db.execute(
            select(func.count(Queue.id))
            .where(
                and_(
                    func.date(Queue.created_at) == today,
                    Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED])
                )
            )
        )
        current_queue_length = result.scalar_one()
        
        # Average wait time (for completed appointments)
        result = await db.execute(
            select(func.avg(
                func.extract('epoch', Queue.served_at - Queue.created_at) / 60
            ))
            .where(
                and_(
                    func.date(Queue.created_at) == today,
                    Queue.status == QueueStatus.COMPLETED,
                    Queue.served_at.isnot(None)
                )
            )
        )
        avg_wait_time = result.scalar_one()
        
        return DashboardStats(
            total_patients_today=total_patients_today,
            total_served_today=total_served_today,
            current_queue_length=current_queue_length,
            average_wait_time=int(avg_wait_time) if avg_wait_time else None
        )

# Export all services
__all__ = [
    'AuthService',
    'PatientService',
    'QueueService',
    'AppointmentService',
    'get_queue_analytics',
    'get_appointment_analytics',
    'get_doctor_analytics',
    'get_system_overview'
]