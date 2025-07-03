# API Integration Implementation

This directory contains the API service implementations for the Hospital Queue Management System. These services handle communication between the frontend web app and the backend API.

## Core Components

### API Client (`client.ts`)
- Base Axios client with configuration
- Token management and authorization headers
- Token refresh functionality
- Error handling and toast notifications
- Request/response interceptors

### Data Transformers (`data-transformers.ts`)
- Conversion utilities between backend and frontend data models
- Type definitions matching frontend models
- Backend → Frontend transformers for User, Appointment, and Notification data
- Frontend → Backend transformers for data submission

### Authentication Service (`auth-service.ts`)
- User authentication (login/logout)
- Role-based authentication (staff, doctor)
- Token storage management
- User registration (admin functionality)
- Password management

## API Services

- **Auth Service**: User authentication and management
- **Receptionist Service**: Patient registration and management
- **Doctor Service**: Doctor-specific functionality
- **Queue Service**: Queue and appointment management
- **Notification Service**: System notifications

## Usage

### Authentication

```typescript
// User login
import { authService } from '@/services/api';

const loginUser = async (username, password) => {
  const result = await authService.login({ username, password });
  if (result.success) {
    // Handle successful login
    console.log('Logged in user:', result.data.user);
  } else {
    // Handle login error
    console.error('Login failed:', result.error);
  }
};

// Check authentication status
const isLoggedIn = authService.isAuthenticated();

// Get current user
const currentUser = authService.getCurrentUser();

// Logout
authService.logout();
```

### Data Transformation

The data transformers handle the conversion between backend and frontend data models:

```typescript
import { transformToFrontendUser, transformToBackendUserData } from '@/services/api/data-transformers';

// Convert backend user data to frontend format
const frontendUser = transformToFrontendUser(backendUserData);

// Convert frontend user data to backend format
const backendData = transformToBackendUserData(frontendUserData);
```

## Authentication Context

The authentication context provides a React context for managing authentication state throughout the application. It handles:

- User authentication state
- Login/logout functionality
- Error handling
- User data updates

```typescript
// In a React component
import { useAuth } from '@/context/auth-context';

const MyComponent = () => {
  const { user, isAuthenticated, login, logout, error } = useAuth();

  const handleLogin = async () => {
    const success = await login(username, password);
    if (success) {
      // Redirect or show success message
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user?.fullName}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <LoginForm onSubmit={handleLogin} error={error} />
      )}
    </div>
  );
};
```

## Next Steps

1. Implement the remaining API services:
   - Update `receptionist-service.ts` to use real API endpoints
   - Update `doctor-service.ts` to use real API endpoints
   - Complete notification service integration

2. Integrate authentication with the frontend UI:
   - Add login pages
   - Implement protected routes
   - Add user profile management 