#!/usr/bin/env python3
"""
Targeted Testing Script for Hospital Queue Management System

This script allows running specific tests for the hospital queue management system
by importing and using the test functions from test_system.py.
"""

import requests
import json
import uuid
import datetime
import sys
import time
import argparse
from typing import Dict, Any, Optional, Tuple, List

# Import all necessary functions from test_system
from test_system import (
    BASE_URL,
    test_health_endpoint,
    test_auth_endpoints,
    test_user_endpoints,
    test_queue_endpoints,
    test_patient_records,
    test_appointment_endpoints,
    test_queue_entries,
    test_notifications,
    print_header,
    print_subheader,
    print_response,
    check_response,
    # Test data
    TEST_ADMIN,
    TEST_DOCTOR,
    TEST_NURSE,
    TEST_PATIENT
)

def main():
    """Main function to run the tests."""
    global BASE_URL  # Move this to the very beginning of the function
    
    parser = argparse.ArgumentParser(
        description="Hospital Queue Management System API Targeted Test",
        formatter_class=argparse.RawTextHelpFormatter
    )
    
    parser.add_argument("--all", action="store_true", help="Run all tests")
    parser.add_argument("--auth", action="store_true", help="Test authentication endpoints")
    parser.add_argument("--users", action="store_true", help="Test user management endpoints")
    parser.add_argument("--queues", action="store_true", help="Test queue management endpoints")
    parser.add_argument("--patients", action="store_true", help="Test patient record endpoints")
    parser.add_argument("--appointments", action="store_true", help="Test appointment endpoints")
    parser.add_argument("--queue-entries", action="store_true", help="Test queue entry endpoints")
    parser.add_argument("--notifications", action="store_true", help="Test notification endpoints")
    parser.add_argument("--base-url", default=BASE_URL, help=f"Base URL for the API (default: {BASE_URL})")
    
    args = parser.parse_args()
    
    BASE_URL = args.base_url  # Now this assignment is valid
    
    print_header("Hospital Queue Management System API Targeted Test")
    print(f"API Base URL: {BASE_URL}")
    print(f"Test Started: {datetime.datetime.now()}")
    
    # Test API health first
    if not test_health_endpoint():
        print("\n❌ Health check failed. Ensure the API is running and try again.")
        sys.exit(1)
    
    # Determine which tests to run
    run_all = args.all or not any([
        args.auth, args.users, args.queues, args.patients,
        args.appointments, args.queue_entries, args.notifications
    ])
    
    # Authentication is required for all other tests
    if run_all or args.auth or args.users or args.queues or args.patients or args.appointments or args.queue_entries or args.notifications:
        if not test_auth_endpoints():
            print("\n❌ Authentication tests failed. Other tests may not work properly.")
            # Continue anyway because some endpoints might work with the tokens we got
    
    results = {}
    
    # Run selected tests
    if run_all or args.users:
        print("\n\nRunning User Management Tests...")
        try:
            success = test_user_endpoints()
            results["User Management"] = "✅ PASSED" if success else "❌ FAILED"
        except Exception as e:
            print(f"❌ Error running User Management tests: {e}")
            results["User Management"] = "❌ ERROR"
    
    if run_all or args.queues:
        print("\n\nRunning Queue Management Tests...")
        try:
            success = test_queue_endpoints()
            results["Queue Management"] = "✅ PASSED" if success else "❌ FAILED"
        except Exception as e:
            print(f"❌ Error running Queue Management tests: {e}")
            results["Queue Management"] = "❌ ERROR"
    
    if run_all or args.patients:
        print("\n\nRunning Patient Record Tests...")
        try:
            success = test_patient_records()
            results["Patient Records"] = "✅ PASSED" if success else "❌ FAILED"
        except Exception as e:
            print(f"❌ Error running Patient Record tests: {e}")
            results["Patient Records"] = "❌ ERROR"
    
    if run_all or args.appointments:
        print("\n\nRunning Appointment Tests...")
        try:
            success = test_appointment_endpoints()
            results["Appointments"] = "✅ PASSED" if success else "❌ FAILED"
        except Exception as e:
            print(f"❌ Error running Appointment tests: {e}")
            results["Appointments"] = "❌ ERROR"
    
    if run_all or args.queue_entries:
        print("\n\nRunning Queue Entry Tests...")
        try:
            success = test_queue_entries()
            results["Queue Entries"] = "✅ PASSED" if success else "❌ FAILED"
        except Exception as e:
            print(f"❌ Error running Queue Entry tests: {e}")
            results["Queue Entries"] = "❌ ERROR"
    
    if run_all or args.notifications:
        print("\n\nRunning Notification Tests...")
        try:
            success = test_notifications()
            results["Notifications"] = "✅ PASSED" if success else "❌ FAILED"
        except Exception as e:
            print(f"❌ Error running Notification tests: {e}")
            results["Notifications"] = "❌ ERROR"
    
    # Print test summary
    print_header("Test Summary")
    for name, result in results.items():
        print(f"{name}: {result}")
    
    # Overall result
    if results:
        all_passed = all(result == "✅ PASSED" for result in results.values())
        print("\n" + ("✅ All tests passed!" if all_passed else "❌ Some tests failed."))
    else:
        print("\n⚠️ No tests were run. Use --all or specific test flags.")
    
    print(f"Test Completed: {datetime.datetime.now()}")

if __name__ == "__main__":
    main()