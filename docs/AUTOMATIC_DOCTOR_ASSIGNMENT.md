# Automatic Doctor Assignment Feature

## Overview

This feature automatically assigns available doctors to appointments when they are created, ensuring efficient patient care and optimal resource utilization.

## Implementation Details

### 1. New Method: `assign_available_doctor`

**Location**: `backend/services/queue_service.py`

**Purpose**: Intelligently assigns doctors based on:
- Department preferences (extracted from appointment reason)
- Current queue load (doctors with fewer patients get priority)
- Doctor availability status

**Parameters**:
- `db`: Database session
- `appointment`: Appointment object
- `preferred_department`: Optional department preference

**Logic**:
1. First tries to find doctors in the preferred department with the least queue
2. Falls back to general assignment if no preferred department doctors are available
3. Uses simple fallback if any errors occur

### 2. Enhanced Department Detection

The system automatically detects department preferences from appointment reasons:

- **Cardiology**: Keywords like "cardio", "chest pain", "heart"
- **Orthopedics**: Keywords like "ortho", "knee", "joint", "bone"
- **Pediatrics**: Keywords like "pediatric", "child", "baby"
- **Emergency**: Keywords like "emergency", "urgent"

### 3. Updated Appointment Creation Endpoints

#### Staff Endpoint (`backend/api/routes/staff.py`)
- Uses the new `assign_available_doctor` method
- Creates temporary appointment object for doctor assignment
- Extracts department preferences from appointment reason
- Provides better logging and error handling

#### Patient Endpoint (`backend/api/routes/patient.py`)
- Uses the new `assign_available_doctor` method
- Creates temporary appointment object for doctor assignment
- Extracts department preferences from appointment reason
- Maintains backward compatibility

#### Queue Service (`backend/services/queue_service.py`)
- Enhanced `add_to_queue` method uses the new assignment logic
- Automatically assigns doctors if not already assigned
- Updates appointment with assigned doctor
- Provides comprehensive logging

## Benefits

1. **Efficient Resource Utilization**: Doctors are assigned based on current workload
2. **Specialized Care**: Patients are matched with appropriate department doctors when possible
3. **Reduced Wait Times**: Load balancing ensures no single doctor is overwhelmed
4. **Automatic Fallback**: System gracefully handles cases where preferred doctors aren't available
5. **Backward Compatibility**: Existing functionality remains unchanged

## Usage Examples

### Creating an appointment with automatic doctor assignment:

```python
# The system will automatically:
# 1. Extract department preference from reason
# 2. Find available doctors in that department
# 3. Choose the doctor with the least queue
# 4. Assign the doctor to the appointment

appointment_data = {
    "patient_id": patient_id,
    "reason": "Chest pain and cardiovascular symptoms",  # Will prefer Cardiology
    "urgency": "high",
    "appointment_date": datetime.now()
}

# Doctor will be automatically assigned during appointment creation
```

### Department preference examples:

```python
# Cardiology preference
reason = "Chest pain and cardiovascular symptoms"
# System will prefer doctors in Cardiology department

# Orthopedics preference  
reason = "Knee pain and joint issues"
# System will prefer doctors in Orthopedics department

# General consultation
reason = "General checkup"
# System will assign any available doctor
```

## Configuration

The department detection can be easily extended by adding more keyword mappings in the appointment creation endpoints:

```python
if "cardio" in appointment_data.reason.lower():
    preferred_department = "Cardiology"
elif "ortho" in appointment_data.reason.lower():
    preferred_department = "Orthopedics"
# Add more mappings as needed
```

## Testing

A test script is provided at `test_doctor_assignment.py` to verify the functionality:

```bash
cd backend
python ../test_doctor_assignment.py
```

## Error Handling

The system includes comprehensive error handling:

1. **No doctors available**: Logs warning and continues without assignment
2. **Database errors**: Graceful fallback to simple doctor selection
3. **Invalid department**: Falls back to general assignment
4. **Missing data**: Handles gracefully with appropriate defaults

## Logging

The system provides detailed logging for debugging and monitoring:

- Doctor assignment decisions
- Department preference detection
- Queue load analysis
- Error conditions and fallbacks

## Future Enhancements

Potential improvements for future versions:

1. **Machine Learning**: Use ML to better predict doctor-patient matches
2. **Specialty Matching**: More sophisticated specialty detection
3. **Load Balancing**: Advanced algorithms for optimal distribution
4. **Patient History**: Consider patient's previous doctor preferences
5. **Time-based Assignment**: Consider doctor schedules and availability times 