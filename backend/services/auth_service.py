from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from models import Patient, User, Doctor
from schemas import PatientCreate, UserCreate, DoctorCreate, UserUpdate, DoctorUpdate
from api.core.security import get_password_hash, verify_password


class AuthService:
    @staticmethod
    async def register_patient(db: AsyncSession, patient_data: PatientCreate) -> Patient:
        """Register a new patient"""
        # Check if phone number already exists
        result = await db.execute(
            select(Patient).where(Patient.phone_number == patient_data.phone_number)
        )
        existing_patient = result.scalar_one_or_none()
        
        if existing_patient:
            raise ValueError("Phone number already registered")
        
        # Hash password
        hashed_password = get_password_hash(patient_data.password)
        
        # Create patient
        patient = Patient(
            phone_number=patient_data.phone_number,
            password_hash=hashed_password,
            first_name=patient_data.first_name,
            last_name=patient_data.last_name,
            email=patient_data.email,
            date_of_birth=patient_data.date_of_birth,
            gender=patient_data.gender,
            address=patient_data.address,
            emergency_contact=patient_data.emergency_contact
        )
        
        db.add(patient)
        await db.commit()
        await db.refresh(patient)
        
        return patient
    
    @staticmethod
    async def authenticate_patient(db: AsyncSession, phone_number: str, password: str) -> Optional[Patient]:
        """Authenticate patient by phone number and password"""
        result = await db.execute(
            select(Patient).where(Patient.phone_number == phone_number)
        )
        patient = result.scalar_one_or_none()
        
        if not patient or not verify_password(password, patient.password_hash):
            return None
        
        return patient
    
    @staticmethod
    async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional[User]:
        """Authenticate user (staff/admin/doctor) by username and password"""
        result = await db.execute(
            select(User).where(User.username == username and User.is_active == True)
        )
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(password, user.password_hash):
            return None
        
        return user
    
    @staticmethod
    async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
        """Create a new user (staff/admin/doctor)"""
        # Check if username already exists
        result = await db.execute(
            select(User).where(User.username == user_data.username)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise ValueError("Username already exists")
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user
        user = User(
            username=user_data.username,
            password_hash=hashed_password,
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=user_data.role
        )
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        return user
    
    @staticmethod
    async def update_user(db: AsyncSession, user_id: UUID, user_update: UserUpdate) -> User:
        """Update user information"""
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError("User not found")
        
        # Update fields
        if user_update.email is not None:
            user.email = user_update.email
        if user_update.first_name is not None:
            user.first_name = user_update.first_name
        if user_update.last_name is not None:
            user.last_name = user_update.last_name
        if user_update.is_active is not None:
            user.is_active = user_update.is_active
        if user_update.password is not None:
            user.password_hash = get_password_hash(user_update.password)
        
        await db.commit()
        await db.refresh(user)
        
        return user
    
    @staticmethod
    async def create_doctor(db: AsyncSession, doctor_data: DoctorCreate) -> Doctor:
        """Create a new doctor with associated user account"""
        # First create the user account
        user_data = UserCreate(
            username=doctor_data.username,
            password=doctor_data.password,
            email=doctor_data.email,
            first_name=doctor_data.first_name,
            last_name=doctor_data.last_name,
            role="doctor"
        )
        
        user = await AuthService.create_user(db, user_data)
        
        # Then create the doctor profile
        doctor = Doctor(
            user_id=user.id,
            specialization=doctor_data.specialization,
            license_number=doctor_data.license_number,
            department=doctor_data.department,
            consultation_fee=doctor_data.consultation_fee,
            is_available=doctor_data.is_available if doctor_data.is_available is not None else True
        )
        
        db.add(doctor)
        await db.commit()
        await db.refresh(doctor)
        
        return doctor
    
    @staticmethod
    async def update_doctor(db: AsyncSession, doctor_id: UUID, doctor_update: DoctorUpdate) -> Doctor:
        """Update doctor information"""
        result = await db.execute(
            select(Doctor).where(Doctor.id == doctor_id)
        )
        doctor = result.scalar_one_or_none()
        
        if not doctor:
            raise ValueError("Doctor not found")
        
        # Update fields
        if doctor_update.specialization is not None:
            doctor.specialization = doctor_update.specialization
        if doctor_update.license_number is not None:
            doctor.license_number = doctor_update.license_number
        if doctor_update.department is not None:
            doctor.department = doctor_update.department
        if doctor_update.consultation_fee is not None:
            doctor.consultation_fee = doctor_update.consultation_fee
        if doctor_update.is_available is not None:
            doctor.is_available = doctor_update.is_available
        
        await db.commit()
        await db.refresh(doctor)
        
        return doctor
    
    @staticmethod
    async def get_patient_by_id(db: AsyncSession, patient_id: UUID) -> Optional[Patient]:
        """Get patient by ID"""
        result = await db.execute(
            select(Patient).where(Patient.id == patient_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
        """Get user by ID"""
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_doctor_by_user_id(db: AsyncSession, user_id: UUID) -> Optional[Doctor]:
        """Get doctor by user ID"""
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == user_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_patient_profile(db: AsyncSession, patient_id: UUID, patient_data: dict) -> Patient:
        """Update patient profile"""
        result = await db.execute(
            select(Patient).where(Patient.id == patient_id)
        )
        patient = result.scalar_one_or_none()
        
        if not patient:
            raise ValueError("Patient not found")
        
        # Update allowed fields
        allowed_fields = ['first_name', 'last_name', 'date_of_birth', 'gender', 'address', 'emergency_contact', 'email']
        for field, value in patient_data.items():
            if field in allowed_fields and value is not None:
                setattr(patient, field, value)
        
        await db.commit()
        await db.refresh(patient)
        
        return patient