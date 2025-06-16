import { connectivityService } from '@/services/connectivity/connectivityService';
import { indexedDBService } from '@/services/db/indexedDBService';

// Mock indexedDBService
jest.mock('@/services/db/indexedDBService', () => ({
  indexedDBService: {
    syncWithServer: jest.fn().mockResolvedValue(undefined),
  }
}));

describe('Connectivity Service', () => {
  // Store original window.navigator.onLine
  const originalOnline = window.navigator.onLine;
  
  // Store original event listeners
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;
  
  beforeAll(() => {
    // Mock navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true
    });
    
    // Mock addEventListener
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });
  
  afterAll(() => {
    // Restore original navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: originalOnline
    });
    
    // Restore original event listeners
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  test('should initialize with correct online status', () => {
    // Set navigator.onLine to true
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true
    });
    
    // Initialize service
    connectivityService.init();
    
    // Check status
    expect(connectivityService.getStatus()).toBe(true);
    
    // Set navigator.onLine to false
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: false
    });
    
    // Re-initialize service
    connectivityService.init();
    
    // Check status again
    expect(connectivityService.getStatus()).toBe(false);
  });
  
  test('should add event listeners on init', () => {
    connectivityService.init();
    
    // Check that event listeners were added
    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });
  
  test('should update status when online/offline events occur', () => {
    connectivityService.init();
    
    // Get the event handlers
    const calls = (window.addEventListener as jest.Mock).mock.calls;
    const onlineHandler = calls.find(call => call[0] === 'online')?.[1];
    const offlineHandler = calls.find(call => call[0] === 'offline')?.[1];
    
    // Ensure we found the handlers
    expect(onlineHandler).toBeDefined();
    expect(offlineHandler).toBeDefined();
    
    if (onlineHandler && offlineHandler) {
      // Trigger offline event
      offlineHandler();
      expect(connectivityService.getStatus()).toBe(false);
      
      // Trigger online event
      onlineHandler();
      expect(connectivityService.getStatus()).toBe(true);
    }
  });
  
  test('should notify listeners when status changes', () => {
    connectivityService.init();
    
    // Add a listener
    const mockListener = jest.fn();
    const removeListener = connectivityService.addListener(mockListener);
    
    // Get the event handlers
    const calls = (window.addEventListener as jest.Mock).mock.calls;
    const onlineHandler = calls.find(call => call[0] === 'online')?.[1];
    const offlineHandler = calls.find(call => call[0] === 'offline')?.[1];
    
    if (onlineHandler && offlineHandler) {
      // Trigger offline event
      offlineHandler();
      expect(mockListener).toHaveBeenCalledWith(false);
      
      // Trigger online event
      onlineHandler();
      expect(mockListener).toHaveBeenCalledWith(true);
    }
    
    // Test removing listener
    mockListener.mockClear();
    removeListener();
    
    if (onlineHandler) {
      // Trigger event again
      onlineHandler();
      // Listener should not be called
      expect(mockListener).not.toHaveBeenCalled();
    }
  });
  
  test('should clean up event listeners on destroy', () => {
    connectivityService.init();
    connectivityService.destroy();
    
    // Check that event listeners were removed
    expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });
  
  test('should sync with server when coming online', async () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', { value: false });
    window.dispatchEvent(new Event('offline'));
    
    // Now come back online
    Object.defineProperty(navigator, 'onLine', { value: true });
    window.dispatchEvent(new Event('online'));
    
    // Should have called sync
    expect(indexedDBService.syncWithServer).toHaveBeenCalled();
  });
  
  test('should start periodic sync', () => {
    // Start periodic sync
    connectivityService.startPeriodicSync(1000); // 1 second interval
    
    // Fast-forward time
    jest.advanceTimersByTime(3500); // 3.5 seconds
    
    // Should have called sync 3 times (at 1s, 2s, and 3s)
    expect(indexedDBService.syncWithServer).toHaveBeenCalledTimes(3);
  });
  
  test('should stop periodic sync', () => {
    // Start periodic sync
    connectivityService.startPeriodicSync(1000);
    
    // Fast-forward 1.5 seconds
    jest.advanceTimersByTime(1500);
    
    // Should have called sync once
    expect(indexedDBService.syncWithServer).toHaveBeenCalledTimes(1);
    
    // Stop sync
    connectivityService.stopPeriodicSync();
    
    // Reset mock
    (indexedDBService.syncWithServer as jest.Mock).mockClear();
    
    // Fast-forward more time
    jest.advanceTimersByTime(3000);
    
    // Should not have called sync again
    expect(indexedDBService.syncWithServer).not.toHaveBeenCalled();
  });
  
  test('should cleanup correctly', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    // Initialize service (adds event listeners)
    const service = connectivityService;
    
    // Before cleanup - should have added listeners
    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    
    // Start periodic sync
    service.startPeriodicSync();
    
    // Now cleanup
    service.cleanup();
    
    // Should have removed listeners
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    
    // No sync calls should happen after cleanup
    jest.advanceTimersByTime(10000);
    expect(indexedDBService.syncWithServer).not.toHaveBeenCalled();
  });
}); 