"""
Load testing configuration for Queue Management System using Locust
"""

from locust import HttpUser, task, between
import random
import json
from datetime import datetime, timedelta

class PatientUser(HttpUser):
    """Simulate patient behavior"""
    wait_time = between(1, 5)
    
    def on_start(self):
        """Setup for each user"""
        self.phone_number = f"+255{random.randint(700000000, 799999999)}"
        self.patient_data = {
            "phone_number": self.phone_number,
            "password": "password123",
            "first_name": "LoadTest",
            "last_name": f"User{random.randint(1, 1000)}",
            "date_of_birth": "1990-01-01",
            "gender": random.choice(["male", "female"]),
            "address": "123 Test Street"
        }
        self.access_token = None
        
        # Register patient
        self.register_patient()
        # Login patient
        self.login_patient()
    
    def register_patient(self):
        """Register a new patient"""
        response = self.client.post(
            "/api/patients/register",
            json=self.patient_data,
            name="Patient Registration"
        )
        if response.status_code != 201:
            print(f"Registration failed: {response.text}")
    
    def login_patient(self):
        """Login patient and get access token"""
        login_data = {
            "username": self.phone_number,
            "password": "password123"
        }
        response = self.client.post(
            "/api/patients/login",
            data=login_data,
            name="Patient Login"
        )
        if response.status_code == 200:
            self.access_token = response.json().get("access_token")
    
    @property
    def auth_headers(self):
        """Get authorization headers"""
        if self.access_token:
            return {"Authorization": f"Bearer {self.access_token}"}
        return {}
    
    @task(3)
    def view_profile(self):
        """View patient profile"""
        self.client.get(
            "/api/patients/profile",
            headers=self.auth_headers,
            name="View Profile"
        )
    
    @task(2)
    def book_appointment(self):
        """Book a new appointment"""
        appointment_data = {
            "doctor_id": None,  # General appointment
            "appointment_date": (datetime.now() + timedelta(days=random.randint(1, 7))).isoformat(),
            "reason": "Load test appointment",
            "urgency_level": random.randint(1, 5)
        }
        self.client.post(
            "/api/patients/appointments",
            json=appointment_data,
            headers=self.auth_headers,
            name="Book Appointment"
        )
    
    @task(4)
    def check_queue_status(self):
        """Check queue status"""
        self.client.get(
            "/api/patients/queue-status",
            headers=self.auth_headers,
            name="Check Queue Status"
        )
    
    @task(1)
    def update_profile(self):
        """Update patient profile"""
        update_data = {
            "address": f"Updated Address {random.randint(1, 100)}",
            "emergency_contact": f"+255{random.randint(700000000, 799999999)}"
        }
        self.client.patch(
            "/api/patients/profile",
            json=update_data,
            headers=self.auth_headers,
            name="Update Profile"
        )

class StaffUser(HttpUser):
    """Simulate staff behavior"""
    wait_time = between(2, 8)
    
    def on_start(self):
        """Setup for staff user"""
        # Use predefined staff credentials
        self.username = "receptionist1"
        self.password = "password123"
        self.access_token = None
        
        # Login staff
        self.login_staff()
    
    def login_staff(self):
        """Login staff and get access token"""
        login_data = {
            "username": self.username,
            "password": self.password
        }
        response = self.client.post(
            "/api/staff/login",
            data=login_data,
            name="Staff Login"
        )
        if response.status_code == 200:
            self.access_token = response.json().get("access_token")
        else:
            print(f"Staff login failed: {response.text}")
    
    @property
    def auth_headers(self):
        """Get authorization headers"""
        if self.access_token:
            return {"Authorization": f"Bearer {self.access_token}"}
        return {}
    
    @task(5)
    def view_queue(self):
        """View current queue"""
        self.client.get(
            "/api/staff/queue",
            headers=self.auth_headers,
            name="View Queue"
        )
    
    @task(2)
    def register_patient(self):
        """Register a new patient (staff action)"""
        patient_data = {
            "phone_number": f"+255{random.randint(700000000, 799999999)}",
            "password": "password123",
            "first_name": "Staff",
            "last_name": f"Registered{random.randint(1, 1000)}",
            "date_of_birth": "1985-01-01",
            "gender": random.choice(["male", "female"]),
            "address": "Staff registered address"
        }
        self.client.post(
            "/api/staff/patients",
            json=patient_data,
            headers=self.auth_headers,
            name="Staff Register Patient"
        )
    
    @task(3)
    def manage_queue(self):
        """Manage queue operations"""
        # This would typically involve updating queue priorities
        # For load testing, we'll just make GET requests to queue management endpoints
        self.client.get(
            "/api/staff/queue/current",
            headers=self.auth_headers,
            name="Manage Queue"
        )

class DoctorUser(HttpUser):
    """Simulate doctor behavior"""
    wait_time = between(5, 15)  # Doctors take more time between actions
    
    def on_start(self):
        """Setup for doctor user"""
        self.username = "doctor1"
        self.password = "password123"
        self.access_token = None
        
        # Login doctor
        self.login_doctor()
    
    def login_doctor(self):
        """Login doctor and get access token"""
        login_data = {
            "username": self.username,
            "password": self.password
        }
        response = self.client.post(
            "/api/doctors/login",
            data=login_data,
            name="Doctor Login"
        )
        if response.status_code == 200:
            self.access_token = response.json().get("access_token")
    
    @property
    def auth_headers(self):
        """Get authorization headers"""
        if self.access_token:
            return {"Authorization": f"Bearer {self.access_token}"}
        return {}
    
    @task(4)
    def view_patient_queue(self):
        """View patients in queue"""
        self.client.get(
            "/api/doctors/queue",
            headers=self.auth_headers,
            name="View Patient Queue"
        )
    
    @task(2)
    def mark_patient_served(self):
        """Mark patient as served (simulation)"""
        # In a real scenario, this would mark specific patients as served
        # For load testing, we'll make requests to the endpoint
        self.client.get(
            "/api/doctors/current-patient",
            headers=self.auth_headers,
            name="Get Current Patient"
        )

class HealthCheckUser(HttpUser):
    """Simulate health check monitoring"""
    wait_time = between(10, 30)
    
    @task
    def health_check(self):
        """Basic health check"""
        self.client.get("/health", name="Health Check")
    
    @task
    def detailed_health_check(self):
        """Detailed health check"""
        self.client.get("/health/detailed", name="Detailed Health Check")

# Custom user classes for different load scenarios
class PatientHeavyLoad(PatientUser):
    """Heavy patient load simulation"""
    weight = 3  # 3x more likely to be chosen
    wait_time = between(0.5, 2)  # Faster actions

class StaffNormalLoad(StaffUser):
    """Normal staff load"""
    weight = 1
    wait_time = between(2, 5)

class DoctorLightLoad(DoctorUser):
    """Light doctor load"""
    weight = 1
    wait_time = between(10, 20)