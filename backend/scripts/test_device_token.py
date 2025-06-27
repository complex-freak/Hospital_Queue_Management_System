import requests
import json
import os
import sys

# Configuration
API_URL = "http://192.168.173.140:8000"  # Backend URL from env.ts
TOKEN_ENDPOINT = "/api/v1/patient/device-token"
LOGIN_ENDPOINT = "/api/v1/patient/login"

# Test user credentials (should exist in your database)
TEST_CREDENTIALS = {
    "phone_number": "1234567890",  # Replace with a valid phone number in your database
    "password": "Password123"        # Replace with the correct password
}

def login_and_get_token():
    """Login to get authentication token"""
    print(f"Logging in with phone number: {TEST_CREDENTIALS['phone_number']}")
    response = requests.post(
        f"{API_URL}{LOGIN_ENDPOINT}",
        json=TEST_CREDENTIALS
    )
    
    print(f"Login status code: {response.status_code}")
    
    if response.status_code != 200:
        print("Login failed:", response.text)
        sys.exit(1)
        
    token_data = response.json()
    return token_data["access_token"]

def test_register_device_token(access_token):
    """Test registering a device token"""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Test payload - EXACTLY what we send from the mobile app
    payload = {
        "token": "ExponentPushToken[dev-mock-token]",
        "device_type": "android"
    }
    
    print("\nSending device token registration request...")
    print(f"Headers: {headers}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    response = requests.post(
        f"{API_URL}{TOKEN_ENDPOINT}",
        headers=headers,
        json=payload
    )
    
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    
    if response.headers.get('content-type') == 'application/json':
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"Response: {response.text}")
        
    return response.status_code == 200

if __name__ == "__main__":
    print("Device Token Registration Test")
    print("=============================")
    print(f"API URL: {API_URL}")
    
    try:
        access_token = login_and_get_token()
        print(f"Successfully logged in and got access token")
        
        success = test_register_device_token(access_token)
        
        if success:
            print("\n✅ Device token registration successful!")
        else:
            print("\n❌ Device token registration failed!")
            
    except Exception as e:
        print(f"\n❌ Error occurred during test: {str(e)}") 