#!/usr/bin/env python3
"""
Test Runner Script for Hospital Queue Management System

This script helps run the test scripts with proper setup instructions.
"""

import os
import sys
import subprocess
import argparse

def check_api():
    """Check if API is running"""
    import requests
    try:
        response = requests.get("http://localhost:8000/api/v1/health", timeout=5)
        if response.status_code == 200:
            return True
        else:
            return False
    except:
        return False

def main():
    parser = argparse.ArgumentParser(
        description="Hospital Queue Management System Test Runner",
        formatter_class=argparse.RawTextHelpFormatter
    )
    
    parser.add_argument("--targeted", action="store_true", help="Run targeted tests instead of full test suite")
    parser.add_argument("--base-url", default="http://localhost:8000/api/v1", help="Base URL for the API")
    parser.add_argument("--test-flags", default="", help="Additional flags to pass to the test script")
    
    args = parser.parse_args()
    
    # Check if API is running
    if not check_api():
        print("\n❌ API does not appear to be running!")
        print("\nPlease start the API first with:")
        print("cd backend")
        print("uvicorn main:app --reload\n")
        sys.exit(1)
    
    # Determine which test script to run
    script = "test_system_targeted.py" if args.targeted else "test_system.py"
    
    # Build command
    cmd = [sys.executable, script, f"--base-url={args.base_url}"]
    
    # Add any additional flags
    if args.test_flags:
        cmd.extend(args.test_flags.split())
    
    # Run the test script
    print(f"\n🚀 Running {script} with base URL: {args.base_url}")
    process = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
    
    # Return the exit code from the test script
    sys.exit(process.returncode)

if __name__ == "__main__":
    main() 