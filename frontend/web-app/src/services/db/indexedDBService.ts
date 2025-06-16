import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface HospitalDBSchema extends DBSchema {
  patients: {
    key: string;
    value: {
      id: string;
      name: string;
      reason: string;
      priority: string;
      checkInTime: string;
      doctor?: string;
      status: 'waiting' | 'seen' | 'skipped';
      lastUpdated: number;
    };
    indexes: { 'by-status': string };
  };
  pendingActions: {
    key: string;
    value: {
      id: string;
      action: 'add' | 'update' | 'remove' | 'assign' | 'prioritize' | 'reorder';
      payload: any;
      timestamp: number;
    };
  };
  doctors: {
    key: string;
    value: {
      id: string;
      name: string;
      specialty: string;
      isAvailable: boolean;
      patientCount: number;
      lastUpdated: number;
    };
  };
}

class IndexedDBService {
  private dbPromise: Promise<IDBPDatabase<HospitalDBSchema>> | null = null;
  private readonly DB_NAME = 'hospital_queue_db';
  private readonly DB_VERSION = 1;

  constructor() {
    this.initDB();
  }

  private initDB() {
    this.dbPromise = openDB<HospitalDBSchema>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Create patients store
        const patientStore = db.createObjectStore('patients', {
          keyPath: 'id',
        });
        patientStore.createIndex('by-status', 'status');

        // Create pending actions store
        db.createObjectStore('pendingActions', {
          keyPath: 'id',
        });

        // Create doctors store
        db.createObjectStore('doctors', {
          keyPath: 'id',
        });
      },
    });
  }

  private async getDB() {
    if (!this.dbPromise) {
      this.initDB();
    }
    return this.dbPromise as Promise<IDBPDatabase<HospitalDBSchema>>;
  }

  // Patient methods
  async getAllPatients() {
    const db = await this.getDB();
    return db.getAll('patients');
  }

  async getPatientsByStatus(status: 'waiting' | 'seen' | 'skipped') {
    const db = await this.getDB();
    return db.getAllFromIndex('patients', 'by-status', status);
  }

  async getPatient(id: string) {
    const db = await this.getDB();
    return db.get('patients', id);
  }

  async savePatient(patient: any) {
    const db = await this.getDB();
    patient.lastUpdated = Date.now();
    await db.put('patients', patient);
    return patient;
  }

  async removePatient(id: string) {
    const db = await this.getDB();
    await db.delete('patients', id);
    return id;
  }

  // Pending actions methods
  async addPendingAction(action: 'add' | 'update' | 'remove' | 'assign' | 'prioritize' | 'reorder', payload: any) {
    const db = await this.getDB();
    const pendingAction = {
      id: `${action}_${Date.now()}`,
      action,
      payload,
      timestamp: Date.now(),
    };
    await db.add('pendingActions', pendingAction);
    return pendingAction;
  }

  async getAllPendingActions() {
    const db = await this.getDB();
    return db.getAll('pendingActions');
  }

  async removePendingAction(id: string) {
    const db = await this.getDB();
    await db.delete('pendingActions', id);
    return id;
  }

  // Doctor methods
  async getAllDoctors() {
    const db = await this.getDB();
    return db.getAll('doctors');
  }

  async saveDoctor(doctor: any) {
    const db = await this.getDB();
    doctor.lastUpdated = Date.now();
    await db.put('doctors', doctor);
    return doctor;
  }

  // Utility methods
  async clearAllData() {
    const db = await this.getDB();
    await db.clear('patients');
    await db.clear('pendingActions');
    await db.clear('doctors');
  }

  async syncWithServer() {
    // This would be implemented to sync pending actions with the server
    // when the connection is restored
    const pendingActions = await this.getAllPendingActions();
    
    // Sort actions by timestamp
    pendingActions.sort((a, b) => a.timestamp - b.timestamp);
    
    // Process each action (in a real app, this would call your API)
    for (const action of pendingActions) {
      try {
        // Here you would call your API based on the action type
        console.log(`Processing action: ${action.action}`, action.payload);
        
        // After successful processing, remove the action
        await this.removePendingAction(action.id);
      } catch (error) {
        console.error(`Failed to process action ${action.id}:`, error);
        // You might want to implement retry logic here
      }
    }
  }
}

export const indexedDBService = new IndexedDBService(); 