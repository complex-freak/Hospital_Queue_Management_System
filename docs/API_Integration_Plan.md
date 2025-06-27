# Hospital Queue Management API Integration Plan

## Overview

This document outlines the API integration requirements between the frontend web application and the backend API for the Hospital Queue Management System. It identifies all available backend API endpoints, compares them with the frontend application's needs, and specifies the changes required for seamless integration.

---

## 1. Authentication and User Management

### Web App Needs
- Staff/receptionist authentication
- Doctor authentication
- Token validation and refresh

### Backend API Endpoints
| Endpoint                                             | Method | Purpose                     | Required by Web App? | Status |
| ---------------------------------------------------- | ------ | --------------------------- | -------------------- | ------ |
| `/staff/login`                                      | POST   | Staff/receptionist login    | ✅ Yes               | ✅ Implemented |
| `/doctor/login`                                     | POST   | Doctor login                | ✅ Yes               | ✅ Implemented |
| `/admin/login`                                      | POST   | Admin login                 | ✅ Yes (admin panel) | ✅ Implemented |
| `/staff/me`, `/doctor/me`, `/admin/me`              | GET    | Get current user profile    | ✅ Yes               | ✅ Implemented |
| `/staff/logout`, `/doctor/logout`, `/admin/logout`  | POST   | Logout                      | ✅ Yes               | ✅ Implemented |

### Data Format Mapping
- Map backend fields to frontend fields (e.g., `phone_number` → `phoneNumber`, `first_name`/`last_name` → `firstName`/`lastName`/`fullName`).
- Ensure JWT and user profile structure matches frontend expectations.

### Implementation Notes
- Authentication is fully implemented in both frontend and backend
- JWT implementation is working correctly with proper token creation, verification, and password hashing
- Role-based access control is properly implemented in the backend dependencies.py file

---

## 2. Patient Management

### Web App Needs
- Get all patients (queued and historical)
- Register a new patient
- Save/get draft registration
- Update patient priority
- Remove patient from queue

### Backend API Endpoints
| Endpoint                            | Method | Purpose                      | Required by Web App? | Status |
| ----------------------------------- | ------ | ---------------------------- | -------------------- | ------ |
| `/staff/patients`                   | GET    | Get all patients             | ✅ Yes               | ✅ Implemented |
| `/staff/patients/register`          | POST   | Register a new patient       | ✅ Yes               | ✅ Implemented |
| `/staff/patients/drafts`            | POST   | Save draft registration      | ✅ Yes               | ✅ Implemented |
| `/staff/patients/drafts/{id}`       | GET    | Get draft registration       | ✅ Yes               | ✅ Implemented |
| `/staff/appointments/{id}/priority` | PATCH  | Update patient priority      | ✅ Yes               | ✅ Implemented |
| `/staff/appointments/{id}/cancel`   | POST   | Remove patient from queue    | ✅ Yes               | ✅ Implemented |

### Data Format Mapping
- Ensure all patient fields required by the frontend (priority, department, reason, vitalSigns, noteHistory) are present in backend responses or available via related endpoints.

### Implementation Notes
- Patient management is fully implemented in both frontend and backend
- Draft registration has localStorage fallback in the frontend for offline capability
- Priority management is working correctly with proper queue reordering

---

## 3. Queue Management

### Web App Needs
- Queue operations (fetch, update, statistics)
- Waiting time calculations
- Priority management

### Backend API Endpoints
| Endpoint                               | Method | Purpose                      | Required by Web App? | Status |
| -------------------------------------- | ------ | ---------------------------- | -------------------- | ------ |
| `/staff/queue`                         | GET    | Get queue status             | ✅ Yes               | ✅ Implemented |
| `/staff/queue/stats`                   | GET    | Get queue statistics         | ✅ Yes               | ✅ Implemented |
| `/staff/appointments`                  | GET    | Get all appointments         | ✅ Yes               | ✅ Implemented |
| `/staff/appointments`                  | POST   | Create appointment           | ✅ Yes               | ✅ Implemented |
| `/staff/queue/{queue_id}`              | PUT    | Update queue entry           | ✅ Yes               | ✅ Implemented |
| `/staff/queue/{queue_id}/call-next`    | POST   | Call next patient            | ✅ Yes               | ✅ Implemented |

### Data Format Mapping
- Ensure queue and appointment responses include `queueNumber`, `currentPosition`, `estimatedTime`, `doctorName` as required by the frontend.

### Implementation Notes
- Queue management is fully implemented in both frontend and backend
- Queue statistics endpoint provides all necessary information for the frontend dashboard
- Estimated wait time calculation is working correctly

---

## 4. Doctor Management

### Web App Needs
- Update doctor availability status
- Update doctor profile
- Get detailed patient information
- Save medical notes for a patient
- Get note history for a patient
- Save a new version of notes
- Submit consultation feedback

### Backend API Endpoints (Current & Needed)
| Endpoint                                         | Method | Purpose                       | Status      |
| ------------------------------------------------ | ------ | ----------------------------- | ----------- |
| `/doctor/status`                                 | POST   | Update doctor availability    | ❌ Missing  |
| `/doctor/profile`                                | PUT    | Update doctor profile         | ❌ Missing  |
| `/doctor/patients/{patient_id}`                  | GET    | Get patient details           | ✅ Implemented |
| `/doctor/patients/{patient_id}/notes`            | POST   | Save patient notes            | ❌ Missing  |
| `/doctor/patients/{patient_id}/notes/history`    | GET    | Get note history              | ❌ Missing  |
| `/doctor/patients/{patient_id}/notes/versions`   | POST   | Save note version             | ❌ Missing  |
| `/doctor/consultations`                          | POST   | Submit consultation feedback  | ❌ Missing  |
| `/doctor/queue`                                  | GET    | Get doctor queue              | ✅ Implemented |
| `/doctor/queue/next`                             | GET    | Get next patient              | ✅ Implemented |
| `/doctor/queue/{queue_id}/serve`                 | POST   | Mark patient as served        | ✅ Implemented |
| `/doctor/dashboard/stats`                        | GET    | Get doctor dashboard stats    | ✅ Implemented |
| `/doctor/appointments/history`                   | GET    | Get appointment history       | ✅ Implemented |

### Data Format Mapping
- Add/align fields for notes, note history, and consultation feedback as per frontend needs.

### Implementation Notes
- Basic doctor functionality is implemented, but note management and consultation feedback are missing
- Doctor dashboard statistics are implemented but may need adjustments to match frontend expectations
- Patient details endpoint needs to include more comprehensive information including medical history

---

## 5. Notification System

### Web App Needs
- Send notification(s) to patient(s)
- Get notification history
- Manage notification templates

### Backend API Endpoints (Current & Needed)
| Endpoint                                         | Method | Purpose                       | Status      |
| ------------------------------------------------ | ------ | ----------------------------- | ----------- |
| `/staff/notifications`                           | POST   | Send notification             | ❌ Missing  |
| `/staff/notifications/bulk`                      | POST   | Send bulk notifications       | ❌ Missing  |
| `/staff/notifications`                           | GET    | Get notification history      | ❌ Missing  |
| `/staff/notifications/patient/{patientId}`       | GET    | Get notification history for patient | ❌ Missing  |
| `/staff/notifications/templates`                 | POST   | Create template               | ❌ Missing  |
| `/staff/notifications/templates`                 | GET    | Get templates                 | ❌ Missing  |
| `/notifications/{id}/read`                       | PUT    | Mark notification as read     | ❌ Missing  |
| `/notifications/read-all`                        | PUT    | Mark all notifications as read| ❌ Missing  |

### Data Format Mapping
- Add `title`, `read`, and `type` fields to notification model/schema.
- Ensure `created_at` is mapped to `timestamp` in frontend.

### Implementation Notes
- Notification system is largely missing from the backend
- Frontend expects a comprehensive notification system with read/unread status
- Templates functionality is needed for efficient notification management

---

## 6. Data Model & Schema Updates Needed

### Patient Model Updates
- Add `priority` field to match frontend expectations
- Add `department` field to store department information
- Ensure `vitalSigns` are properly stored and retrieved
- Create `noteHistory` relationship for tracking patient notes

### Appointment Model Updates
- Ensure `queueNumber`, `currentPosition`, `estimatedTime`, `doctorName` are included in responses
- Add `diagnosis`, `treatment`, `prescription`, `followUpDate`, `duration` fields for consultation feedback

### New Models Needed
1. **Notes Model**
   - Fields: `id`, `patient_id`, `doctor_id`, `content`, `version`, `created_at`
   - Relationships: `patient`, `doctor`, `previous_version`

2. **NotificationTemplate Model**
   - Fields: `id`, `title`, `content`, `type`, `created_at`, `updated_at`
   - Used for storing reusable notification templates

3. **ConsultationFeedback Model**
   - Fields: `id`, `appointment_id`, `doctor_id`, `diagnosis`, `treatment`, `prescription`, `followUpDate`, `duration`, `created_at`
   - Relationships: `appointment`, `doctor`

### Schema Updates
- Update `Notification` schema to include `title`, `read`, and `type` fields
- Create new schemas for `Notes`, `NotificationTemplate`, and `ConsultationFeedback`
- Update `Patient` schema to include `priority`, `department`, `vitalSigns`, `noteHistory`

---

## 7. Endpoints/Models to Remove (Not Used in Web-App)

### Patient Endpoints (Mobile Only)
- `/patient/delete-account` - Not used in web app (keep for mobile)
- `/patient/change-password` - Not used in web app (keep for mobile)

### Admin Endpoints (Consider Keeping for Future Admin Panel)
- `/admin/users` - Keep for admin panel
- `/admin/doctors` - Keep for admin panel

### Other Endpoints to Review
- Any endpoints in `/sync.py` that are not used by the web app but may be needed for mobile

---

## 8. Implementation Priorities

1. **Add missing doctor management endpoints**
   - Implement `/doctor/status` for availability updates
   - Implement `/doctor/profile` for profile updates
   - Implement notes management endpoints
   - Implement consultation feedback endpoint

2. **Create notification system**
   - Implement all notification endpoints
   - Add notification templates functionality
   - Create notification read/unread status tracking

3. **Update data models and schemas**
   - Add missing fields to existing models
   - Create new models for notes, templates, and feedback
   - Update schemas to match frontend expectations

4. **Validate data transformations**
   - Ensure all snake_case to camelCase conversions are working
   - Verify date format consistency
   - Check that all required fields are present in responses

5. **Update tests and documentation**
   - Add tests for new endpoints
   - Update API documentation
   - Keep progress tracker updated

---

## 9. Next Steps

### Backend Tasks
- Implement missing doctor management endpoints
- Create notification system
- Update data models and schemas
- Add comprehensive tests

### Frontend Tasks
- Complete doctor service implementation
- Implement notification service
- Update data transformation utilities
- Add error handling and offline fallbacks

### Documentation Tasks
- Keep this plan updated as changes are made
- Update API documentation
- Update progress tracker 