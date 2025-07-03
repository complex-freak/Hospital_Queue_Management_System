# Hospital Queuing System - Testing Strategy

## Overview

This document outlines the testing strategy for the Hospital Queuing System web application. The application is a React/TypeScript frontend that provides role-based dashboards for hospital staff (doctors, receptionists, and administrators) to manage patient queues efficiently, with offline support via IndexedDB.

## Test Types

### Unit Tests
Unit tests focus on testing individual components, services, hooks, and utility functions in isolation. These tests verify that each unit of code performs as expected without dependencies on other parts of the system.

### Integration Tests
Integration tests verify that different units of the application work together correctly. These tests focus on workflows that span multiple components and services, such as the patient registration to doctor assignment workflow.

## Test Directory Structure

```
src/__tests__/
├── integration/          # Integration tests
│   └── patientWorkflow.test.tsx
├── unit/                 # Unit tests
│   ├── components/       # Component tests
│   │   ├── PatientForm.test.tsx
│   │   └── QueueMonitor.test.tsx
│   ├── hooks/            # Hook tests
│   │   └── useAuth.test.tsx
│   └── services/         # Service tests
│       ├── connectivityService.test.ts
│       ├── indexedDBService.test.ts
│       ├── notificationService.test.ts
│       └── queueService.test.ts
├── utils/                # Testing utilities and mocks
│   ├── mockServices.ts
│   └── testUtils.tsx
└── README.md             # This file
```

## Mock Strategy

We use Jest's mocking capabilities to mock dependencies:

1. **Service Mocks**: Core services like IndexedDBService, QueueService, and NotificationService are mocked to isolate the tested code and avoid actual browser API calls.

2. **Context Mocks**: React contexts (AuthContext, QueueContext, NotificationContext) are mocked to provide controlled test environments.

3. **React Router Mocks**: Navigation functions and route-related hooks are mocked to simulate navigation without actual browser changes.

4. **Browser API Mocks**: APIs like IndexedDB are mocked to avoid actual database operations during testing.

## Running Tests

### Command
To run all tests:
```
npm test
```

To run tests with coverage:
```
npm test -- --coverage
```

To run a specific test file:
```
npm test -- -t "Component Name"
```

### Coverage Goals

We aim for:
- 80% overall coverage
- 90% coverage for core services (connectivity, notifications, queue management)
- 75% coverage for components
- 90% coverage for utility functions and hooks

## Current Test Coverage

Our current test suite covers:

1. **Core Services**:
   - IndexedDBService
   - NotificationService
   - QueueService
   - ConnectivityService

2. **Components**:
   - PatientForm
   - QueueMonitor

3. **Hooks**:
   - useAuth

4. **Integration Flows**:
   - Patient registration to doctor workflow
   - Queue reordering (drag and drop)

## Next Steps

To expand test coverage:

1. **Component Tests**:
   - DoctorDashboard
   - AdminDashboard
   - Notification components
   - Login/Authentication forms

2. **Role-based Integration Tests**:
   - Admin workflows
   - Reception to doctor handoff
   - Patient status update flows

3. **Error Handling Tests**:
   - Network failure scenarios
   - Data validation errors
   - Authentication errors

4. **End-to-End Tests**:
   - Consider adding Cypress for full E2E testing of critical user journeys

## Best Practices

1. **Test Isolation**: Each test should run independently, without relying on the state from other tests.
2. **Mock Dependencies**: Use mocks to isolate the code under test.
3. **Descriptive Test Names**: Name tests clearly to describe the behavior being tested.
4. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification phases.
5. **Test Coverage**: Aim for high coverage, but prioritize testing critical business logic and edge cases. 