from typing import Dict, Any
from datetime import datetime, timedelta
from sqlalchemy import select, func, and_, desc, case
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    Appointment, Doctor, User, ConsultationFeedback, 
    AppointmentStatus, UrgencyLevel
)

async def get_appointment_analytics(db: AsyncSession, days: int = 30) -> Dict[str, Any]:
    """Get appointment analytics for the specified time period"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Daily appointment counts
    daily_appointments = await db.execute(
        select(
            func.date(Appointment.created_at).label('date'),
            func.count(Appointment.id).label('count')
        )
        .where(Appointment.created_at >= start_date)
        .group_by(func.date(Appointment.created_at))
        .order_by(func.date(Appointment.created_at))
    )
    
    # Appointment status distribution
    status_distribution = await db.execute(
        select(
            Appointment.status,
            func.count(Appointment.id).label('count')
        )
        .where(Appointment.created_at >= start_date)
        .group_by(Appointment.status)
    )
    
    # Urgency level distribution
    urgency_distribution = await db.execute(
        select(
            Appointment.urgency,
            func.count(Appointment.id).label('count')
        )
        .where(Appointment.created_at >= start_date)
        .group_by(Appointment.urgency)
    )
    
    # Average consultation time by doctor
    consultation_times = await db.execute(
        select(
            Doctor.id,
            func.concat(User.first_name, ' ', User.last_name).label('doctor_name'),
            func.avg(ConsultationFeedback.duration).label('avg_duration')
        )
        .join(ConsultationFeedback, Doctor.id == ConsultationFeedback.doctor_id)
        .join(User, Doctor.user_id == User.id)
        .where(ConsultationFeedback.created_at >= start_date)
        .group_by(Doctor.id, User.first_name, User.last_name)
        .order_by(desc(func.avg(ConsultationFeedback.duration)))
    )
    
    # No-show rate by day
    no_show_rates = await db.execute(
        select(
            func.date(Appointment.appointment_date).label('date'),
            func.count(Appointment.id).label('total'),
            func.sum(
                case(
                    (Appointment.status == AppointmentStatus.NO_SHOW, 1),
                    else_=0
                )
            ).label('no_shows')
        )
        .where(Appointment.created_at >= start_date)
        .group_by(func.date(Appointment.appointment_date))
        .order_by(func.date(Appointment.appointment_date))
    )
    
    # Appointment wait time (time between creation and actual appointment)
    appointment_wait_times = await db.execute(
        select(
            func.date(Appointment.created_at).label('date'),
            func.avg(
                func.extract('epoch', Appointment.appointment_date - Appointment.created_at) / 3600 / 24
            ).label('avg_wait_days')
        )
        .where(
            and_(
                Appointment.created_at >= start_date,
                Appointment.appointment_date > Appointment.created_at
            )
        )
        .group_by(func.date(Appointment.created_at))
        .order_by(func.date(Appointment.created_at))
    )
    
    return {
        "daily_appointments": [
            {"date": str(row.date), "count": row.count}
            for row in daily_appointments.all()
        ],
        "status_distribution": [
            {"status": row.status.value, "count": row.count}
            for row in status_distribution.all()
        ],
        "urgency_distribution": [
            {"urgency_level": row.urgency.value, "count": row.count}
            for row in urgency_distribution.all()
        ],
        "consultation_times": [
            {
                "doctor_id": str(row.id), 
                "doctor_name": row.doctor_name, 
                "avg_duration": int(row.avg_duration or 0)
            }
            for row in consultation_times.all()
        ],
        "no_show_rates": [
            {
                "date": str(row.date), 
                "total": row.total, 
                "no_shows": row.no_shows or 0,
                "rate": round((row.no_shows or 0) / row.total * 100, 2) if row.total > 0 else 0
            }
            for row in no_show_rates.all()
        ],
        "appointment_wait_times": [
            {
                "date": str(row.date),
                "avg_wait_days": round(row.avg_wait_days or 0, 1)
            }
            for row in appointment_wait_times.all()
        ]
    } 