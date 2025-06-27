from typing import List, Dict, Any, Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from uuid import UUID
from datetime import datetime, timedelta
import json
import logging
from models import Patient, Appointment, Queue, User, Doctor
from schemas import (
    PatientCreate, PatientUpdate, 
    AppointmentCreate, AppointmentUpdate,
    QueueUpdate
)
from services.auth_service import AuthService
from services.appointment_service import AppointmentService
from services.queue_service import QueueService

logger = logging.getLogger(__name__)

class SyncService:
    @staticmethod
    async def sync_offline_data(
        db: AsyncSession,
        user_id: UUID,
        sync_data: Dict[str, Any],
        last_sync_timestamp: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Sync offline data from client to server
        Returns sync results and any conflicts
        """
        sync_results = {
            'success': True,
            'processed': 0,
            'errors': [],
            'conflicts': [],
            'server_updates': {},
            'sync_timestamp': datetime.utcnow().isoformat()
        }
        
        try:
            # Process patient registrations
            if 'patients' in sync_data:
                patient_results = await SyncService._sync_patients(
                    db, user_id, sync_data['patients']
                )
                sync_results['processed'] += patient_results['processed']
                sync_results['errors'].extend(patient_results['errors'])
                sync_results['conflicts'].extend(patient_results['conflicts'])

            # Process appointments
            if 'appointments' in sync_data:
                appointment_results = await SyncService._sync_appointments(
                    db, user_id, sync_data['appointments']
                )
                sync_results['processed'] += appointment_results['processed']
                sync_results['errors'].extend(appointment_results['errors'])
                sync_results['conflicts'].extend(appointment_results['conflicts'])

            # Process queue updates
            if 'queue_updates' in sync_data:
                queue_results = await SyncService._sync_queue_updates(
                    db, user_id, sync_data['queue_updates']
                )
                sync_results['processed'] += queue_results['processed']
                sync_results['errors'].extend(queue_results['errors'])
                sync_results['conflicts'].extend(queue_results['conflicts'])

            # Get server updates since last sync
            if last_sync_timestamp:
                server_updates = await SyncService._get_server_updates(
                    db, user_id, last_sync_timestamp
                )
                sync_results['server_updates'] = server_updates

            await db.commit()
            
        except Exception as e:
            logger.error(f"Sync error for user {user_id}: {str(e)}")
            await db.rollback()
            sync_results['success'] = False
            sync_results['errors'].append(f"Sync failed: {str(e)}")
        
        return sync_results

    @staticmethod
    async def _sync_patients(
        db: AsyncSession,
        user_id: UUID,
        patients_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Sync patient data with conflict resolution"""
        results = {'processed': 0, 'errors': [], 'conflicts': []}
        
        for patient_data in patients_data:
            try:
                # Check if patient exists by phone number
                existing_patient = await db.execute(
                    select(Patient).where(Patient.phone_number == patient_data['phone_number'])
                )
                existing_patient = existing_patient.scalar_one_or_none()
                
                if existing_patient:
                    # Check for conflicts based on updated_at timestamp
                    client_updated = datetime.fromisoformat(patient_data.get('updated_at', '1970-01-01'))
                    server_updated = existing_patient.updated_at or existing_patient.created_at
                    
                    if client_updated < server_updated:
                        results['conflicts'].append({
                            'type': 'patient',
                            'id': str(existing_patient.id),
                            'reason': 'Server version is newer',
                            'client_data': patient_data,
                            'server_data': {
                                'id': str(existing_patient.id),
                                'phone_number': existing_patient.phone_number,
                                'full_name': existing_patient.full_name,
                                'updated_at': existing_patient.updated_at.isoformat() if existing_patient.updated_at else None
                            }
                        })
                        continue
                    
                    # Update existing patient (staff override)
                    for key, value in patient_data.items():
                        if hasattr(existing_patient, key) and key not in ['id', 'created_at']:
                            setattr(existing_patient, key, value)
                    existing_patient.updated_at = datetime.utcnow()
                    existing_patient.updated_by = user_id
                else:
                    # Create new patient
                    patient_create = PatientCreate(**patient_data)
                    new_patient = await AuthService.register_patient(db, patient_create)
                
                results['processed'] += 1
                
            except Exception as e:
                logger.error(f"Error syncing patient {patient_data.get('phone_number')}: {str(e)}")
                results['errors'].append(f"Patient sync error: {str(e)}")
        
        return results

    @staticmethod
    async def _sync_appointments(
        db: AsyncSession,
        user_id: UUID,
        appointments_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Sync appointment data with conflict resolution"""
        results = {'processed': 0, 'errors': [], 'conflicts': []}
        
        for appointment_data in appointments_data:
            try:
                appointment_id = appointment_data.get('id')
                if appointment_id:
                    # Update existing appointment
                    existing_appointment = await db.get(Appointment, UUID(appointment_id))
                    if existing_appointment:
                        # Check for conflicts
                        client_updated = datetime.fromisoformat(appointment_data.get('updated_at', '1970-01-01'))
                        server_updated = existing_appointment.updated_at or existing_appointment.created_at
                        
                        if client_updated < server_updated:
                            results['conflicts'].append({
                                'type': 'appointment',
                                'id': appointment_id,
                                'reason': 'Server version is newer',
                                'client_data': appointment_data,
                                'server_data': {
                                    'id': str(existing_appointment.id),
                                    'status': existing_appointment.status,
                                    'updated_at': existing_appointment.updated_at.isoformat() if existing_appointment.updated_at else None
                                }
                            })
                            continue
                        
                        # Update appointment
                        appointment_update = AppointmentUpdate(**{
                            k: v for k, v in appointment_data.items() 
                            if k not in ['id', 'created_at', 'patient_id']
                        })
                        updated_appointment = await AppointmentService.update_appointment(
                            db, UUID(appointment_id), appointment_update
                        )
                else:
                    # Create new appointment
                    appointment_create = AppointmentCreate(**appointment_data)
                    new_appointment = await AppointmentService.create_appointment(
                        db, appointment_create, user_id
                    )
                
                results['processed'] += 1
                
            except Exception as e:
                logger.error(f"Error syncing appointment {appointment_data.get('id')}: {str(e)}")
                results['errors'].append(f"Appointment sync error: {str(e)}")
        
        return results

    @staticmethod
    async def _sync_queue_updates(
        db: AsyncSession,
        user_id: UUID,
        queue_updates_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Sync queue status updates"""
        results = {'processed': 0, 'errors': [], 'conflicts': []}
        
        for queue_data in queue_updates_data:
            try:
                queue_id = queue_data.get('id')
                if queue_id:
                    existing_queue = await db.get(Queue, UUID(queue_id))
                    if existing_queue:
                        # Check for conflicts
                        client_updated = datetime.fromisoformat(queue_data.get('updated_at', '1970-01-01'))
                        server_updated = existing_queue.updated_at or existing_queue.created_at
                        
                        if client_updated < server_updated:
                            results['conflicts'].append({
                                'type': 'queue',
                                'id': queue_id,
                                'reason': 'Server version is newer',
                                'client_data': queue_data,
                                'server_data': {
                                    'id': str(existing_queue.id),
                                    'status': existing_queue.status,
                                    'priority': existing_queue.priority,
                                    'updated_at': existing_queue.updated_at.isoformat() if existing_queue.updated_at else None
                                }
                            })
                            continue
                        
                        # Update queue
                        queue_update = QueueUpdate(**{
                            k: v for k, v in queue_data.items() 
                            if k not in ['id', 'created_at', 'appointment_id']
                        })
                        
                        # Check if status is provided, otherwise use a default
                        if queue_update.status is not None:
                            updated_queue = await QueueService.update_queue_status(
                                db, UUID(queue_id), queue_update.status, getattr(queue_update, "notes", None)
                            )
                
                results['processed'] += 1
                
            except Exception as e:
                logger.error(f"Error syncing queue {queue_data.get('id')}: {str(e)}")
                results['errors'].append(f"Queue sync error: {str(e)}")
        
        return results

    @staticmethod
    async def _get_server_updates(
        db: AsyncSession,
        user_id: UUID,
        last_sync_timestamp: datetime
    ) -> Dict[str, Any]:
        """Get server updates since last sync timestamp"""
        server_updates = {
            'patients': [],
            'appointments': [],
            'queue': []
        }
        
        try:
            # Get updated patients
            patients_query = select(Patient).where(
                or_(
                    Patient.updated_at > last_sync_timestamp,
                    and_(Patient.updated_at.is_(None), Patient.created_at > last_sync_timestamp)
                )
            )
            patients_result = await db.execute(patients_query)
            patients = patients_result.scalars().all()
            
            for patient in patients:
                server_updates['patients'].append({
                    'id': str(patient.id),
                    'phone_number': patient.phone_number,
                    'full_name': patient.full_name,
                    'date_of_birth': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                    'gender': patient.gender,
                    'address': patient.address,
                    'emergency_contact': patient.emergency_contact,
                    'medical_history': patient.medical_history,
                    'created_at': patient.created_at.isoformat(),
                    'updated_at': patient.updated_at.isoformat() if patient.updated_at else None
                })

            # Get updated appointments
            appointments_query = select(Appointment).where(
                or_(
                    Appointment.updated_at > last_sync_timestamp,
                    and_(Appointment.updated_at.is_(None), Appointment.created_at > last_sync_timestamp)
                )
            )
            appointments_result = await db.execute(appointments_query)
            appointments = appointments_result.scalars().all()
            
            for appointment in appointments:
                server_updates['appointments'].append({
                    'id': str(appointment.id),
                    'patient_id': str(appointment.patient_id),
                    'doctor_id': str(appointment.doctor_id) if appointment.doctor_id else None,
                    'appointment_date': appointment.appointment_date.isoformat(),
                    'reason': appointment.reason,
                    'urgency_level': appointment.urgency_level,
                    'status': appointment.status,
                    'notes': appointment.notes,
                    'created_at': appointment.created_at.isoformat(),
                    'updated_at': appointment.updated_at.isoformat() if appointment.updated_at else None
                })

            # Get updated queue items
            queue_query = select(Queue).where(
                or_(
                    Queue.updated_at > last_sync_timestamp,
                    and_(Queue.updated_at.is_(None), Queue.created_at > last_sync_timestamp)
                )
            )
            queue_result = await db.execute(queue_query)
            queue_items = queue_result.scalars().all()
            
            for queue_item in queue_items:
                server_updates['queue'].append({
                    'id': str(queue_item.id),
                    'appointment_id': str(queue_item.appointment_id),
                    'queue_number': queue_item.queue_number,
                    'priority': queue_item.priority,
                    'status': queue_item.status,
                    'estimated_wait_time': queue_item.estimated_wait_time,
                    'created_at': queue_item.created_at.isoformat(),
                    'updated_at': queue_item.updated_at.isoformat() if queue_item.updated_at else None
                })
                
        except Exception as e:
            logger.error(f"Error getting server updates: {str(e)}")
        
        return server_updates

    @staticmethod
    async def get_sync_status(
        db: AsyncSession,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Get current sync status for a user"""
        try:
            # Get counts of pending items
            pending_appointments = await db.execute(
                select(func.count(Appointment.id)).where(
                    and_(
                        Appointment.created_by == user_id,
                        Appointment.status.in_(['pending', 'confirmed'])
                    )
                )
            )
            
            pending_queue = await db.execute(
                select(func.count(Queue.id)).where(
                    Queue.status.in_(['waiting', 'in_progress'])
                )
            )
            
            return {
                'last_sync': datetime.utcnow().isoformat(),
                'pending_appointments': pending_appointments.scalar(),
                'pending_queue_items': pending_queue.scalar(),
                'sync_available': True
            }
            
        except Exception as e:
            logger.error(f"Error getting sync status: {str(e)}")
            return {
                'last_sync': None,
                'pending_appointments': 0,
                'pending_queue_items': 0,
                'sync_available': False,
                'error': str(e)
            }

    @staticmethod
    async def resolve_conflict(
        db: AsyncSession,
        user_id: UUID,
        conflict_id: str,
        resolution: str,
        resolution_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Resolve sync conflicts manually"""
        try:
            if resolution == 'use_server':
                # Keep server version, discard client changes
                return {'resolved': True, 'action': 'kept_server_version'}
            
            elif resolution == 'use_client':
                # Apply client changes, overwrite server
                conflict_type = resolution_data.get('type')
                
                if conflict_type == 'patient':
                    patient_id = UUID(conflict_id)
                    patient = await db.get(Patient, patient_id)
                    if patient:
                        for key, value in resolution_data['client_data'].items():
                            if hasattr(patient, key) and key not in ['id', 'created_at']:
                                setattr(patient, key, value)
                        patient.updated_at = datetime.utcnow()
                        patient.updated_by = user_id
                        await db.commit()
                
                elif conflict_type == 'appointment':
                    appointment_update = AppointmentUpdate(**resolution_data['client_data'])
                    await AppointmentService.update_appointment(
                        db, UUID(conflict_id), appointment_update
                    )
                
                elif conflict_type == 'queue':
                    queue_update = QueueUpdate(**resolution_data['client_data'])
                    
                    # Check if status is provided, otherwise skip update
                    if queue_update.status is not None:
                        await QueueService.update_queue_status(
                            db, UUID(conflict_id), queue_update.status, getattr(queue_update, "notes", None)
                        )
                
                return {'resolved': True, 'action': 'applied_client_version'}
            
            elif resolution == 'merge':
                # Custom merge logic would go here
                return {'resolved': True, 'action': 'merged_versions'}
            
            else:
                return {'resolved': False, 'error': 'Invalid resolution type'}
                
        except Exception as e:
            logger.error(f"Error resolving conflict {conflict_id}: {str(e)}")
            await db.rollback()
            return {'resolved': False, 'error': str(e)}