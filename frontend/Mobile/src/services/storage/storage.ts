//  AsyncStorage enhanced wrapper
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../config/env';
import { Appointment } from '../../types';

// Interface for cached data with version and timestamp
interface CachedData<T> {
  data: T;
  version: number;
  timestamp: number;
  lastSynced: number;
}

class StorageService {
  /**
   * Store data with versioning and timestamp
   */
  async storeData<T>(key: string, data: T, version: number = 1): Promise<void> {
    try {
      const cachedData: CachedData<T> = {
        data,
        version,
        timestamp: Date.now(),
        lastSynced: Date.now()
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(cachedData));
    } catch (error) {
      console.error(`Error storing data for key ${key}:`, error);
      throw error;
    }
  }
  
  /**
   * Retrieve data with version validation
   */
  async getData<T>(key: string, minVersion: number = 1): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      
      if (!value) {
        return null;
      }
      
      const cachedData: CachedData<T> = JSON.parse(value);
      
      // Check if data version is compatible with requested minimum version
      if (cachedData.version < minVersion) {
        console.warn(`Cached data for key ${key} is outdated. Version ${cachedData.version} < ${minVersion}`);
        return null;
      }
      
      return cachedData.data;
    } catch (error) {
      console.error(`Error getting data for key ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Store appointments with metadata
   */
  async storeAppointments(appointments: Appointment[]): Promise<void> {
    await this.storeData(STORAGE_KEYS.APPOINTMENTS, appointments, 1);
  }
  
  /**
   * Get cached appointments
   */
  async getAppointments(): Promise<Appointment[] | null> {
    return this.getData<Appointment[]>(STORAGE_KEYS.APPOINTMENTS);
  }
  
  /**
   * Store a single appointment (updates or adds to the cache)
   */
  async updateAppointment(appointment: Appointment): Promise<void> {
    try {
      // Get current appointments
      const appointments = await this.getAppointments() || [];
      
      // Find if appointment already exists
      const existingIndex = appointments.findIndex(a => a.id === appointment.id);
      
      if (existingIndex >= 0) {
        // Update existing appointment
        appointments[existingIndex] = {
          ...appointments[existingIndex],
          ...appointment,
          // Set local modification flag for conflict resolution
          _locallyModified: true,
          _lastModified: Date.now()
        };
      } else {
        // Add new appointment
        appointments.push({
          ...appointment,
          _locallyModified: true,
          _lastModified: Date.now()
        });
      }
      
      // Store updated appointments
      await this.storeAppointments(appointments);
    } catch (error) {
      console.error(`Error updating appointment ${appointment.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get metadata for cached item
   */
  async getMetadata<T>(key: string): Promise<Omit<CachedData<T>, 'data'> | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      
      if (!value) {
        return null;
      }
      
      const { data, ...metadata } = JSON.parse(value) as CachedData<T>;
      return metadata;
    } catch (error) {
      console.error(`Error getting metadata for key ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Update last synced timestamp for a key
   */
  async updateSyncTimestamp(key: string): Promise<void> {
    try {
      const value = await AsyncStorage.getItem(key);
      
      if (value) {
        const cachedData = JSON.parse(value);
        cachedData.lastSynced = Date.now();
        await AsyncStorage.setItem(key, JSON.stringify(cachedData));
      }
    } catch (error) {
      console.error(`Error updating sync timestamp for key ${key}:`, error);
    }
  }
  
  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      const keys = [
        STORAGE_KEYS.APPOINTMENTS,
        STORAGE_KEYS.NOTIFICATIONS,
        STORAGE_KEYS.QUEUE_STATUS
      ];
      
      await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
export default storageService;