import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class UserRole(str, Enum):
    ADMIN = "admin"
    STAFF = "staff"
    RECEPTIONIST = "receptionist"
    DOCTOR = "doctor"


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class UrgencyLevel(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    EMERGENCY = "emergency"


class QueueStatus(str, Enum):
    WAITING = "waiting"
    CALLED = "called"
    SERVING = "serving"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class NotificationType(str, Enum):
    SMS = "sms"
    EMAIL = "email"
    PUSH = "push"
    SYSTEM = "system"


class AuditAction(str, Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    REGISTER = "register"
    DEACTIVATE = "deactivate"
    REACTIVATE = "reactivate"


class AuditResource(str, Enum):
    USER = "user"
    PATIENT = "patient"
    DOCTOR = "doctor"
    APPOINTMENT = "appointment"
    QUEUE = "queue"
    SYSTEM = "system"


class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_number = Column(String(20), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(DateTime, nullable=True)
    gender = Column(String(10), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact = Column(String(20), nullable=True)
    emergency_contact_name = Column(String(200), nullable=True)
    emergency_contact_relationship = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    appointments = relationship("Appointment", back_populates="patient")
    notifications = relationship("Notification", back_populates="patient")
    notes = relationship("PatientNote", back_populates="patient")


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False)
    created_appointments = relationship("Appointment", back_populates="created_by_user")


class Doctor(Base):
    __tablename__ = "doctors"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    specialization = Column(String(200), nullable=True)
    license_number = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    consultation_fee = Column(Integer, nullable=True)  # in cents
    is_available = Column(Boolean, default=True)
    shift_start = Column(String(10), nullable=True)  # HH:MM format
    shift_end = Column(String(10), nullable=True)  # HH:MM format
    
    # Relationships
    user = relationship("User", back_populates="doctor_profile")
    appointments = relationship("Appointment", back_populates="doctor")
    notes = relationship("PatientNote", back_populates="doctor")
    consultations = relationship("ConsultationFeedback", back_populates="doctor")


class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    appointment_date = Column(DateTime(timezone=True), nullable=False)
    reason = Column(Text, nullable=True)
    urgency = Column(SQLEnum(UrgencyLevel), default=UrgencyLevel.NORMAL)
    status = Column(SQLEnum(AppointmentStatus), default=AppointmentStatus.SCHEDULED)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    created_by_user = relationship("User", back_populates="created_appointments")
    queue_entry = relationship("Queue", back_populates="appointment", uselist=False)
    consultation_feedback = relationship("ConsultationFeedback", back_populates="appointment", uselist=False)


class Queue(Base):
    __tablename__ = "queue"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.id"), unique=True, nullable=False)
    queue_number = Column(Integer, nullable=False)
    priority_score = Column(Integer, default=0)
    status = Column(SQLEnum(QueueStatus), default=QueueStatus.WAITING)
    estimated_wait_time = Column(Integer, nullable=True)  # in minutes
    called_at = Column(DateTime(timezone=True), nullable=True)
    served_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    appointment = relationship("Appointment", back_populates="queue_entry")


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    type = Column(SQLEnum(NotificationType), default=NotificationType.SYSTEM)
    recipient = Column(String, nullable=False)
    message = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="pending")
    error_message = Column(String, nullable=True)  
    reference_id = Column(UUID(as_uuid=True), nullable=True)  # For linking to appointments, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="notifications", foreign_keys=[patient_id])
    user = relationship("User", foreign_keys=[user_id])


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    subject = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    type = Column(SQLEnum(NotificationType), default=NotificationType.SYSTEM)
    variables = Column(JSON, nullable=True)  # Store template variables as JSON
    is_active = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])


class AuditLog(Base):
    __tablename__ = "audit_log"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)  # Can be patient or user
    user_type = Column(String(20), nullable=False)  # patient, user
    action = Column(SQLEnum(AuditAction), nullable=False)
    resource = Column(SQLEnum(AuditResource), nullable=False)
    resource_id = Column(UUID(as_uuid=True), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DeviceToken(Base):
    __tablename__ = "device_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    token = Column(String(512), nullable=False)
    device_type = Column(String(20), nullable=False)  # ios, android, web
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    patient = relationship("Patient")


class PatientSettings(Base):
    __tablename__ = "patient_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), unique=True, nullable=False)
    language = Column(String(10), default="en")
    notifications_enabled = Column(Boolean, default=True)
    sms_notifications = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=False)
    push_notifications = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    patient = relationship("Patient")


class PatientDraft(Base):
    __tablename__ = "patient_drafts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    draft_id = Column(String, nullable=False, unique=True, index=True)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship
    staff = relationship("User", foreign_keys=[staff_id])


class PatientNote(Base):
    __tablename__ = "patient_notes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=False)
    content = Column(Text, nullable=False)
    version = Column(Integer, default=1)
    previous_version_id = Column(UUID(as_uuid=True), ForeignKey("patient_notes.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="notes")
    doctor = relationship("Doctor", back_populates="notes")
    previous_version = relationship("PatientNote", remote_side=[id], backref="next_versions")


class ConsultationFeedback(Base):
    __tablename__ = "consultation_feedback"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.id"), unique=True, nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=False)
    diagnosis = Column(Text, nullable=False)
    treatment = Column(Text, nullable=False)
    prescription = Column(Text, nullable=True)
    follow_up_date = Column(DateTime(timezone=True), nullable=True)
    duration = Column(Integer, nullable=True)  # in minutes
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    appointment = relationship("Appointment", back_populates="consultation_feedback")
    doctor = relationship("Doctor", back_populates="consultations")