# Hospital App Mobile Client API Integration Plan

## Overview

This document outlines the plan for integrating the hospital app's mobile client with the backend API. It maps the data needs of the mobile client to the available backend API endpoints, identifies data format discrepancies, and sets priorities for implementation.

## 1. Authentication & User Management

### Mobile App Needs

- User registration
- User login
- Profile retrieval
- Profile updates

### Backend API Endpoints

| Endpoint                     | Method | Purpose                | Required by Mobile? |
| ---------------------------- | ------ | ---------------------- | ------------------- |
| `/api/v1/patient/register` | POST   | Register new patient   | ✅ Yes              |
| `/api/v1/patient/login`    | POST   | Patient login          | ✅ Yes              |
| `/api/v1/patient/profile`  | GET    | Get patient profile    | ✅ Yes              |
| `/api/v1/patient/profile`  | PUT    | Update patient profile | ✅ Yes              |

### Data Format Mapping

#### User Type in Mobile App:

```typescript
export interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    isAuthenticated: boolean;
}
```

#### Patient Schema in Backend:

```python
class Patient(PatientBase, BaseSchema):
    id: UUID
    first_name: str
    last_name: str
    phone_number: str
    email: Optional[EmailStr]
    date_of_birth: Optional[datetime]
    gender: Optional[str]
    address: Optional[str]
    emergency_contact: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
```

#### Data Transformation Needed:

- Backend → Mobile:

  - `fullName = first_name + " " + last_name`
  - `phoneNumber = phone_number`
  - `isAuthenticated` is set to true after successful login
- Mobile → Backend:

  - On registration/profile update: Split `fullName` into `first_name` and `last_name`

## 2. Appointment & Queue Management

### Mobile App Needs

- Create appointment
- Check queue status
- Get appointment details
- Update appointment
- Cancel appointment

### Backend API Endpoints

| Endpoint                                     | Method | Purpose                      | Required by Mobile? |
| -------------------------------------------- | ------ | ---------------------------- | ------------------- |
| `/api/v1/patient/appointments`             | POST   | Create appointment           | ✅ Yes              |
| `/api/v1/patient/queue-status`             | GET    | Get current queue status     | ✅ Yes              |
| `/api/v1/patient/appointments`             | GET    | Get all patient appointments | ✅ Yes              |
| `/api/v1/patient/appointments/{id}`        | GET    | Get appointment details      | ✅ Yes              |
| `/api/v1/patient/appointments/{id}`        | PUT    | Update appointment           | ✅ Yes              |
| `/api/v1/patient/appointments/{id}/cancel` | PUT    | Cancel appointment           | ✅ Yes              |

### Data Format Mapping

#### Appointment Type in Mobile App:

```typescript
export interface Appointment {
    id: string;
    patientName: string;
    gender: Gender;
    dateOfBirth: string;
    phoneNumber: string;
    conditionType: ConditionType;
    queueNumber: number;
    currentPosition: number;
    estimatedTime: number;
    doctorName?: string;
    status: 'waiting' | 'ongoing' | 'completed' | 'cancelled';
    createdAt: string;
}

export type ConditionType = 'emergency' | 'elderly' | 'child' | 'normal';
export type Gender = 'male' | 'female';
```

#### Appointment & Queue Schema in Backend:

```python
class Appointment(AppointmentBase, BaseSchema):
    id: UUID
    patient_id: UUID
    doctor_id: Optional[UUID]
    appointment_date: datetime
    reason: Optional[str]
    urgency: UrgencyLevel  # 'emergency', 'high', 'normal', 'low'
    status: AppointmentStatus  # 'scheduled', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show'
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    patient: Patient
    doctor: Optional[Doctor]

class QueueStatusResponse(BaseModel):
    queue_position: int
    estimated_wait_time: Optional[int]
    current_serving: Optional[int]
    total_in_queue: int
    your_number: int
    status: QueueStatus  # 'waiting', 'called', 'in_progress', 'completed', 'skipped'
```

#### Data Transformation Needed:

- Backend → Mobile:

  - Map `urgency` ('emergency', 'high', 'normal', 'low') to `conditionType` ('emergency', 'elderly', 'child', 'normal')
  - Map `status` value formats
  - Combine appointment and queue data (queue number, position, estimated time)
  - Format doctor's name from Doctor object as `doctorName`
- Mobile → Backend:

  - Map `conditionType` to appropriate `urgency` value
  - Extract doctor information when available

## 3. Notifications

### Mobile App Needs

- Retrieve notifications
- Mark notifications as read
- Receive push notifications

### Backend API Endpoints

| Endpoint                                 | Method | Purpose                                | Required by Mobile?          |
| ---------------------------------------- | ------ | -------------------------------------- | ---------------------------- |
| `/api/patient/notifications`           | GET    | Get patient notifications              | ✅ Yes (needs to be created) |
| `/api/patient/notifications/{id}/read` | PUT    | Mark notification as read              | ✅ Yes (needs to be created) |
| `/api/patient/device-token`            | POST   | Register device for push notifications | ✅ Yes (needs to be created) |

### Data Format Mapping

#### Notification Type in Mobile App:

```typescript
export interface Notification {
    id: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
}
```

#### Notification Schema in Backend:

```python
class Notification(NotificationBase, BaseSchema):
    id: UUID
    patient_id: UUID
    type: NotificationType  # 'sms', 'push', 'email'
    recipient: str
    message: str
    subject: Optional[str]
    sent_at: Optional[datetime]
    status: str  # 'pending', 'sent', 'failed'
    error_message: Optional[str]
    created_at: datetime
```

#### Data Transformation Needed:

- Backend → Mobile:

  - `title = subject` (or use a default if null)
  - Need to add `read` status to backend schema
  - `createdAt = created_at` (with proper date formatting)
- Mobile → Backend:

  - Need to track read status per notification

## 4. Missing Endpoints

The following endpoints need to be added to the backend to fully support the mobile app:

1. **Notifications API**:

   - GET `/api/patient/notifications` - Retrieve patient notifications
   - PUT `/api/patient/notifications/{id}/read` - Mark notification as read
   - POST `/api/patient/device-token` - Register device token for push notifications
2. **Settings API**:

   - GET `/api/patient/settings` - Get patient app settings
   - PUT `/api/patient/settings` - Update patient app settings

## 5. Implementation Priorities

1. **Phase 1: Core Authentication**

   - Patient registration
   - Patient login
   - Profile retrieval
   - Profile updates
2. **Phase 2: Queue & Appointments**

   - Create appointment
   - Check queue status
   - View appointments
   - Cancel appointment
3. **Phase 3: Notifications**

   - Backend notification endpoints implementation
   - Notification retrieval
   - Push notification setup
4. **Phase 4: Settings & Enhancements**

   - Patient settings
   - Appointment modifications
   - Offline support & syncing

## 6. API Service Implementation Plan

1. Create the API service directory structure:

   ```
   /src/services/
     ├── api/
     │     ├── index.ts        # Exports & config
     │     ├── auth.ts         # Authentication API
     │     ├── appointments.ts # Appointment & queue API
     │     ├── notifications.ts # Notifications API
     │     └── settings.ts     # Settings API
     ├── storage/
     │     ├── index.ts        # Storage service exports
     │     └── storage.ts      # AsyncStorage enhanced wrapper
     └── index.ts              # Main service exports
   ```
2. Implement HttpClient class with:

   - Token management
   - Refresh token mechanism
   - Request/response interceptors
   - Error handling
3. Implement individual API services connected to context providers
4. Add Connectivity service for:

   - Online/offline detection
   - Request queueing
   - Background sync

## 7. Data Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│ UI/Screens │◄────┤  Contexts  │◄────┤API Services│◄────┤   Backend  │
└────────────┘     └────────────┘     └────────────┘     └────────────┘
      ▲                  ▲                  ▲                  │
      │                  │                  │                  │
      └──────────────────┴──────────────────┴──────────────────┘
                         Data Flow
```

- UI components use context hooks to access data and actions
- Context providers interact with API services for data
- API services handle communication with backend endpoints
- Cached data flows back to contexts through AsyncStorage when offline

## 8. Next Steps

1. Create services directory structure
2. Implement HttpClient base class
3. Implement first authentication services
4. Connect AuthContext to auth services
5. Progressively implement other service integrations
