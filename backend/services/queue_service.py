from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_, insert, column
from uuid import UUID
from datetime import datetime, date, timedelta
import asyncio

from models import Queue, Appointment, Patient, Doctor, UrgencyLevel, QueueStatus
from schemas import QueueCreate, QueueUpdate, QueueResponse


class QueueService:
    @staticmethod
    async def add_to_queue(
        db: AsyncSession,
        appointment_id: UUID,
        doctor_id: Optional[UUID] = None,
        priority_override: Optional[int] = None
    ) -> Queue:
        """Add an appointment to the queue"""
        # Verify appointment exists
        result = await db.execute(
            select(Appointment).where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one_or_none()
        if not appointment:
            raise ValueError("Appointment not found")
        
        # Check if already in queue
        result = await db.execute(
            select(Queue).where(
                and_(
                    column("appointment_id") == appointment_id,
                    Queue.status.in_([QueueStatus.WAITING, QueueStatus.SERVING])
                )
            )
        )
        existing_queue = result.scalar_one_or_none()
        if existing_queue:
            raise ValueError("Appointment already in queue")
        
        # Get next queue number for the day
        today = date.today()
        result = await db.execute(
            select(func.max(column("queue_number"))).select_from(Queue).where(
                func.date(column("created_at")) == today
            )
        )
        max_queue_number = result.scalar() or 0
        next_queue_number = max_queue_number + 1
        
        # Calculate priority score
        priority_score = await QueueService._calculate_priority_score(
            db, appointment, priority_override
        )
        
        # Create queue entry
        estimated_wait_time = await QueueService._calculate_estimated_wait_time(
            db, doctor_id or appointment.doctor_id
        )
        
        stmt = insert(Queue).values(
            appointment_id=appointment_id,
            patient_id=appointment.patient_id,
            doctor_id=doctor_id or appointment.doctor_id,
            queue_number=next_queue_number,
            priority_score=priority_score,
            status=QueueStatus.WAITING,
            estimated_wait_time=estimated_wait_time
        ).returning(Queue)
        
        result = await db.execute(stmt)
        queue_entry = result.scalar_one()
        await db.commit()
        
        return queue_entry
    
    @staticmethod
    async def _calculate_priority_score(
        db: AsyncSession,
        appointment: Appointment,
        priority_override: Optional[int] = None
    ) -> int:
        """Calculate priority score for queue ordering"""
        if priority_override is not None:
            return priority_override
        
        base_score = 100
        
        # Urgency level adjustment
        if appointment.urgency == UrgencyLevel.EMERGENCY:
            base_score += 1000
        elif appointment.urgency == UrgencyLevel.HIGH:
            base_score += 500
        elif appointment.urgency == UrgencyLevel.NORMAL:
            base_score += 0
        elif appointment.urgency == UrgencyLevel.LOW:
            base_score -= 100
        
        # Time-based adjustment (waiting time)
        time_diff = datetime.utcnow() - appointment.created_at
        hours_waiting = time_diff.total_seconds() / 3600
        base_score += int(hours_waiting * 10)  # 10 points per hour of waiting
        
        return base_score
    
    @staticmethod
    async def _calculate_estimated_wait_time(
        db: AsyncSession,
        doctor_id: Optional[UUID] = None
    ) -> int:
        """Calculate estimated wait time in minutes"""
        # Get current queue for doctor or all doctors
        query = select(Queue).where(
            and_(
                Queue.status == QueueStatus.WAITING,
                func.date(column("created_at")) == date.today()
            )
        )
        
        if doctor_id:
            query = query.where(column("doctor_id") == doctor_id)
        
        result = await db.execute(query.order_by(column("priority_score").desc()))
        waiting_queue = result.scalars().all()
        
        # Estimate 15 minutes per patient (configurable)
        average_consultation_time = 15
        estimated_time = len(waiting_queue) * average_consultation_time
        
        return estimated_time
    
    @staticmethod
    async def get_queue_by_id(db: AsyncSession, queue_id: UUID) -> Optional[Queue]:
        """Get queue entry by ID"""
        result = await db.execute(
            select(Queue).where(Queue.id == queue_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_patient_queue_status(
        db: AsyncSession, 
        patient_id: UUID
    ) -> Optional[Queue]:
        """Get current queue status for a patient"""
        result = await db.execute(
            select(Queue).where(
                and_(
                    column("patient_id") == patient_id,
                    Queue.status.in_([QueueStatus.WAITING, QueueStatus.SERVING]),
                    func.date(column("created_at")) == date.today()
                )
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_doctor_queue(
        db: AsyncSession,
        doctor_id: UUID,
        queue_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Queue]:
        """Get queue for a specific doctor"""
        target_date = queue_date or date.today()
        
        result = await db.execute(
            select(Queue).where(
                and_(
                    column("doctor_id") == doctor_id,
                    func.date(column("created_at")) == target_date,
                    Queue.status.in_([QueueStatus.WAITING, QueueStatus.SERVING])
                )
            )
            .order_by(column("priority_score").desc(), column("created_at").asc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_all_queue(
        db: AsyncSession,
        queue_date: Optional[date] = None,
        status: Optional[QueueStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Queue]:
        """Get all queue entries"""
        target_date = queue_date or date.today()
        
        query = select(Queue).where(func.date(column("created_at")) == target_date)
        
        if status:
            query = query.where(Queue.status == status)
        else:
            query = query.where(Queue.status.in_([QueueStatus.WAITING, QueueStatus.SERVING]))
        
        query = query.order_by(column("priority_score").desc(), column("created_at").asc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def update_queue_status(
        db: AsyncSession,
        queue_id: UUID,
        status: QueueStatus,
        notes: Optional[str] = None
    ) -> Queue:
        """Update queue status"""
        result = await db.execute(
            select(Queue).where(Queue.id == queue_id)
        )
        queue_entry = result.scalar_one_or_none()
        
        if not queue_entry:
            raise ValueError("Queue entry not found")
        
        queue_entry.status = status
        if notes:
            queue_entry.notes = notes
        
        if status == QueueStatus.SERVING:
            queue_entry.served_at = datetime.utcnow()
        elif status == QueueStatus.COMPLETED:
            queue_entry.completed_at = datetime.utcnow()
        
        queue_entry.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(queue_entry)
        
        return queue_entry
    
    @staticmethod
    async def call_next_patient(
        db: AsyncSession,
        doctor_id: UUID
    ) -> Optional[Queue]:
        """Call the next patient in queue for a doctor"""
        # Get next patient in queue
        result = await db.execute(
            select(Queue).where(
                and_(
                    column("doctor_id") == doctor_id,
                    Queue.status == QueueStatus.WAITING,
                    func.date(column("created_at")) == date.today()
                )
            )
            .order_by(column("priority_score").desc(), column("created_at").asc())
            .limit(1)
        )
        next_patient = result.scalar_one_or_none()
        
        if not next_patient:
            return None
        
        # Update status to in progress
        next_patient.status = QueueStatus.SERVING
        next_patient.served_at = datetime.utcnow()
        next_patient.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(next_patient)
        
        return next_patient
    
    @staticmethod
    async def skip_patient(
        db: AsyncSession,
        queue_id: UUID,
        reason: str = "Patient not available"
    ) -> Queue:
        """Skip a patient in queue"""
        result = await db.execute(
            select(Queue).where(Queue.id == queue_id)
        )
        queue_entry = result.scalar_one_or_none()
        
        if not queue_entry:
            raise ValueError("Queue entry not found")
        
        if queue_entry.status != QueueStatus.SERVING:
            raise ValueError("Can only skip patients currently in progress")
        
        queue_entry.status = QueueStatus.NO_SHOW
        queue_entry.notes = f"{queue_entry.notes or ''}\nSkipped: {reason}"
        queue_entry.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(queue_entry)
        
        return queue_entry
    
    @staticmethod
    async def reorder_queue(
        db: AsyncSession,
        queue_updates: List[Dict[str, Any]]
    ) -> List[Queue]:
        """Manually reorder queue entries"""
        updated_entries = []
        
        for update in queue_updates:
            queue_id = update.get('queue_id')
            new_priority = update.get('priority_score')
            
            if not queue_id or new_priority is None:
                continue
            
            result = await db.execute(
                select(Queue).where(Queue.id == queue_id)
            )
            queue_entry = result.scalar_one_or_none()
            
            if queue_entry and queue_entry.status == QueueStatus.WAITING:
                queue_entry.priority_score = new_priority
                queue_entry.updated_at = datetime.utcnow()
                updated_entries.append(queue_entry)
        
        if updated_entries:
            await db.commit()
            for entry in updated_entries:
                await db.refresh(entry)
        
        return updated_entries
    
    @staticmethod
    async def get_queue_statistics(
        db: AsyncSession,
        queue_date: Optional[date] = None,
        doctor_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Get queue statistics"""
        target_date = queue_date or date.today()
        
        # Base query
        base_query = select(Queue).where(func.date(column("created_at")) == target_date)
        
        if doctor_id:
            base_query = base_query.where(column("doctor_id") == doctor_id)
        
        # Total patients
        result = await db.execute(
            select(func.count(Queue.id)).select_from(base_query.subquery())
        )
        total_patients = result.scalar() or 0
        
        # Patients by status
        result = await db.execute(
            select(Queue.status, func.count(Queue.id))
            .select_from(base_query.subquery())
            .group_by(Queue.status)
        )
        status_counts = dict(result.all())
        
        # Average wait time for completed patients
        result = await db.execute(
            select(func.avg(
                func.extract('epoch', Queue.served_at - Queue.created_at) / 60
            )).select_from(
                base_query.where(Queue.served_at.isnot(None)).subquery()
            )
        )
        avg_wait_time = result.scalar() or 0
        
        return {
            'date': target_date.isoformat(),
            'total_patients': total_patients,
            'waiting': status_counts.get(QueueStatus.WAITING, 0),
            'in_progress': status_counts.get(QueueStatus.SERVING, 0),
            'completed': status_counts.get(QueueStatus.COMPLETED, 0),
            'skipped': status_counts.get(QueueStatus.NO_SHOW, 0),
            'cancelled': status_counts.get(QueueStatus.CANCELLED, 0),
            'average_wait_time_minutes': round(avg_wait_time, 2)
        }
    
    @staticmethod
    async def remove_from_queue(
        db: AsyncSession,
        queue_id: UUID,
        reason: str = "Removed by staff"
    ) -> Queue:
        """Remove a patient from queue"""
        result = await db.execute(
            select(Queue).where(Queue.id == queue_id)
        )
        queue_entry = result.scalar_one_or_none()
        
        if not queue_entry:
            raise ValueError("Queue entry not found")
        
        if queue_entry.status in [QueueStatus.COMPLETED, QueueStatus.CANCELLED]:
            raise ValueError(f"Cannot remove queue entry with status: {queue_entry.status}")
        
        queue_entry.status = QueueStatus.CANCELLED
        queue_entry.notes = f"{queue_entry.notes or ''}\nRemoved: {reason}"
        queue_entry.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(queue_entry)
        
        return queue_entry