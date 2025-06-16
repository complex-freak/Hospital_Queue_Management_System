// Mock for notification service
export const notificationService = {
  // Core notification handling
  addNotification: jest.fn().mockImplementation((title, message, type = 'info') => {
    const id = `notification-${Date.now()}`;
    return {
      id,
      title,
      message,
      type,
      read: false,
      timestamp: Date.now(),
    };
  }),
  getNotifications: jest.fn().mockReturnValue([]),
  getUnreadCount: jest.fn().mockReturnValue(0),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  removeNotification: jest.fn(),
  clearAllNotifications: jest.fn(),
  
  // System notification methods
  requestPermission: jest.fn().mockResolvedValue('granted'),
  showSystemNotification: jest.fn(),
  
  // Event-specific notification methods
  notifyPatientAdded: jest.fn().mockImplementation((patientName) => {
    return {
      id: `notification-${Date.now()}`,
      title: 'New Patient Added',
      message: `Patient ${patientName} has been added to the queue.`,
      type: 'success',
      read: false,
      timestamp: Date.now(),
    };
  }),
  notifyPatientRemoved: jest.fn().mockImplementation((patientName) => {
    return {
      id: `notification-${Date.now()}`,
      title: 'Patient Removed',
      message: `Patient ${patientName} has been removed from the queue.`,
      type: 'info',
      read: false,
      timestamp: Date.now(),
    };
  }),
  notifyPriorityChanged: jest.fn().mockImplementation((patientName, priority) => {
    return {
      id: `notification-${Date.now()}`,
      title: 'Priority Changed',
      message: `${patientName}'s priority has been changed to ${priority}.`,
      type: 'info',
      read: false,
      timestamp: Date.now(),
    };
  }),
  notifyDoctorAssigned: jest.fn().mockImplementation((patientName, doctorName) => {
    return {
      id: `notification-${Date.now()}`,
      title: 'Doctor Assigned',
      message: `${patientName} has been assigned to ${doctorName}.`,
      type: 'info',
      read: false,
      timestamp: Date.now(),
    };
  }),
  notifyLongWaitTime: jest.fn().mockImplementation((patientName, waitTime) => {
    return {
      id: `notification-${Date.now()}`,
      title: 'Long Wait Time',
      message: `${patientName} has been waiting for ${waitTime}.`,
      type: 'warning',
      read: false,
      timestamp: Date.now(),
    };
  }),
  notifyOfflineAction: jest.fn().mockImplementation((actionType) => {
    return {
      id: `notification-${Date.now()}`,
      title: 'Offline Action Queued',
      message: `The ${actionType} action will be processed when connection is restored.`,
      type: 'info',
      read: false,
      timestamp: Date.now(),
    };
  }),
}; 