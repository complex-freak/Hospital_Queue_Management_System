import sqlalchemy as sa
from sqlalchemy import Column, String, Integer, Date, Time, Enum, Text, ForeignKey, TIMESTAMP, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import uuid

Base = declarative_base()

# Enums
urgency_enum = sa.Enum('low', 'medium', 'high', name='urgency_level')
status_enum = sa.Enum('waiting', 'notified', 'served', 'skipped', name='queue_status')
gender_enum = sa.Enum('M', 'F', 'Other', name='gender_enum')
role_enum = sa.Enum('doctor', 'receptionist', 'admin', name='user_roles')
channel_enum = sa.Enum('sms', 'push', name='notification_channel')
status_notif_enum = sa.Enum('success', 'failed', name='notification_status')

def generate_uuid():
    """Generate a UUID using Python's uuid library instead of PostgreSQL's uuid-ossp"""
    return str(uuid.uuid4())

class Patient(Base):
    """
    Patient model representing individuals registered in the hospital system.
    """
    __tablename__ = 'patients'
    
    patient_id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    full_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), unique=True, nullable=False, index=True)
    dob = Column(Date, nullable=True)
    gender = Column(gender_enum, nullable=True)
    registered_on = Column(TIMESTAMP, server_default=sa.text('CURRENT_TIMESTAMP'))
    
    # Relationships
    appointments = relationship("Appointment", back_populates="patient")

class Appointment(Base):
    """
    Appointment model for scheduling patient consultations.
    """
    __tablename__ = 'appointments'
    
    appointment_id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.patient_id'))
    scheduled_date = Column(Date, nullable=False, index=True)
    scheduled_time = Column(Time, nullable=False)
    urgency_level = Column(urgency_enum, nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    created_at = Column(TIMESTAMP, server_default=sa.text('CURRENT_TIMESTAMP'))
    
    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    created_by_user = relationship("User", foreign_keys=[created_by])
    queue = relationship("Queue", back_populates="appointment", uselist=False)
    notifications = relationship("Notification", back_populates="appointment")
    
    # Indices
    __table_args__ = (
        Index('ix_appointments_date_time', 'scheduled_date', 'scheduled_time'),
    )

class Queue(Base):
    """
    Queue model for managing the order of patient consultations.
    """
    __tablename__ = 'queue'
    
    queue_id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey('appointments.appointment_id'))
    queue_number = Column(String(10), nullable=False, index=True)
    priority_score = Column(Integer, nullable=False, index=True)
    status = Column(status_enum, default='waiting', nullable=False, index=True)
    check_in_time = Column(TIMESTAMP, server_default=sa.text('CURRENT_TIMESTAMP'))
    served_time = Column(TIMESTAMP, nullable=True)
    
    # Relationships
    appointment = relationship("Appointment", back_populates="queue")

class User(Base):
    """
    User model for staff authentication and role management.
    """
    __tablename__ = 'users'
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(role_enum, nullable=False, index=True)
    name = Column(String(100), nullable=True)
    
    # Relationships
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False)

class Doctor(Base):
    """
    Doctor model extending the User model with doctor-specific details.
    """
    __tablename__ = 'doctors'
    
    doctor_id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'))
    specialty = Column(String(50), nullable=True)
    available_today = Column(Boolean, default=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="doctor_profile")

class Notification(Base):
    """
    Notification model for tracking SMS and push notification events.
    """
    __tablename__ = 'notifications'
    
    notification_id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey('appointments.appointment_id'))
    channel = Column(channel_enum, nullable=False)
    message = Column(Text, nullable=False)
    sent_time = Column(TIMESTAMP, server_default=sa.text('CURRENT_TIMESTAMP'))
    status = Column(status_notif_enum, nullable=False, index=True)
    
    # Relationships
    appointment = relationship("Appointment", back_populates="notifications")

class AuditLog(Base):
    """
    AuditLog model for tracking system events and changes.
    """
    __tablename__ = 'auditlog'
    
    log_id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    event_type = Column(String(50), nullable=False, index=True)
    actor_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    description = Column(Text, nullable=True)
    event_time = Column(TIMESTAMP, server_default=sa.text('CURRENT_TIMESTAMP'), index=True) 