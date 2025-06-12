from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import date, datetime
from uuid import UUID

class PatientBase(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=100)
    phone_number: str = Field(..., min_length=10, max_length=20)
    dob: Optional[date] = None
    gender: Optional[str] = Field(None, description="M, F, or Other")
    
    @validator('gender')
    def validate_gender(cls, v):
        if v and v not in ['M', 'F', 'Other']:
            raise ValueError('Gender must be M, F, or Other')
        return v
        
    @validator('phone_number')
    def validate_phone(cls, v):
        # Simple regex validation for phone number
        if not v.replace('+', '').replace('-', '').replace(' ', '').isdigit():
            raise ValueError('Phone number must contain only digits, +, -, or spaces')
        return v

class PatientCreate(PatientBase):
    """Schema for creating a new patient"""
    pass

class PatientUpdate(PatientBase):
    """Schema for updating an existing patient"""
    full_name: Optional[str] = Field(None, min_length=3, max_length=100)
    phone_number: Optional[str] = Field(None, min_length=10, max_length=20)

class PatientInDB(PatientBase):
    """Schema for patient data from the database"""
    patient_id: UUID
    registered_on: datetime
    
    class Config:
        orm_mode = True

class PatientResponse(PatientInDB):
    """Schema for patient data in API responses"""
    pass 