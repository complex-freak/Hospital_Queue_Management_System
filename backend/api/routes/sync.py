from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
from datetime import datetime
from uuid import UUID

from database import get_db
from api.dependencies import get_current_user, RoleChecker
from models import User
from services.sync_service import SyncService
from services.audit_service import AuditService
from schemas import SyncRequest, SyncResponse, ConflictResolution

router = APIRouter()

@router.post("/offline-data", response_model=SyncResponse)
async def sync_offline_data(
    sync_request: SyncRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sync offline data from client to server
    """
    try:
        # Parse last sync timestamp if provided
        last_sync_timestamp = None
        if sync_request.last_sync_timestamp:
            last_sync_timestamp = datetime.fromisoformat(sync_request.last_sync_timestamp)
        
        # Perform sync
        sync_results = await SyncService.sync_offline_data(
            db=db,
            user_id=current_user.id,
            sync_data=sync_request.data,
            last_sync_timestamp=last_sync_timestamp
        )
        
        # Log sync operation in background
        background_tasks.add_task(
            AuditService.log_event,
            db=db,
            user_id=current_user.id,
            action="sync_offline_data",
            resource_type="sync",
            resource_id=str(current_user.id),
            details={
                "processed_items": sync_results['processed'],
                "errors_count": len(sync_results['errors']),
                "conflicts_count": len(sync_results['conflicts'])
            }
        )
        
        return SyncResponse(
            success=sync_results['success'],
            processed=sync_results['processed'],
            errors=sync_results['errors'],
            conflicts=sync_results['conflicts'],
            server_updates=sync_results['server_updates'],
            sync_timestamp=sync_results['sync_timestamp']
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Sync operation failed: {str(e)}"
        )

@router.get("/status")
async def get_sync_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current sync status for the user
    """
    try:
        sync_status = await SyncService.get_sync_status(
            db=db,
            user_id=current_user.id
        )
        
        return sync_status
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get sync status: {str(e)}"
        )

@router.post("/resolve-conflict")
async def resolve_conflict(
    conflict_resolution: ConflictResolution,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Resolve sync conflicts manually
    """
    try:
        result = await SyncService.resolve_conflict(
            db=db,
            user_id=current_user.id,
            conflict_id=conflict_resolution.conflict_id,
            resolution=conflict_resolution.resolution,
            resolution_data=conflict_resolution.resolution_data
        )
        
        # Log conflict resolution in background
        background_tasks.add_task(
            AuditService.log_event,
            db=db,
            user_id=current_user.id,
            action="resolve_sync_conflict",
            resource_type="sync",
            resource_id=conflict_resolution.conflict_id,
            details={
                "resolution": conflict_resolution.resolution,
                "success": result['resolved']
            }
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to resolve conflict: {str(e)}"
        )

@router.get("/server-updates")
async def get_server_updates(
    last_sync: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get server updates since last sync timestamp
    """
    try:
        last_sync_timestamp = None
        if last_sync:
            last_sync_timestamp = datetime.fromisoformat(last_sync)
        
        server_updates = await SyncService._get_server_updates(
            db=db,
            user_id=current_user.id,
            last_sync_timestamp=last_sync_timestamp or datetime.min
        )
        
        return {
            "updates": server_updates,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get server updates: {str(e)}"
        )

# Staff-only endpoints
@router.post("/force-sync", dependencies=[Depends(RoleChecker(["staff", "admin"]))])
async def force_sync_all_data(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Force sync all data (staff/admin only)
    """
    try:
        # This would implement a full data sync
        # For now, return sync status
        sync_status = await SyncService.get_sync_status(
            db=db,
            user_id=current_user.id
        )
        
        # Log force sync operation
        background_tasks.add_task(
            AuditService.log_event,
            db=db,
            user_id=current_user.id,
            action="force_sync",
            resource_type="sync",
            resource_id=str(current_user.id),
            details={"sync_status": sync_status}
        )
        
        return {
            "message": "Force sync initiated",
            "status": sync_status
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Force sync failed: {str(e)}"
        )