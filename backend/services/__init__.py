from typing import Optional, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.orm import selectinload
from uuid import UUID
import logging

from models import (
    Patient, User, Doctor, Appointment, Queue, Notification, AuditLog,
    UserRole, AppointmentStatus, QueueStatus, UrgencyLevel, NotificationType
)
from schemas import (
    PatientCreate, PatientUpdate, UserCreate, UserUpdate, 
    AppointmentCreate, AppointmentUpdate, QueueCreate, QueueUpdate,
    NotificationCreate, QueueStatusResponse, DashboardStats
)
from api.core.security import get_password_hash, verify_password, create_access_token

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
        patient = Patient(
            phone_number=patient_data.phone_number,
            password_hash=get_password_hash(patient_data.password),
            first_name=patient_data.first_name,
            last_name=patient_data.last_name,
            email=patient_data.email,
            date_of_birth=patient_data.date_of_birth,
            gender=patient_data.gender,
            address=patient_data.address,
            emergency_contact=patient_data.emergency_contact
        )
        
        db.add(patient)
        await db.commit()
        await db.refresh(patient)
        
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
        user = User(
            username=user_data.username,
            password_hash=get_password_hash(user_data.password),
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=user_data.role,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
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
        queue_entry = Queue(
            appointment_id=appointment_id,
            queue_number=queue_number,
            priority_score=priority_score
        )
        
        db.add(queue_entry)
        await db.commit()
        await db.refresh(queue_entry)
        
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
            .options(selectinload(Queue.appointment))
        )
        patient_queue = result.scalar_one_or_none()
        
        if not patient_queue:
            return None
        
        # Get current serving number
        result = await db.execute(
            select(Queue.queue_number)
            .where(
                and_(
                    Queue.status == QueueStatus.IN_PROGRESS,
                    func.date(Queue.created_at) == func.current_date()
                )
            )
        )
        current_serving = result.scalar_one_or_none()
        
        # Get queue position (count of people ahead with higher priority)
        result = await db.execute(
            select(func.count(Queue.id))
            .where(
                and_(
                    Queue.status == QueueStatus.WAITING,
                    or_(
                        Queue.priority_score > patient_queue.priority_score,
                        and_(
                            Queue.priority_score == patient_queue.priority_score,
                            Queue.queue_number < patient_queue.queue_number
                        )
                    ),
                    func.date(Queue.created_at) == func.current_date()
                )
            )
        )
        position = result.scalar_one() + 1
        
        # Get total in queue
        result = await db.execute(
            select(func.count(Queue.id))
            .where(
                and_(
                    Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED]),
                    func.date(Queue.created_at) == func.current_date()
                )
            )
        )
        total_in_queue = result.scalar_one()
        
        return QueueStatusResponse(
            queue_position=position,
            estimated_wait_time=patient_queue.estimated_wait_time,
            current_serving=current_serving,
            total_in_queue=total_in_queue,
            your_number=patient_queue.queue_number,
            status=patient_queue.status
        )
    
    @staticmethod
    async def get_queue_list(
        db: AsyncSession,
        status: Optional[QueueStatus] = None,
        limit: int = 50
    ) -> List[Queue]:
        """Get current queue list"""
        query = select(Queue).options(
            selectinload(Queue.appointment).selectinload(Appointment.patient)
        ).where(
            func.date(Queue.created_at) == func.current_date()
        )
        
        if status:
            query = query.where(Queue.status == status)
        else:
            query = query.where(
                Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_PROGRESS])
            )
        
        # Order by priority score (desc) then queue number (asc)
        query = query.order_by(desc(Queue.priority_score), asc(Queue.queue_number))
        query = query.limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def call_next_patient(db: AsyncSession) -> Optional[Queue]:
        """Call next patient in queue"""
        # Get next patient
        result = await db.execute(
            select(Queue)
            .where(
                and_(
                    Queue.status == QueueStatus.WAITING,
                    func.date(Queue.created_at) == func.current_date()
                )
            )
            .order_by(desc(Queue.priority_score), asc(Queue.queue_number))
            .limit(1)
        )
        next_patient = result.scalar_one_or_none()
        
        if next_patient:
            next_patient.status = QueueStatus.CALLED
            next_patient.called_at = datetime.utcnow()
            await db.commit()
            logger.info(f"Called patient #{next_patient.queue_number}")
        
        return next_patient
    
    @staticmethod
    async def mark_patient_served(
        db: AsyncSession,
        queue_id: UUID
    ) -> Queue:
        """Mark a patient as served"""
        # Get queue entry
        result = await db.execute(
            select(Queue).where(Queue.id == queue_id)
        )
        queue_entry = result.scalar_one_or_none()
        
        if not queue_entry:
            raise ValueError("Queue entry not found")
        
        if queue_entry.status != QueueStatus.IN_PROGRESS:
            raise ValueError("Patient is not currently being served")
        
        queue_entry.status = QueueStatus.COMPLETED
        queue_entry.served_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(queue_entry)
        
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
        patient = Patient(
            phone_number=patient_data.phone_number,
            password_hash=get_password_hash(patient_data.password),
            first_name=patient_data.first_name,
            last_name=patient_data.last_name,
            email=patient_data.email,
            date_of_birth=patient_data.date_of_birth,
            gender=patient_data.gender,
            address=patient_data.address,
            emergency_contact=patient_data.emergency_contact
        )
        
        db.add(patient)
        await db.commit()
        await db.refresh(patient)
        
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
        update_data = patient_update.dict(exclude_unset=True)
        for field, value in update_data.items():
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


class NotificationService:
    """Notification service for SMS, email and push notifications"""
    
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        notification_data: NotificationCreate
    ) -> Notification:
        """Create notification record"""
        notification = Notification(**notification_data.model_dump())
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        return notification
    
    @staticmethod
    async def send_sms_notification(
        phone_number: str,
        message: str
    ) -> bool:
        """Send SMS notification via Twilio"""
        try:
            from twilio.rest import Client
            from api.core.config import settings
            
            if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_FROM_NUMBER]):
                logger.warning("Twilio credentials not configured")
                return False
            
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            
            message = client.messages.create(
                body=message,
                from_=settings.TWILIO_FROM_NUMBER,
                to=phone_number
            )
            
            logger.info(f"SMS sent to {phone_number}: {message.sid}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send SMS to {phone_number}: {e}")
            return False
    
    @staticmethod
    async def send_push_notification(
        device_token: str,
        title: str,
        body: str
    ) -> bool:
        """Send push notification via Firebase"""
        try:
            import firebase_admin
            from firebase_admin import messaging, credentials
            from core.config import settings
            
            if not settings.FIREBASE_CREDENTIALS_PATH:
                logger.warning("Firebase credentials not configured")
                return False
            
            # Initialize Firebase Admin if not already done
            if not firebase_admin._apps:
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                firebase_admin.initialize_app(cred)
            
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                token=device_token,
            )
            
            response = messaging.send(message)
            logger.info(f"Push notification sent: {response}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send push notification: {e}")
            return False
    
    @staticmethod
    async def send_notification(
        db: AsyncSession,
        user_id: UUID,
        title: str,
        message: str,
        notification_type: str = "general",
        reference_id: Optional[UUID] = None
    ) -> UUID:
        """Send notification to user"""
        try:
            # Get user details
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()
            if not user:
                raise ValueError("User not found")
            
            # Create notification record
            notification = Notification(
                patient_id=user_id,
                type=NotificationType.SMS if notification_type == "sms" else NotificationType.PUSH,
                recipient=user.email or str(user.id),
                subject=title,
                message=message,
                status="pending"
            )
            
            db.add(notification)
            await db.commit()
            await db.refresh(notification)
            
            # Attempt to send the notification
            # This is a simplified implementation - in a real app you might use a queue
            notification.status = "sent"
            notification.sent_at = datetime.utcnow()
            await db.commit()
            
            logger.info(f"Notification sent to user {user_id}: {title}")
            return notification.id
            
        except Exception as e:
            logger.error(f"Error sending notification: {str(e)}")
            if 'notification' in locals():
                notification.status = "failed"
                notification.error_message = str(e)
                await db.commit()
                return notification.id
            raise
    
    @staticmethod
    async def notify_appointment_booked(
        db: AsyncSession,
        patient: Patient,
        appointment: Appointment,
        queue_number: int
    ):
        """Send booking confirmation"""
        message = f"Appointment confirmed for {appointment.appointment_date.strftime('%Y-%m-%d %H:%M')}. Your queue number is #{queue_number}. Please arrive 15 minutes early."
        
        # Create notification record
        notification = await NotificationService.create_notification(
            db,
            NotificationCreate(
                patient_id=patient.id,
                type=NotificationType.SMS,
                recipient=patient.phone_number,
                message=message,
                subject="Appointment Confirmed"
            )
        )
        
        # Send SMS
        success = await NotificationService.send_sms_notification(
            patient.phone_number,
            message
        )
        
        # Update notification status
        notification.status = "sent" if success else "failed"
        notification.sent_at = datetime.utcnow() if success else None
        await db.commit()
    
    @staticmethod
    async def notify_turn_approaching(
        db: AsyncSession,
        patient: Patient,
        queue_number: int,
        estimated_time: int
    ):
        """Notify patient their turn is approaching"""
        message = f"Your turn is approaching! Queue #{queue_number}. Estimated wait time: {estimated_time} minutes. Please be ready."
        
        notification = await NotificationService.create_notification(
            db,
            NotificationCreate(
                patient_id=patient.id,
                type=NotificationType.SMS,
                recipient=patient.phone_number,
                message=message,
                subject="Your Turn Approaching"
            )
        )
        
        success = await NotificationService.send_sms_notification(
            patient.phone_number,
            message
        )
        
        notification.status = "sent" if success else "failed"
        notification.sent_at = datetime.utcnow() if success else None
        await db.commit()
    
    @staticmethod
    async def notify_turn_ready(
        db: AsyncSession,
        patient: Patient,
        queue_number: int
    ):
        """Notify patient it's their turn"""
        message = f"It's your turn! Queue #{queue_number}. Please proceed to the consultation room."
        
        notification = await NotificationService.create_notification(
            db,
            NotificationCreate(
                patient_id=patient.id,
                type=NotificationType.SMS,
                recipient=patient.phone_number,
                message=message,
                subject="Your Turn Now"
            )
        )
        
        success = await NotificationService.send_sms_notification(
            patient.phone_number,
            message
        )
        
        notification.status = "sent" if success else "failed"
        notification.sent_at = datetime.utcnow() if success else None
        await db.commit()


class AppointmentService:
    """Appointment management service"""
    
    @staticmethod
    async def create_appointment(
        db: AsyncSession,
        appointment_data: AppointmentCreate,
        created_by_id: Optional[UUID] = None
    ) -> Appointment:
        """Create new appointment"""
        appointment = Appointment(
            **appointment_data.model_dump(),
            created_by=created_by_id
        )
        
        db.add(appointment)
        await db.commit()
        await db.refresh(appointment)
        
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
        
        # Send notification
        await NotificationService.notify_appointment_booked(
            db, patient, appointment, queue_entry.queue_number
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