# Hospital App Mobile API Integration

This directory contains the API service implementations for the Hospital App mobile client.

## Services Overview

The API services are organized into domain-specific services, each responsible for a particular feature area:

- **auth.ts**: Authentication and user profile management
- **appointments.ts**: Appointment booking and queue status management
- **notifications.ts**: User notifications and device token registration
- **settings.ts**: User app preferences and settings

## Architecture

Each service follows a consistent pattern:

1. Type definitions for API requests and responses
2. A class with methods to interact with backend API endpoints
3. Data transformation functions to convert between backend and frontend data formats
4. A singleton instance export

## Data Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│ UI/Screens │◄────┤  Contexts  │◄────┤API Services│◄────┤   Backend  │
└────────────┘     └────────────┘     └────────────┘     └────────────┘
      ▲                  ▲                  ▲                  │
      │                  │                  │                  │
      └──────────────────┴──────────────────┴──────────────────┘
                         Data Flow
```

## Implementation Status

### Phase 1: Core Authentication (Completed)

- ✅ Patient registration
- ✅ Patient login
- ✅ Profile retrieval
- ✅ Profile updates

### Phase 2: Queue & Appointments (In Progress)

- ✅ Create appointment
- ✅ Check queue status
- ✅ View appointments
- ✅ Cancel appointment

### Phase 3: Notifications (Implemented, awaiting backend endpoints)

- ⚠️ Backend notification endpoints implementation
- ✅ Notification retrieval service
- ⚠️ Push notification setup

### Phase 4: Settings & Enhancements (Implemented, awaiting backend endpoints)

- ✅ Patient settings service
- ✅ Offline support (AsyncStorage caching)

## API Endpoint Mapping

| Frontend Path                         | Backend Endpoint                  | Status       |
| ------------------------------------- | --------------------------------- | ------------ |
| `/api/v1/patients/register`         | `/api/v1/patient/register`      | ✅ Working   |
| `/api/v1/patients/login`            | `/api/v1/patient/login`         | ✅ Working   |
| `/api/v1/patients/profile`          | `/api/v1/patient/profile`       | ✅ Working   |
| `/api/v1/patients/complete-profile` | `/api/v1/patient/profile` (PUT) | ✅ Working   |
| `/api/v1/patients/appointments`     | `/api/v1/patient/appointments`  | ✅ Working   |
| `/api/v1/patients/queue-status`     | `/api/v1/patient/queue-status`  | ✅ Working   |
| `/api/v1/patients/notifications`    | N/A (Awaiting backend)            | ⚠️ Pending |
| `/api/v1/patients/device-token`     | N/A (Awaiting backend)            | ⚠️ Pending |
| `/api/v1/patients/settings`         | N/A (Awaiting backend)            | ⚠️ Pending |

## Usage Example

```typescript
import { authService } from '../services';

// Login
const loginResponse = await authService.login({
  phone_number: '+1234567890',
  password: 'securePassword123'
});

// Get profile after login
if (loginResponse.isSuccess) {
  const profileResponse = await authService.getProfile();
  if (profileResponse.isSuccess) {
    // Transform to frontend model
    const user = authService.transformUserResponse(profileResponse.data);
    // Use user data...
  }
}
```

## Future Enhancements

1. Add refresh token mechanism
2. Implement request queueing for offline operations
3. Add request retry logic for network failures
4. Implement comprehensive error handling with user-friendly messages
