import { QueueService } from '../../../services/queueService';
import { Patient, PriorityLevel } from '../../../types/patient';
import { IndexedDBService } from '../../../services/indexedDBService';

// Mock IndexedDBService
jest.mock('../../../services/indexedDBService', () => ({
  IndexedDBService: {
    saveQueue: jest.fn(),
    getQueue: jest.fn(),
    updatePatientStatus: jest.fn(),
  },
}));

describe('QueueService', () => {
  let queueService: QueueService;
  const mockPatients: Patient[] = [
    {
      id: '1',
      name: 'John Doe',
      priority: 'Medium',
      status: 'waiting',
      registeredTime: new Date(),
      department: 'general',
      reason: 'Fever and headache',
      checkInTime: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Jane Smith',
      priority: 'High',
      status: 'in-progress',
      registeredTime: new Date(),
      department: 'cardiology',
      reason: 'Chest pain',
      checkInTime: new Date().toISOString(),
    },
  ];
  
  beforeEach(() => {
    queueService = new QueueService();
    jest.clearAllMocks();
    
    // Reset any event listeners/subscribers
    jest.spyOn(queueService, 'notifySubscribers').mockImplementation();
    
    // Setup default mock return values
    (IndexedDBService.getQueue as jest.Mock).mockResolvedValue(mockPatients);
  });
  
  test('should get queue', async () => {
    const result = await queueService.getQueue();
    
    expect(IndexedDBService.getQueue).toHaveBeenCalled();
    expect(result).toEqual(mockPatients);
  });
  
  test('should add patient to queue', async () => {
    const newPatient: Patient = {
      id: '3',
      name: 'Robert Johnson',
      priority: 'Low',
      status: 'waiting',
      registeredTime: new Date(),
      department: 'orthopedics',
      reason: 'Back pain',
      checkInTime: new Date().toISOString(),
    };
    
    await queueService.addPatient(newPatient);
    
    expect(IndexedDBService.saveQueue).toHaveBeenCalledWith([...mockPatients, newPatient]);
    expect(queueService.notifySubscribers).toHaveBeenCalled();
  });
  
  test('should update patient status', async () => {
    const patientId = '1';
    const newStatus = 'completed';
    
    await queueService.updatePatientStatus(patientId, newStatus);
    
    expect(IndexedDBService.updatePatientStatus).toHaveBeenCalledWith(patientId, newStatus);
    expect(queueService.notifySubscribers).toHaveBeenCalled();
  });
  
  test('should remove patient from queue', async () => {
    const patientId = '1';
    const expectedUpdatedQueue = mockPatients.filter(p => p.id !== patientId);
    
    await queueService.removePatient(patientId);
    
    expect(IndexedDBService.saveQueue).toHaveBeenCalledWith(expectedUpdatedQueue);
    expect(queueService.notifySubscribers).toHaveBeenCalled();
  });
  
  test('should reorder queue', async () => {
    const reorderedQueue = [...mockPatients].reverse();
    
    await queueService.reorderQueue(reorderedQueue);
    
    expect(IndexedDBService.saveQueue).toHaveBeenCalledWith(reorderedQueue);
    expect(queueService.notifySubscribers).toHaveBeenCalled();
  });
  
  test('should subscribe and notify subscribers', () => {
    const mockCallback = jest.fn();
    
    queueService.subscribe(mockCallback);
    
    // Manually call notifySubscribers since we mocked it earlier
    const originalNotify = queueService.notifySubscribers;
    jest.spyOn(queueService, 'notifySubscribers').mockRestore();
    
    queueService.notifySubscribers();
    
    expect(mockCallback).toHaveBeenCalled();
    
    // Restore the mock for other tests
    jest.spyOn(queueService, 'notifySubscribers').mockImplementation(originalNotify);
  });
  
  test('should unsubscribe correctly', () => {
    const mockCallback = jest.fn();
    
    const unsubscribe = queueService.subscribe(mockCallback);
    
    // Unsubscribe the callback
    unsubscribe();
    
    // Manually call notifySubscribers
    const originalNotify = queueService.notifySubscribers;
    jest.spyOn(queueService, 'notifySubscribers').mockRestore();
    
    queueService.notifySubscribers();
    
    // The callback should not be called after unsubscribing
    expect(mockCallback).not.toHaveBeenCalled();
    
    // Restore the mock for other tests
    jest.spyOn(queueService, 'notifySubscribers').mockImplementation(originalNotify);
  });
}); 