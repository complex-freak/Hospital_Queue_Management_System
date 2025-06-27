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
                    Queue.status == QueueStatus.SERVING,
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
                Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.SERVING])
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
        
        if queue_entry.status != QueueStatus.SERVING:
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
        notification_values = notification_data.model_dump()
        await db.execute(insert(Notification).values(**notification_values))
        await db.commit()
        
        # Get the newly created notification
        # Use a unique combination of fields to identify it
        result = await db.execute(
            select(Notification).where(
                and_(
                    Notification.recipient == notification_data.recipient,
                    Notification.message == notification_data.message,
                    Notification.created_at >= datetime.utcnow() - timedelta(minutes=1)
                )
            ).order_by(desc(Notification.created_at)).limit(1)
        )
        notification = result.scalar_one_or_none()
        return notification
    
    @staticmethod
    async def create_bulk_notifications(
        db: AsyncSession,
        bulk_data: NotificationBulkCreate
    ) -> List[Notification]:
        """Create multiple notification records"""
        notifications = []
        for notification_data in bulk_data.notifications:
            notification_values = notification_data.model_dump()
            result = await db.execute(insert(Notification).values(**notification_values).returning(Notification))
            notification = result.scalar_one()
            notifications.append(notification)
        
        await db.commit()
        
        # Refresh all notifications to get their IDs
        for notification in notifications:
            await db.refresh(notification)
        
        # If send_immediately is True, attempt to send all notifications
        if bulk_data.send_immediately:
            for notification in notifications:
                try:
                    if notification.type == NotificationType.SMS:
                        success = await NotificationService.send_sms_notification(
                            notification.recipient,
                            notification.message
                        )
                    elif notification.type == NotificationType.PUSH:
                        # Get device token for the recipient
                        result = await db.execute(
                            select(DeviceToken)
                            .where(
                                and_(
                                    or_(
                                        DeviceToken.patient_id == notification.patient_id,
                                        DeviceToken.patient_id == notification.user_id
                                    ),
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
                        # For other notification types (email, system)
                        success = True  # Assume success for now
                    
                    notification.status = "sent" if success else "failed"
                    notification.sent_at = datetime.utcnow() if success else None
                except Exception as e:
                    notification.status = "failed"
                    notification.error_message = str(e)
        
        await db.commit()
        return notifications
    
    @staticmethod
    async def get_notifications(
        db: AsyncSession,
        patient_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Notification]:
        """Get notifications for a patient or user"""
        query = select(Notification)
        
        if patient_id:
            query = query.where(Notification.patient_id == patient_id)
        elif user_id:
            query = query.where(Notification.user_id == user_id)
        
        query = query.order_by(desc(Notification.created_at)).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def mark_notification_read(
        db: AsyncSession,
        notification_id: UUID
    ) -> Optional[Notification]:
        """Mark a notification as read"""
        result = await db.execute(
            select(Notification).where(Notification.id == notification_id)
        )
        notification = result.scalar_one_or_none()
        
        if notification:
            notification.is_read = True
            await db.commit()
            await db.refresh(notification)
        
        return notification
    
    @staticmethod
    async def mark_all_read(
        db: AsyncSession,
        patient_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None
    ) -> int:
        """Mark all notifications as read for a patient or user"""
        query = update(Notification).values(is_read=True)
        
        if patient_id:
            query = query.where(
                and_(
                    Notification.patient_id == patient_id,
                    Notification.is_read == False
                )
            )
        elif user_id:
            query = query.where(
                and_(
                    Notification.user_id == user_id,
                    Notification.is_read == False
                )
            )
        else:
            return 0  # No patient_id or user_id provided
        
        result = await db.execute(query)
        await db.commit()
        return result.rowcount
    
    @staticmethod
    async def create_template(
        db: AsyncSession,
        template_data: NotificationTemplateCreate,
        created_by: Optional[UUID] = None
    ) -> NotificationTemplate:
        """Create a notification template"""
        template_values = template_data.model_dump()
        template_values["created_by"] = created_by
        
        result = await db.execute(insert(NotificationTemplate).values(**template_values).returning(NotificationTemplate))
        template = result.scalar_one()
        await db.commit()
        return template
    
    @staticmethod
    async def get_templates(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        active_only: bool = True
    ) -> List[NotificationTemplate]:
        """Get all notification templates"""
        query = select(NotificationTemplate)
        
        if active_only:
            query = query.where(NotificationTemplate.is_active == True)
        
        query = query.order_by(NotificationTemplate.name).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_template(
        db: AsyncSession,
        template_id: UUID
    ) -> Optional[NotificationTemplate]:
        """Get a notification template by ID"""
        result = await db.execute(
            select(NotificationTemplate).where(NotificationTemplate.id == template_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_template(
        db: AsyncSession,
        template_id: UUID,
        template_data: NotificationTemplateUpdate
    ) -> Optional[NotificationTemplate]:
        """Update a notification template"""
        result = await db.execute(
            select(NotificationTemplate).where(NotificationTemplate.id == template_id)
        )
        template = result.scalar_one_or_none()
        
        if template:
            update_data = template_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(template, field, value)
            
            await db.commit()
            await db.refresh(template)
        
        return template
    
    @staticmethod
    async def delete_template(
        db: AsyncSession,
        template_id: UUID
    ) -> bool:
        """Delete a notification template (soft delete by setting is_active=False)"""
        result = await db.execute(
            select(NotificationTemplate).where(NotificationTemplate.id == template_id)
        )
        template = result.scalar_one_or_none()
        
        if template:
            template.is_active = False
            await db.commit()
            return True
        
        return False
    
    @staticmethod
    async def send_notification_from_template(
        db: AsyncSession,
        template_request: NotificationFromTemplate
    ) -> Optional[Notification]:
        """Send a notification using a template"""
        # Get the template
        result = await db.execute(
            select(NotificationTemplate).where(
                and_(
                    NotificationTemplate.id == template_request.template_id,
                    NotificationTemplate.is_active == True
                )
            )
        )
        template = result.scalar_one_or_none()
        
        if not template:
            raise ValueError("Template not found or inactive")
        
        # Process template with variables
        subject = template.subject
        message = template.body
        
        if template_request.variables:
            try:
                # Simple string formatting for variables
                for key, value in template_request.variables.items():
                    placeholder = f"{{{key}}}"
                    subject = subject.replace(placeholder, str(value))
                    message = message.replace(placeholder, str(value))
            except Exception as e:
                logger.error(f"Error processing template variables: {e}")
                # Continue with unprocessed template
        
        # Create notification
        notification_data = NotificationCreate(
            type=template.type,
            recipient=template_request.recipient,
            subject=subject,
            message=message,
            patient_id=template_request.patient_id,
            user_id=template_request.user_id,
            reference_id=template_request.reference_id
        )
        
        notification = await NotificationService.create_notification(db, notification_data)
        
        # Send the notification
        try:
            if template.type == NotificationType.SMS:
                success = await NotificationService.send_sms_notification(
                    notification.recipient,
                    notification.message
                )
            elif template.type == NotificationType.PUSH:
                # Get device token
                token_query = select(DeviceToken)
                
                if notification.patient_id:
                    token_query = token_query.where(
                        and_(
                            DeviceToken.patient_id == notification.patient_id,
                            DeviceToken.is_active == True
                        )
                    )
                elif notification.user_id:
                    # For future use if we add device tokens for staff/doctors
                    pass
                
                token_query = token_query.order_by(desc(DeviceToken.created_at)).limit(1)
                token_result = await db.execute(token_query)
                device_token = token_result.scalar_one_or_none()
                
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
                # For other notification types (email, system)
                success = True  # Assume success for now
            
            notification.status = "sent" if success else "failed"
            notification.sent_at = datetime.utcnow() if success else None
            await db.commit()
            await db.refresh(notification)
            
            return notification
        except Exception as e:
            notification.status = "failed"
            notification.error_message = str(e)
            await db.commit()
            logger.error(f"Error sending notification: {e}")
            return notification

    @staticmethod
    async def send_sms_notification(
        phone_number: str,
        message: str
    ) -> bool:
        """Send SMS notification via Twilio"""
        # Import at function level to avoid circular imports
        from api.core.config import settings
        
        if not settings.SMS_ENABLED:
            logger.info("SMS notifications are disabled")
            return False
            
        try:
            # Optional import - will be installed in production
            from twilio.rest import Client  # type: ignore
            
            if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_FROM_NUMBER]):
                logger.warning("Twilio credentials not configured")
                return False
            
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            
            message = client.messages.create(
                body=message,
                from_=settings.TWILIO_FROM_NUMBER,
                to=phone_number
            )
            
            logger.info(f"SMS sent to {phone_number}")
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
        # Import at function level to avoid circular imports
        from api.core.config import settings
        
        if not settings.PUSH_ENABLED:
            logger.info("Push notifications are disabled")
            return False
            
        try:
            # Optional imports - will be installed in production
            import firebase_admin  # type: ignore
            from firebase_admin import messaging, credentials  # type: ignore
            
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
            
            notification_values = {
                "user_id": user_id,
                "type": NotificationType.SMS if notification_type == "sms" else NotificationType.PUSH,
                "recipient": user.email or str(user.id),
                "subject": title,
                "message": message,
                "status": "pending",
                "reference_id": reference_id
            }
            
            result = await db.execute(insert(Notification).values(**notification_values).returning(Notification))
            notification = result.scalar_one()
            await db.commit()
            
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
                subject="Appointment Confirmed",
                reference_id=appointment.id
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
    
    @staticmethod
    async def notify_appointment_cancelled(
        db: AsyncSession,
        patient: Patient,
        reason: Optional[str] = None
    ):
        """Notify patient about appointment cancellation"""
        reason_text = f" Reason: {reason}" if reason else ""
        message = f"Your appointment has been cancelled.{reason_text} Please contact us to reschedule."
        
        notification = await NotificationService.create_notification(
            db,
            NotificationCreate(
                patient_id=patient.id,
                type=NotificationType.SMS,
                recipient=patient.phone_number,
                message=message,
                subject="Appointment Cancelled"
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

# Export all services
__all__ = [
    'AuthService',
    'PatientService',
    'NotificationService',
    'get_queue_analytics',
    'get_appointment_analytics',
    'get_doctor_analytics',
    'get_system_overview'
]