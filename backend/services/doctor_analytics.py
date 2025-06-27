from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy import select, func, and_, desc, extract, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from models import (
    User, Doctor, Appointment, PatientNote, ConsultationFeedback
)

async def get_doctor_analytics(db: AsyncSession, days: int = 30, doctor_id: Optional[UUID] = None) -> Dict[str, Any]:
    """Get doctor analytics for the specified time period, optionally filtered by doctor"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Base query filter
    base_filter = and_(Appointment.created_at >= start_date)
    if doctor_id:
        base_filter = and_(base_filter, Appointment.doctor_id == doctor_id)
    
    # Most active doctors
    doctor_activity = await db.execute(
        select(
            Doctor.id,
            func.concat(User.first_name, ' ', User.last_name).label('doctor_name'),
            func.count(Appointment.id).label('appointment_count')
        )
        .join(Appointment, Doctor.id == Appointment.doctor_id)
        .join(User, Doctor.user_id == User.id)
        .where(Appointment.created_at >= start_date)
        .group_by(Doctor.id, User.first_name, User.last_name)
        .order_by(desc(func.count(Appointment.id)))
        .limit(10)
    )
    
    # Doctor availability stats
    availability_stats = await db.execute(
        select(
            Doctor.id,
            func.concat(User.first_name, ' ', User.last_name).label('doctor_name'),
            Doctor.is_available,
            func.count(distinct(Appointment.id)).label('appointment_count')
        )
        .join(User, Doctor.user_id == User.id)
        .outerjoin(Appointment, and_(
            Doctor.id == Appointment.doctor_id,
            Appointment.created_at >= start_date
        ))
        .group_by(Doctor.id, User.first_name, User.last_name, Doctor.is_available)
        .order_by(desc(func.count(distinct(Appointment.id))))
    )
    
    # Doctor performance stats
    performance_stats = await db.execute(
        select(
            Doctor.id,
            func.concat(User.first_name, ' ', User.last_name).label('doctor_name'),
            func.count(distinct(Appointment.id)).label('total_appointments'),
            func.avg(ConsultationFeedback.duration).label('avg_duration'),
            func.count(distinct(PatientNote.id)).label('notes_count')
        )
        .join(User, Doctor.user_id == User.id)
        .outerjoin(Appointment, and_(
            Doctor.id == Appointment.doctor_id,
            Appointment.created_at >= start_date
        ))
        .outerjoin(ConsultationFeedback, and_(
            Appointment.id == ConsultationFeedback.appointment_id,
            ConsultationFeedback.created_at >= start_date
        ))
        .outerjoin(PatientNote, and_(
            Doctor.id == PatientNote.doctor_id,
            PatientNote.created_at >= start_date
        ))
        .group_by(Doctor.id, User.first_name, User.last_name)
        .order_by(desc(func.count(distinct(Appointment.id))))
    )
    
    # Department distribution
    department_distribution = await db.execute(
        select(
            Doctor.department,
            func.count(distinct(Doctor.id)).label('doctor_count'),
            func.count(distinct(Appointment.id)).label('appointment_count')
        )
        .outerjoin(Appointment, and_(
            Doctor.id == Appointment.doctor_id,
            Appointment.created_at >= start_date
        ))
        .where(Doctor.department.isnot(None))
        .group_by(Doctor.department)
        .order_by(desc(func.count(distinct(Appointment.id))))
    )
    
    return {
        "doctor_activity": [
            {
                "doctor_id": str(row.id), 
                "doctor_name": row.doctor_name, 
                "appointment_count": row.appointment_count
            }
            for row in doctor_activity.all()
        ],
        "availability_stats": [
            {
                "doctor_id": str(row.id), 
                "doctor_name": row.doctor_name, 
                "is_available": row.is_available,
                "appointment_count": row.appointment_count
            }
            for row in availability_stats.all()
        ],
        "performance_stats": [
            {
                "doctor_id": str(row.id), 
                "doctor_name": row.doctor_name, 
                "total_appointments": row.total_appointments,
                "avg_duration": int(row.avg_duration or 0),
                "notes_count": row.notes_count
            }
            for row in performance_stats.all()
        ],
        "department_distribution": [
            {
                "department": row.department or "Unassigned", 
                "doctor_count": row.doctor_count,
                "appointment_count": row.appointment_count
            }
            for row in department_distribution.all()
        ]
    } 