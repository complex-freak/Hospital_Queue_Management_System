#!/usr/bin/env python3
"""
Seed script for the Queue Management System
Creates sample data for development and testing
"""

import asyncio
import sys
from pathlib import Path
from faker import Faker
from datetime import datetime, timedelta
import random

# Add the parent directory to the path to import our modules
sys.path.append(str(Path(__file__).parent.parent))

from database import get_db, engine
from models import (
    Patient, User, Doctor, Appointment, Queue, 
    Notification, AuditLog, UserRole, AppointmentStatus, 
    QueueStatus, NotificationType, AuditLogAction
)
from core.security import get_password_hash
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

fake = Faker()

class DatabaseSeeder:
    def __init__(self):
        self.session: AsyncSession = None
        self.patients = []
        self.users = []
        self.doctors = []
        self.appointments = []
        
    async def seed_all(self):
        """Main seeding function"""
        async with engine.begin() as conn:
            # Create tables if they don't exist
            from models import Base
            await conn.run_sync(Base.metadata.create_all)
        
        async for session in get_db():
            self.session = session
            try:
                print("🌱 Starting database seeding...")
                
                # Check if data already exists
                if await self._check_existing_data():
                    print("📊 Database already contains data. Skipping seeding.")
                    return
                
                # Seed in order due to dependencies
                await self._seed_patients()
                await self._seed_users()
                await self._seed_doctors()
                await self._seed_appointments()
                await self._seed_queue()
                await self._seed_notifications()
                await self._seed_audit_logs()
                
                await session.commit()
                print("✅ Database seeding completed successfully!")
                
            except Exception as e:
                await session.rollback()
                print(f"❌ Error during seeding: {e}")
                raise
            finally:
                await session.close()
    
    async def _check_existing_data(self) -> bool:
        """Check if database already has data"""
        result = await self.session.execute(select(Patient).limit(1))
        return result.first() is not None
    
    async def _seed_patients(self):
        """Create sample patients"""
        print("👥 Creating patients...")
        
        # Create 50 sample patients
        for i in range(50):
            patient = Patient(
                phone_number=f"+255{fake.random_int(min=700000000, max=799999999)}",
                password_hash=get_password_hash("password123"),
                first_name=fake.first_name(),
                last_name=fake.last_name(),
                date_of_birth=fake.date_of_birth(minimum_age=18, maximum_age=80),
                gender=random.choice(["male", "female"]),
                address=fake.address(),
                emergency_contact=f"+255{fake.random_int(min=700000000, max=799999999)}",
                medical_history=fake.text(max_nb_chars=200) if random.choice([True, False]) else None,
                created_at=fake.date_time_between(start_date="-1y", end_date="now")
            )
            self.session.add(patient)
            self.patients.append(patient)
        
        await self.session.flush()  # Get IDs without committing
        print(f"✅ Created {len(self.patients)} patients")
    
    async def _seed_users(self):
        """Create sample staff users"""
        print("👨‍💼 Creating staff users...")
        
        # Create admin user
        admin = User(
            username="admin",
            password_hash=get_password_hash("admin123"),
            email="admin@hospital.com",
            first_name="System",
            last_name="Administrator",
            role=UserRole.ADMIN,
            is_active=True,
            created_at=datetime.utcnow()
        )
        self.session.add(admin)
        self.users.append(admin)
        
        # Create receptionist users
        for i in range(5):
            receptionist = User(
                username=f"receptionist{i+1}",
                password_hash=get_password_hash("password123"),
                email=f"receptionist{i+1}@hospital.com",
                first_name=fake.first_name(),
                last_name=fake.last_name(),
                role=UserRole.RECEPTIONIST,
                is_active=True,
                created_at=fake.date_time_between(start_date="-6m", end_date="now")
            )
            self.session.add(receptionist)
            self.users.append(receptionist)
        
        # Create doctor users
        for i in range(10):
            doctor_user = User(
                username=f"doctor{i+1}",
                password_hash=get_password_hash("password123"),
                email=f"doctor{i+1}@hospital.com",
                first_name=fake.first_name(),
                last_name=fake.last_name(),
                role=UserRole.DOCTOR,
                is_active=True,
                created_at=fake.date_time_between(start_date="-6m", end_date="now")
            )
            self.session.add(doctor_user)
            self.users.append(doctor_user)
        
        await self.session.flush()
        print(f"✅ Created {len(self.users)} staff users")
    
    async def _seed_doctors(self):
        """Create doctor profiles"""
        print("👨‍⚕️ Creating doctor profiles...")
        
        specializations = [
            "General Medicine", "Cardiology", "Dermatology", 
            "Pediatrics", "Orthopedics", "Neurology",
            "Gynecology", "Psychiatry", "Radiology", "Surgery"
        ]
        
        doctor_users = [u for u in self.users if u.role == UserRole.DOCTOR]
        
        for i, user in enumerate(doctor_users):
            doctor = Doctor(
                user_id=user.id,
                specialization=specializations[i],
                license_number=f"LIC{fake.random_int(min=10000, max=99999)}",
                years_of_experience=fake.random_int(min=1, max=30),
                consultation_fee=fake.random_int(min=20000, max=100000),  # Tanzanian Shillings
                is_available=random.choice([True, False]),
                created_at=user.created_at
            )
            self.session.add(doctor)
            self.doctors.append(doctor)
        
        await self.session.flush()
        print(f"✅ Created {len(self.doctors)} doctor profiles")
    
    async def _seed_appointments(self):
        """Create sample appointments"""
        print("📅 Creating appointments...")
        
        # Get receptionists for created_by field
        receptionists = [u for u in self.users if u.role == UserRole.RECEPTIONIST]
        
        # Create appointments for the past week and next week
        for i in range(100):
            # Random date within 2 weeks (past and future)
            appointment_date = fake.date_time_between(
                start_date="-1w", 
                end_date="+1w"
            )
            
            appointment = Appointment(
                patient_id=random.choice(self.patients).id,
                doctor_id=random.choice(self.doctors).id if self.doctors else None,
                appointment_date=appointment_date,
                reason=fake.sentence(nb_words=6),
                urgency_level=random.choice([1, 2, 3, 4, 5]),
                status=random.choice(list(AppointmentStatus)),
                notes=fake.text(max_nb_chars=150) if random.choice([True, False]) else None,
                created_by=random.choice(receptionists).id if receptionists else None,
                created_at=fake.date_time_between(start_date="-1w", end_date="now")
            )
            self.session.add(appointment)
            self.appointments.append(appointment)
        
        await self.session.flush()
        print(f"✅ Created {len(self.appointments)} appointments")
    
    async def _seed_queue(self):
        """Create queue entries"""
        print("🔢 Creating queue entries...")
        
        # Create queue entries for today's appointments
        today_appointments = [
            apt for apt in self.appointments 
            if apt.appointment_date.date() == datetime.now().date()
        ]
        
        for i, appointment in enumerate(today_appointments[:20]):  # Limit to 20 for demo
            queue_entry = Queue(
                appointment_id=appointment.id,
                queue_number=i + 1,
                priority_score=appointment.urgency_level * 10 + random.randint(1, 9),
                status=random.choice(list(QueueStatus)),
                estimated_time=datetime.now() + timedelta(minutes=(i * 15)),
                created_at=appointment.created_at
            )
            
            # Set served_at for completed entries
            if queue_entry.status == QueueStatus.SERVED:
                queue_entry.served_at = fake.date_time_between(
                    start_date=queue_entry.created_at,
                    end_date="now"
                )
            
            self.session.add(queue_entry)
        
        await self.session.flush()
        print(f"✅ Created queue entries for today's appointments")
    
    async def _seed_notifications(self):
        """Create sample notifications"""
        print("📱 Creating notifications...")
        
        notification_types = list(NotificationType)
        
        # Create notifications for recent appointments
        recent_appointments = [
            apt for apt in self.appointments 
            if apt.created_at >= datetime.now() - timedelta(days=7)
        ]
        
        for appointment in recent_appointments[:30]:  # Limit for demo
            for _ in range(random.randint(1, 3)):  # 1-3 notifications per appointment
                notification = Notification(
                    patient_id=appointment.patient_id,
                    appointment_id=appointment.id,
                    type=random.choice(notification_types),
                    title=fake.sentence(nb_words=4),
                    message=fake.text(max_nb_chars=100),
                    sent_at=fake.date_time_between(
                        start_date=appointment.created_at,
                        end_date="now"
                    ),
                    is_read=random.choice([True, False]),
                    created_at=appointment.created_at
                )
                self.session.add(notification)
        
        await self.session.flush()
        print("✅ Created sample notifications")
    
    async def _seed_audit_logs(self):
        """Create audit log entries"""
        print("📋 Creating audit logs...")
        
        actions = list(AuditLogAction)
        
        # Create audit logs for various actions
        for _ in range(200):
            audit_log = AuditLog(
                user_id=random.choice(self.users).id,
                action=random.choice(actions),
                resource_type=random.choice([
                    "patient", "appointment", "queue", "user", "doctor"
                ]),
                resource_id=str(fake.uuid4()),
                ip_address=fake.ipv4(),
                user_agent=fake.user_agent(),
                details=fake.json(),
                created_at=fake.date_time_between(start_date="-1m", end_date="now")
            )
            self.session.add(audit_log)
        
        await self.session.flush()
        print("✅ Created audit log entries")

async def main():
    """Main function"""
    seeder = DatabaseSeeder()
    await seeder.seed_all()

if __name__ == "__main__":
    print("🚀 Queue Management System - Database Seeder")
    print("=" * 50)
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n❌ Seeding interrupted by user")
    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        sys.exit(1)