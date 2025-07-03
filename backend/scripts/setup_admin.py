#!/usr/bin/env python3
"""
Admin Setup Script for Hospital Queue Management System

This script creates an admin user in the system.
"""

import requests
import json
import sys
import argparse

def create_admin_user(base_url, username, password, email, first_name, last_name):
    """Create an admin user"""
    print(f"\n[1/2] Creating admin user '{username}'...")
    
    user_data = {
        "username": username,
        "password": password,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "role": "admin"
    }
    
    try:
        response = requests.post(
            f"{base_url}/admin/users",
            json=user_data
        )
        
        print(f"Status: {response.status_code}")
        if response.content:
            try:
                print(f"Response: {json.dumps(response.json(), indent=2)}")
            except json.JSONDecodeError:
                print(f"Response: {response.text[:300]}")
        
        if response.status_code in (200, 201):
            print("✅ Admin user created successfully!")
            return True
        else:
            print("❌ Failed to create admin user")
            return False
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
        return False

def login_admin_user(base_url, username, password):
    """Login with admin user"""
    print(f"\n[2/2] Logging in as '{username}'...")
    
    login_data = {
        "username": username,
        "password": password
    }
    
    try:
        response = requests.post(
            f"{base_url}/admin/login",
            json=login_data
        )
        
        print(f"Status: {response.status_code}")
        if response.content:
            try:
                print(f"Response: {json.dumps(response.json(), indent=2)}")
            except json.JSONDecodeError:
                print(f"Response: {response.text[:300]}")
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            if token:
                print("✅ Login successful!")
                print(f"Access Token: {token[:20]}...{token[-10:]}")
                return True
            else:
                print("❌ No access token in response")
                return False
        else:
            print("❌ Login failed")
            return False
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
        return False

def check_api_health(base_url):
    """Check if API is running"""
    try:
        response = requests.get(f"{base_url}/health")
        return response.status_code == 200
    except:
        return False

def main():
    parser = argparse.ArgumentParser(description="Hospital Queue Admin Setup")
    
    parser.add_argument("--base-url", default="http://localhost:8000/api/v1", 
                        help="Base URL for the API")
    parser.add_argument("--username", default="admin", 
                        help="Admin username")
    parser.add_argument("--password", default="Admin123!", 
                        help="Admin password")
    parser.add_argument("--email", default="admin@example.com", 
                        help="Admin email")
    parser.add_argument("--first-name", default="Admin", 
                        help="Admin first name")
    parser.add_argument("--last-name", default="User", 
                        help="Admin last name")
    
    args = parser.parse_args()
    
    print("Hospital Queue Management System - Admin Setup")
    print(f"API URL: {args.base_url}")
    
    if not check_api_health(args.base_url):
        print("\n❌ API is not running! Start it with: uvicorn main:app --reload")
        sys.exit(1)
    
    # Step 1: Create admin user
    if not create_admin_user(
        args.base_url, args.username, args.password, 
        args.email, args.first_name, args.last_name
    ):
        print("\n⚠️ Admin user creation failed. If it already exists, trying login...")
    
    # Step 2: Login with admin user
    if login_admin_user(args.base_url, args.username, args.password):
        print("\n🎉 Setup completed successfully!")
    else:
        print("\n❌ Setup failed")
        sys.exit(1)

if __name__ == "__main__":
    main() 