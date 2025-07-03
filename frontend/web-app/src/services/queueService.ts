import { Patient } from '../types/patient';
import { IndexedDBService } from './indexedDBService';

export class QueueService {
  private subscribers: Array<(queue: Patient[]) => void> = [];

  async getQueue(): Promise<Patient[]> {
    return IndexedDBService.getQueue();
  }

  async addPatient(patient: Patient): Promise<void> {
    const currentQueue = await this.getQueue();
    await IndexedDBService.saveQueue([...currentQueue, patient]);
    this.notifySubscribers();
  }

  async updatePatientStatus(patientId: string, status: string): Promise<void> {
    await IndexedDBService.updatePatientStatus(patientId, status);
    this.notifySubscribers();
  }

  async removePatient(patientId: string): Promise<void> {
    const currentQueue = await this.getQueue();
    const updatedQueue = currentQueue.filter(patient => patient.id !== patientId);
    await IndexedDBService.saveQueue(updatedQueue);
    this.notifySubscribers();
  }

  async reorderQueue(newQueue: Patient[]): Promise<void> {
    await IndexedDBService.saveQueue(newQueue);
    this.notifySubscribers();
  }

  subscribe(callback: (queue: Patient[]) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(subscriber => subscriber !== callback);
    };
  }

  notifySubscribers(): void {
    this.getQueue().then(queue => {
      this.subscribers.forEach(callback => callback(queue));
    });
  }
} 