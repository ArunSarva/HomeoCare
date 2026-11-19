import { Patient } from '../../../types';
import { getDB } from '../../../hooks/useIndexedDB';

/**
 * Generate patient ID in format P000001, P000002, etc.
 * Reads the last patient from IndexedDB or Google Sheets and increments
 */
export const generatePatientId = async (): Promise<string> => {
  try {
    const db = await getDB();
    const tx = db.transaction('patients', 'readonly');
    const store = tx.objectStore('patients');
    const request = store.getAll();
    
    return new Promise<string>((resolve, reject) => {
      request.onsuccess = () => {
        const patients: Patient[] = request.result;
        
        // Get all patients sorted by patientId to find the highest
        const sortedPatients = patients.sort((a, b) => {
          const numA = parseInt(a.patientId.replace('P', '').padEnd(6, '0'), 10);
          const numB = parseInt(b.patientId.replace('P', '').padEnd(6, '0'), 10);
          return numB - numA;
        });
        
        if (sortedPatients.length > 0) {
          const lastId = sortedPatients[0].patientId;
          const num = parseInt(lastId.replace('P', ''), 10);
          resolve(`P${String(num + 1).padStart(6, '0')}`);
        } else {
          resolve('P000001');
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error generating patient ID:', error);
    return 'P000001';
  }
};

/**
 * Patient service for CRUD operations with offline-first support
 */
export class PatientService {
  private async getDB() {
    return getDB();
  }

  async getAllPatients(): Promise<Patient[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('patients', 'readonly');
      const store = tx.objectStore('patients');
      const request = store.getAll();
      
      const patients = await new Promise<Patient[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as Patient[]);
        request.onerror = () => reject(request.error);
      });
      

      
      return patients;
    } catch (error) {
      console.error('Error getting patients:', error);
      return [];
    }
  }

  async getPatientById(id: string): Promise<Patient | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('patients', 'readonly');
      const store = tx.objectStore('patients');
      const request = store.get(id);
      
      return new Promise<Patient | null>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting patient:', error);
      return null;
    }
  }

  async createPatient(patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>, customCreatedAt?: string): Promise<Patient> {
    try {
      const db = await this.getDB();

      // Generate the ID before opening the write transaction: IndexedDB
      // auto-commits a transaction that has no pending requests, so awaiting
      // this (its own read transaction) in between made store.put() throw
      // TransactionInactiveError and every save failed silently.
      const patientId = await generatePatientId();

      const tx = db.transaction('patients', 'readwrite');
      const store = tx.objectStore('patients');

      const patient: Patient = {
        ...patientData,
        id: crypto.randomUUID(),
        patientId,
        createdAt: customCreatedAt || new Date().toISOString(),
        updatedAt: customCreatedAt || new Date().toISOString(),
      };

      store.put(patient);
      
      // Add to sync queue
      const syncTx = db.transaction('syncQueue', 'readwrite');
      const syncStore = syncTx.objectStore('syncQueue');
      const syncId = crypto.randomUUID();
      await syncStore.put({
        id: syncId,
        type: 'patient',
        action: 'create',
        data: patient,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      });

      return patient;
    } catch (error) {
      console.error('Error creating patient:', error);
      throw error;
    }
  }

  async updatePatient(id: string, patientData: Partial<Patient>): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('patients', 'readwrite');
      const store = tx.objectStore('patients');
      
      const existing = await new Promise<Patient | undefined>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (!existing) {
        throw new Error('Patient not found');
      }

      const updatedPatient: Patient = {
        ...existing,
        ...patientData,
        updatedAt: new Date().toISOString(),
      };

      store.put(updatedPatient);
      
      // Add to sync queue
      const syncTx = db.transaction('syncQueue', 'readwrite');
      const syncStore = syncTx.objectStore('syncQueue');
      const syncId = crypto.randomUUID();
      await syncStore.put({
        id: syncId,
        type: 'patient',
        action: 'update',
        data: updatedPatient,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      });
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  }

  async deletePatient(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('patients', 'readwrite');
      const store = tx.objectStore('patients');
      store.delete(id);
      
      // Add to sync queue
      const syncTx = db.transaction('syncQueue', 'readwrite');
      const syncStore = syncTx.objectStore('syncQueue');
      const syncId = crypto.randomUUID();
      await syncStore.put({
        id: syncId,
        type: 'patient',
        action: 'delete',
        data: { id },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      });
    } catch (error) {
      console.error('Error deleting patient:', error);
      throw error;
    }
  }

  async searchPatients(searchTerm: string): Promise<Patient[]> {
    try {
      const patients = await this.getAllPatients();
      
      const term = searchTerm.toLowerCase();
      return patients.filter(patient => 
        patient.fullName.toLowerCase().includes(term) ||
        patient.patientId.toLowerCase().includes(term) ||
        patient.mobile.toLowerCase().includes(term) ||
        (patient.email && patient.email.toLowerCase().includes(term))
      );
    } catch (error) {
      console.error('Error searching patients:', error);
      return [];
    }
  }

  async getPatientCount(): Promise<number> {
    const patients = await this.getAllPatients();
    return patients.length;
  }
}

export const patientService = new PatientService();
