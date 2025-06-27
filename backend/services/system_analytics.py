from typing import Dict, Any
from datetime import datetime, timedelta
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    User, Doctor, Patient, Appointment, Queue, 
    QueueStatus, AppointmentStatus
)

async def get_system_overview(db: AsyncSession) -> Dict[str, Any]:
    """Get system overview statistics"""
    # Total stats
    total_users = await db.execute(select(func.count(User.id)).where(User.is_active == True))
    total_doctors = await db.execute(select(func.count(Doctor.id)))
    total_patients = await db.execute(select(func.count(Patient.id)))
    total_appointments = await db.execute(select(func.count(Appointment.id)))
    total_queues = await db.execute(select(func.count(Queue.id)))
    
    # Active queue stats
    active_queues = await db.execute(
        select(func.count(Queue.id))
        .where(Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED]))
    )
    
    # System stats for last 24 hours
    last_24h = datetime.utcnow() - timedelta(hours=24)
    new_patients_24h = await db.execute(
        select(func.count(Patient.id)).where(Patient.created_at >= last_24h)
    )
    new_appointments_24h = await db.execute(
        select(func.count(Appointment.id)).where(Appointment.created_at >= last_24h)
    )
    completed_appointments_24h = await db.execute(
        select(func.count(Appointment.id))
        .where(
            and_(
                Appointment.updated_at >= last_24h,
                Appointment.status == AppointmentStatus.COMPLETED
            )
        )
    )
    
    # System uptime (days since first user created)
    first_user = await db.execute(select(func.min(User.created_at)))
    first_user_date = first_user.scalar()
    system_uptime_days = 0
    if first_user_date:
        system_uptime_days = (datetime.utcnow() - first_user_date).days
    
    return {
        "total_stats": {
            "users": total_users.scalar() or 0,
            "doctors": total_doctors.scalar() or 0,
            "patients": total_patients.scalar() or 0,
            "appointments": total_appointments.scalar() or 0,
            "queues": total_queues.scalar() or 0,
        },
        "active_stats": {
            "active_queues": active_queues.scalar() or 0,
        },
        "last_24h_stats": {
            "new_patients": new_patients_24h.scalar() or 0,
            "new_appointments": new_appointments_24h.scalar() or 0,
            "completed_appointments": completed_appointments_24h.scalar() or 0,
        },
        "system_uptime_days": system_uptime_days,
    } 