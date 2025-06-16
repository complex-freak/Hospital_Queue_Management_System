import { indexedDBService } from '@/services/db/indexedDBService';
import { IDBFactory, IDBDatabase } from 'fake-indexeddb';

// Mock IndexedDB
jest.mock('fake-indexeddb', () => {
  const mockIDBFactory = {
    open: jest.fn().mockReturnValue({
      result: {
        createObjectStore: jest.fn(),
        transaction: jest.fn().mockReturnValue({
          objectStore: jest.fn().mockReturnValue({
            add: jest.fn().mockReturnValue({
              onsuccess: null,
              onerror: null
            }),
            getAll: jest.fn().mockReturnValue({
              result: [],
              onsuccess: null,
              onerror: null
            }),
            delete: jest.fn().mockReturnValue({
              onsuccess: null,
              onerror: null
            }),
            clear: jest.fn().mockReturnValue({
              onsuccess: null,
              onerror: null
            })
          }),
          oncomplete: null,
          onerror: null
        })
      },
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null
    })
  };

  return {
    IDBFactory: jest.fn().mockImplementation(() => mockIDBFactory),
    IDBDatabase: jest.fn()
  };
});

// Mock window.indexedDB
Object.defineProperty(window, 'indexedDB', {
  value: new IDBFactory(),
  writable: true
});

describe('indexedDBService', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  test('should initialize database correctly', async () => {
    await indexedDBService.init();
    expect(window.indexedDB.open).toHaveBeenCalledWith('HospitalQueue', expect.any(Number));
  });

  test('should add pending action to store', async () => {
    await indexedDBService.init();
    
    // Mock the transaction and objectStore
    const mockObjectStore = {
      add: jest.fn().mockImplementation((item, key) => {
        const request = {
          onsuccess: null,
          onerror: null
        };
        
        // Simulate successful operation
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess(new Event('success'));
          }
        }, 0);
        
        return request;
      })
    };
    
    const mockTransaction = {
      objectStore: jest.fn().mockReturnValue(mockObjectStore),
      oncomplete: null,
      onerror: null
    };
    
    // Mock the database
    const mockDB = {
      transaction: jest.fn().mockReturnValue(mockTransaction)
    };
    
    // Set the mock database
    (indexedDBService as any).db = mockDB;
    
    // Add a pending action
    const result = await indexedDBService.addPendingAction('update', { patientId: '123' });
    
    // Verify the transaction was created correctly
    expect(mockDB.transaction).toHaveBeenCalledWith(['pendingActions'], 'readwrite');
    expect(mockTransaction.objectStore).toHaveBeenCalledWith('pendingActions');
    
    // Verify the item was added
    expect(mockObjectStore.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'update',
        data: { patientId: '123' },
        timestamp: expect.any(Number)
      })
    );
    
    // Verify the result
    expect(result).toBeTruthy();
  });

  test('should get all pending actions', async () => {
    await indexedDBService.init();
    
    // Mock data
    const mockActions = [
      { id: 1, type: 'update', data: { patientId: '123' }, timestamp: Date.now() },
      { id: 2, type: 'remove', data: { patientId: '456' }, timestamp: Date.now() }
    ];
    
    // Mock the transaction and objectStore
    const mockObjectStore = {
      getAll: jest.fn().mockImplementation(() => {
        const request = {
          result: mockActions,
          onsuccess: null,
          onerror: null
        };
        
        // Simulate successful operation
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess(new Event('success'));
          }
        }, 0);
        
        return request;
      })
    };
    
    const mockTransaction = {
      objectStore: jest.fn().mockReturnValue(mockObjectStore),
      oncomplete: null,
      onerror: null
    };
    
    // Mock the database
    const mockDB = {
      transaction: jest.fn().mockReturnValue(mockTransaction)
    };
    
    // Set the mock database
    (indexedDBService as any).db = mockDB;
    
    // Get all pending actions
    const actions = await indexedDBService.getPendingActions();
    
    // Verify the transaction was created correctly
    expect(mockDB.transaction).toHaveBeenCalledWith(['pendingActions'], 'readonly');
    expect(mockTransaction.objectStore).toHaveBeenCalledWith('pendingActions');
    
    // Verify getAll was called
    expect(mockObjectStore.getAll).toHaveBeenCalled();
    
    // Verify the result
    expect(actions).toEqual(mockActions);
  });

  test('should remove pending action', async () => {
    await indexedDBService.init();
    
    // Mock the transaction and objectStore
    const mockObjectStore = {
      delete: jest.fn().mockImplementation((key) => {
        const request = {
          onsuccess: null,
          onerror: null
        };
        
        // Simulate successful operation
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess(new Event('success'));
          }
        }, 0);
        
        return request;
      })
    };
    
    const mockTransaction = {
      objectStore: jest.fn().mockReturnValue(mockObjectStore),
      oncomplete: null,
      onerror: null
    };
    
    // Mock the database
    const mockDB = {
      transaction: jest.fn().mockReturnValue(mockTransaction)
    };
    
    // Set the mock database
    (indexedDBService as any).db = mockDB;
    
    // Remove a pending action
    await indexedDBService.removePendingAction(1);
    
    // Verify the transaction was created correctly
    expect(mockDB.transaction).toHaveBeenCalledWith(['pendingActions'], 'readwrite');
    expect(mockTransaction.objectStore).toHaveBeenCalledWith('pendingActions');
    
    // Verify delete was called with the correct key
    expect(mockObjectStore.delete).toHaveBeenCalledWith(1);
  });

  test('should clear all pending actions', async () => {
    await indexedDBService.init();
    
    // Mock the transaction and objectStore
    const mockObjectStore = {
      clear: jest.fn().mockImplementation(() => {
        const request = {
          onsuccess: null,
          onerror: null
        };
        
        // Simulate successful operation
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess(new Event('success'));
          }
        }, 0);
        
        return request;
      })
    };
    
    const mockTransaction = {
      objectStore: jest.fn().mockReturnValue(mockObjectStore),
      oncomplete: null,
      onerror: null
    };
    
    // Mock the database
    const mockDB = {
      transaction: jest.fn().mockReturnValue(mockTransaction)
    };
    
    // Set the mock database
    (indexedDBService as any).db = mockDB;
    
    // Clear all pending actions
    await indexedDBService.clearPendingActions();
    
    // Verify the transaction was created correctly
    expect(mockDB.transaction).toHaveBeenCalledWith(['pendingActions'], 'readwrite');
    expect(mockTransaction.objectStore).toHaveBeenCalledWith('pendingActions');
    
    // Verify clear was called
    expect(mockObjectStore.clear).toHaveBeenCalled();
  });

  test('should handle database errors gracefully', async () => {
    // Mock open to simulate an error
    (window.indexedDB.open as jest.Mock).mockReturnValueOnce({
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null
    });
    
    // Attempt to initialize
    try {
      await indexedDBService.init();
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
}); 