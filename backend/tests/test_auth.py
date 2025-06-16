import pytest
from datetime import datetime, timedelta
from jose import jwt
from httpx import AsyncClient

from core.config import settings
from core.security import verify_password, get_password_hash, create_access_token, verify_token
from services.auth_service import authenticate_patient, authenticate_user

class TestPasswordHashing:
    """Test password hashing and verification."""
    
    def test_hash_password(self):
        """Test password hashing."""
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert hashed != password
        assert len(hashed) > 0
        assert verify_password(password, hashed)
    
    def test_verify_password_correct(self):
        """Test password verification with correct password."""
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password."""
        password = "testpassword123"
        wrong_password = "wrongpassword"
        hashed = get_password_hash(password)
        
        assert verify_password(wrong_password, hashed) is False

class TestJWTTokens:
    """Test JWT token creation and verification."""
    
    def test_create_access_token(self):
        """Test JWT token creation."""
        data = {"sub": "user123", "type": "patient"}
        token = create_access_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode token to verify content
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert decoded["sub"] == "user123"
        assert decoded["type"] == "patient"
        assert "exp" in decoded
    
    def test_create_access_token_with_expiry(self):
        """Test JWT token creation with custom expiry."""
        data = {"sub": "user123"}
        expires_delta = timedelta(minutes=15)
        token = create_access_token(data, expires_delta)
        
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        exp_time = datetime.fromtimestamp(decoded["exp"])
        expected_time = datetime.utcnow() + expires_delta
        
        # Allow 1 minute tolerance
        assert abs((exp_time - expected_time).total_seconds()) < 60
    
    def test_verify_token_valid(self):
        """Test token verification with valid token."""
        data = {"sub": "user123", "type": "patient"}
        token = create_access_token(data)
        
        payload = verify_token(token)
        assert payload["sub"] == "user123"
        assert payload["type"] == "patient"
    
    def test_verify_token_invalid(self):
        """Test token verification with invalid token."""
        invalid_token = "invalid.token.here"
        
        payload = verify_token(invalid_token)
        assert payload is None
    
    def test_verify_token_expired(self):
        """Test token verification with expired token."""
        data = {"sub": "user123"}
        expires_delta = timedelta(seconds=-1)  # Already expired
        token = create_access_token(data, expires_delta)
        
        payload = verify_token(token)
        assert payload is None

class TestAuthenticationService:
    """Test authentication service functions."""
    
    async def test_authenticate_patient_success(self, test_patient, db_session):
        """Test successful patient authentication."""
        patient = await authenticate_patient(
            db_session, 
            test_patient.phone_number, 
            "testpassword"
        )
        
        assert patient is not None
        assert patient.id == test_patient.id
        assert patient.phone_number == test_patient.phone_number
    
    async def test_authenticate_patient_wrong_password(self, test_patient, db_session):
        """Test patient authentication with wrong password."""
        patient = await authenticate_patient(
            db_session, 
            test_patient.phone_number, 
            "wrongpassword"
        )
        
        assert patient is None
    
    async def test_authenticate_patient_nonexistent(self, db_session):
        """Test patient authentication with non-existent phone."""
        patient = await authenticate_patient(
            db_session, 
            "+9999999999", 
            "testpassword"
        )
        
        assert patient is None
    
    async def test_authenticate_user_success(self, test_admin_user, db_session):
        """Test successful user authentication."""
        user = await authenticate_user(
            db_session, 
            test_admin_user.username, 
            "adminpassword"
        )
        
        assert user is not None
        assert user.id == test_admin_user.id
        assert user.username == test_admin_user.username
    
    async def test_authenticate_user_wrong_password(self, test_admin_user, db_session):
        """Test user authentication with wrong password."""
        user = await authenticate_user(
            db_session, 
            test_admin_user.username, 
            "wrongpassword"
        )
        
        assert user is None
    
    async def test_authenticate_user_nonexistent(self, db_session):
        """Test user authentication with non-existent username."""
        user = await authenticate_user(
            db_session, 
            "nonexistent", 
            "testpassword"
        )
        
        assert user is None

class TestAuthenticationEndpoints:
    """Test authentication endpoints integration."""
    
    async def test_patient_login_endpoint(self, client: AsyncClient, test_patient):
        """Test patient login endpoint."""
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
        
        # Verify token is valid
        token = data["access_token"]
        payload = verify_token(token)
        assert payload["sub"] == str(test_patient.id)
        assert payload["type"] == "patient"
    
    async def test_staff_login_endpoint(self, client: AsyncClient, test_staff_user):
        """Test staff login endpoint."""
        login_data = {
            "username": test_staff_user.username,
            "password": "staffpassword"
        }
        
        response = await client.post("/api/staff/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user_type"] == "user"
        assert data["role"] == "staff"
    
    async def test_protected_endpoint_without_token(self, client: AsyncClient):
        """Test accessing protected endpoint without token."""
        response = await client.get("/api/patients/profile")
        
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]
    
    async def test_protected_endpoint_with_invalid_token(self, client: AsyncClient):
        """Test accessing protected endpoint with invalid token."""
        headers = {"Authorization": "Bearer invalid.token.here"}
        response = await client.get("/api/patients/profile", headers=headers)
        
        assert response.status_code == 401
    
    async def test_protected_endpoint_with_valid_token(self, client: AsyncClient, auth_headers_patient):
        """Test accessing protected endpoint with valid token."""
        response = await client.get("/api/patients/profile", headers=auth_headers_patient)
        
        assert response.status_code == 200