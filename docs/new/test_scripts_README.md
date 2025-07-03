# Testing Scripts for Hospital Queue Management System

This directory contains comprehensive testing scripts for the Hospital Queue Management System API. These scripts will help you identify and fix issues in your application by systematically testing all endpoints and CRUD operations.

## Available Scripts

### 1. `test_system.py`

A comprehensive script that tests all API endpoints in sequence. It creates test users with different roles (admin, doctor, nurse, patient), authenticates, and tests all endpoints in your system.

#### Features:
- Tests authentication (register, login)
- Tests user management endpoints
- Tests queue management endpoints
- Tests patient record management endpoints
- Tests appointment management endpoints
- Tests queue entry management endpoints
- Tests notification endpoints

#### Usage:
```bash
# Run all tests with the default base URL (http://localhost:8000/api/v1)
python test_system.py

# Run tests with a custom API URL
python test_system.py --base-url http://localhost:8080/api/v1

# Run tests without cleaning up test data
python test_system.py --no-cleanup
```

### 2. `test_system_targeted.py`

A more targeted script that allows you to test specific endpoint groups for better debugging. This is useful when you need to focus on a particular part of the API.

#### Features:
- Can test specific endpoint groups
- Provides detailed output for debugging
- Uses command-line arguments to control which tests to run

#### Usage:
```bash
# Test all endpoints
python test_system_targeted.py --all

# Test only authentication endpoints
python test_system_targeted.py --auth

# Test only user management endpoints
python test_system_targeted.py --users

# Test only queue management endpoints
python test_system_targeted.py --queues

# Test only patient record endpoints
python test_system_targeted.py --patients

# Test only appointment endpoints
python test_system_targeted.py --appointments

# Test only queue entry endpoints
python test_system_targeted.py --queue-entries

# Test only notification endpoints
python test_system_targeted.py --notifications

# Test specific combinations
python test_system_targeted.py --auth --users --queues

# Test with a custom API URL
python test_system_targeted.py --all --base-url http://localhost:8080/api/v1
```

## Prerequisites

Before running the test scripts, ensure that:

1. The API server is running:
   ```bash
   # In terminal 1 (from the project root directory)
   uvicorn app.main:app --reload
   ```

2. Your virtual environment is activated:
   ```bash
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```

3. The required packages are installed:
   ```bash
   pip install requests
   ```

## Interpreting Results

The test scripts provide detailed information about each request and response, including:
- HTTP status codes
- Response JSON/content
- Any errors encountered

Each test section is clearly marked with a header, and the results are displayed with:
- ✅ for successful tests
- ❌ for failed tests
- ⚠️ for warnings

At the end of the test run, a summary is displayed showing which test groups passed or failed.

## Troubleshooting Common Issues

1. **Connection Refused** - Make sure the API server is running on the correct port (default is 8000)
2. **Authentication Errors** - Check that the server is properly configured for JWT authentication
3. **Permission Errors** - Verify that the role-based access control is working correctly
4. **Database Errors** - Ensure your database is properly set up and migrations are applied
5. **Missing Endpoints** - If endpoints are not found, check your API routes and URL structure

## Customizing Tests

You can modify these test scripts to better match your specific API implementation:

1. Update the `BASE_URL` variable if your API is deployed at a different location
2. Modify the test data in the user registration sections to match your schema requirements
3. Adjust the endpoint URLs if your API uses a different URL structure
4. Add new test functions for any custom endpoints specific to your implementation

## Best Practices

1. Run the targeted tests during development to debug specific parts of your API
2. Run the comprehensive test before deploying to ensure the entire system works together
3. Consider adding these tests to your CI/CD pipeline for automated testing
4. Use the `--no-cleanup` flag during debugging to inspect created test data

## Note

These test scripts are designed to be non-destructive to existing data when possible, but they do create and delete test data. It's recommended to run them in a development or testing environment, not against production data. 