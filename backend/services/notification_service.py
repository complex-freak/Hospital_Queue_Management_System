from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, insert, and_
from uuid import UUID
from datetime import datetime
import asyncio
import logging
import aiohttp
from fastapi import BackgroundTasks

# SMS API imports

try:
    from pyfcm import FCMNotification  # type: ignore
except ImportError:
    FCMNotification = None

from models import Notification, Patient, Queue, Doctor, NotificationType, DeviceToken, User
from schemas import NotificationCreate
from api.core.config import settings

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self):
        # Initialize SMS API configuration
        self.sms_api_key = getattr(settings, "SMS_API_KEY", None)
        self.sms_api_url = getattr(settings, "SMS_API_URL", "https://api.smsmobileapi.com/sendsms/")
        
        if not self.sms_api_key:
            logger.warning("SMS_API_KEY not configured")
        
        # Initialize FCM client
        if FCMNotification and getattr(settings, "FIREBASE_SERVER_KEY", None):
            self.fcm_client = FCMNotification(api_key=getattr(settings, "FIREBASE_SERVER_KEY", ""))
        else:
            self.fcm_client = None
            logger.warning("FCM not configured or pyfcm package not installed")
        
        # Log settings status
        if settings.SMS_ENABLED and not self.sms_api_key:
            logger.warning("SMS_ENABLED=True but SMS_API_KEY not configured")
            
        if settings.PUSH_ENABLED and not self.fcm_client:
            logger.warning("PUSH_ENABLED=True but FCM client not initialized")
    
    async def create_notification(
        self,
        db: AsyncSession,
        notification_data: NotificationCreate
    ) -> Notification:
        """Create a notification record in database"""
        notification_values = {
            "patient_id": notification_data.patient_id,
            "user_id": notification_data.user_id,
            "type": notification_data.type,
            "recipient": notification_data.recipient,
            "message": notification_data.message,
            "subject": notification_data.subject,
            "reference_id": notification_data.reference_id,
            "status": "pending"
        }
        
        result = await db.execute(insert(Notification).values(**notification_values).returning(Notification.id))
        notification_id_row = result.first()
        await db.commit()

        # Fetch ORM instance by ID to ensure we return a proper model
        notification_id = notification_id_row[0] if notification_id_row else None
        if notification_id is not None:
            result = await db.execute(select(Notification).where(Notification.id == notification_id))
            notification = result.scalar_one_or_none()
            return notification
        else:
            return None
    
    async def send_sms(
        self,
        phone_number: str,
        message: str,
        notification_id: Optional[UUID] = None,
        db: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """Send SMS notification via SMS API"""
        if not self.sms_api_key:
            result = {
                'success': False,
                'error': 'SMS API not configured',
                'message_id': None
            }
        else:
            try:
                # Prepare payload for SMS API
                payload = {
                    "recipients": phone_number,
                    "message": message,
                    "apikey": self.sms_api_key
                }
                
                # Send SMS using aiohttp for async HTTP requests
                async with aiohttp.ClientSession() as session:
                    async with session.post(self.sms_api_url, data=payload) as response:
                        response_text = await response.text()
                        
                        if response.status == 200:
                            result = {
                                'success': True,
                                'error': None,
                                'message_id': f"sms_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
                            }
                            logger.info(f"SMS sent successfully to {phone_number}, Response: {response_text}")
                        else:
                            result = {
                                'success': False,
                                'error': f"HTTP {response.status}: {response_text}",
                                'message_id': None
                            }
                            logger.error(f"Failed to send SMS to {phone_number}: HTTP {response.status} - {response_text}")
                
            except aiohttp.ClientError as e:
                result = {
                    'success': False,
                    'error': f"Network error: {str(e)}",
                    'message_id': None
                }
                logger.error(f"Network error sending SMS to {phone_number}: {e}")
            except Exception as e:
                result = {
                    'success': False,
                    'error': f"Unexpected error: {str(e)}",
                    'message_id': None
                }
                logger.error(f"Unexpected error sending SMS to {phone_number}: {e}")
        
        # Update notification status in database
        if notification_id and db:
            await self._update_notification_status(
                db, notification_id, result['success'], result.get('error')
            )
        
        return result
    
    async def _update_notification_status(
        self,
        db: AsyncSession,
        notification_id: UUID,
        success: bool,
        error_message: Optional[str] = None
    ):
        """Update notification status in database"""
        try:
            result = await db.execute(
                select(Notification).where(Notification.id == notification_id)
            )
            notification = result.scalar_one_or_none()
            
            if notification:
                notification.status = "SENT" if success else "FAILED"
                notification.sent_at = datetime.utcnow() if success else None
                notification.error_message = error_message
                notification.updated_at = datetime.utcnow()
                
                await db.commit()
                
        except Exception as e:
            logger.error(f"Failed to update notification status: {e}")
    
    # Background task methods for FastAPI BackgroundTasks
    async def send_appointment_confirmation(
        self,
        db: AsyncSession,
        patient_id: UUID,
        appointment_id: UUID,
        queue_number: int
    ):
        """Send appointment booking confirmation"""
        try:
            # Get patient details
            result = await db.execute(
                select(Patient).where(Patient.id == patient_id)
            )
            patient = result.scalar_one_or_none()
            
            if not patient:
                logger.error(f"Patient not found: {patient_id}")
                return
            
            # Create notification record
            notification_data = NotificationCreate(
                type=NotificationType.SMS,
                recipient=patient.phone_number,
                message=f"Hello {patient.first_name}, your appointment has been confirmed. Your queue number is {queue_number}.",
                subject="Appointment Confirmed",
                patient_id=patient_id,
                reference_id=appointment_id
            )
            
            notification = await self.create_notification(db, notification_data)
            
            # Send SMS
            await self.send_sms(
                phone_number=patient.phone_number,
                message=notification.message,
                notification_id=notification.id,
                db=db
            )
            
        except Exception as e:
            logger.error(f"Failed to send appointment confirmation: {e}")
    
    async def send_queue_position_update(
        self,
        db: AsyncSession,
        patient_id: UUID,
        queue_position: int,
        estimated_wait_time: int
    ):
        """Send queue position update"""
        try:
            # Get patient details
            result = await db.execute(
                select(Patient).where(Patient.id == patient_id)
            )
            patient = result.scalar_one_or_none()
            
            if not patient:
                logger.error(f"Patient not found: {patient_id}")
                return
            
            # Create notification record
            notification_data = NotificationCreate(
                type=NotificationType.SMS,
                recipient=patient.phone_number,
                message=f"Hello {patient.first_name}, you are number {queue_position} in queue. Estimated wait time: {estimated_wait_time} minutes.",
                subject="Queue Position Update",
                patient_id=patient_id
            )
            
            notification = await self.create_notification(db, notification_data)
            
            # Send SMS
            await self.send_sms(
                phone_number=patient.phone_number,
                message=notification.message,
                notification_id=notification.id,
                db=db
            )
            
        except Exception as e:
            logger.error(f"Failed to send queue position update: {e}")
    
    async def send_your_turn_notification(
        self,
        db: AsyncSession,
        patient_id: UUID,
        doctor_name: str,
        room_number: Optional[str] = None
    ):
        """Send notification when it's patient's turn"""
        try:
            # Get patient details
            result = await db.execute(
                select(Patient).where(Patient.id == patient_id)
            )
            patient = result.scalar_one_or_none()
            
            if not patient:
                logger.error(f"Patient not found: {patient_id}")
                return
            
            room_info = f" in room {room_number}" if room_number else ""
            
            # Create notification record
            notification_data = NotificationCreate(
                type=NotificationType.SMS,
                recipient=patient.phone_number,
                message=f"Hello {patient.first_name}, it's now your turn to see Dr. {doctor_name}{room_info}. Please proceed immediately.",
                subject="It's Your Turn!",
                patient_id=patient_id
            )
            
            notification = await self.create_notification(db, notification_data)
            
            # Send SMS
            await self.send_sms(
                phone_number=patient.phone_number,
                message=notification.message,
                notification_id=notification.id,
                db=db
            )
            
            # Send push notification if FCM token available
            if hasattr(patient, 'fcm_token') and patient.fcm_token:
                await self.send_push_notification(
                    fcm_token=patient.fcm_token,
                    title="It's Your Turn!",
                    message=notification.message,
                    data={
                        'type': 'your_turn',
                        'doctor_name': doctor_name,
                        'room_number': room_number or ''
                    },
                    notification_id=notification.id,
                    db=db
                )
            
        except Exception as e:
            logger.error(f"Failed to send your turn notification: {e}")
    
    async def send_reminder_notification(
        self,
        db: AsyncSession,
        patient_id: UUID,
        minutes_remaining: int
    ):
        """Send reminder notification before patient's turn"""
        try:
            # Get patient details
            result = await db.execute(
                select(Patient).where(Patient.id == patient_id)
            )
            patient = result.scalar_one_or_none()
            
            if not patient:
                logger.error(f"Patient not found: {patient_id}")
                return
            
            # Create notification record
            notification_data = NotificationCreate(
                type=NotificationType.SMS,
                recipient=patient.phone_number,
                message=f"Hello {patient.first_name}, your turn is coming up in approximately {minutes_remaining} minutes. Please be ready.",
                subject="Appointment Reminder",
                patient_id=patient_id
            )
            
            notification = await self.create_notification(db, notification_data)
            
            # Send SMS
            await self.send_sms(
                phone_number=patient.phone_number,
                message=notification.message,
                notification_id=notification.id,
                db=db
            )
            
        except Exception as e:
            logger.error(f"Failed to send reminder notification: {e}")
    
    async def send_appointment_cancelled(
        self,
        db: AsyncSession,
        patient_id: UUID,
        reason: Optional[str] = None
    ):
        """Send appointment cancellation notification"""
        try:
            # Get patient details
            result = await db.execute(
                select(Patient).where(Patient.id == patient_id)
            )
            patient = result.scalar_one_or_none()
            
            if not patient:
                logger.error(f"Patient not found: {patient_id}")
                return
            
            reason_text = f" Reason: {reason}" if reason else ""
            
            # Create notification record
            notification_data = NotificationCreate(
                type=NotificationType.SMS,
                recipient=patient.phone_number,
                message=f"Hello {patient.first_name}, your appointment has been cancelled.{reason_text} Please contact us to reschedule.",
                subject="Appointment Cancelled",
                patient_id=patient_id
            )
            
            notification = await self.create_notification(db, notification_data)
            
            # Send SMS
            await self.send_sms(
                phone_number=patient.phone_number,
                message=notification.message,
                notification_id=notification.id,
                db=db
            )
            
        except Exception as e:
            logger.error(f"Failed to send cancellation notification: {e}")
    
    async def send_push_notification(
        self,
        fcm_token: str,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        notification_id: Optional[UUID] = None,
        db: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """Send push notification via FCM"""
        if not self.fcm_client:
            result = {
                'success': False,
                'error': 'FCM not configured',
                'message_id': None
            }
        else:
            try:
                response = self.fcm_client.notify_single_device(
                    registration_id=fcm_token,
                    message_title=title,
                    message_body=message,
                    data_message=data or {}
                )
                
                if response.get('success'):
                    result = {
                        'success': True,
                        'error': None,
                        'message_id': response.get('message_id')
                    }
                    logger.info(f"Push notification sent successfully, ID: {response.get('message_id')}")
                else:
                    result = {
                        'success': False,
                        'error': response.get('failure', 'Unknown FCM error'),
                        'message_id': None
                    }
                    logger.error(f"Failed to send push notification: {response}")
                
            except Exception as e:
                result = {
                    'success': False,
                    'error': f"FCM error: {str(e)}",
                    'message_id': None
                }
                logger.error(f"FCM error: {e}")
        
        # Update notification status in database
        if notification_id and db:
            await self._update_notification_status(
                db, notification_id, result['success'], result.get('error')
            )
        
        return result
    
    async def get_patient_notifications(
        self,
        db: AsyncSession,
        patient_id: UUID,
        skip: int = 0,
        limit: int = 50
    ) -> List[Notification]:
        """Get notifications for a patient"""
        result = await db.execute(
            select(Notification)
            .where(Notification.patient_id == patient_id)
            .order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    async def mark_notification_as_read(
        self,
        db: AsyncSession,
        notification_id: UUID
    ) -> Optional[Notification]:
        """Mark a notification as read"""
        result = await db.execute(
            select(Notification).where(Notification.id == notification_id)
        )
        notification = result.scalar_one_or_none()
        
        if notification:
            notification.read_at = datetime.utcnow()
            notification.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(notification)
        
        return notification
    
    async def get_notification_statistics(
        self,
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get notification statistics"""
        query = select(Notification)
        
        if start_date:
            query = query.where(Notification.created_at >= start_date)
        if end_date:
            query = query.where(Notification.created_at <= end_date)
        
        # Total notifications
        total_result = await db.execute(
            select(func.count(Notification.id)).select_from(query.subquery())
        )
        total_notifications = total_result.scalar() or 0
        
        # Notifications by status
        status_result = await db.execute(
            select(Notification.status, func.count(Notification.id))
            .select_from(query.subquery())
            .group_by(Notification.status)
        )
        status_counts = dict(status_result.all())
        
        # Notifications by type
        type_result = await db.execute(
            select(Notification.type, func.count(Notification.id))
            .select_from(query.subquery())
            .group_by(Notification.type)
        )
        type_counts = dict(type_result.all())
        
        return {
            'total_notifications': total_notifications,
            'status_breakdown': status_counts,
            'type_breakdown': type_counts,
            'success_rate': (
                status_counts.get("SENT", 0) / total_notifications * 100
                if total_notifications > 0 else 0
            )
        }
    
    async def send_queue_position_notification(
        self,
        db: AsyncSession,
        patient_id: UUID,
        queue_number: int,
        position: int,
        doctor_name: Optional[str] = None
    ):
        """Send notification to patient about their position in the queue"""
        try:
            # Get patient details
            result = await db.execute(
                select(Patient).where(Patient.id == patient_id)
            )
            patient = result.scalar_one_or_none()
            
            if not patient:
                logger.error(f"Patient not found: {patient_id}")
                return
            
            doctor_info = f" with Dr. {doctor_name}" if doctor_name else ""
            
            # Different messages based on position
            if position == 10:
                message = f"Hello {patient.first_name}, you are now at position 10 in the queue{doctor_info}. Estimated wait time is about 30-45 minutes."
            elif position == 5:
                message = f"Hello {patient.first_name}, you are now at position 5 in the queue{doctor_info}. Estimated wait time is about 15-20 minutes."
            elif position == 3:
                message = f"Hello {patient.first_name}, you are now at position 3 in the queue{doctor_info}. Please be ready, you'll be called soon."
            else:
                message = f"Hello {patient.first_name}, you are now at position {position} in the queue{doctor_info}."
            
            # Create notification record
            notification_data = NotificationCreate(
                type=NotificationType.SYSTEM,
                recipient=patient.phone_number,
                message=message,
                subject=f"Queue Update: Position {position}",
                patient_id=patient_id
            )
            
            notification = await self.create_notification(db, notification_data)
            
            # Send push notification if device token is available
            result = await db.execute(
                select(DeviceToken).where(
                    and_(
                        DeviceToken.patient_id == patient_id,
                        DeviceToken.is_active == True
                    )
                )
            )
            device_token = result.scalar_one_or_none()
            
            if device_token and settings.PUSH_ENABLED:
                await self.send_push_notification(
                    fcm_token=device_token.token,
                    title=f"Queue Update: Position {position}",
                    message=message,
                    notification_id=notification.id,
                    db=db
                )
            # Fall back to SMS
            elif settings.SMS_ENABLED:
                await self.send_sms(
                    phone_number=patient.phone_number,
                    message=message,
                    notification_id=notification.id,
                    db=db
                )
            
            return notification
                
        except Exception as e:
            logger.error(f"Error sending queue position notification: {str(e)}")
            return None
    
    async def send_doctor_manual_notification(
        self,
        db: AsyncSession,
        patient_id: UUID,
        doctor_id: UUID,
        message: str,
        subject: str = "Message from your doctor"
    ):
        """Send a manual notification from a doctor to a patient"""
        try:
            # Get patient details
            result = await db.execute(
                select(Patient).where(Patient.id == patient_id)
            )
            patient = result.scalar_one_or_none()
            
            if not patient:
                logger.error(f"Patient not found: {patient_id}")
                return None
            
            # Get doctor details
            result = await db.execute(
                select(Doctor).where(Doctor.id == doctor_id)
            )
            doctor = result.scalar_one_or_none()
            
            if not doctor:
                logger.error(f"Doctor not found: {doctor_id}")
                return None
            
            # Use a generic doctor name instead of querying the User model
            doctor_name = f"Dr. {doctor.id}"
            
            # Customize message if not already mentioning the doctor
            if "doctor" not in message.lower():
                message = f"Message from your doctor: {message}"
            
            # Create notification record
            notification_data = NotificationCreate(
                type=NotificationType.SYSTEM,
                recipient=patient.phone_number,
                message=message,
                subject=subject,
                patient_id=patient_id,
                user_id=doctor.user_id
            )
            
            notification = await self.create_notification(db, notification_data)
            
            # Send push notification if device token is available
            result = await db.execute(
                select(DeviceToken).where(
                    and_(
                        DeviceToken.patient_id == patient_id,
                        DeviceToken.is_active == True
                    )
                )
            )
            device_token = result.scalar_one_or_none()
            
            if device_token and settings.PUSH_ENABLED:
                await self.send_push_notification(
                    fcm_token=device_token.token,
                    title=subject,
                    message=message,
                    notification_id=notification.id,
                    db=db
                )
            # Fall back to SMS
            elif settings.SMS_ENABLED:
                await self.send_sms(
                    phone_number=patient.phone_number,
                    message=message,
                    notification_id=notification.id,
                    db=db
                )
            
            return notification
                
        except Exception as e:
            logger.error(f"Error sending doctor manual notification: {str(e)}")
            return None


# Global notification service instance
notification_service = NotificationService()

# The file has been fixed by removing the misplaced function