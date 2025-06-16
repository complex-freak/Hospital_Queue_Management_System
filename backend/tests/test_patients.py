import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

class TestPatientRegistration:
    """Test patient registration endpoints."""
    
    async def test_register_patient_success(self, client: AsyncClient):
        """Test successful patient registration."""
        patient_data = {
            "phone_number": "+1234567890",
            "password": "testpassword123",
            "first_name": "John",
            "last_name": "Doe",
            "date_of_birth": "1990-01-01",
            "gender": "male",
            "email": "john.doe@example.com"
        }
        
        response = await client.post("/api/patients/register", json=patient_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["phone_number"] == patient_data["phone_number"]
        assert data["first_name"] == patient_data["first_name"]
        assert "password_hash" not in data
        assert "id" in data
        assert "created_at" in data
    
    async def test_register_patient_duplicate_phone(self, client: AsyncClient, test_patient):
        """Test registration with duplicate phone number."""
        patient_data = {
            "phone_number": test_patient.phone_number,
            "password": "testpassword123",
            "first_name": "Jane",
            "last_name": "Doe"
        }
        
        response = await client.post("/api/patients/register", json=patient_data)
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()
    
    async def test_register_patient_invalid_data(self, client: AsyncClient):
        """Test registration with invalid data."""
        invalid_data = {
            "phone_number": "invalid",
            "password": "123",  # Too short
            "first_name": "",  # Empty
        }
        
        response = await client.post("/api/patients/register", json=invalid_data)
        
        assert response.status_code == 422

class TestPatientAuthentication:
    """Test patient authentication endpoints."""
    
    async def test_login_success(self, client: AsyncClient, test_patient):
        """Test successful patient login."""
        login_data = {
            "phone_number": test_patient.phone_number,
            "password": "testpassword"
        }
        
        response = await client.post("/api/patients/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user_type"] == "patient"
    
    async def test_login_invalid_credentials(self, client: AsyncClient, test_patient):
        """Test login with invalid credentials."""
        login_data = {
            "phone_number": test_patient.phone_number,
            "password": "wrongpassword"
        }
        
        response = await client.post("/api/patients/login", json=login_data)
        
        assert response.status_code == 401
    
    async def test_login_nonexistent_patient(self, client: AsyncClient):
        """Test login with non-existent patient."""
        login_data = {
            "phone_number": "+9999999999",
            "password": "testpassword"
        }
        
        response = await client.post("/api/patients/login", json=login_data)
        
        assert response.status_code == 401

class TestPatientProfile:
    """Test patient profile endpoints."""
    
    async def test_get_profile(self, client: AsyncClient, test_patient, auth_headers_patient):
        """Test getting patient profile."""
        response = await client.get("/api/patients/profile", headers=auth_headers_patient)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_patient.id)
        assert data["phone_number"] == test_patient.phone_number
        assert data["first_name"] == test_patient.first_name
    
    async def test_update_profile(self, client: AsyncClient, test_patient, auth_headers_patient):
        """Test updating patient profile."""
        update_data = {
            "first_name": "Updated John",
            "last_name": "Updated Doe",
            "email": "updated.john@example.com"
        }
        
        response = await client.put(
            "/api/patients/profile", 
            json=update_data, 
            headers=auth_headers_patient
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == update_data["first_name"]
        assert data["last_name"] == update_data["last_name"]
        assert data["email"] == update_data["email"]
    
    async def test_get_profile_unauthorized(self, client: AsyncClient):
        """Test getting profile without authentication."""
        response = await client.get("/api/patients/profile")
        
        assert response.status_code == 401

class TestPatientQueue:
    """Test patient queue endpoints."""
    
    async def test_get_queue_status_no_appointment(self, client: AsyncClient, test_patient, auth_headers_patient):
        """Test getting queue status when no appointment exists."""
        response = await client.get("/api/patients/queue-status", headers=auth_headers_patient)
        
        assert response.status_code == 200
        data = response.json()
        assert data["has_active_appointment"] is False
        assert data["queue_info"] is None
    
    async def test_get_queue_status_with_appointment(
        self, 
        client: AsyncClient, 
        test_patient, 
        test_appointment,
        auth_headers_patient,
        db_session: AsyncSession
    ):
        """Test getting queue status with active appointment."""
        # Create queue entry for the appointment
        from models import Queue
        import uuid
        from datetime import datetime
        
        queue_entry = Queue(
            id=uuid.uuid4(),
            appointment_id=test_appointment.id,
            queue_number=1,
            priority_score=0,
            status="waiting",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db_session.add(queue_entry)
        await db_session.commit()
        
        response = await client.get("/api/patients/queue-status", headers=auth_headers_patient)
        
        assert response.status_code == 200
        data = response.json()
        assert data["has_active_appointment"] is True
        assert data["queue_info"]["queue_number"] == 1
        assert data["queue_info"]["status"] == "waiting"

class TestPatientAppointments:
    """Test patient appointment endpoints."""
    
    async def test_get_appointments(self, client: AsyncClient, test_patient, auth_headers_patient):
        """Test getting patient appointments."""
        response = await client.get("/api/patients/appointments", headers=auth_headers_patient)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_get_appointments_with_existing(
        self, 
        client: AsyncClient, 
        test_patient, 
        test_appointment,
        auth_headers_patient
    ):
        """Test getting appointments when appointments exist."""
        response = await client.get("/api/patients/appointments", headers=auth_headers_patient)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == str(test_appointment.id)
        assert data[0]["reason"] == test_appointment.reason