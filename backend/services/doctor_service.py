from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_, desc, insert, update
from uuid import UUID
from datetime import datetime, date, timedelta
import uuid

from models import Doctor, User, Patient, Appointment, Queue, PatientNote, ConsultationFeedback, AppointmentStatus
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
        
        # Store shift information if provided
        if status_data.shift_start:
            doctor.shift_start = status_data.shift_start
            
        if status_data.shift_end:
            doctor.shift_end = status_data.shift_end
        
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
        note = PatientNote()
        note.id = uuid.uuid4()
        note.patient_id = note_data.patient_id
        note.doctor_id = note_data.doctor_id
        note.content = note_data.content
        note.version = latest_version + 1
        note.previous_version_id = note_data.previous_version_id
        
        result = await db.execute(insert(PatientNote).values(
            id=note.id,
            patient_id=note.patient_id,
            doctor_id=note.doctor_id,
            content=note.content,
            version=note.version,
            previous_version_id=note.previous_version_id
        ).returning(PatientNote))
        note = result.scalar_one()
        await db.commit()
        
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
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"Starting create_consultation_feedback for appointment {feedback_data.appointment_id}")
        
        # Check if appointment exists
        logger.info("Checking if appointment exists")
        result = await db.execute(
            select(Appointment).where(Appointment.id == feedback_data.appointment_id)
        )
        appointment = result.scalar_one_or_none()
        if not appointment:
            logger.error(f"Appointment {feedback_data.appointment_id} not found")
            raise ValueError("Appointment not found")
        
        logger.info(f"Found appointment: {appointment.id}")
        
        # Check if doctor exists
        logger.info(f"Checking if doctor {feedback_data.doctor_id} exists")
        result = await db.execute(
            select(Doctor).where(Doctor.id == feedback_data.doctor_id)
        )
        doctor = result.scalar_one_or_none()
        if not doctor:
            logger.error(f"Doctor {feedback_data.doctor_id} not found")
            raise ValueError("Doctor not found")
        
        logger.info(f"Found doctor: {doctor.id}")
        
        # Check if feedback already exists
        logger.info("Checking if feedback already exists")
        result = await db.execute(
            select(ConsultationFeedback).where(
                ConsultationFeedback.appointment_id == feedback_data.appointment_id
            )
        )
        existing_feedback = result.scalar_one_or_none()
        if existing_feedback:
            logger.error(f"Feedback already exists for appointment {feedback_data.appointment_id}")
            raise ValueError("Consultation feedback already exists for this appointment")
        
        logger.info("No existing feedback found, creating new feedback")
        
        # Create new feedback
        feedback = ConsultationFeedback()
        feedback.id = uuid.uuid4()
        feedback.appointment_id = feedback_data.appointment_id
        feedback.doctor_id = feedback_data.doctor_id
        feedback.diagnosis = feedback_data.diagnosis
        feedback.treatment = feedback_data.treatment
        feedback.prescription = feedback_data.prescription
        feedback.follow_up_date = feedback_data.follow_up_date
        feedback.duration = feedback_data.duration
        
        logger.info(f"Created feedback object with ID: {feedback.id}")
        
        # Update appointment status to completed
        appointment.status = AppointmentStatus.COMPLETED
        
        logger.info("Inserting consultation feedback into database")
        result = await db.execute(insert(ConsultationFeedback).values(
            id=feedback.id,
            appointment_id=feedback.appointment_id,
            doctor_id=feedback.doctor_id,
            diagnosis=feedback.diagnosis,
            treatment=feedback.treatment,
            prescription=feedback.prescription,
            follow_up_date=feedback.follow_up_date,
            duration=feedback.duration
        ).returning(ConsultationFeedback))
        inserted_feedback = result.scalar_one()
        
        logger.info(f"Inserted feedback: {inserted_feedback.id}")
        
        # Update appointment status in database
        logger.info("Updating appointment status to COMPLETED")
        await db.execute(
            update(Appointment)
            .where(Appointment.id == appointment.id)
            .values(status=AppointmentStatus.COMPLETED)
        )
        
        logger.info("Committing transaction")
        await db.commit()
        
        logger.info(f"Successfully created consultation feedback: {inserted_feedback.id}")
        return inserted_feedback
    
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