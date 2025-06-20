# Hospital Queue Management API Integration Plan

## Overview

This document outlines the API integration requirements between the frontend web application and the backend API for the Hospital Queue Management System. The purpose is to identify all available backend API endpoints, compare them with the frontend application's needs, and identify any gaps or modifications required for seamless integration.

## 1. Authentication and User Management

### Web App Needs

- Staff/receptionist authentication
- Doctor authentication
- Token validation and refresh

### Backend API Endpoints

| Endpoint                                             | Method | Purpose                     | Required by Web App? |
| ---------------------------------------------------- | ------ | --------------------------- | -------------------- |
| `/patient/login`                                   | POST   | Patient authentication      | ❌ No                |
| `/patient/register`                                | POST   | Patient registration        | ❌ No                |
| Inferred staff/doctor endpoints from dependencies.py | POST   | Staff/doctor authentication | ✅ Yes               |

### Data Format Mapping

#### User Type in Frontend:

```typescript
export interface User {
    id: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    phoneNumber: string;
    isAuthenticated: boolean;
    isProfileComplete?: boolean;
    email?: string;
    gender?: 'male' | 'female' | 'other';
    dateOfBirth?: string;
    address?: string;
    emergencyContact?: string;
    emergencyContactName?: string;
    emergencyContactRelationship?: string;
}
```

#### Patient/User Schema in Backend:

```python
class Patient(BaseModel):
    id: UUID
    phone_number: str
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
```

#### Data Transformation Needed:

- Backend → Frontend:
- Map `phone_number` to `phoneNumber`
- Map `first_name` to `firstName`
- Map `last_name` to `lastName`
- Combine `first_name` and `last_name` to create `fullName`
- Map `date_of_birth` to `dateOfBirth` (with string formatting)
- Add `isAuthenticated` and `isProfileComplete` fields
- Ensure consistent gender enumeration
- Frontend → Backend:

  - Split name fields if only `fullName` is provided
  - Convert date formats as needed

## 2. Patient Management

### Web App Needs

- Get all patients (both queued and historical)
- Register a new patient
- Save draft registration
- Get a draft registration
- Update patient priority
- Remove patient from queue

### Backend API Endpoints

| Endpoint                            | Method | Purpose                      | Required by Web App?         |
| ----------------------------------- | ------ | ---------------------------- | ---------------------------- |
| `/patient/register`               | POST   | Register a new patient       | ✅ Yes                       |
| `/patient/complete-profile`       | POST   | Complete patient profile     | ✅ Yes                       |
| `/patient/profile`                | GET    | Get patient profile          | ✅ Yes                       |
| `/patient/profile`                | PUT    | Update patient profile       | ✅ Yes                       |
| `/patient/delete-account`         | DELETE | Delete patient account       | ❌ No                        |
| `/patient/change-password`        | POST   | Change patient password      | ❌ No                        |
| No endpoint for draft registrations | -      | Save/get draft registrations | ✅ Yes (needs to be created) |
| No endpoint for all patients        | -      | Get all patients             | ✅ Yes (needs to be created) |
| No endpoint for priority updates    | -      | Update patient priority      | ✅ Yes (needs to be created) |

### Data Format Mapping

This section already covered in the Authentication and User Management section.

## 3. Queue Management

### Web App Needs

- Queue operations (inferred from frontend service)
- Waiting time calculations
- Priority management

### Backend API Endpoints

| Endpoint                               | Method | Purpose                      | Required by Web App?         |
| -------------------------------------- | ------ | ---------------------------- | ---------------------------- |
| `/patient/queue-status`              | GET    | Get queue status for patient | ✅ Yes                       |
| `/doctor/queue`                      | GET    | Get queue for current doctor | ✅ Yes                       |
| `/doctor/queue/next`                 | GET    | Get next patient in queue    | ✅ Yes                       |
| `/doctor/queue/{queue_id}/serve`     | POST   | Mark patient as served       | ✅ Yes                       |
| No endpoint for queue position updates | -      | Update queue positions       | ✅ Yes (needs to be created) |

### Data Format Mapping

#### Appointment Type in Frontend:

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
    status: 'scheduled' | 'waiting' | 'ongoing' | 'completed' | 'cancelled';
    createdAt: string;
}
```

#### Appointment Schema in Backend:

```python
class Appointment(AppointmentBase, BaseSchema):
    id: UUID
    patient_id: UUID
    doctor_id: Optional[UUID] = None
    created_by: Optional[UUID] = None
    status: AppointmentStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    patient: Patient
    doctor: Optional[Doctor] = None
```

#### Data Transformation Needed:

- Backend → Frontend:
- Extract `patientName` from `patient.first_name` and `patient.last_name`
- Extract `gender` from `patient.gender`
- Extract `dateOfBirth` from `patient.date_of_birth` (with string formatting)
- Extract `phoneNumber` from `patient.phone_number`
- Map `urgency` to `conditionType` (backend uses UrgencyLevel, frontend uses ConditionType)
- Obtain `queueNumber` from related queue entry
- Calculate `currentPosition` based on queue position
- Map `created_at` to `createdAt` (with string formatting)
- Extract `doctorName` from `doctor.user.first_name` and `doctor.user.last_name`
- Map status values between backend and frontend enums
- Frontend → Backend:

  - Map `conditionType` to the backend's `urgency` enum values
  - Convert status values to the backend's status enum format

## 4. Doctor Management

### Web App Needs

- Update doctor availability status
- Update doctor profile
- Get detailed patient information
- Save medical notes for a patient
- Get note history for a patient
- Save a new version of notes
- Submit consultation feedback

### Backend API Endpoints

| Endpoint                              | Method | Purpose                       | Required by Web App?         |
| ------------------------------------- | ------ | ----------------------------- | ---------------------------- |
| `/doctor/queue`                     | GET    | Get doctor's queue            | ✅ Yes                       |
| `/doctor/queue/next`                | GET    | Get next patient              | ✅ Yes                       |
| `/doctor/queue/{queue_id}/serve`    | POST   | Mark patient as served        | ✅ Yes                       |
| `/doctor/patients/{patient_id}`     | GET    | Get patient details           | ✅ Yes                       |
| `/doctor/appointments/history`      | GET    | Get appointment history       | ✅ Yes                       |
| `/doctor/dashboard/stats`           | GET    | Get doctor dashboard stats    | ✅ Yes                       |
| No endpoint for doctor status         | -      | Update doctor availability    | ✅ Yes (needs to be created) |
| No endpoint for note history          | -      | Get note history and versions | ✅ Yes (needs to be created) |
| No endpoint for consultation feedback | -      | Submit consultation feedback  | ✅ Yes (needs to be created) |

### Data Format Mapping

Doctor profile and related data models will need to be defined based on the frontend requirements, as they aren't fully detailed in the existing code samples.

## 5. Notification System

### Web App Needs

- Create a notification
- Add a notification
- Get all notifications
- Mark notification as read
- Mark all notifications as read
- Clear all notifications

### Backend API Endpoints

| Endpoint                           | Method | Purpose                 | Required by Web App?         |
| ---------------------------------- | ------ | ----------------------- | ---------------------------- |
| No specific notification endpoints | -      | Notification management | ✅ Yes (needs to be created) |

### Data Format Mapping

#### Notification Type in Frontend:

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
    sent_at: Optional[datetime] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
```

#### Data Transformation Needed:

- Backend → Frontend:
- Add `title` field to backend model
- Convert `created_at` to `createdAt` (with string formatting)
- Add `read` status field to backend model
- Frontend → Backend:

  - Need to track read status for notifications
  - Need to add title field in backend

## 6. Missing Endpoints

The following endpoints need to be added to the backend to fully support the web application:

1. **Patient Management**:

   - GET `/staff/patients` - Get all patients
   - POST `/staff/patients/drafts` - Save draft registration
   - GET `/staff/patients/drafts/{id}` - Get draft registration
   - PATCH `/patients/{id}/priority` - Update patient priority
2. **Doctor Management**:

   - POST `/doctor/status` - Update doctor availability status
   - PUT `/doctor/profile` - Update doctor profile
   - POST `/patients/{id}/notes` - Save patient notes
   - GET `/patients/{id}/notes/history` - Get note history
   - POST `/patients/{id}/notes/versions` - Save note version
   - POST `/consultations` - Submit consultation feedback
3. **Notification System**:

   - GET `/notifications` - Get notifications
   - PUT `/notifications/{id}/read` - Mark notification as read
   - PUT `/notifications/read-all` - Mark all notifications as read
   - DELETE `/notifications` - Clear all notifications

## 7. Implementation Priorities

1. **Phase 1: Authentication and User Base**

   - Implement proper authentication service in the web app
   - Align frontend authentication flow with backend JWT strategy
   - Implement token refresh mechanisms
2. **Phase 2: Core Data Model Alignment**

   - Create data transformation services to convert between backend and frontend data models
   - Implement adapter functions for each model (Patient/User, Appointment, Notification)
   - Update backend models to include missing frontend fields
3. **Phase 3: API Endpoint Implementation**

   - Enhance backend API to support:
   - Draft patient registrations
   - Doctor note history and versions
   - Consultation feedback submission
   - Notification REST endpoints
   - Update frontend services to connect to the corresponding backend endpoints:
   - Update `receptionist-service.ts` to use real API endpoints
   - Update `doctor-service.ts` to use real API endpoints
   - Implement a notification service using real API endpoints
4. **Phase 4: Testing and Validation**

   - Create integration tests for each API endpoint
   - Validate data flow between frontend and backend
   - Test error handling scenarios

## 8. API Service Implementation Plan

1. Create the API service directory structure:

   ```
   /src/services/api/
     ├── client.ts            # Base API client with auth handling
     ├── index.ts             # Exports & config
     ├── receptionist-service.ts  # Patient & registration API
     ├── doctor-service.ts    # Doctor-specific API
     ├── queue-service.ts     # Queue management API
     └── notification-service.ts  # Notifications API
   ```
2. Implement API client with:

   - Token management
   - Request/response interceptors
   - Error handling with toast notifications
3. Update individual services to connect to real endpoints
4. Add data transformation utilities for converting between backend and frontend data models

## 9. Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ UI/Components│◄────┤State/Context│◄────┤API Services │◄────┤Backend API  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      ▲                   ▲                  ▲                   │
      │                   │                  │                   │
      └───────────────────┴──────────────────┴───────────────────┘
                          Data Flow
```

- UI components use context/state management to access data and actions
- Context providers interact with API services for data
- API services handle communication with backend endpoints
- Error handling and notifications are managed at the service layer

## 10. Conclusion

The frontend and backend components share similar data models and functionality, but several misalignments need to be addressed. The main gaps are in naming conventions, field structure, and some missing API endpoints. By following the implementation plan outlined above, we can achieve a seamless integration between the frontend web application and the backend API.

Key priorities for alignment are:

1. Creating a proper authentication service in the frontend
2. Aligning data models between frontend and backend
3. Adding missing API endpoints for features like draft registrations and note history
4. Ensuring consistent API response formats that match frontend expectations

## 11. Next Steps

1. Create services directory structure
2. Implement base API client with authentication
3. Update receptionist service to use real endpoints
4. Connect doctor service to backend
5. Implement notification management
6. Request backend team to add missing endpoints
