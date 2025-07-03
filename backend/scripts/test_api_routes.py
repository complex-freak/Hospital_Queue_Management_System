#!/usr/bin/env python
"""
API Route Testing Script

This script tests all available API routes in the hospital queue management system.
It identifies routes from the API modules and attempts to make requests to each endpoint.
"""

import os
import sys
import json
import asyncio
import httpx
import inspect
import importlib
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime, date
from uuid import UUID, uuid4
import logging
from pydantic import BaseModel
from enum import Enum

# Add the parent directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("api_tester")

# Constants
API_BASE_URL = "http://localhost:8000"
TEST_TIMEOUT = 10.0  # seconds

# Test data
TEST_PATIENT = {
    "phone_number": "+1234567890",  # Fixed phone format
    "password": "TestPassword123",  # Added uppercase and numbers
    "first_name": "Test",
    "last_name": "Patient",
    "email": f"test{uuid4().hex[:8]}@example.com",
    "gender": "male",
    "date_of_birth": "1990-01-01T00:00:00"  # Fixed date format
}

class RouteInfo:
    """Information about a route to test"""
    def __init__(
        self, 
        path: str, 
        method: str, 
        requires_auth: bool = True,
        required_role: Optional[str] = None,
        test_data: Optional[Dict[str, Any]] = None,
        path_params: Optional[Dict[str, Any]] = None,
        query_params: Optional[Dict[str, Any]] = None,
        expected_status: Union[int, List[int]] = 200,
        description: str = ""
    ):
        self.path = path
        self.method = method
        self.requires_auth = requires_auth
        self.required_role = required_role
        self.test_data = test_data or {}
        self.path_params = path_params or {}
        self.query_params = query_params or {}
        self.expected_status = expected_status
        self.description = description

    def get_full_path(self) -> str:
        """Get the full path with path parameters substituted"""
        path = self.path
        for param_name, param_value in self.path_params.items():
            path = path.replace(f"{{{param_name}}}", str(param_value))
        
        # Add query parameters if any
        if self.query_params:
            query_string = "&".join([f"{k}={v}" for k, v in self.query_params.items()])
            path = f"{path}?{query_string}"
            
        return path

    def __str__(self) -> str:
        return f"{self.method} {self.path} (Auth: {self.requires_auth}, Role: {self.required_role})"


class APITester:
    """Tests all API routes in the application"""
    
    def __init__(self):
        self.tokens = {}
        self.test_data = {}
        self.client = httpx.AsyncClient(timeout=TEST_TIMEOUT)
        self.patient_id = None
        
    async def close(self):
        await self.client.aclose()
    
    async def test_route(self, route_info: RouteInfo) -> Tuple[bool, str]:
        """Test a specific route"""
        full_path = route_info.get_full_path()
        url = f"{API_BASE_URL}{full_path}"
        
        method = route_info.method.lower()
        try:
            if method == "get":
                response = await self.client.get(url)
            elif method == "post":
                response = await self.client.post(url, json=route_info.test_data)
            elif method == "put":
                response = await self.client.put(url, json=route_info.test_data)
            elif method == "delete":
                response = await self.client.delete(url)
            else:
                return False, f"Unsupported HTTP method: {method}"
            
            # For auth routes, 401/403 is expected and considered successful
            if route_info.requires_auth and response.status_code in (401, 403):
                return True, f"Authentication required as expected ({response.status_code})"
            
            # For non-auth routes, check expected status
            elif not route_info.requires_auth:
                expected_status = route_info.expected_status
                if isinstance(expected_status, list):
                    if response.status_code in expected_status:
                        return True, f"Success ({response.status_code}): {response.text[:100]}"
                else:
                    if response.status_code == expected_status:
                        return True, f"Success ({response.status_code}): {response.text[:100]}"
            
            # Any other case is a failure
            if isinstance(route_info.expected_status, list):
                expected_str = f"one of {route_info.expected_status}"
            else:
                expected_str = str(route_info.expected_status)
            return False, f"Expected status {expected_str}, got {response.status_code}: {response.text}"
                
        except Exception as e:
            return False, f"Error: {str(e)}"
    
    async def test_patient_registration(self) -> Tuple[bool, str, Optional[str]]:
        """Test patient registration and login to get a token"""
        # Register patient
        try:
            response = await self.client.post(
                f"{API_BASE_URL}/api/v1/patients/register",
                json=TEST_PATIENT
            )
            
            if response.status_code == 200:
                patient_data = response.json()
                self.patient_id = patient_data.get("id")
                logger.info(f"Successfully registered test patient with ID: {self.patient_id}")
                
                # Try to login
                login_response = await self.client.post(
                    f"{API_BASE_URL}/api/v1/patients/login",
                    json={
                        "phone_number": TEST_PATIENT["phone_number"],
                        "password": TEST_PATIENT["password"]
                    }
                )
                
                if login_response.status_code == 200:
                    token = login_response.json().get("access_token")
                    logger.info("Successfully logged in as test patient")
                    return True, "Registration and login successful", token
                else:
                    return False, f"Login failed: {login_response.status_code} - {login_response.text}", None
            elif response.status_code == 400 and "already registered" in response.text:
                # Try login with existing credentials
                login_response = await self.client.post(
                    f"{API_BASE_URL}/api/v1/patients/login",
                    json={
                        "phone_number": TEST_PATIENT["phone_number"],
                        "password": TEST_PATIENT["password"]
                    }
                )
                
                if login_response.status_code == 200:
                    token = login_response.json().get("access_token")
                    logger.info("Successfully logged in with existing patient credentials")
                    return True, "Login with existing credentials successful", token
                else:
                    return False, f"Login failed: {login_response.status_code} - {login_response.text}", None
            else:
                return False, f"Registration failed: {response.status_code} - {response.text}", None
                
        except Exception as e:
            return False, f"Error during registration: {str(e)}", None
    
    def discover_routes_from_files(self) -> List[Dict[str, Any]]:
        """Discover API routes by analyzing the route files"""
        routes_info = []
        
        # Define the path to the routes directory
        routes_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "api", "routes")
        
        # Get all Python files in the routes directory
        route_files = [f for f in os.listdir(routes_dir) if f.endswith(".py") and not f.startswith("__")]
        
        logger.info(f"Found route files: {route_files}")
        
        # Map route files to their API prefixes based on main.py
        route_prefixes = {
            'patient.py': '/api/v1/patients',
            'staff.py': '/api/v1/staff',
            'doctor.py': '/api/v1/doctors',
            'admin.py': '/api/v1/admin',
            'sync.py': '/api/v1/sync',
            'health.py': '/health'
        }
        
        # Extract endpoints from each file
        for route_file in route_files:
            file_path = os.path.join(routes_dir, route_file)
            module_name = route_file[:-3]  # Remove .py extension
            
            # Get the API prefix for this route file
            prefix = route_prefixes.get(route_file, "")
            
            # Read the file and look for router definitions and endpoints
            with open(file_path, 'r') as f:
                content = f.read()
                
                # Extract route definitions
                route_lines = [line for line in content.split('\n') if "@router." in line]
                
                for line in route_lines:
                    route_info = {"file": route_file, "module": module_name}
                    
                    # Extract HTTP method
                    if "@router.get" in line:
                        route_info["method"] = "GET"
                    elif "@router.post" in line:
                        route_info["method"] = "POST"
                    elif "@router.put" in line:
                        route_info["method"] = "PUT"
                    elif "@router.delete" in line:
                        route_info["method"] = "DELETE"
                    else:
                        continue
                    
                    # Extract path
                    path_start = line.find('("') + 2
                    path_end = line.find('"', path_start)
                    if path_start > 1 and path_end > path_start:
                        path = line[path_start:path_end]
                        route_info["path"] = f"{prefix}{path}"
                    else:
                        continue
                    
                    # Extract auth requirements
                    route_info["requires_auth"] = "Depends" in line
                    
                    # Extract required role
                    if "require_admin" in line:
                        route_info["required_role"] = "admin"
                    elif "require_doctor" in line:
                        route_info["required_role"] = "doctor"
                    elif "require_staff" in line:
                        route_info["required_role"] = "staff"
                    elif "get_current_patient" in line:
                        route_info["required_role"] = "patient"
                    else:
                        route_info["required_role"] = None
                    
                    routes_info.append(route_info)
        
        return routes_info
    
    def generate_test_routes(self) -> List[RouteInfo]:
        """Generate test routes with appropriate test data"""
        test_routes = []
        
        # Root and health endpoints (no auth required)
        test_routes.append(RouteInfo(
            path="/",
            method="get",
            requires_auth=False,
            expected_status=200,
            description="Root endpoint"
        ))
        
        test_routes.append(RouteInfo(
            path="/health",
            method="get",
            requires_auth=False,
            expected_status=200,
            description="Health check"
        ))
        
        # Patient registration and login (no auth required)
        test_routes.append(RouteInfo(
            path="/api/v1/patients/register",
            method="post",
            requires_auth=False,
            test_data=TEST_PATIENT,
            expected_status=[200, 400],  # Allow 400 for already registered
            description="Register new patient"
        ))
        
        test_routes.append(RouteInfo(
            path="/api/v1/patients/login",
            method="post",
            requires_auth=False,
            test_data={
                "phone_number": TEST_PATIENT["phone_number"],
                "password": TEST_PATIENT["password"]
            },
            expected_status=200,
            description="Patient login"
        ))
        
        # Add routes from files
        discovered_routes = self.discover_routes_from_files()
        for route in discovered_routes:
            # Skip routes we've already added
            if any(r.path == route["path"] and r.method.lower() == route["method"].lower() for r in test_routes):
                continue
            
            # For authenticated routes, we expect 401/403 responses
            if route["requires_auth"]:
                test_routes.append(RouteInfo(
                    path=route["path"],
                    method=route["method"].lower(),
                    requires_auth=True,
                    required_role=route["required_role"],
                    expected_status=[401, 403],  # Expect 401 or 403 for auth routes
                    description=f"From {route['file']}"
                ))
            else:
                # For non-auth routes, we expect 200 OK
                test_routes.append(RouteInfo(
                    path=route["path"],
                    method=route["method"].lower(),
                    requires_auth=False,
                    required_role=None,
                    expected_status=200,
                    description=f"From {route['file']}"
                ))
        
        return test_routes

    async def run_tests(self):
        """Run tests on all routes"""
        # Test patient registration first
        reg_success, reg_message, token = await self.test_patient_registration()
        if reg_success and token:
            self.tokens["patient"] = token
            logger.info("✅ Patient registration test successful")
        else:
            logger.warning(f"⚠️ Patient registration test failed: {reg_message}")
        
        # Get test routes
        test_routes = self.generate_test_routes()
        
        # Run tests
        results = []
        for route in test_routes:
            logger.info(f"Testing {route.method.upper()} {route.get_full_path()}...")
            success, message = await self.test_route(route)
            
            result = {
                "method": route.method.upper(),
                "path": route.get_full_path(),
                "description": route.description,
                "requires_auth": route.requires_auth,
                "required_role": route.required_role,
                "success": success,
                "message": message
            }
            results.append(result)
            
            if success:
                logger.info(f"✅ {route.method.upper()} {route.get_full_path()} - Success")
            else:
                logger.error(f"❌ {route.method.upper()} {route.get_full_path()} - Failed: {message}")
        
        # Summary
        total = len(results)
        successful = sum(1 for r in results if r["success"])
        
        logger.info(f"\n===== TEST SUMMARY =====")
        logger.info(f"Total routes tested: {total}")
        logger.info(f"Successful: {successful}")
        logger.info(f"Failed: {total - successful}")
        logger.info(f"Success rate: {successful/total*100:.1f}%")
        
        # Save results to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = os.path.join(os.path.dirname(__file__), f"api_test_results_{timestamp}.json")
        with open(filename, "w") as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "total_routes": total,
                "successful_routes": successful,
                "failed_routes": total - successful,
                "success_rate": successful/total,
                "results": results
            }, f, indent=2)
        
        logger.info(f"Results saved to {filename}")
        
        return results


async def main():
    """Main entry point"""
    logger.info("Starting API route testing...")
    
    tester = APITester()
    try:
        await tester.run_tests()
    finally:
        await tester.close()


if __name__ == "__main__":
    asyncio.run(main()) 