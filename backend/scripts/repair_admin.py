#!/usr/bin/env python3
"""
Admin Repair Script for Hospital Queue Management System

This script helps diagnose and fix issues with admin users in the database.
It can list existing users and reset passwords.
"""

import sys
import asyncio
import argparse
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add the parent directory to path so we can import modules
sys.path.append('..')

try:
    from models import User, UserRole
    from api.core.security import get_password_hash
    from database import get_db, Base
except ImportError as e:
    print(f"Failed to import required modules: {e}")
    print("Make sure you run this script from the scripts directory")
    sys.exit(1)

async def list_users(engine):
    """List all users in the database"""
    print("\nListing all users in database:")
    
    async_session = sessionmaker(
        engine, expire_on_commit=False, class_=AsyncSession
    )
    
    async with async_session() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        
        if not users:
            print("No users found in database")
            return
            
        print(f"Found {len(users)} user(s):")
        for user in users:
            print(f"ID: {user.id}")
            print(f"Username: {user.username}")
            print(f"Email: {user.email}")
            print(f"Role: {user.role}")
            print(f"Is active: {user.is_active}")
            print(f"Created at: {user.created_at}")
            print("-" * 40)

async def reset_admin_password(engine, username, password):
    """Reset the password of an admin user"""
    print(f"\nResetting password for admin user '{username}'...")
    
    async_session = sessionmaker(
        engine, expire_on_commit=False, class_=AsyncSession
    )
    
    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ User '{username}' not found in database")
            return False
        
        if user.role != UserRole.ADMIN:
            print(f"❌ User '{username}' is not an admin (current role: {user.role})")
            return False
        
        # Update password
        user.password_hash = get_password_hash(password)
        user.is_active = True  # Ensure the user is active
        
        try:
            await session.commit()
            print(f"✅ Password for admin user '{username}' has been reset")
            print(f"   User ID: {user.id}")
            return True
        except Exception as e:
            await session.rollback()
            print(f"❌ Failed to update password: {e}")
            return False

async def create_admin_user(engine, username, password, email, first_name, last_name):
    """Create a new admin user"""
    print(f"\nCreating new admin user '{username}'...")
    
    async_session = sessionmaker(
        engine, expire_on_commit=False, class_=AsyncSession
    )
    
    async with async_session() as session:
        # Check if user already exists
        result = await session.execute(
            select(User).where(User.username == username)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"❌ Username '{username}' already exists")
            return False
            
        # Create new user
        user = User(
            username=username,
            password_hash=get_password_hash(password),
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=UserRole.ADMIN,
            is_active=True
        )
        
        try:
            session.add(user)
            await session.commit()
            await session.refresh(user)
            print(f"✅ Created new admin user '{username}'")
            print(f"   User ID: {user.id}")
            return True
        except Exception as e:
            await session.rollback()
            print(f"❌ Failed to create admin user: {e}")
            return False

async def delete_user_by_username(engine, username):
    """Delete a user by username"""
    print(f"\nDeleting user '{username}'...")
    
    async_session = sessionmaker(
        engine, expire_on_commit=False, class_=AsyncSession
    )
    
    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ User '{username}' not found in database")
            return False
        
        try:
            await session.delete(user)
            await session.commit()
            print(f"✅ User '{username}' has been deleted")
            return True
        except Exception as e:
            await session.rollback()
            print(f"❌ Failed to delete user: {e}")
            return False

async def main_async():
    parser = argparse.ArgumentParser(description="Hospital Queue Admin Repair")
    
    # Database connection options
    parser.add_argument("--db-url", default="postgresql+asyncpg://postgres:postgres@localhost/hospital", 
                        help="Database URL")
    
    # Action options
    parser.add_argument("--list", action="store_true", help="List all users")
    parser.add_argument("--reset", action="store_true", help="Reset admin password")
    parser.add_argument("--create", action="store_true", help="Create new admin user")
    parser.add_argument("--delete", action="store_true", help="Delete a user by username")
    parser.add_argument("--force", action="store_true", help="Force create admin (delete if exists)")
    
    # User details
    parser.add_argument("--username", default="admin", help="Admin username")
    parser.add_argument("--password", default="Admin123!", help="Admin password")
    parser.add_argument("--email", default="admin@example.com", help="Admin email")
    parser.add_argument("--first-name", default="Admin", help="Admin first name")
    parser.add_argument("--last-name", default="User", help="Admin last name")
    
    args = parser.parse_args()
    
    print("Hospital Queue Management System - Admin Repair Tool")
    print(f"Database URL: {args.db_url}")
    
    # Create database engine
    try:
        engine = create_async_engine(args.db_url, echo=False)
    except Exception as e:
        print(f"\n❌ Failed to connect to database: {e}")
        return
    
    # Determine action
    if args.list:
        await list_users(engine)
    
    elif args.reset:
        await reset_admin_password(engine, args.username, args.password)
    
    elif args.create:
        await create_admin_user(
            engine, 
            args.username, 
            args.password, 
            args.email, 
            args.first_name, 
            args.last_name
        )
    
    elif args.delete:
        await delete_user_by_username(engine, args.username)
    
    elif args.force:
        # Try to delete first if it exists, then create
        await delete_user_by_username(engine, args.username)
        await create_admin_user(
            engine,
            args.username,
            args.password,
            args.email,
            args.first_name, 
            args.last_name
        )
    
    else:
        # Default action if none specified
        await list_users(engine)
    
    await engine.dispose()

def main():
    asyncio.run(main_async())

if __name__ == "__main__":
    main() 