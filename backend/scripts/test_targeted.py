#!/usr/bin/env python3
"""
Targeted Testing Script for Hospital Queue Management System

This script tests only the specific endpoints that were failing in the full test suite.
"""

import requests
import json
import uuid
import datetime
import sys
from typing import Dict, Any, Optional, Tuple

# Configuration 
BASE_URL = "http://localhost:8000/api/v1"

# Test user data with randomized values to avoid conflicts
TEST_ADMIN = {
    "email": f"admin.test.{uuid.uuid4().hex[:8]}@example.com",
    "username": f"admin_test_{uuid.uuid4().hex[:8]}",
    "password": "Password123!",
    "first_name": "Admin",
    "last_name": "User",
    "role": "admin"
}

# Global variables to store tokens
admin_token = None

def print_header(title: str) -> None:
    """Print a formatted header."""
    print(f"\n{'=' * 80}\n{title.center(80)}\n{'=' * 80}")

def print_subheader(subtitle: str) -> None:
    """Print a formatted subheader."""
    print(f"\n{'-' * 80}\n{subtitle}\n{'-' * 80}")

def print_response(response: requests.Response) -> None:
    """Print the response status and content."""
    print(f"Status: {response.status_code}")
    if response.content:
        try:
            content = response.json()
            print(f"Response: {json.dumps(content, indent=2)}")
        except json.JSONDecodeError:
            print(f"Response: {response.text[:300]}")
    else:
        print("Response: <empty>")

def check_response(response: requests.Response, expected_status: int = 200) -> bool:
    """Check if the response has the expected status code."""
    if response.status_code != expected_status:
        try:
            error_detail = response.json().get("detail", "No detail provided")
        except:
            error_detail = response.text or "No error text available"
            
        print(f"❌ Expected status {expected_status}, got {response.status_code}")
        print(f"Error: {error_detail}")
        return False
    
    print(f"✅ Status {response.status_code} as expected")
    return True

def request_with_token(
    method: str, 
    endpoint: str, 
    data: Optional[Dict] = None,
    params: Optional[Dict] = None,
    expected_status: int = 200
) -> Tuple[bool, Optional[Dict]]:
    """
    Make a request to the API with the admin token.
    
    Returns:
        Tuple[bool, Optional[Dict]]: Success status and response data if available
    """
    global admin_token
    
    # Prepare headers with the token
    headers = {}
    if admin_token:
        headers["Authorization"] = f"Bearer {admin_token}"
    
    # Prepare URL
    url = f"{BASE_URL}{endpoint}"
    print(f"\n→ {method.upper()} {url}")
    if data:
        print(f"Data: {json.dumps(data, indent=2)}")
    
    try:
        # Make the request with the appropriate method
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, params=params)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, params=params)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=headers, params=params)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, params=params)
        else:
            print(f"❌ Unsupported HTTP method: {method}")
            return False, None
        
        # Print and check response
        print_response(response)
        success = check_response(response, expected_status)
        
        # Return data if successful and response has content
        if success and response.content:
            try:
                return True, response.json()
            except json.JSONDecodeError:
                return True, None
        
        return success, None
        
    except requests.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False, None

def test_health_endpoint() -> bool:
    """Test the health endpoint to verify API is running."""
    print_subheader("Testing Health Endpoint")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        print_response(response)
        
        if check_response(response):
            print("✅ API is running and health check passed")
            return True
        else:
            print("❌ API health check failed")
            return False
    except requests.RequestException as e:
        print(f"❌ Error connecting to API: {e}")
        print("Make sure the API is running (uvicorn main:app --reload)")
        return False

def register_and_login_admin() -> bool:
    """Register and login an admin user to get a token."""
    global admin_token
    
    print_subheader("Register Admin User")
    
    try:
        response = requests.post(f"{BASE_URL}/admin/users", json=TEST_ADMIN)
        print_response(response)
        
        if not (check_response(response, expected_status=200) or check_response(response, expected_status=201)):
            if response.status_code == 409:
                print("⚠️ User may already exist, trying to login")
            else:
                print("❌ Failed to register admin user")
                return False
        
        print_subheader("Login Admin User")
        
        login_data = {
            "username": TEST_ADMIN["username"],
            "password": TEST_ADMIN["password"]
        }
        
        response = requests.post(f"{BASE_URL}/admin/login", json=login_data)
        print_response(response)
        
        if response.status_code == 200:
            try:
                response_data = response.json()
                admin_token = response_data.get("access_token")
                if admin_token:
                    print(f"✅ Got access token: {admin_token[:10]}...")
                    return True
                else:
                    print("❌ No access token in response")
                    return False
            except json.JSONDecodeError:
                print("❌ Invalid JSON response")
                return False
        else:
            print(f"❌ Login failed with status {response.status_code}")
            return False
    except requests.RequestException as e:
        print(f"❌ Error: {e}")
        return False

def test_user_me_endpoint() -> bool:
    """Test the /users/me endpoint."""
    print_subheader("Testing /users/me Endpoint")
    
    success, user_data = request_with_token("GET", "/admin/users/me")
    if success and user_data:
        print(f"✅ Retrieved current user: {user_data.get('username')}")
        return True
    else:
        print("❌ Failed to get current user")
        return False

def test_queue_endpoint() -> bool:
    """Test the queue creation endpoint."""
    print_subheader("Testing Queue Creation")
    
    queue_data = {
        "name": "Test Queue",
        "description": "Queue created for testing purposes",
        "department": "Testing Department",
        "is_active": True
    }
    
    success, queue_response = request_with_token("POST", "/staff/queue", data=queue_data)
    if success and queue_response:
        queue_id = queue_response.get("id")
        print(f"✅ Created queue with ID: {queue_id}")
        return True
    else:
        print("❌ Failed to create queue")
        return False

def test_patient_endpoint() -> bool:
    """Test the patient creation endpoint."""
    print_subheader("Testing Patient Creation")
    
    patient_data = {
        "phone_number": f"+1{uuid.uuid4().hex[:8]}",
        "first_name": "Test",
        "last_name": "Patient",
        "date_of_birth": "1990-01-01T00:00:00",
        "gender": "male",
        "password": "Password123!"
    }
    
    success, patient_response = request_with_token("POST", "/admin/patients", data=patient_data)
    if success and patient_response:
        patient_id = patient_response.get("id")
        print(f"✅ Created patient with ID: {patient_id}")
        return True
    else:
        print("❌ Failed to create patient")
        return False

def test_notification_endpoint() -> bool:
    """Test the notification creation endpoint."""
    print_subheader("Testing Notification Creation")
    
    notification_data = {
        "user_id": None,  # We'll use the admin's ID which we don't have yet
        "title": "Test Notification",
        "message": "This is a test notification"
    }
    
    success, notification_response = request_with_token("POST", "/admin/notifications", data=notification_data)
    if success:
        print("✅ Created notification successfully")
        return True
    else:
        print("❌ Failed to create notification")
        return False

def main():
    """Main function to run the tests."""
    print_header("Hospital Queue Management System API Targeted Test")
    print(f"API Base URL: {BASE_URL}")
    print(f"Test Started: {datetime.datetime.now()}")
    
    # Test API health
    if not test_health_endpoint():
        print("\n❌ Health check failed. Ensure the API is running and try again.")
        sys.exit(1)
    
    # Register and login admin
    if not register_and_login_admin():
        print("\n❌ Failed to register/login admin. Cannot proceed with tests.")
        sys.exit(1)
    
    # Run the targeted tests
    tests = [
        ("User Me Endpoint", test_user_me_endpoint),
        ("Queue Creation", test_queue_endpoint),
        ("Patient Creation", test_patient_endpoint),
        ("Notification Creation", test_notification_endpoint)
    ]
    
    results = {}
    for name, test_func in tests:
        print(f"\n\nRunning {name} Test...")
        try:
            success = test_func()
            results[name] = "✅ PASSED" if success else "❌ FAILED"
        except Exception as e:
            print(f"❌ Error running {name} test: {e}")
            results[name] = "❌ ERROR"
    
    # Print test summary
    print_header("Test Summary")
    for name, result in results.items():
        print(f"{name}: {result}")
    
    # Overall result
    all_passed = all(result == "✅ PASSED" for result in results.values())
    print("\n" + ("✅ All tests passed!" if all_passed else "❌ Some tests failed."))
    print(f"Test Completed: {datetime.datetime.now()}")

if __name__ == "__main__":
    main() 