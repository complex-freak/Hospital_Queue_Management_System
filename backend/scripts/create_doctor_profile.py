#!/usr/bin/env python
"""
Script to create missing doctor profiles for users with doctor role.
"""
import asyncio
import sys
import os
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import User, Doctor, UserRole
from api.core.config import settings
from database import get_db

async def create_missing_doctor_profiles():
    """Create missing doctor profiles for users with doctor role"""
    print("Creating doctor profiles for users with doctor role...")
    
    # Create engine
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        async for session in get_db():
            try:
                # Find users with doctor role
                result = await session.execute(
                    select(User).where(User.role == UserRole.DOCTOR)
                )
                doctor_users = result.scalars().all()
                
                if not doctor_users:
                    print("No users with doctor role found in the database")
                    return True
                
                print(f"Found {len(doctor_users)} users with doctor role")
                
                # Check if they have doctor profiles and create if missing
                for user in doctor_users:
                    # Check if doctor profile exists
                    result = await session.execute(
                        select(Doctor).where(Doctor.user_id == user.id)
                    )
                    doctor = result.scalar_one_or_none()
                    
                    if doctor:
                        print(f"Doctor profile already exists for user {user.username} ({user.id})")
                        continue
                    
                    # Create doctor profile
                    print(f"Creating doctor profile for user {user.username} ({user.id})")
                    doctor = Doctor(
                        id=uuid.uuid4(),
                        user_id=user.id,
                        specialization="General Medicine",  # Default values
                        department="General Practice",
                        is_available=True
                    )
                    
                    session.add(doctor)
                    await session.commit()
                    print(f"Created doctor profile with ID {doctor.id}")
                
                print("Doctor profile creation completed")
                return True
                
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"Error creating doctor profiles: {e}")
                await session.rollback()
                return False
            finally:
                await session.close()

if __name__ == "__main__":
    asyncio.run(create_missing_doctor_profiles()) 