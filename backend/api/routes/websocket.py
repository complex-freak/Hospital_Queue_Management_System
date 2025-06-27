from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Dict, List, Optional
import json
import logging
from uuid import UUID
from jose import jwt, JWTError
from api.core.config import settings
from api.core.security import ALGORITHM  # Import ALGORITHM from security.py
# from api.core.security import oauth2_scheme

router = APIRouter()

# Store active connections
active_connections: Dict[str, List[WebSocket]] = {}
logger = logging.getLogger(__name__)

async def get_user_from_token(token: str):
    """Verify JWT token and return user info"""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            return None
        return {"user_id": user_id, "payload": payload}
    except JWTError:
        return None

@router.websocket("/notifications")
async def websocket_endpoint(
    websocket: WebSocket, 
    user_id: str = Query(...), 
    token: str = Query(...)
):
    """WebSocket endpoint for real-time notifications"""
    # Verify token
    user_data = await get_user_from_token(token)
    
    if not user_data:
        logger.error(f"WebSocket authentication failed: Invalid token")
        await websocket.close(code=1008, reason="Authentication failed")
        return
    
    # Extract token user_id
    token_user_id = user_data["user_id"]
    
    # Log the IDs for debugging
    logger.info(f"WebSocket connection attempt - URL user_id: {user_id}, Token user_id: {token_user_id}")
    
    # Compare user IDs - allow connection if either matches
    # This handles cases where one might be a string and one a UUID
    if str(user_id) != str(token_user_id):
        logger.error(f"WebSocket authentication failed: User ID mismatch")
        await websocket.close(code=1008, reason="Authentication failed: User ID mismatch")
        return
    
    # Accept the connection
    await websocket.accept()
    
    # Add to active connections
    if user_id not in active_connections:
        active_connections[user_id] = []
    active_connections[user_id].append(websocket)
    
    logger.info(f"WebSocket connection established for user {user_id}")
    
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "connection_status",
            "status": "connected",
            "message": "Connected to notification service"
        })
        
        # Listen for messages
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                # Process message if needed
                await websocket.send_json({
                    "type": "acknowledgment",
                    "message": "Message received"
                })
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON format"
                })
    except WebSocketDisconnect:
        # Remove from active connections
        if user_id in active_connections:
            active_connections[user_id].remove(websocket)
            if not active_connections[user_id]:
                del active_connections[user_id]
        logger.info(f"WebSocket connection closed for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        if user_id in active_connections and websocket in active_connections[user_id]:
            active_connections[user_id].remove(websocket)
            if not active_connections[user_id]:
                del active_connections[user_id]

async def send_notification_to_user(user_id: str, notification: dict):
    """Send notification to user via WebSocket"""
    if user_id in active_connections:
        for connection in active_connections[user_id]:
            try:
                await connection.send_json({
                    "type": "notification",
                    "title": notification.get("title", "New Notification"),
                    "message": notification.get("message", ""),
                    "notification_type": notification.get("notification_type", "info"),
                    "data": notification.get("data", {})
                })
            except Exception as e:
                logger.error(f"Failed to send notification: {str(e)}") 