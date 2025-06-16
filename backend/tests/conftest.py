import pytest
import asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from main import app
from database import get_db, Base
from core.config import settings
from models import User, Patient, Doctor, Appointment, Queue, Notification, AuditLog
from core.security import get_password_hash
from services.auth_service import create_access_token
import uuid
from datetime import datetime, date

# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)

@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async with test_engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        
        async with TestingSessionLocal() as session:
            yield session
            
        await connection.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client."""
    def get_test_db():
        return db_session
    
    app.dependency_overrides[get_db] = get_test_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()

@pytest.fixture
def test_client() -> TestClient:
    """Create a sync test client for simple tests."""
    return TestClient(app)

# Test data fixtures
@pytest.fixture
async def test_patient(db_session: AsyncSession):
    """Create a test patient."""
    patient = Patient(
        id=uuid.uuid4(),
        phone_number="+1234567890",
        password_hash=get_password_hash("testpassword"),
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1),
        gender="male",
        email="john.doe@example.com",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.add(patient)
    await db_session.commit()
    await db_session.refresh(patient)
    return patient

@pytest.fixture
async def test_admin_user(db_session: AsyncSession):
    """Create a test admin user."""
    user = User(
        id=uuid.uuid4(),
        username="admin",
        password_hash=get_password_hash("adminpassword"),
        role="admin",
        first_name="Admin",
        last_name="User",
        email="admin@example.com",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def test_staff_user(db_session: AsyncSession):
    """Create a test staff user."""
    user = User(
        id=uuid.uuid4(),
        username="staff",
        password_hash=get_password_hash("staffpassword"),
        role="staff",
        first_name="Staff",
        last_name="User",
        email="staff@example.com",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def test_doctor_user(db_session: AsyncSession):
    """Create a test doctor user."""
    user = User(
        id=uuid.uuid4(),
        username="doctor",
        password_hash=get_password_hash("doctorpassword"),
        role="doctor",
        first_name="Doctor",
        last_name="Smith",
        email="doctor@example.com",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    doctor = Doctor(
        id=uuid.uuid4(),
        user_id=user.id,
        specialization="General Medicine",
        license_number="DOC123456",
        consultation_fee=100.00,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.add(doctor)
    await db_session.commit()
    await db_session.refresh(doctor)
    
    return user, doctor

@pytest.fixture
async def test_appointment(db_session: AsyncSession, test_patient, test_staff_user):
    """Create a test appointment."""
    appointment = Appointment(
        id=uuid.uuid4(),
        patient_id=test_patient.id,
        created_by=test_staff_user.id,
        appointment_date=date.today(),
        urgency_level="normal",
        reason="Regular checkup",
        status="scheduled",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.add(appointment)
    await db_session.commit()
    await db_session.refresh(appointment)
    return appointment

@pytest.fixture
def patient_token(test_patient):
    """Create a JWT token for patient."""
    return create_access_token(
        data={"sub": str(test_patient.id), "type": "patient"}
    )

@pytest.fixture
def admin_token(test_admin_user):
    """Create a JWT token for admin."""
    return create_access_token(
        data={"sub": str(test_admin_user.id), "type": "user", "role": "admin"}
    )

@pytest.fixture
def staff_token(test_staff_user):
    """Create a JWT token for staff."""
    return create_access_token(
        data={"sub": str(test_staff_user.id), "type": "user", "role": "staff"}
    )

@pytest.fixture
def doctor_token(test_doctor_user):
    """Create a JWT token for doctor."""
    user, doctor = test_doctor_user
    return create_access_token(
        data={"sub": str(user.id), "type": "user", "role": "doctor"}
    )

@pytest.fixture
def auth_headers_patient(patient_token):
    """Create authorization headers for patient."""
    return {"Authorization": f"Bearer {patient_token}"}

@pytest.fixture
def auth_headers_admin(admin_token):
    """Create authorization headers for admin."""
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture
def auth_headers_staff(staff_token):
    """Create authorization headers for staff."""
    return {"Authorization": f"Bearer {staff_token}"}

@pytest.fixture
def auth_headers_doctor(doctor_token):
    """Create authorization headers for doctor."""
    return {"Authorization": f"Bearer {doctor_token}"}