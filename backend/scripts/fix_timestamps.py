#!/usr/bin/env python
"""
Script to fix missing timestamps in database.
This adds created_at and updated_at timestamps to existing users that have NULL values.
"""
import asyncio
import sys
import os
from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import User, Patient, Doctor, Appointment, Queue, Notification
from api.core.config import settings
from database import get_db, Base

async def fix_timestamps():
    """Fix missing timestamps in database"""
    print("Starting to fix missing timestamps...")
    
    # Create an engine and session
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        # First, check if there are users with NULL timestamps
        async for session in get_db():
            try:
                # Check users with NULL created_at
                result = await session.execute(
                    select(User).where(User.created_at.is_(None))
                )
                users_without_created_at = result.scalars().all()
                
                if users_without_created_at:
                    print(f"Found {len(users_without_created_at)} users with NULL created_at")
                    
                    # Update each user
                    for user in users_without_created_at:
                        user.created_at = datetime.utcnow()
                        user.updated_at = datetime.utcnow()
                    
                    await session.commit()
                    print("Updated users with timestamps")
                else:
                    print("No users found with NULL created_at")
                    
                # Similarly check other entities if needed
                # For example:
                # result = await session.execute(
                #     select(Patient).where(Patient.created_at.is_(None))
                # )
                # patients_without_created_at = result.scalars().all()
                # 
                # if patients_without_created_at:
                #     print(f"Found {len(patients_without_created_at)} patients with NULL created_at")
                #     
                #     for patient in patients_without_created_at:
                #         patient.created_at = datetime.utcnow()
                #         patient.updated_at = datetime.utcnow()
                #     
                #     await session.commit()
                #     print("Updated patients with timestamps")
                    
                print("Timestamp fixing completed successfully")
                return True
                
            except Exception as e:
                print(f"Error updating timestamps: {e}")
                await session.rollback()
                return False
            finally:
                await session.close()

if __name__ == "__main__":
    asyncio.run(fix_timestamps()) 