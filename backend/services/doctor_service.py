from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_, desc
from uuid import UUID
from datetime import datetime, date, timedelta
import uuid

from models import Doctor, User, Patient, Appointment, Queue, PatientNote, ConsultationFeedback
from schemas import (
    DoctorUpdate, PatientNoteCreate, PatientNoteUpdate, 
    ConsultationFeedbackCreate, ConsultationFeedbackUpdate,
    DoctorStatusUpdate
)


class DoctorService:
    @staticmethod
    async def get_doctor_by_user_id(
        db: AsyncSession,
        user_id: UUID
    ) -> Optional[Doctor]:
        """Get doctor by user ID"""
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == user_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_doctor_profile(
        db: AsyncSession,
        doctor_id: UUID,
        profile_data: DoctorUpdate
    ) -> Doctor:
        """Update doctor profile"""
        result = await db.execute(
            select(Doctor).where(Doctor.id == doctor_id)
        )
        doctor = result.scalar_one_or_none()
        
        if not doctor:
            raise ValueError("Doctor not found")
        
        # Update doctor fields
        for field, value in profile_data.model_dump(exclude_unset=True).items():
            setattr(doctor, field, value)
        
        await db.commit()
        await db.refresh(doctor)
        
        return doctor
    
    @staticmethod
    async def update_doctor_status(
        db: AsyncSession,
        doctor_id: UUID,
        status_data: DoctorStatusUpdate
    ) -> Doctor:
        """Update doctor availability status"""
        result = await db.execute(
            select(Doctor).where(Doctor.id == doctor_id)
        )
        doctor = result.scalar_one_or_none()
        
        if not doctor:
            raise ValueError("Doctor not found")
        
        doctor.is_available = status_data.is_available
        
        await db.commit()
        await db.refresh(doctor)
        
        return doctor
    
    @staticmethod
    async def create_patient_note(
        db: AsyncSession,
        note_data: PatientNoteCreate
    ) -> PatientNote:
        """Create a new patient note"""
        # Check if patient exists
        result = await db.execute(
            select(Patient).where(Patient.id == note_data.patient_id)
        )
        patient = result.scalar_one_or_none()
        if not patient:
            raise ValueError("Patient not found")
        
        # Check if doctor exists
        result = await db.execute(
            select(Doctor).where(Doctor.id == note_data.doctor_id)
        )
        doctor = result.scalar_one_or_none()
        if not doctor:
            raise ValueError("Doctor not found")
        
        # Get latest version for this patient and doctor
        result = await db.execute(
            select(func.max(PatientNote.version))
            .where(
                and_(
                    PatientNote.patient_id == note_data.patient_id,
                    PatientNote.doctor_id == note_data.doctor_id
                )
            )
        )
        latest_version = result.scalar() or 0
        
        # Create new note
        note = PatientNote(
            id=uuid.uuid4(),
            patient_id=note_data.patient_id,
            doctor_id=note_data.doctor_id,
            content=note_data.content,
            version=latest_version + 1,
            previous_version_id=note_data.previous_version_id
        )
        
        db.add(note)
        await db.commit()
        await db.refresh(note)
        
        return note
    
    @staticmethod
    async def get_patient_notes(
        db: AsyncSession,
        patient_id: UUID,
        doctor_id: Optional[UUID] = None
    ) -> List[PatientNote]:
        """Get all notes for a patient, optionally filtered by doctor"""
        query = select(PatientNote).where(PatientNote.patient_id == patient_id)
        
        if doctor_id:
            query = query.where(PatientNote.doctor_id == doctor_id)
        
        query = query.order_by(desc(PatientNote.created_at))
        
        result = await db.execute(query)
        notes = result.scalars().all()
        
        # Add doctor names to notes
        for note in notes:
            doctor_result = await db.execute(
                select(Doctor).join(User).where(Doctor.id == note.doctor_id)
            )
            doctor = doctor_result.scalar_one_or_none()
            if doctor and doctor.user:
                note.doctor_name = f"{doctor.user.first_name} {doctor.user.last_name}"
        
        return notes
    
    @staticmethod
    async def get_note_history(
        db: AsyncSession,
        note_id: UUID
    ) -> List[PatientNote]:
        """Get the history of a note (all versions)"""
        # Get the requested note
        result = await db.execute(
            select(PatientNote).where(PatientNote.id == note_id)
        )
        note = result.scalar_one_or_none()
        
        if not note:
            raise ValueError("Note not found")
        
        # Get all notes for this patient and doctor
        result = await db.execute(
            select(PatientNote)
            .where(
                and_(
                    PatientNote.patient_id == note.patient_id,
                    PatientNote.doctor_id == note.doctor_id
                )
            )
            .order_by(desc(PatientNote.version))
        )
        
        return result.scalars().all()
    
    @staticmethod
    async def create_consultation_feedback(
        db: AsyncSession,
        feedback_data: ConsultationFeedbackCreate
    ) -> ConsultationFeedback:
        """Create consultation feedback for an appointment"""
        # Check if appointment exists
        result = await db.execute(
            select(Appointment).where(Appointment.id == feedback_data.appointment_id)
        )
        appointment = result.scalar_one_or_none()
        if not appointment:
            raise ValueError("Appointment not found")
        
        # Check if doctor exists
        result = await db.execute(
            select(Doctor).where(Doctor.id == feedback_data.doctor_id)
        )
        doctor = result.scalar_one_or_none()
        if not doctor:
            raise ValueError("Doctor not found")
        
        # Check if feedback already exists
        result = await db.execute(
            select(ConsultationFeedback).where(
                ConsultationFeedback.appointment_id == feedback_data.appointment_id
            )
        )
        existing_feedback = result.scalar_one_or_none()
        if existing_feedback:
            raise ValueError("Consultation feedback already exists for this appointment")
        
        # Create new feedback
        feedback = ConsultationFeedback(
            id=uuid.uuid4(),
            appointment_id=feedback_data.appointment_id,
            doctor_id=feedback_data.doctor_id,
            diagnosis=feedback_data.diagnosis,
            treatment=feedback_data.treatment,
            prescription=feedback_data.prescription,
            follow_up_date=feedback_data.follow_up_date,
            duration=feedback_data.duration
        )
        
        # Update appointment status to completed
        appointment.status = "completed"
        
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)
        
        return feedback
    
    @staticmethod
    async def get_consultation_feedback(
        db: AsyncSession,
        appointment_id: UUID
    ) -> Optional[ConsultationFeedback]:
        """Get consultation feedback for an appointment"""
        result = await db.execute(
            select(ConsultationFeedback).where(
                ConsultationFeedback.appointment_id == appointment_id
            )
        )
        feedback = result.scalar_one_or_none()
        
        if feedback:
            # Add doctor name to feedback
            doctor_result = await db.execute(
                select(Doctor).join(User).where(Doctor.id == feedback.doctor_id)
            )
            doctor = doctor_result.scalar_one_or_none()
            if doctor and doctor.user:
                feedback.doctor_name = f"{doctor.user.first_name} {doctor.user.last_name}"
            
            # Add patient name to feedback
            appointment_result = await db.execute(
                select(Appointment).join(Patient).where(Appointment.id == feedback.appointment_id)
            )
            appointment = appointment_result.scalar_one_or_none()
            if appointment and appointment.patient:
                feedback.patient_name = f"{appointment.patient.first_name} {appointment.patient.last_name}"
        
        return feedback
    
    @staticmethod
    async def update_consultation_feedback(
        db: AsyncSession,
        feedback_id: UUID,
        feedback_data: ConsultationFeedbackUpdate
    ) -> ConsultationFeedback:
        """Update consultation feedback"""
        result = await db.execute(
            select(ConsultationFeedback).where(ConsultationFeedback.id == feedback_id)
        )
        feedback = result.scalar_one_or_none()
        
        if not feedback:
            raise ValueError("Consultation feedback not found")
        
        # Update feedback fields
        for field, value in feedback_data.model_dump(exclude_unset=True).items():
            setattr(feedback, field, value)
        
        await db.commit()
        await db.refresh(feedback)
        
        return feedback 