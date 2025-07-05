"""
Utility functions for handling timezone-aware datetime operations.
This module provides consistent datetime handling across the application.
"""

from datetime import datetime, timezone
from typing import Optional


def get_timezone_aware_now() -> datetime:
    """
    Get current timezone-aware datetime in UTC.
    
    Returns:
        datetime: Current timezone-aware datetime in UTC
    """
    return datetime.now(timezone.utc)


def make_timezone_aware(dt: datetime) -> datetime:
    """
    Make a datetime timezone-aware if it isn't already.
    
    Args:
        dt (datetime): The datetime to make timezone-aware
        
    Returns:
        datetime: Timezone-aware datetime in UTC
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def get_utc_datetime(year: int, month: int, day: int, 
                    hour: int = 0, minute: int = 0, second: int = 0, 
                    microsecond: int = 0) -> datetime:
    """
    Create a timezone-aware datetime in UTC.
    
    Args:
        year (int): Year
        month (int): Month
        day (int): Day
        hour (int, optional): Hour. Defaults to 0.
        minute (int, optional): Minute. Defaults to 0.
        second (int, optional): Second. Defaults to 0.
        microsecond (int, optional): Microsecond. Defaults to 0.
        
    Returns:
        datetime: Timezone-aware datetime in UTC
    """
    return datetime(year, month, day, hour, minute, second, microsecond, tzinfo=timezone.utc)


def format_datetime_for_display(dt: Optional[datetime]) -> Optional[str]:
    """
    Format a datetime for display purposes.
    
    Args:
        dt (Optional[datetime]): The datetime to format
        
    Returns:
        Optional[str]: Formatted datetime string or None
    """
    if dt is None:
        return None
    
    # Make sure it's timezone-aware
    dt = make_timezone_aware(dt)
    return dt.isoformat() 