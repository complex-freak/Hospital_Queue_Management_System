from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_, insert, column, asc, desc, update
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import datetime, date, timedelta, timezone
import asyncio
import logging

from models import Queue, Appointment, Patient, Doctor, User, UrgencyLevel, QueueStatus
from schemas import QueueCreate, QueueUpdate, QueueResponse
from .notification_service import NotificationService
from utils.datetime_utils import get_timezone_aware_now

logger = logging.getLogger(__name__)

class QueueService:
    @staticmethod
    async def add_to_queue(
        db: AsyncSession,
        appointment_id: UUID,
        doctor_id: Optional[UUID] = None,
        priority_override: Optional[int] = None
    ) -> Queue:
        """Add an appointment to the queue"""
        try:
            # Verify appointment exists
            result = await db.execute(
                select(Appointment).where(Appointment.id == appointment_id)
            )
            appointment = result.scalar_one_or_none()
            if not appointment:
                raise ValueError("Appointment not found")
            
            print(f"Found appointment: {appointment.id}")
            
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
            print(f"Next queue number: {next_queue_number}")
            
            # If doctor_id is not provided, automatically assign an available doctor
            assigned_doctor_id = doctor_id or appointment.doctor_id
            if not assigned_doctor_id:
                # Extract department preference from appointment reason if available
                preferred_department = None
                if appointment.reason and len(appointment.reason) > 0:
                    # Simple logic to extract potential department from reason
                    # In a real app, you might have a more sophisticated classification
                    if "cardio" in appointment.reason.lower():
                        preferred_department = "Cardiology"
                    elif "ortho" in appointment.reason.lower():
                        preferred_department = "Orthopedics"
                    elif "pediatric" in appointment.reason.lower() or "child" in appointment.reason.lower():
                        preferred_department = "Pediatrics"
                    elif "emergency" in appointment.reason.lower() or "urgent" in appointment.reason.lower():
                        preferred_department = "Emergency"
                    # Add more department mappings as needed
                
                # Use the new robust doctor assignment method
                assigned_doctor_id = await QueueService.assign_available_doctor(
                    db, appointment, preferred_department
                )
                
                if assigned_doctor_id:
                    # Update the appointment with the assigned doctor
                    appointment.doctor_id = assigned_doctor_id
                    await db.commit()
                    logger.info(f"Automatically assigned doctor with ID: {assigned_doctor_id} to appointment {appointment.id}")
                else:
                    logger.warning("No available doctors found for appointment assignment")
            
            # Calculate priority score
            priority_score = await QueueService._calculate_priority_score(
                db, appointment, priority_override
            )
            print(f"Priority score: {priority_score}")
            
            # Create queue entry
            estimated_wait_time = await QueueService._calculate_estimated_wait_time(
                db, assigned_doctor_id
            )
            print(f"Estimated wait time: {estimated_wait_time}")
            
            # Prepare values for insert, handling the case where doctor_id might be None
            queue_values = {
                "appointment_id": appointment_id,
                "patient_id": appointment.patient_id,
                "queue_number": next_queue_number,
                "priority_score": priority_score,
                "status": QueueStatus.WAITING,
                "estimated_wait_time": estimated_wait_time
            }
            
            # Only add doctor_id if it's not None
            if assigned_doctor_id:
                queue_values["doctor_id"] = assigned_doctor_id
            
            print(f"Queue values: {queue_values}")
            
            stmt = insert(Queue).values(**queue_values).returning(Queue.id)
            
            try:
                result = await db.execute(stmt)
                queue_id = result.scalar_one()
                print(f"Queue entry created with ID: {queue_id}")
                await db.commit()
                
                # Re-fetch the queue entry with relationships loaded
                result = await db.execute(
                    select(Queue)
                    .options(
                        selectinload(Queue.appointment).selectinload(Appointment.patient),
                        selectinload(Queue.appointment).selectinload(Appointment.doctor).selectinload(Doctor.user)
                    )
                    .where(Queue.id == queue_id)
                )
                queue_entry = result.scalar_one()
                
                return queue_entry
            except Exception as insert_error:
                print(f"Error during queue insert: {str(insert_error)}")
                await db.rollback()
                # Try a simplified insert as a fallback
                simplified_values = {
                    "appointment_id": appointment_id,
                    "queue_number": next_queue_number,
                    "priority_score": priority_score,
                    "status": "waiting",
                    "estimated_wait_time": estimated_wait_time
                }
                print(f"Trying simplified insert: {simplified_values}")
                # Only return the ID, then fetch the model instance
                stmt = insert(Queue).values(**simplified_values).returning(Queue.id)
                result = await db.execute(stmt)
                queue_id = result.scalar_one()
                await db.commit()
                # Re-fetch the queue entry with relationships loaded
                result = await db.execute(
                    select(Queue)
                    .options(
                        selectinload(Queue.appointment).selectinload(Appointment.patient),
                        selectinload(Queue.appointment).selectinload(Appointment.doctor).selectinload(Doctor.user)
                    )
                    .where(Queue.id == queue_id)
                )
                queue_entry = result.scalar_one()
                return queue_entry
        except Exception as e:
            print(f"Error in add_to_queue: {str(e)}")
            await db.rollback()
            raise
    
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
        
        # Urgency level adjustment - higher weights for priority
        if appointment.urgency == UrgencyLevel.EMERGENCY:
            base_score += 3000  # Highest priority for emergencies
        elif appointment.urgency == UrgencyLevel.HIGH:
            base_score += 1000  # High priority
        elif appointment.urgency == UrgencyLevel.NORMAL:
            base_score += 0     # Default priority
        elif appointment.urgency == UrgencyLevel.LOW:
            base_score -= 200   # Lower priority
        
        # Time-based adjustment (waiting time) - FIFO component
        # Use timezone-aware datetime to avoid timezone issues
        now = get_timezone_aware_now()
        time_diff = now - appointment.created_at
        hours_waiting = time_diff.total_seconds() / 3600
        
        # Gradually increase priority based on wait time
        # Weight waiting time more heavily for lower priority appointments
        if appointment.urgency == UrgencyLevel.LOW:
            wait_score = int(hours_waiting * 25)  # Give more weight to waiting time for low priority
        elif appointment.urgency == UrgencyLevel.NORMAL:
            wait_score = int(hours_waiting * 15)  # Standard weight
        else:
            wait_score = int(hours_waiting * 10)  # Less weight for already high priority cases
            
        base_score += wait_score
        
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
        try:
            logger.info(f"Getting patient queue status for patient: {patient_id}")
            result = await db.execute(
                select(Queue).where(
                    and_(
                        column("patient_id") == patient_id,
                        Queue.status.in_([QueueStatus.WAITING, QueueStatus.SERVING]),
                        func.date(column("created_at")) == date.today()
                    )
                )
            )
            queue_entry = result.scalars().first()
            logger.info(f"Patient queue entry found: {queue_entry is not None}")
            if queue_entry:
                logger.info(f"Queue entry details: id={queue_entry.id}, status={queue_entry.status}")
            return queue_entry
        except Exception as e:
            logger.error(f"Error in get_patient_queue_status for patient {patient_id}: {str(e)}", exc_info=True)
            raise
    
    @staticmethod
    async def get_queue_status(
        db: AsyncSession, 
        patient_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get current queue status for a patient and return in QueueStatusResponse format"""
        try:
            logger.info(f"Getting queue status for patient: {patient_id}")
            
            queue_entry = await QueueService.get_patient_queue_status(db, patient_id)
            logger.info(f"Queue entry found: {queue_entry is not None}")
            
            if not queue_entry:
                logger.info(f"No queue entry found for patient: {patient_id}")
                return None
                
            logger.info(f"Queue entry details: id={queue_entry.id}, status={queue_entry.status}, queue_number={queue_entry.queue_number}")
            
            # Get position in queue
            logger.info("Calculating queue position...")
            result = await db.execute(
                select(func.count(Queue.id)).where(
                    and_(
                        Queue.status == QueueStatus.WAITING,
                        Queue.priority_score > queue_entry.priority_score,
                        func.date(Queue.created_at) == func.date(queue_entry.created_at)
                    )
                )
            )
            queue_position = result.scalar() or 0
            queue_position += 1  # Add one for current position
            logger.info(f"Queue position calculated: {queue_position}")
            
            # Get total in queue
            logger.info("Calculating total in queue...")
            result = await db.execute(
                select(func.count(Queue.id)).where(
                    and_(
                        Queue.status == QueueStatus.WAITING,
                        func.date(Queue.created_at) == func.date(queue_entry.created_at)
                    )
                )
            )
            total_in_queue = result.scalar() or 0
            logger.info(f"Total in queue: {total_in_queue}")
            
            # Get current serving number
            logger.info("Getting current serving number...")
            result = await db.execute(
                select(Queue.queue_number).where(
                    and_(
                        Queue.status == QueueStatus.SERVING,
                        func.date(Queue.created_at) == func.date(queue_entry.created_at)
                    )
                ).order_by(Queue.served_at.desc()).limit(1)
            )
            current_serving = result.scalar()
            logger.info(f"Current serving: {current_serving}")
            
            # Format as QueueStatusResponse
            response = {
                "queue_id": queue_entry.id,
                "queue_position": queue_position,
                "your_number": queue_entry.queue_number,
                "estimated_wait_time": queue_entry.estimated_wait_time,
                "status": queue_entry.status,
                "appointment_id": queue_entry.appointment_id,
                "total_in_queue": total_in_queue,
                "current_serving": current_serving
            }
            logger.info(f"Queue status response: {response}")
            return response
            
        except Exception as e:
            logger.error(f"Error in get_queue_status for patient {patient_id}: {str(e)}", exc_info=True)
            raise
    
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
        try:
            result = await db.execute(
                select(Queue).where(Queue.id == queue_id)
            )
            queue_entry = result.scalar_one_or_none()
            
            if not queue_entry:
                raise ValueError("Queue entry not found")
            
            queue_entry.status = status
            # Note: Queue model doesn't have a notes field, so we skip setting it
            
            now = get_timezone_aware_now()
            if status == QueueStatus.SERVING:
                queue_entry.served_at = now
            elif status == QueueStatus.COMPLETED:
                # Use served_at for completion time since completed_at doesn't exist
                queue_entry.served_at = now
            
            queue_entry.updated_at = now
            
            # Don't commit here - let the calling code handle the transaction
            # await db.commit()
            # await db.refresh(queue_entry)
            
            return queue_entry
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating queue status for queue_id {queue_id}: {str(e)}")
            raise ValueError(f"Failed to update queue status: {str(e)}")
    
    @staticmethod
    async def call_next_patient(
        db: AsyncSession,
        doctor_id: UUID
    ) -> Optional[Queue]:
        """Call the next patient in queue for a doctor"""
        try:
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
            now = get_timezone_aware_now()
            next_patient.status = QueueStatus.SERVING
            next_patient.served_at = now
            next_patient.updated_at = now
            
            # Don't commit here - let the calling code handle the transaction
            # await db.commit()
            # await db.refresh(next_patient)
            
            return next_patient
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error calling next patient for doctor_id {doctor_id}: {str(e)}")
            raise ValueError(f"Failed to call next patient: {str(e)}")
    
    @staticmethod
    async def skip_patient(
        db: AsyncSession,
        queue_id: UUID,
        reason: str = "Patient not available"
    ) -> Queue:
        """Skip a patient in queue"""
        try:
            result = await db.execute(
                select(Queue).where(Queue.id == queue_id)
            )
            queue_entry = result.scalar_one_or_none()
            
            if not queue_entry:
                raise ValueError("Queue entry not found")
            
            # Allow skipping patients who are waiting, called, or currently being served
            if queue_entry.status not in [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.SERVING]:
                raise ValueError(f"Cannot skip patient with status: {queue_entry.status}")
            
            queue_entry.status = QueueStatus.NO_SHOW
            # Note: Queue model doesn't have a notes field, so we skip setting it
            queue_entry.updated_at = get_timezone_aware_now()
            
            # Don't commit here - let the calling code handle the transaction
            # await db.commit()
            # await db.refresh(queue_entry)
            
            return queue_entry
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error skipping patient for queue_id {queue_id}: {str(e)}")
            raise ValueError(f"Failed to skip patient: {str(e)}")
    
    @staticmethod
    async def reorder_queue(
        db: AsyncSession,
        queue_updates: List[Dict[str, Any]]
    ) -> List[Queue]:
        """Manually reorder queue entries"""
        try:
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
                    queue_entry.updated_at = get_timezone_aware_now()
                    updated_entries.append(queue_entry)
            
            # Don't commit here - let the calling code handle the transaction
            # if updated_entries:
            #     await db.commit()
            #     for entry in updated_entries:
            #         await db.refresh(entry)
            
            return updated_entries
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error reordering queue: {str(e)}")
            raise ValueError(f"Failed to reorder queue: {str(e)}")
    
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
        try:
            result = await db.execute(
                select(Queue).where(Queue.id == queue_id)
            )
            queue_entry = result.scalar_one_or_none()
            
            if not queue_entry:
                raise ValueError("Queue entry not found")
            
            if queue_entry.status in [QueueStatus.COMPLETED, QueueStatus.CANCELLED]:
                raise ValueError(f"Cannot remove queue entry with status: {queue_entry.status}")
            
            queue_entry.status = QueueStatus.CANCELLED
            # Note: Queue model doesn't have a notes field, so we skip setting it
            queue_entry.updated_at = get_timezone_aware_now()
            
            # Don't commit here - let the calling code handle the transaction
            # await db.commit()
            # await db.refresh(queue_entry)
            
            return queue_entry
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error removing from queue for queue_id {queue_id}: {str(e)}")
            raise ValueError(f"Failed to remove from queue: {str(e)}")
    
    @staticmethod
    async def get_doctor_with_least_queue(db: AsyncSession) -> Optional[UUID]:
        """
        Find the doctor with the least number of patients in queue
        Returns the doctor's ID
        """
        # Count the number of active queue entries for each doctor
        result = await db.execute(
            select(
                Appointment.doctor_id,
                func.count(Queue.id).label("queue_count")
            )
            .join(Queue, Queue.appointment_id == Appointment.id)
            .where(
                and_(
                    Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED]),
                    func.date(Queue.created_at) == func.current_date()
                )
            )
            .group_by(Appointment.doctor_id)
            .order_by(asc("queue_count"))
        )
        doctor_with_count = result.first()
        
        if doctor_with_count:
            return doctor_with_count[0]  # Return the doctor_id
        
        # If no doctors found with queue, get the first available doctor
        result = await db.execute(
            select(Doctor.id)
            .where(Doctor.is_available == True)
            .limit(1)
        )
        doctor = result.scalar_one_or_none()
        
        return doctor  # May be None if no doctors available

    @staticmethod
    async def assign_available_doctor(
        db: AsyncSession,
        appointment: Appointment,
        preferred_department: Optional[str] = None
    ) -> Optional[UUID]:
        """
        Assign an available doctor to an appointment
        Prioritizes doctors with the least queue, then considers department preferences
        Returns the assigned doctor's ID or None if no doctors available
        """
        try:
            # First, try to find a doctor with the least queue in the preferred department
            if preferred_department:
                result = await db.execute(
                    select(
                        Doctor.id,
                        func.count(Queue.id).label("queue_count")
                    )
                    .join(User, Doctor.user_id == User.id)
                    .outerjoin(
                        Appointment, 
                        and_(
                            Doctor.id == Appointment.doctor_id,
                            Appointment.id == Queue.appointment_id,
                            Queue.status.in_([QueueStatus.WAITING, QueueStatus.CALLED]),
                            func.date(Queue.created_at) == func.current_date()
                        )
                    )
                    .outerjoin(Queue, Appointment.id == Queue.appointment_id)
                    .where(
                        and_(
                            Doctor.is_available == True,
                            Doctor.department.ilike(f"%{preferred_department}%")
                        )
                    )
                    .group_by(Doctor.id)
                    .order_by(asc("queue_count"), asc(Doctor.id))
                )
                doctor_with_count = result.first()
                
                if doctor_with_count:
                    logger.info(f"Assigned doctor {doctor_with_count[0]} from preferred department {preferred_department}")
                    return doctor_with_count[0]
            
            # If no preferred department or no doctors in preferred department, 
            # fall back to general assignment
            return await QueueService.get_doctor_with_least_queue(db)
            
        except Exception as e:
            logger.error(f"Error assigning available doctor: {str(e)}")
            # Fallback to simple available doctor selection
            result = await db.execute(
                select(Doctor.id)
                .where(Doctor.is_available == True)
                .limit(1)
            )
            return result.scalar_one_or_none()
    
    @staticmethod
    async def update_queue_positions(
        db: AsyncSession,
        doctor_id: Optional[UUID] = None,
        notification_service: Optional[NotificationService] = None
    ):
        """
        Update queue positions after a patient is served or removed
        Optionally send notifications to waiting patients
        """
        # Build the base query for waiting patients
        query = (
            select(Queue)
            .join(Appointment, Queue.appointment_id == Appointment.id)
            .where(Queue.status == QueueStatus.WAITING)
            .order_by(desc(Queue.priority_score), asc(Queue.queue_number))
        )
        
        # Filter by doctor if specified
        if doctor_id:
            query = query.where(Appointment.doctor_id == doctor_id)
        
        # Get all waiting queue entries
        result = await db.execute(query)
        queue_entries = result.scalars().all()
        
        # Update positions and send notifications if service provided
        for position, entry in enumerate(queue_entries, 1):
            # Estimated wait time (5-10 min per position)
            estimated_wait = position * 8  # minutes
            
            if notification_service and position <= 3:
                # Only notify the next few patients
                try:
                    # Get patient ID from appointment
                    appointment_result = await db.execute(
                        select(Appointment)
                        .where(Appointment.id == entry.appointment_id)
                    )
                    appointment = appointment_result.scalar_one_or_none()
                    
                    if appointment:
                        # Send queue position update notification
                        await notification_service.send_queue_position_update(
                            db=db,
                            patient_id=appointment.patient_id,
                            queue_position=position,
                            estimated_wait_time=estimated_wait
                        )
                except Exception as e:
                    logger.error(f"Failed to send queue position update: {str(e)}")
        
        return queue_entries