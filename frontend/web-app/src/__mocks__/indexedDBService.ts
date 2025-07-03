// Mock for indexedDBService
export const indexedDBService = {
  // Patient methods
  getAllPatients: jest.fn().mockResolvedValue([]),
  getPatientsByStatus: jest.fn().mockResolvedValue([]),
  getPatient: jest.fn().mockResolvedValue(null),
  savePatient: jest.fn().mockImplementation((patient) => Promise.resolve({ ...patient, lastUpdated: Date.now() })),
  removePatient: jest.fn().mockImplementation((id) => Promise.resolve(id)),

  // Pending actions methods
  addPendingAction: jest.fn().mockImplementation((action, payload) => 
    Promise.resolve({ id: `${action}_${Date.now()}`, action, payload, timestamp: Date.now() })
  ),
  getAllPendingActions: jest.fn().mockResolvedValue([]),
  removePendingAction: jest.fn().mockImplementation((id) => Promise.resolve(id)),

  // Doctor methods
  getAllDoctors: jest.fn().mockResolvedValue([]),
  saveDoctor: jest.fn().mockImplementation((doctor) => Promise.resolve({ ...doctor, lastUpdated: Date.now() })),

  // Utility methods
  clearAllData: jest.fn().mockResolvedValue(undefined),
  syncWithServer: jest.fn().mockResolvedValue(undefined),
}; 