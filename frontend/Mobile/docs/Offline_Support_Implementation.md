# Offline Support Implementation

## Overview

This document outlines the implementation of offline support capabilities in the Hospital App mobile client. These features allow users to continue using critical app functionality even when they have no internet connection, with data synchronized once connectivity is restored.

## Key Components

### 1. Connectivity Monitoring

The `connectivityService` monitors network status changes and triggers appropriate actions:

- Detects when the device goes offline or comes back online
- Notifies UI components about connectivity changes
- Triggers data synchronization when the connection is restored

### 2. Data Synchronization

The `syncService` manages the offline action queue:

- Queues API requests that fail due to connectivity issues
- Stores pending actions in AsyncStorage
- Attempts to process pending actions when connectivity is restored
- Reports success/failure of sync attempts

### 3. Enhanced HTTP Client

The HTTP client has been extended with offline-aware methods:

- `postWithOfflineSupport`: Tries to make a POST request, queues if offline
- `putWithOfflineSupport`: Similar functionality for PUT requests
- `deleteWithOfflineSupport`: Similar functionality for DELETE requests

### 4. User Interface Updates

- `NetworkStatusBar`: Shows network status to keep users informed
- Offline indicators in relevant screens
- Optimistic UI updates for actions queued offline

## Implementation Details

### API Services Using Offline Support

The following API operations support offline functionality:

1. **Appointments**:
   - Creating new appointments
   - Updating appointment details
   - Canceling appointments

2. **Profile Updates**:
   - Updating user profile information
   - Changing settings

### Data Flow in Offline Mode

```
┌───────────────┐     ┌────────────┐     ┌────────────────────┐
│ User Action   │────▶│ API Service │────▶│ Check Connectivity │
└───────────────┘     └────────────┘     └────────────────────┘
                                                   │
                                                   ▼
┌────────────────┐     ┌────────────┐     ┌────────────────┐
│  AsyncStorage  │◀────┤ Sync Queue  │◀────┤ No Connection │
└────────────────┘     └────────────┘     └────────────────┘
        │
        │                                 ┌─────────────────┐
        └────────────────────────────────▶│ Connection Back │
                                         └─────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │ Process Queue   │
                                         └─────────────────┘
```

## Usage Example

Services can be used the same way, whether offline or online:

```typescript
// This will work in both online and offline modes
const createAppointment = async () => {
  try {
    const response = await appointmentService.createAppointment({
      urgency: 'normal',
      reason: 'Regular checkup',
      appointment_date: new Date().toISOString(),
    });
    
    if (response.isSuccess) {
      // Update UI optimistically
      // If offline, response will have status 202
      if (response.status === 202) {
        showMessage('Appointment will be created when back online');
      } else {
        showMessage('Appointment created successfully');
      }
    }
  } catch (error) {
    console.error('Error creating appointment:', error);
  }
};
```

## Testing Offline Mode

1. Enable airplane mode on the device
2. Perform actions in the app (create appointment, update profile, etc.)
3. Disable airplane mode
4. Observe the app automatically syncing data with the backend

## Future Improvements

1. **Conflict Resolution**: Implement strategies for handling conflicts when offline changes conflict with server state
2. **Selective Sync**: Allow users to choose which data types to sync
3. **Background Sync**: Implement periodic sync attempts in the background
4. **Sync Status Dashboard**: Provide users with visibility into pending sync operations 