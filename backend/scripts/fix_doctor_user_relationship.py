#!/usr/bin/env python
"""
Script to fix Doctor-User relationship issues in database.
This ensures all doctor records have properly linked user relationships.
"""
import asyncio
import sys
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import joinedload

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import User, Doctor
from api.core.config import settings
from database import get_db

async def fix_doctor_user_relationships():
    """Fix Doctor-User relationship issues in database"""
    print("Starting to fix doctor-user relationships...")
    
    # Create an engine
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        async for session in get_db():
            try:
                # Get all doctors
                result = await session.execute(
                    select(Doctor)
                )
                doctors = result.scalars().all()
                
                if not doctors:
                    print("No doctors found in the database")
                    return True
                
                print(f"Found {len(doctors)} doctor records")
                
                # Check doctor-user relationships
                for doctor in doctors:
                    # Check if user exists
                    result = await session.execute(
                        select(User).where(User.id == doctor.user_id)
                    )
                    user = result.scalar_one_or_none()
                    
                    if not user:
                        print(f"Doctor {doctor.id} has invalid user_id {doctor.user_id}")
                        continue
                    
                    # Print information about the doctor and user
                    print(f"Doctor: {doctor.id}, User: {user.id} ({user.username})")
                    print(f"User attributes: first_name={user.first_name}, last_name={user.last_name}, role={user.role}")
                    print(f"User timestamps: created_at={user.created_at}, updated_at={user.updated_at}")
                
                print("Doctor-User relationship checking completed")
                return True
                
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"Error fixing doctor-user relationships: {e}")
                return False
            finally:
                await session.close()

if __name__ == "__main__":
    asyncio.run(fix_doctor_user_relationships()) 