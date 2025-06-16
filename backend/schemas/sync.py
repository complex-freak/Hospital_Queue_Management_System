from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime
from uuid import UUID

class SyncRequest(BaseModel):
    """Request model for syncing offline data"""
    data: Dict[str, Any] = Field(..., description="Offline data to sync")
    last_sync_timestamp: Optional[datetime] = Field(None, description="Last sync timestamp")
    device_id: Optional[str] = Field(None, description="Device identifier for conflict resolution")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class SyncConflict(BaseModel):
    """Model for sync conflicts"""
    entity_type: str = Field(..., description="Type of entity (appointment, patient, etc.)")
    entity_id: UUID = Field(..., description="ID of the conflicting entity")
    local_version: Dict[str, Any] = Field(..., description="Local version of the data")
    server_version: Dict[str, Any] = Field(..., description="Server version of the data")
    conflict_reason: str = Field(..., description="Reason for the conflict")

class SyncResolution(BaseModel):
    """Model for resolving sync conflicts"""
    entity_type: str = Field(..., description="Type of entity")
    entity_id: UUID = Field(..., description="ID of the entity")
    resolution: str = Field(..., description="Resolution strategy: 'use_local', 'use_server', 'merge'")
    merged_data: Optional[Dict[str, Any]] = Field(None, description="Merged data if resolution is 'merge'")

class SyncResponse(BaseModel):
    """Response model for sync operations"""
    success: bool = Field(..., description="Whether sync was successful")
    conflicts: List[SyncConflict] = Field(default_factory=list, description="List of conflicts found")
    updated_data: Dict[str, Any] = Field(default_factory=dict, description="Data updated on server")
    sync_timestamp: datetime = Field(default_factory=datetime.utcnow, description="Current sync timestamp")
    message: str = Field("Sync completed", description="Sync status message")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class OfflineQueueUpdate(BaseModel):
    """Model for offline queue updates"""
    queue_id: UUID = Field(..., description="Queue entry ID")
    action: str = Field(..., description="Action performed: 'create', 'update', 'delete'")
    data: Dict[str, Any] = Field(..., description="Queue data")
    timestamp: datetime = Field(..., description="When action was performed offline")

class OfflineAppointmentUpdate(BaseModel):
    """Model for offline appointment updates"""
    appointment_id: Optional[UUID] = Field(None, description="Appointment ID (None for new)")
    action: str = Field(..., description="Action performed: 'create', 'update', 'cancel'")
    data: Dict[str, Any] = Field(..., description="Appointment data")
    timestamp: datetime = Field(..., description="When action was performed offline")

class OfflinePatientUpdate(BaseModel):
    """Model for offline patient updates"""
    patient_id: UUID = Field(..., description="Patient ID")
    action: str = Field(..., description="Action performed: 'update'")
    data: Dict[str, Any] = Field(..., description="Patient data")
    timestamp: datetime = Field(..., description="When action was performed offline")

class BatchSyncRequest(BaseModel):
    """Request model for batch syncing offline data"""
    queue_updates: List[OfflineQueueUpdate] = Field(default_factory=list)
    appointment_updates: List[OfflineAppointmentUpdate] = Field(default_factory=list)
    patient_updates: List[OfflinePatientUpdate] = Field(default_factory=list)
    device_id: str = Field(..., description="Device identifier")
    last_sync_timestamp: Optional[datetime] = Field(None)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class BatchSyncResponse(BaseModel):
    """Response model for batch sync operations"""
    success: bool = Field(..., description="Overall sync success")
    processed_updates: int = Field(..., description="Number of updates processed")
    conflicts: List[SyncConflict] = Field(default_factory=list)
    failed_updates: List[Dict[str, Any]] = Field(default_factory=list)
    sync_timestamp: datetime = Field(default_factory=datetime.utcnow)
    message: str = Field("Batch sync completed")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }