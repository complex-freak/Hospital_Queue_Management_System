from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from uuid import UUID
from models import UserRole, AppointmentStatus, QueueStatus, UrgencyLevel, NotificationType


# Base schemas
class BaseSchema(BaseModel):
    model_config = {
        "from_attributes": True
    }


# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


# Patient schemas
class PatientBase(BaseModel):
    phone_number: str = Field(..., pattern=r'^\+?[1-9]\d{1,14}$')
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = Field(None, pattern=r'^(male|female|other)$')
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None


class PatientCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone_number: str = Field(..., pattern=r'^\+?[1-9]\d{1,14}$')
    password: str = Field(..., min_length=8, max_length=50)
    email: Optional[EmailStr] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = Field(None, pattern=r'^(male|female|other)$')
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class PatientUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = Field(None, pattern=r'^(male|female|other)$')
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    
    model_config = {
        "from_attributes": True,
        # Make validation more lenient
        "validate_assignment": False,
        "arbitrary_types_allowed": True,
    }


class PatientLogin(BaseModel):
    phone_number: str
    password: str


class Patient(PatientBase, BaseSchema):
    id: UUID
    is_active: bool
    created_at: Optional[datetime] = None  # Make created_at optional to fix validation error
    updated_at: Optional[datetime] = None


# Add alias for Patient class
PatientSchema = Patient


# User schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: Optional[EmailStr] = None
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role: UserRole


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=50)
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None


class UserLogin(BaseModel):
    username: str
    password: str


class User(UserBase, BaseSchema):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


# Doctor schemas
class DoctorBase(BaseModel):
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    department: Optional[str] = None
    consultation_fee: Optional[int] = None
    is_available: bool = True


class DoctorCreate(DoctorBase):
    user_id: UUID


class DoctorUpdate(BaseModel):
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    department: Optional[str] = None
    consultation_fee: Optional[int] = None
    is_available: Optional[bool] = None


class Doctor(DoctorBase, BaseSchema):
    id: UUID
    user_id: UUID
    user: User


# Appointment schemas
class AppointmentBase(BaseModel):
    appointment_date: datetime
    reason: Optional[str] = None
    urgency: UrgencyLevel = UrgencyLevel.NORMAL


class AppointmentCreate(AppointmentBase):
    patient_id: UUID
    doctor_id: Optional[UUID] = None


# Schema for patient appointment creation from mobile app
class PatientAppointmentCreate(BaseModel):
    appointment_date: Optional[datetime] = None
    notes: Optional[str] = None
    urgency: str = "normal"  # default to normal
    
    model_config = {
        "extra": "ignore",  # Ignore extra fields
        "from_attributes": True,
        "validate_assignment": False,
        "arbitrary_types_allowed": True,
    }
    
    # Validate and convert string to datetime if needed
    @field_validator('appointment_date', mode='before')
    @classmethod
    def validate_appointment_date(cls, v):
        if v == "undefined" or v is None or v == "":
            return None
        return v


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[datetime] = None
    doctor_id: Optional[UUID] = None
    reason: Optional[str] = None
    urgency: Optional[UrgencyLevel] = None
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None


class Appointment(AppointmentBase, BaseSchema):
    id: UUID
    patient_id: UUID
    doctor_id: Optional[UUID] = None
    created_by: Optional[UUID] = None
    status: AppointmentStatus
    notes: Optional[str] = None
    created_at: Optional[datetime] = None  # Make created_at optional to fix validation error
    updated_at: Optional[datetime] = None
    patient: Patient
    doctor: Optional[Doctor] = None


# Queue schemas
class QueueBase(BaseModel):
    queue_number: int
    priority_score: int = 0
    estimated_wait_time: Optional[int] = None


class QueueCreate(QueueBase):
    appointment_id: UUID


class QueueUpdate(BaseModel):
    priority_score: Optional[int] = None
    status: Optional[QueueStatus] = None
    estimated_wait_time: Optional[int] = None


class Queue(QueueBase, BaseSchema):
    id: UUID
    appointment_id: UUID
    status: QueueStatus
    called_at: Optional[datetime] = None
    served_at: Optional[datetime] = None
    created_at: Optional[datetime] = None  # Make created_at optional to fix validation error
    updated_at: Optional[datetime] = None
    appointment: Appointment


# Notification schemas
class NotificationBase(BaseModel):
    type: NotificationType
    recipient: str
    message: str
    subject: Optional[str] = None


class NotificationCreate(NotificationBase):
    patient_id: UUID


class Notification(NotificationBase, BaseSchema):
    id: UUID
    patient_id: UUID
    sent_at: Optional[datetime] = None
    status: str
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None  # Make created_at optional


# Audit Log schema
class AuditLog(BaseSchema):
    id: UUID
    user_id: Optional[UUID] = None
    user_type: str
    action: str
    resource: str
    resource_id: Optional[UUID] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: Optional[datetime] = None


class AuditLogCreate(BaseModel):
    user_id: Optional[UUID] = None
    user_type: str
    action: str
    resource: str
    resource_id: Optional[UUID] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


# Response schemas
class QueueStatusResponse(BaseModel):
    queue_position: int
    estimated_wait_time: Optional[int] = None
    current_serving: Optional[int] = None
    total_in_queue: int
    your_number: int
    status: QueueStatus


class QueueResponse(BaseModel):
    id: UUID
    queue_number: int
    priority_score: int
    status: QueueStatus
    estimated_wait_time: Optional[int] = None
    appointment_id: UUID
    patient_id: UUID
    doctor_id: Optional[UUID] = None
    created_at: Optional[datetime] = None  # Make created_at optional


class DashboardStats(BaseModel):
    total_patients_today: int
    total_served_today: int
    current_queue_length: int
    average_wait_time: Optional[int] = None


class DoctorDashboardStats(BaseModel):
    patients_served_today: int
    current_queue_length: int
    urgent_cases: int
    average_consultation_time: Optional[int] = None


class AdminDashboardStats(BaseModel):
    total_users: int
    total_doctors: int
    total_patients: int
    appointments_today: int
    active_queue_length: int
    system_uptime_days: int


class SystemAnalytics(BaseModel):
    daily_appointments: List[Dict[str, Any]]
    daily_wait_times: List[Dict[str, Any]]
    doctor_activity: List[Dict[str, Any]]
    urgency_distribution: List[Dict[str, Any]]


class OfflineSyncRequest(BaseModel):
    data: Dict[str, Any]
    timestamp: str


class SyncRequest(BaseModel):
    data: Dict[str, Any]
    last_sync_timestamp: Optional[str] = None
    device_id: Optional[str] = None


class SyncResponse(BaseModel):
    success: bool
    processed: int
    errors: List[Dict[str, Any]]
    conflicts: List[Dict[str, Any]]
    server_updates: Dict[str, Any]
    sync_timestamp: str


class ConflictResolution(BaseModel):
    conflict_id: str
    resolution: str  # client, server, merge
    resolution_data: Optional[Dict[str, Any]] = None


# Device Token schema
class DeviceToken(BaseSchema):
    id: UUID
    patient_id: UUID
    token: str
    device_type: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class DeviceTokenSchema(BaseModel):
    token: str
    device_type: str = Field(..., pattern=r'^(ios|android|web)$')


# Settings schemas
class SettingsSchema(BaseSchema):
    id: UUID
    patient_id: UUID
    language: str = "en"
    notifications_enabled: bool = True
    sms_notifications: bool = True
    email_notifications: bool = False
    push_notifications: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None


class SettingsUpdateSchema(BaseModel):
    language: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None