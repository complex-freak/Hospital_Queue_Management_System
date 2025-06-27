from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy import select, func, and_, desc, extract, distinct, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from uuid import UUID

from models import (
    User, Doctor, Patient, Appointment, Queue, AuditLog, 
    UserRole, QueueStatus, AppointmentStatus, UrgencyLevel,
    PatientNote, ConsultationFeedback
)

class AnalyticsService:
    @staticmethod
    async def get_queue_analytics(db: AsyncSession, days: int = 30) -> Dict[str, Any]:
        """Get queue analytics for the specified time period"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get hourly queue distribution
        hourly_distribution = await db.execute(
            select(
                extract('hour', Queue.created_at).label('hour'),
                func.count(Queue.id).label('count')
            )
            .where(Queue.created_at >= start_date)
            .group_by(extract('hour', Queue.created_at))
            .order_by(extract('hour', Queue.created_at))
        )
        
        # Get daily queue counts
        daily_queues = await db.execute(
            select(
                func.date(Queue.created_at).label('date'),
                func.count(Queue.id).label('count')
            )
            .where(Queue.created_at >= start_date)
            .group_by(func.date(Queue.created_at))
            .order_by(func.date(Queue.created_at))
        )
        
        # Get average wait times by day
        daily_wait_times = await db.execute(
            select(
                func.date(Queue.created_at).label('date'),
                func.avg(
                    func.extract('epoch', Queue.served_at - Queue.created_at) / 60
                ).label('avg_wait_time')
            )
            .where(
                and_(
                    Queue.status == QueueStatus.COMPLETED,
                    Queue.created_at >= start_date,
                    Queue.served_at.isnot(None)
                )
            )
            .group_by(func.date(Queue.created_at))
            .order_by(func.date(Queue.created_at))
        )
        
        # Get queue status distribution
        queue_status_distribution = await db.execute(
            select(
                Queue.status,
                func.count(Queue.id).label('count')
            )
            .where(Queue.created_at >= start_date)
            .group_by(Queue.status)
        )
        
        return {
            "hourly_distribution": [
                {"hour": int(row.hour), "count": row.count}
                for row in hourly_distribution.all()
            ],
            "daily_queues": [
                {"date": str(row.date), "count": row.count}
                for row in daily_queues.all()
            ],
            "daily_wait_times": [
                {"date": str(row.date), "avg_wait_time": int(row.avg_wait_time or 0)}
                for row in daily_wait_times.all()
            ],
            "queue_status_distribution": [
                {"status": row.status.value, "count": row.count}
                for row in queue_status_distribution.all()
            ]
        }
    
    @staticmethod
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
            ]
        }
    
    @staticmethod
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
    
    @staticmethod
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