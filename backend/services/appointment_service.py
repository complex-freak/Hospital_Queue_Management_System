from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, insert
from uuid import UUID
from datetime import datetime, date

from models import Appointment, Patient, Doctor, UrgencyLevel
from schemas import AppointmentCreate, AppointmentUpdate


class AppointmentService:
    @staticmethod
    async def create_appointment(
        db: AsyncSession, 
        appointment_data: AppointmentCreate, 
        created_by_user_id: UUID
    ) -> Appointment:
        """Create a new appointment"""
        # Verify patient exists
        result = await db.execute(
            select(Patient).where(Patient.id == appointment_data.patient_id)
        )
        patient = result.scalar_one_or_none()
        if not patient:
            raise ValueError("Patient not found")
        
        # Verify doctor exists if specified
        if appointment_data.doctor_id:
            result = await db.execute(
                select(Doctor).where(Doctor.id == appointment_data.doctor_id)
            )
            doctor = result.scalar_one_or_none()
            if not doctor:
                raise ValueError("Doctor not found")
        
        # Check for existing active appointment for the same patient today
        today = date.today()
        result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.patient_id == appointment_data.patient_id,
                    func.date(Appointment.created_at) == today,
                    Appointment.status.in_(["scheduled", "in_progress"])
                )
            )
        )
        existing_appointment = result.scalar_one_or_none()
        
        if existing_appointment:
            raise ValueError("Patient already has an active appointment today")
        
        # Create appointment
        appointment_values = {
            "patient_id": appointment_data.patient_id,
            "doctor_id": appointment_data.doctor_id,
            "appointment_date": appointment_data.appointment_date or datetime.utcnow().date(),
            "urgency_level": getattr(appointment_data, "urgency", UrgencyLevel.NORMAL),
            "reason": appointment_data.reason,
            "notes": getattr(appointment_data, "notes", None),
            "created_by": created_by_user_id,
            "status": "scheduled"
        }
        
        result = await db.execute(insert(Appointment).values(**appointment_values).returning(Appointment))
        appointment = result.scalar_one()
        await db.commit()
        
        return appointment
    
    @staticmethod
    async def update_appointment(
        db: AsyncSession, 
        appointment_id: UUID, 
        appointment_update: AppointmentUpdate
    ) -> Appointment:
        """Update an existing appointment"""
        result = await db.execute(
            select(Appointment).where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one_or_none()
        
        if not appointment:
            raise ValueError("Appointment not found")
        
        # Update fields
        if appointment_update.doctor_id is not None:
            # Verify doctor exists
            result = await db.execute(
                select(Doctor).where(Doctor.id == appointment_update.doctor_id)
            )
            doctor = result.scalar_one_or_none()
            if not doctor:
                raise ValueError("Doctor not found")
            appointment.doctor_id = appointment_update.doctor_id
        
        if appointment_update.appointment_date is not None:
            appointment.appointment_date = appointment_update.appointment_date
        
        if getattr(appointment_update, "urgency", None) is not None:
            appointment.urgency_level = appointment_update.urgency
        
        if appointment_update.reason is not None:
            appointment.reason = appointment_update.reason
        
        if appointment_update.notes is not None:
            appointment.notes = appointment_update.notes
        
        if appointment_update.status is not None:
            appointment.status = appointment_update.status
        
        await db.commit()
        await db.refresh(appointment)
        
        return appointment
    
    @staticmethod
    async def get_appointment_by_id(db: AsyncSession, appointment_id: UUID) -> Optional[Appointment]:
        """Get appointment by ID"""
        result = await db.execute(
            select(Appointment).where(Appointment.id == appointment_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_patient_appointments(
        db: AsyncSession, 
        patient_id: UUID, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Appointment]:
        """Get appointments for a specific patient"""
        result = await db.execute(
            select(Appointment)
            .where(Appointment.patient_id == patient_id)
            .order_by(Appointment.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_doctor_appointments(
        db: AsyncSession, 
        doctor_id: UUID, 
        appointment_date: Optional[date] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Appointment]:
        """Get appointments for a specific doctor"""
        query = select(Appointment).where(Appointment.doctor_id == doctor_id)
        
        if appointment_date:
            query = query.where(Appointment.appointment_date == appointment_date)
        
        query = query.order_by(Appointment.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_appointments_by_date(
        db: AsyncSession, 
        appointment_date: date,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Appointment]:
        """Get all appointments for a specific date"""
        result = await db.execute(
            select(Appointment)
            .where(Appointment.appointment_date == appointment_date)
            .order_by(Appointment.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def cancel_appointment(db: AsyncSession, appointment_id: UUID, reason: Optional[str] = None) -> Appointment:
        """Cancel an appointment"""
        result = await db.execute(
            select(Appointment).where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one_or_none()
        
        if not appointment:
            raise ValueError("Appointment not found")
        
        if appointment.status in ["completed", "cancelled"]:
            raise ValueError(f"Cannot cancel appointment with status: {appointment.status}")
        
        appointment.status = "cancelled"
        appointment.notes = f"{appointment.notes or ''}\nCancelled: {reason or 'No reason provided'}"
        appointment.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(appointment)
        
        return appointment
    
    @staticmethod
    async def complete_appointment(db: AsyncSession, appointment_id: UUID, notes: Optional[str] = None) -> Appointment:
        """Mark an appointment as completed"""
        result = await db.execute(
            select(Appointment).where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one_or_none()
        
        if not appointment:
            raise ValueError("Appointment not found")
        
        if appointment.status in ["completed", "cancelled"]:
            raise ValueError(f"Cannot complete appointment with status: {appointment.status}")
        
        appointment.status = "completed"
        if notes:
            appointment.notes = f"{appointment.notes or ''}\nCompleted: {notes}"
        appointment.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(appointment)
        
        return appointment
    
    @staticmethod
    async def get_appointments_by_status(
        db: AsyncSession, 
        status: str,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Appointment]:
        """Get appointments by status"""
        result = await db.execute(
            select(Appointment)
            .where(Appointment.status == status)
            .order_by(Appointment.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_urgent_appointments(
        db: AsyncSession, 
        appointment_date: Optional[date] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Appointment]:
        """Get urgent appointments"""
        query = select(Appointment).where(
            Appointment.urgency == UrgencyLevel.HIGH
        )
        
        if appointment_date:
            query = query.where(Appointment.appointment_date == appointment_date)
        
        query = query.order_by(Appointment.created_at.asc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def delete_appointment(db: AsyncSession, appointment_id: UUID) -> bool:
        """Delete an appointment (use with caution)"""
        result = await db.execute(
            select(Appointment).where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one_or_none()
        
        if not appointment:
            raise ValueError("Appointment not found")
        
        await db.delete(appointment)
        await db.commit()
        
        return True