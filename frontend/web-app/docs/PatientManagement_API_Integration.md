# Patient Management API Integration

This document outlines the integration between the frontend web application and backend API for patient management functionality.

## Implemented Endpoints

The following backend API endpoints have been implemented to support patient management:

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/staff/patients` | GET | Get all patients | ✅ Implemented |
| `/staff/patients/register` | POST | Register a new patient | ✅ Implemented |
| `/staff/patients/drafts` | POST | Save draft registration | ✅ Implemented |
| `/staff/patients/drafts/{id}` | GET | Get draft registration | ✅ Implemented |
| `/staff/appointments/{id}/priority` | PATCH | Update patient priority | ✅ Implemented |
| `/staff/appointments/{id}/cancel` | POST | Cancel appointment/remove from queue | ✅ Implemented |

## Frontend Service Integration

The `receptionist-service.ts` has been updated to integrate with these endpoints:

### Get All Patients

```typescript
getAllPatients: async () => {
  try {
    const response = await api.get('/staff/patients');
    
    return {
      success: true,
      data: Array.isArray(response.data) ? response.data.map((patient: any) => transformToFrontendUser(patient)) : [],
    };
  } catch (error) {
    console.error('Error fetching all patients:', error);
    return { success: false, error: 'Failed to fetch patients' };
  }
}
```

### Register Patient

```typescript
registerPatient: async (patientData: PatientRegistrationData) => {
  try {
    // Transform data to match backend schema
    const backendData = {
      first_name: patientData.firstName,
      last_name: patientData.lastName,
      // ... other fields ...
    };
    
    // Register the patient
    const registerResponse = await api.post('/staff/patients/register', backendData);
    
    // Create an appointment for the patient
    const appointmentData = {
      patient_id: registerResponse.data.id,
      reason: patientData.reason,
      urgency: mapPriorityToUrgency(patientData.priority),
      status: 'waiting'
    };
    
    const appointmentResponse = await api.post('/staff/appointments', appointmentData);
    
    return {
      success: true,
      data: {
        id: registerResponse.data.id,
        ...patientData,
        appointmentId: appointmentResponse.data.id,
        checkInTime: appointmentResponse.data.created_at,
      },
    };
  } catch (error: any) {
    console.error('Error registering patient:', error);
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Failed to register patient' 
    };
  }
}
```

### Save Patient Draft

```typescript
savePatientDraft: async (draftData: RegistrationDraft) => {
  try {
    // Save to the backend if API endpoint exists
    try {
      const response = await api.post('/staff/patients/drafts', {
        draft_id: draftData.draftId,
        data: draftData,
        last_updated: new Date().toISOString()
      });
      
      return {
        success: true,
        data: {
          ...draftData,
          lastUpdated: response.data.last_updated,
        },
      };
    } catch (backendError: any) {
      console.warn('Backend draft endpoint error:', backendError.message);
      
      // Fallback to localStorage if endpoint doesn't exist or fails
      localStorage.setItem('patientRegistrationDraft-' + draftData.draftId, JSON.stringify({
        ...draftData,
        lastUpdated: new Date().toISOString(),
      }));
      
      return {
        success: true,
        data: {
          ...draftData,
          lastUpdated: new Date().toISOString(),
        },
      };
    }
  } catch (error) {
    console.error('Error saving patient draft:', error);
    return { success: false, error: 'Failed to save draft' };
  }
}
```

### Get Patient Draft

```typescript
getPatientDraft: async (draftId: string) => {
  try {
    // Try to get from backend
    try {
      const response = await api.get(`/staff/patients/drafts/${draftId}`);
      
      if (response.data && response.data.data) {
        return {
          success: true,
          data: response.data.data,
        };
      }
      throw new Error('Invalid response format');
    } catch (backendError: any) {
      console.warn('Backend draft endpoint error:', backendError.message);
      
      // Fallback to localStorage
      const draftData = localStorage.getItem('patientRegistrationDraft-' + draftId);
      if (draftData) {
        const draft = JSON.parse(draftData);
        return {
          success: true,
          data: draft,
        };
      }
      
      return { success: false, error: 'Draft not found' };
    }
  } catch (error) {
    console.error('Error fetching patient draft:', error);
    return { success: false, error: 'Failed to fetch draft' };
  }
}
```

### Update Patient Priority

```typescript
updatePatientPriority: async (patientId: string, priority: string) => {
  try {
    const response = await api.patch(`/staff/appointments/${patientId}/priority`, { 
      urgency: mapPriorityToUrgency(priority)
    });
    
    return {
      success: true,
      data: { 
        id: patientId, 
        priority: priority,
        updatedAt: response.data.updated_at
      },
    };
  } catch (error: any) {
    console.error('Error updating patient priority:', error);
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Failed to update priority' 
    };
  }
}
```

### Remove From Queue

```typescript
removeFromQueue: async (appointmentId: string, reason: string) => {
  try {
    const response = await api.post(`/staff/appointments/${appointmentId}/cancel`, { 
      reason: reason 
    });
    
    return {
      success: true,
      data: { 
        id: appointmentId, 
        removed: true, 
        reason: reason,
        status: response.data.status || 'cancelled'
      },
    };
  } catch (error: any) {
    console.error('Error removing patient from queue:', error);
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Failed to remove patient' 
    };
  }
}
```

## Data Transformation

The integration uses data transformers to convert between backend and frontend data formats:

- `transformToFrontendUser`: Converts backend patient data to frontend user format
- `mapPriorityToUrgency`: Maps frontend priority levels to backend urgency levels

## Fallback Mechanisms

For draft registrations, a fallback to localStorage is implemented when the backend API is unavailable or fails.

## Testing

Integration tests have been created to verify the API integration. These tests mock the API responses and verify that:

1. The correct endpoints are called
2. Data is properly transformed
3. Responses are handled correctly
4. Errors are handled gracefully

## Next Steps

1. Implement proper error handling and retry mechanisms
2. Add caching for frequently accessed data
3. Implement offline support for critical operations
4. Add real-time updates using WebSockets 