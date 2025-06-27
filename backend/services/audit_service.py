from typing import Optional, Dict, Any, List, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, insert, delete
from datetime import timedelta
from uuid import UUID
from datetime import datetime, date
import json
import logging
from fastapi import Request

from models import AuditLog, User, Patient, AuditAction, AuditResource
from schemas import AuditLogCreate

logger = logging.getLogger(__name__)


class AuditService:
    @staticmethod
    async def log_event(
        db: AsyncSession,
        action: str,
        resource: str,
        resource_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        patient_id: Optional[UUID] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> Any:
        """Log an audit event"""
        try:
            audit_values = {
                "action": action,
                "resource": resource,
                "resource_id": resource_id,
                "user_id": user_id,
                "user_type": "user" if user_id else "patient" if patient_id else "system",
                "details": json.dumps(details or {}),
                "ip_address": ip_address,
                "user_agent": user_agent
            }
            
            result = await db.execute(insert(AuditLog).values(**audit_values).returning(AuditLog))
            audit_log = result.scalar_one()
            await db.commit()
            
            logger.info(f"Audit event logged: {action} on {resource} by user {user_id}")
            
            return audit_log
            
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            # Don't raise exception to avoid breaking the main operation
            # Return empty dict as AuditLog
            return {}
    
    @staticmethod
    async def log_login_attempt(
        db: AsyncSession,
        username: str,
        success: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        user_id: Optional[UUID] = None,
        error_message: Optional[str] = None
    ):
        """Log login attempt"""
        await AuditService.log_event(
            db=db,
            action=AuditAction.LOGIN,
            resource=AuditResource.USER,
            user_id=user_id,
            details={
                'username': username,
                'login_time': datetime.utcnow().isoformat()
            },
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            error_message=error_message
        )
    
    @staticmethod
    async def log_logout(
        db: AsyncSession,
        user_id: UUID,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log logout event"""
        await AuditService.log_event(
            db=db,
            action=AuditAction.LOGOUT,
            resource=AuditResource.USER,
            user_id=user_id,
            details={
                'logout_time': datetime.utcnow().isoformat()
            },
            ip_address=ip_address,
            user_agent=user_agent,
            success=True
        )
    
    @staticmethod
    async def log_patient_registration(
        db: AsyncSession,
        patient_id: UUID,
        created_by_user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log patient registration"""
        await AuditService.log_event(
            db=db,
            action=AuditAction.CREATE,
            resource=AuditResource.PATIENT,
            resource_id=patient_id,
            user_id=created_by_user_id,
            patient_id=patient_id,
            details={
                'registration_time': datetime.utcnow().isoformat()
            },
            ip_address=ip_address,
            user_agent=user_agent,
            success=True
        )
    
    @staticmethod
    async def log_appointment_booking(
        db: AsyncSession,
        appointment_id: UUID,
        patient_id: UUID,
        doctor_id: Optional[UUID] = None,
        created_by_user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log appointment booking"""
        await AuditService.log_event(
            db=db,
            action=AuditAction.CREATE,
            resource=AuditResource.APPOINTMENT,
            resource_id=appointment_id,
            user_id=created_by_user_id,
            patient_id=patient_id,
            details={
                'doctor_id': str(doctor_id) if doctor_id else None,
                'booking_time': datetime.utcnow().isoformat()
            },
            ip_address=ip_address,
            user_agent=user_agent,
            success=True
        )
    
    @staticmethod
    async def log_queue_management(
        db: AsyncSession,
        action: AuditAction,
        queue_id: UUID,
        patient_id: UUID,
        user_id: UUID,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log queue management actions"""
        await AuditService.log_event(
            db=db,
            action=action,
            resource=AuditResource.QUEUE,
            resource_id=queue_id,
            user_id=user_id,
            patient_id=patient_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
            success=True
        )
    
    @staticmethod
    async def log_user_management(
        db: AsyncSession,
        action: AuditAction,
        target_user_id: UUID,
        performed_by_user_id: UUID,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log user management actions"""
        await AuditService.log_event(
            db=db,
            action=action,
            resource=AuditResource.USER,
            resource_id=target_user_id,
            user_id=performed_by_user_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
            success=True
        )
    
    @staticmethod
    async def log_data_access(
        db: AsyncSession,
        resource: AuditResource,
        resource_id: UUID,
        user_id: UUID,
        action: AuditAction = AuditAction.READ,
        patient_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log data access events"""
        await AuditService.log_event(
            db=db,
            action=action,
            resource=resource,
            resource_id=resource_id,
            user_id=user_id,
            patient_id=patient_id,
            details={
                'access_time': datetime.utcnow().isoformat()
            },
            ip_address=ip_address,
            user_agent=user_agent,
            success=True
        )
    
    @staticmethod
    async def log_security_event(
        db: AsyncSession,
        event_type: str,
        description: str,
        user_id: Optional[UUID] = None,
        severity: str = "medium",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = False
    ):
        """Log security events"""
        await AuditService.log_event(
            db=db,
            action="SECURITY_EVENT",
            resource=AuditResource.SYSTEM,
            user_id=user_id,
            details={
                'event_type': event_type,
                'description': description,
                'severity': severity,
                'timestamp': datetime.utcnow().isoformat()
            },
            ip_address=ip_address,
            user_agent=user_agent,
            success=success
        )
    
    @staticmethod
    async def log_system_event(
        db: AsyncSession,
        event_type: str,
        description: str,
        details: Optional[Dict[str, Any]] = None,
        success: bool = True
    ):
        """Log system events"""
        await AuditService.log_event(
            db=db,
            action="SYSTEM_EVENT",
            resource=AuditResource.SYSTEM,
            details={
                'event_type': event_type,
                'description': description,
                'timestamp': datetime.utcnow().isoformat(),
                **(details or {})
            },
            success=success
        )
    
    @staticmethod
    async def get_audit_logs(
        db: AsyncSession,
        user_id: Optional[UUID] = None,
        patient_id: Optional[UUID] = None,
        resource: Optional[AuditResource] = None,
        action: Optional[AuditAction] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        success: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditLog]:
        """Get audit logs with filters"""
        query = select(AuditLog)
        
        conditions = []
        
        if user_id:
            conditions.append(AuditLog.user_id == user_id)
        if patient_id:
            conditions.append(AuditLog.user_id == patient_id)
            conditions.append(AuditLog.user_type == "patient")
        if resource:
            conditions.append(AuditLog.resource == resource)
        if action:
            conditions.append(AuditLog.action == action)
        if start_date:
            conditions.append(AuditLog.created_at >= start_date)
        if end_date:
            conditions.append(AuditLog.created_at <= end_date)
        # Success field not in model, so we skip this filter
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_user_activity_summary(
        db: AsyncSession,
        user_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get user activity summary"""
        query = select(AuditLog).where(AuditLog.user_id == user_id)
        
        if start_date:
            query = query.where(AuditLog.created_at >= start_date)
        if end_date:
            query = query.where(AuditLog.created_at <= end_date)
        
        # Total activities
        total_result = await db.execute(
            select(func.count(AuditLog.id)).select_from(query.subquery())
        )
        total_activities = total_result.scalar() or 0
        
        # Activities by action
        action_result = await db.execute(
            select(AuditLog.action, func.count(AuditLog.id))
            .select_from(query.subquery())
            .group_by(AuditLog.action)
        )
        action_counts = dict(action_result.all())
        
        # Activities by resource
        resource_result = await db.execute(
            select(AuditLog.resource, func.count(AuditLog.id))
            .select_from(query.subquery())
            .group_by(AuditLog.resource)
        )
        resource_counts = dict(resource_result.all())
        
        # Success rate
        success_result = await db.execute(
            select(func.count(AuditLog.id))
            .select_from(query.subquery())
        )
        successful_activities = success_result.scalar() or 0
        
        # Last activity
        last_activity_result = await db.execute(
            query.order_by(AuditLog.created_at.desc()).limit(1)
        )
        last_activity = last_activity_result.scalar_one_or_none()
        
        return {
            'user_id': str(user_id),
            'total_activities': total_activities,
            'successful_activities': successful_activities,
            'success_rate': (
                successful_activities / total_activities * 100
                if total_activities > 0 else 0
            ),
            'activities_by_action': {k.value: v for k, v in action_counts.items()},
            'activities_by_resource': {k.value: v for k, v in resource_counts.items()},
            'last_activity_at': last_activity.created_at.isoformat() if last_activity else None
        }
    
    @staticmethod
    async def get_security_events(
        db: AsyncSession,
        severity: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditLog]:
        """Get security events"""
        query = select(AuditLog).where(AuditLog.action == "SECURITY_EVENT")
        
        conditions = []
        
        if severity:
            conditions.append(AuditLog.details['severity'].astext == severity)
        if start_date:
            conditions.append(AuditLog.created_at >= start_date)
        if end_date:
            conditions.append(AuditLog.created_at <= end_date)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_failed_operations(
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditLog]:
        """Get failed operations"""
        query = select(AuditLog).where(AuditLog.details.like('%"error"%'))
        
        if start_date:
            query = query.where(AuditLog.created_at >= start_date)
        if end_date:
            query = query.where(AuditLog.created_at <= end_date)
        
        query = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    def extract_client_info(request: Request) -> Dict[str, str]:
        """Extract client IP and user agent from request"""
        # Get real IP address (considering proxies)
        ip_address = request.headers.get("X-Forwarded-For")
        if ip_address:
            ip_address = ip_address.split(",")[0].strip()
        else:
            ip_address = request.headers.get("X-Real-IP")
        if not ip_address:
            ip_address = request.client.host if request.client else "unknown"
        
        user_agent = request.headers.get("User-Agent", "unknown")
        
        return {
            'ip_address': ip_address,
            'user_agent': user_agent
        }
    
    @staticmethod
    async def cleanup_old_logs(
        db: AsyncSession,
        days_to_keep: int = 90
    ) -> int:
        """Clean up old audit logs"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        result = await db.execute(
            select(func.count(AuditLog.id)).where(AuditLog.created_at < cutoff_date)
        )
        count_to_delete = result.scalar() or 0
        
        if count_to_delete > 0:
            await db.execute(
                delete(AuditLog).where(AuditLog.created_at < cutoff_date)
            )
            await db.commit()
            
            logger.info(f"Cleaned up {count_to_delete} old audit logs")
        
        return count_to_delete