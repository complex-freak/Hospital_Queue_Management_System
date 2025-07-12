from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import datetime

from database import get_db
from models import User, Patient, Notification as NotificationModel, NotificationType, DeviceToken
from schemas import NotificationUpdate, Notification
from services.notification_service import notification_service
from api.dependencies import get_current_user, log_audit_event

router = APIRouter()

@router.put("/{notification_id}/read", response_model=Notification)
async def mark_notification_read(
    notification_id: UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a notification as read"""
    try:
        # Get the notification
        notification = await notification_service.mark_notification_as_read(db, notification_id)
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        # Check if the user has permission to mark this notification as read
        user_id = UUID(current_user["sub"]) if "sub" in current_user else None
        user_type = current_user.get("user_type", "user")
        
        if user_type == "patient":
            if notification.patient_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to mark this notification as read"
                )
        elif user_type == "user":
            if notification.user_id != user_id:
                # Staff can mark any notification as read
                pass
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=user_id,
            user_type=user_type,
            action="update",
            resource="notification",
            resource_id=notification.id,
            details=f"{user_type.capitalize()} marked notification as read"
        )
        
        return notification
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark notification as read: {str(e)}"
        )


@router.put("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark all notifications as read for the current user"""
    try:
        user_id = UUID(current_user["sub"]) if "sub" in current_user else None
        user_type = current_user.get("user_type", "user")
        
        if user_type == "patient":
            # For patients, we need to get their notifications and mark them as read
            # This is a simplified implementation - you might want to add a bulk mark as read method
            count = 0  # TODO: Implement bulk mark as read for patients
        else:
            # For staff users, we can mark all their notifications as read
            count = 0  # TODO: Implement bulk mark as read for users
        
        # Log audit event
        background_tasks.add_task(
            log_audit_event,
            request=request,
            user_id=user_id,
            user_type=user_type,
            action="update",
            resource="notification",
            details=f"{user_type.capitalize()} marked {count} notifications as read"
        )
        
        return {"message": f"Marked {count} notifications as read"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark all notifications as read: {str(e)}"
        ) 