from typing import Optional
from datetime import timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from uuid import UUID
import logging
import uuid

from database import get_db
from models import Patient, Appointment, Notification, DeviceToken, PatientSettings, Doctor, User, UrgencyLevel, AppointmentStatus
from schemas import (
    PatientCreate, PatientUpdate, PatientLogin, Patient as PatientSchema,
    Token, QueueStatusResponse, Appointment as AppointmentSchema,
    Notification as NotificationSchema, DeviceTokenSchema,
    SettingsSchema, SettingsUpdateSchema, PatientAppointmentCreate
)
from services import AuthService
from services.queue_service import QueueService
from services.notification_service import NotificationService, notification_service
from api.core.security import create_access_token, get_password_hash, verify_password
from api.core.config import settings
from api.dependencies import get_current_patient, log_audit_event

router = APIRouter()


# Password change schema
class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


# Create a specific input model for device token registration
class DeviceTokenInput(BaseModel):
    token: str
    device_type: str = Field(..., pattern=r'^(ios|android|web)$')
    
    model_config = {
        "extra": "ignore",  # Ignore additional fields in the request
        "from_attributes": True,
        "arbitrary_types_allowed": True,
    }


@router.post("/register", response_model=PatientSchema)
async def register_patient(
    request: Request,
    background_tasks: BackgroundTasks,
    patient_data: PatientCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new patient with minimal required information"""
    try:
        # For mobile app registration, we only require first name, last name, phone number, password
        # Other fields will be collected during onboarding
        patient = await AuthService.register_patient(db, patient_data)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=patient.id,
            user_type="patient",
            action="register",
            resource="patient",
            resource_id=patient.id,
            details=f"Patient registered with phone {patient.phone_number}"
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
            detail="Registration failed"
        )


@router.post("/complete-profile", response_model=PatientSchema)
async def complete_patient_profile(
    request: Request,
    background_tasks: BackgroundTasks,
    profile_data: PatientUpdate,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Complete patient profile with additional information during onboarding"""
    try:
        # Update patient fields
        update_data = profile_data.model_dump(exclude_unset=True)
        
        # Log received data for debugging
        print(f"Received update data: {update_data}")
        
        # Ensure all required fields are provided
        required_fields = ['gender', 'address', 'emergency_contact']  # Email is now optional
        missing_fields = []
        
        for field in required_fields:
            if field not in update_data or update_data[field] is None:
                if getattr(current_patient, field, None) is None:
                    missing_fields.append(field)
        
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
        
        # Update patient with provided data
        for field, value in update_data.items():
            # Handle timezone conversion for date_of_birth
            if field == 'date_of_birth' and value is not None:
                # Convert timezone-aware datetime to naive datetime
                if hasattr(value, 'tzinfo') and value.tzinfo is not None:
                    value = value.replace(tzinfo=None)
            
            setattr(current_patient, field, value)
        
        await db.commit()
        await db.refresh(current_patient)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_patient.id,
            user_type="patient",
            action="update",
            resource="patient",
            resource_id=current_patient.id,
            details=f"Patient completed profile with fields: {list(update_data.keys())}"
        )
        
        return current_patient
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        print(f"Profile completion error: {str(e)}")  # Log the actual error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile completion failed: {str(e)}"
        )


@router.post("/login", response_model=Token)
async def login_patient(
    request: Request,
    background_tasks: BackgroundTasks,
    login_data: PatientLogin,
    db: AsyncSession = Depends(get_db)
):
    """Patient login"""
    patient = await AuthService.authenticate_patient(
        db, login_data.phone_number, login_data.password
    )
    
    if not patient:
        # Log failed login attempt
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=None,
            user_type="patient",
            action="login_failed",
            resource="patient",
            details=f"Failed login attempt for phone {login_data.phone_number}"
        )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password"
        )
    
    if not patient.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(patient.id), expires_delta=access_token_expires
    )
    
    # Log successful login
    background_tasks.add_task(
        log_audit_event,
        request=request,
        user_id=patient.id,
        user_type="patient",
        action="login",
        resource="patient",
        resource_id=patient.id,
        details="Successful login"
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/profile", response_model=PatientSchema)
async def get_patient_profile(
    current_patient: Patient = Depends(get_current_patient)
):
    """Get current patient profile"""
    return current_patient


@router.put("/profile", response_model=PatientSchema)
async def update_patient_profile(
    request: Request,
    background_tasks: BackgroundTasks,
    patient_update: PatientUpdate,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Update patient profile"""
    try:
        # Update patient fields
        update_data = patient_update.model_dump(exclude_unset=True)
        
        # Log received data for debugging
        print(f"Profile update data: {update_data}")
        
        for field, value in update_data.items():
            # Handle timezone conversion for date_of_birth
            if field == 'date_of_birth' and value is not None:
                # Convert timezone-aware datetime to naive datetime
                if hasattr(value, 'tzinfo') and value.tzinfo is not None:
                    value = value.replace(tzinfo=None)
            
            setattr(current_patient, field, value)
        
        await db.commit()
        await db.refresh(current_patient)
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_patient.id,
            user_type="patient",
            action="update",
            resource="patient",
            resource_id=current_patient.id,
            details=f"Updated fields: {list(update_data.keys())}"
        )
        
        return current_patient
        
    except Exception as e:
        await db.rollback()
        print(f"Profile update error: {str(e)}")  # Log the actual error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile update failed: {str(e)}"
        )


@router.get("/queue-status", response_model=Optional[QueueStatusResponse])
async def get_queue_status(
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Get current queue status for patient"""
    try:
        logging.info(f"Getting queue status for patient: {current_patient.id}")
        queue_status = await QueueService.get_queue_status(db, current_patient.id)
        logging.info(f"Queue status result: {queue_status}")
        return queue_status
        
    except Exception as e:
        logging.error(f"Failed to get queue status for patient {current_patient.id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get queue status: {str(e)}"
        )


@router.get("/appointments", response_model=list[AppointmentSchema])
async def get_patient_appointments(
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
    limit: int = 10,
    offset: int = 0
):
    """Get patient's appointments"""
    try:
        # Log the request for debugging
        logging.info(f"Fetching appointments for patient: {current_patient.id}, limit: {limit}, offset: {offset}")
        
        result = await db.execute(
            select(Appointment)
            .options(
                selectinload(Appointment.patient), 
                selectinload(Appointment.doctor).selectinload(Doctor.user)
            )
            .where(Appointment.patient_id == current_patient.id)
            .order_by(Appointment.appointment_date.desc())
            .offset(offset)
            .limit(limit)
        )
        appointments = result.scalars().all()
        
        # Ensure all appointments have created_at value
        for appointment in appointments:
            if appointment.created_at is None:
                appointment.created_at = appointment.appointment_date or datetime.now()
                
        # Log the number of appointments found
        logging.info(f"Found {len(appointments)} appointments for patient {current_patient.id}")
        
        return appointments
        
    except Exception as e:
        logging.error(f"Failed to get appointments: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get appointments"
        )


@router.get("/appointments/{appointment_id}", response_model=AppointmentSchema)
async def get_appointment_details(
    appointment_id: str,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
    include_queue_status: bool = True
):
    """Get specific appointment details with optional queue status"""
    try:
        result = await db.execute(
            select(Appointment)
            .options(
                selectinload(Appointment.patient), 
                selectinload(Appointment.doctor).selectinload(Doctor.user)
            )
            .where(
                Appointment.id == appointment_id,
                Appointment.patient_id == current_patient.id
            )
        )
        appointment = result.scalar_one_or_none()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Ensure appointment has created_at value
        if appointment.created_at is None:
            appointment.created_at = appointment.appointment_date or datetime.now()
            
        # If include_queue_status is True, get the current queue status
        # Check for appointments that are scheduled and have a queue entry
        logging.info(f"Checking queue status - appointment status: {appointment.status} (type: {type(appointment.status)})")
        logging.info(f"AppointmentStatus.SCHEDULED: {AppointmentStatus.SCHEDULED} (type: {type(AppointmentStatus.SCHEDULED)})")
        logging.info(f"AppointmentStatus.WAITING: {AppointmentStatus.WAITING} (type: {type(AppointmentStatus.WAITING)})")
        
        # Check if appointment status matches either SCHEDULED or WAITING
        # Convert both to strings for comparison to handle potential type mismatches
        appointment_status_str = str(appointment.status).lower()
        status_matches = appointment_status_str in ["scheduled", "waiting"]
        
        logging.info(f"Appointment status check - status: {appointment.status}, status_str: {appointment_status_str}, matches: {status_matches}")
        
        if include_queue_status and status_matches:
            try:
                logging.info(f"Getting queue status for patient {current_patient.id} and appointment {appointment_id}")
                logging.info(f"Appointment status: {appointment.status}")
                queue_status = await QueueService.get_queue_status(db, current_patient.id)
                logging.info(f"Queue status result: {queue_status}")
                
                # We'll return this as part of the response in the schema
                appointment.queue_position = queue_status["queue_position"] if queue_status else None
                appointment.estimated_wait_time = queue_status["estimated_wait_time"] if queue_status else None
                appointment.queue_number = queue_status["your_number"] if queue_status else None
                appointment.queue_identifier = queue_status["queue_identifier"] if queue_status else None
                
                logging.info(f"Appointment queue data - position: {appointment.queue_position}, number: {appointment.queue_number}, identifier: {appointment.queue_identifier}")
            except Exception as e:
                logging.error(f"Failed to get queue status for appointment: {str(e)}")
                # Don't fail the whole request if queue status fails
                pass
        else:
            logging.info(f"Skipping queue status for appointment {appointment_id} with status {appointment.status}")
            
        return appointment
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Failed to get appointment details: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get appointment details"
        )


@router.delete("/delete-account", response_model=dict)
async def delete_patient_account(
    request: Request,
    background_tasks: BackgroundTasks,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Delete patient account (soft delete)"""
    try:
        # Perform soft delete by setting is_active to False
        current_patient.is_active = False
        
        await db.commit()
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_patient.id,
            user_type="patient",
            action="delete",
            resource="patient",
            resource_id=current_patient.id,
            details="Patient account deactivated"
        )
        
        return {"message": "Account deactivated successfully"}
        
    except Exception as e:
        await db.rollback()
        print(f"Account deletion error: {str(e)}")  # Log the actual error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Account deletion failed: {str(e)}"
        )


@router.post("/change-password", response_model=dict)
async def change_password(
    request: Request,
    background_tasks: BackgroundTasks,
    password_data: PasswordChangeRequest,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Change patient password"""
    try:
        # Verify current password
        if not verify_password(password_data.current_password, current_patient.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Validate new password (should match the same validation as in PatientCreate)
        if len(password_data.new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters"
            )
            
        if not any(c.isupper() for c in password_data.new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must contain at least one uppercase letter"
            )
            
        if not any(c.islower() for c in password_data.new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must contain at least one lowercase letter"
            )
            
        if not any(c.isdigit() for c in password_data.new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must contain at least one digit"
            )
        
        # Update password
        current_patient.password_hash = get_password_hash(password_data.new_password)
        await db.commit()
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=current_patient.id,
            user_type="patient",
            action="update",
            resource="patient",
            resource_id=current_patient.id,
            details="Password changed successfully"
        )
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Password change error: {str(e)}")  # Log the actual error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password change failed: {str(e)}"
        )


@router.get("/notifications", response_model=list[NotificationSchema])
async def get_patient_notifications(
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Get patient notifications"""
    result = await db.execute(
        select(Notification)
        .where(Notification.patient_id == current_patient.id)
        .order_by(Notification.created_at.desc())
    )
    notifications = result.scalars().all()
    return notifications


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Mark notification as read"""
    result = await db.execute(
        select(Notification)
        .where(
            Notification.id == notification_id,
            Notification.patient_id == current_patient.id
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.read = True
    await db.commit()
    return {"success": True}


@router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: UUID,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Delete a specific notification"""
    result = await db.execute(
        select(Notification)
        .where(
            Notification.id == notification_id,
            Notification.patient_id == current_patient.id
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    await db.delete(notification)
    await db.commit()
    return {"success": True}


@router.delete("/notifications")
async def delete_all_notifications(
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Delete all notifications for the current patient"""
    result = await db.execute(
        select(Notification)
        .where(Notification.patient_id == current_patient.id)
    )
    notifications = result.scalars().all()
    
    for notification in notifications:
        await db.delete(notification)
    
    await db.commit()
    return {"success": True}


@router.post("/device-token")
async def register_device_token(
    request: Request,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Register device token for push notifications"""
    try:
        # Get request body as JSON
        body = await request.json()
        token = body.get("token")
        device_type = body.get("device_type")
        
        # Validate required fields
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token is required"
            )
        
        if not device_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Device type is required"
            )
            
        # Validate device type
        valid_device_types = ["ios", "android", "web"]
        if device_type not in valid_device_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Device type must be one of {', '.join(valid_device_types)}"
            )
        
        # Check if token already exists
        result = await db.execute(
            select(DeviceToken)
            .where(
                DeviceToken.token == token,
                DeviceToken.patient_id == current_patient.id
            )
        )
        existing_token = result.scalar_one_or_none()
        
        if existing_token:
            # Update existing token
            existing_token.updated_at = datetime.utcnow()
            existing_token.device_type = device_type
            await db.commit()
            
            # Log success
            logging.info(f"Updated device token for patient {current_patient.id}")
        else:
            # Create new token record with all required fields
            new_token_values = {
                "patient_id": current_patient.id,
                "token": token,
                "device_type": device_type,
                "is_active": True,
                "created_at": datetime.utcnow()
            }
            await db.execute(insert(DeviceToken).values(**new_token_values))
            await db.commit()
            
            # Log success
            logging.info(f"Registered new device token for patient {current_patient.id}")
        
        return {"success": True, "message": "Device token registered successfully"}
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the error
        logging.error(f"Error registering device token: {str(e)}")
        await db.rollback()
        
        # Return a generic error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register device token"
        )


@router.get("/settings", response_model=SettingsSchema)
async def get_patient_settings(
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Get patient app settings"""
    result = await db.execute(
        select(PatientSettings)
        .where(PatientSettings.patient_id == current_patient.id)
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        # Create default settings
        settings_values = {
            "patient_id": current_patient.id,
            "language": "en",
            "notifications_enabled": True
        }
        await db.execute(insert(PatientSettings).values(**settings_values))
        await db.commit()
        
        # Get the newly created settings
        result = await db.execute(
            select(PatientSettings).where(PatientSettings.patient_id == current_patient.id)
        )
        settings = result.scalar_one_or_none()
    
    return settings


@router.put("/settings", response_model=SettingsSchema)
async def update_patient_settings(
    settings_data: SettingsUpdateSchema,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Update patient app settings"""
    result = await db.execute(
        select(PatientSettings)
        .where(PatientSettings.patient_id == current_patient.id)
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        # Create settings with provided data
        settings_values = {
            "patient_id": current_patient.id,
            "language": settings_data.language or "en",
            "notifications_enabled": settings_data.notifications_enabled 
                if settings_data.notifications_enabled is not None else True
        }
        await db.execute(insert(PatientSettings).values(**settings_values))
        await db.commit()
        
        # Get the newly created settings
        result = await db.execute(
            select(PatientSettings).where(PatientSettings.patient_id == current_patient.id)
        )
        settings = result.scalar_one_or_none()
    else:
        # Update existing settings
        if settings_data.language is not None:
            settings.language = settings_data.language
        if settings_data.notifications_enabled is not None:
            settings.notifications_enabled = settings_data.notifications_enabled
        
        await db.commit()
        await db.refresh(settings)
    
    return settings


@router.post("/appointments", response_model=AppointmentSchema)
async def create_appointment(
    request: Request,
    background_tasks: BackgroundTasks,
    appointment_data: PatientAppointmentCreate,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Create a new appointment for the current patient"""
    try:
        # Validate urgency level
        try:
            urgency = UrgencyLevel(appointment_data.urgency.lower())
        except ValueError:
            urgency = UrgencyLevel.NORMAL
        
        # Create appointment object
        appointment_obj = {
            "patient_id": current_patient.id,
            "appointment_date": appointment_data.appointment_date or datetime.utcnow(),
            "reason": appointment_data.reason or "General consultation",
            "urgency": urgency,
            "status": AppointmentStatus.SCHEDULED
        }
        
        # Automatically assign a doctor with the least queue
        # Extract department preference from appointment reason if available
        preferred_department = None
        if appointment_data.reason:
            if "cardio" in appointment_data.reason.lower():
                preferred_department = "Cardiology"
            elif "ortho" in appointment_data.reason.lower():
                preferred_department = "Orthopedics"
            elif "pediatric" in appointment_data.reason.lower() or "child" in appointment_data.reason.lower():
                preferred_department = "Pediatrics"
            elif "emergency" in appointment_data.reason.lower() or "urgent" in appointment_data.reason.lower():
                preferred_department = "Emergency"
        
        # Create a temporary appointment object for doctor assignment
        temp_appointment = Appointment()
        temp_appointment.patient_id = current_patient.id
        temp_appointment.doctor_id = None
        temp_appointment.appointment_date = appointment_data.appointment_date or datetime.utcnow()
        temp_appointment.reason = appointment_data.reason or "General consultation"
        temp_appointment.urgency = urgency
        temp_appointment.status = AppointmentStatus.SCHEDULED
        
        doctor_id = await QueueService.assign_available_doctor(db, temp_appointment, preferred_department)
        if doctor_id:
            appointment_obj["doctor_id"] = doctor_id
            
            # Get doctor name for notification
            result = await db.execute(
                select(Doctor, User).join(User, Doctor.user_id == User.id).where(Doctor.id == doctor_id)
            )
            doctor_data = result.first()
            doctor_name = None
            if doctor_data:
                doctor, user = doctor_data
                doctor_name = f"Dr. {user.first_name} {user.last_name}"
        else:
            print("No available doctors found for automatic assignment")
        
        # Insert the appointment
        result = await db.execute(insert(Appointment).values(**appointment_obj).returning(Appointment.id))
        appointment_id = result.scalar_one()
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
            user_id=current_patient.id,
            user_type="patient",
            action="create",
            resource="appointment",
            resource_id=appointment.id,
            details=f"Patient created appointment"
        )
        
        # Add to queue
        try:
            queue_entry = await QueueService.add_to_queue(db, appointment.id)
            
            # Send confirmation notification using the global instance
            background_tasks.add_task(
                notification_service.send_appointment_confirmation,
                db=db,
                patient_id=current_patient.id,
                appointment_id=appointment.id,
                queue_number=queue_entry.queue_number
            )
            
            # Include additional info in response
            setattr(appointment, 'queue_number', queue_entry.queue_number)
            setattr(appointment, 'queue_position', 1)  # New appointment is typically at the end
            setattr(appointment, 'estimated_wait_time', queue_entry.estimated_wait_time)
            
        except Exception as queue_error:
            print(f"Error adding to queue: {str(queue_error)}")
            # Continue with appointment creation even if queue fails
        
        return appointment
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        print(f"Error creating appointment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create appointment"
        )


@router.put("/appointments/{appointment_id}/cancel", response_model=AppointmentSchema)
async def cancel_appointment(
    request: Request,
    background_tasks: BackgroundTasks,
    appointment_id: str,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Cancel an existing appointment"""
    try:
        # Find the appointment
        result = await db.execute(
            select(Appointment)
            .where(
                Appointment.id == appointment_id,
                Appointment.patient_id == current_patient.id
            )
        )
        appointment = result.scalar_one_or_none()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Check if appointment can be cancelled
        if appointment.status in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel appointment with status: {appointment.status}"
            )
        
        # Update appointment status to CANCELLED
        appointment.status = AppointmentStatus.CANCELLED
        appointment.updated_at = datetime.now()
        
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
            user_id=current_patient.id,
            user_type="patient",
            action="delete",
            resource="appointment",
            resource_id=appointment.id,
            details=f"Appointment cancelled by patient"
        )
        
        return appointment
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logging.error(f"Appointment cancellation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel appointment: {str(e)}"
        )