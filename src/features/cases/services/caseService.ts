import { Case } from '../../../types';
import { getDB } from '../../../hooks/useIndexedDB';

/**
 * Cases are offline-first: the local `cases` store is the source of truth,
 * every change is queued in `syncQueue`.
 */


function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export class CaseService {
  private async getDB() {
    return getDB();
  }

  // Generate case ID
  async generateCaseId(): Promise<string> {
    return `C${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }

  /** Write the case and its sync-queue entry in one transaction. */
  private async saveLocally(record: Case | { id: string }, action: 'create' | 'update' | 'delete'): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(['cases', 'syncQueue'], 'readwrite');
    if (action === 'delete') {
      tx.objectStore('cases').delete(record.id);
    } else {
      tx.objectStore('cases').put(record);
    }
    tx.objectStore('syncQueue').put({
      id: crypto.randomUUID(),
      type: 'case',
      action,
      data: record,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    });
    await txDone(tx);
  }



  // Create a new case
  async createCase(caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const caseId = await this.generateCaseId();
      const now = new Date().toISOString();
      const record = { ...caseData, id: caseId, createdAt: now, updatedAt: now } as Case;
      await this.saveLocally(record, 'create');
      return caseId;
    } catch (error) {
      console.error('Error creating case:', error);
      throw error;
    }
  }

  // Update an existing case
  async updateCase(id: string, caseData: Partial<Case>): Promise<void> {
    try {
      const existing = await this.getCaseById(id);
      const record = { ...(existing ?? {}), ...caseData, id, updatedAt: new Date().toISOString() } as Case;
      await this.saveLocally(record, 'update');
    } catch (error) {
      console.error('Error updating case:', error);
      throw error;
    }
  }

  // Delete a case
  async deleteCase(id: string): Promise<void> {
    try {
      await this.saveLocally({ id }, 'delete');
    } catch (error) {
      console.error('Error deleting case:', error);
      throw error;
    }
  }

  // Get case by ID
  async getCaseById(id: string): Promise<Case | null> {
    try {
      const db = await this.getDB();
      const local = await requestToPromise(db.transaction('cases', 'readonly').objectStore('cases').get(id));
      return (local as Case | undefined) ?? null;
    } catch (error) {
      console.error('Error getting case by ID:', error);
      throw error;
    }
  }

  // Get all cases for a patient
  async getCasesByPatientId(patientId: string): Promise<Case[]> {
    try {
      const db = await this.getDB();
      const index = db.transaction('cases', 'readonly').objectStore('cases').index('byPatientId');
      return (await requestToPromise(index.getAll(patientId))) as Case[];
    } catch (error) {
      console.error('Error getting cases by patient ID:', error);
      throw error;
    }
  }

  // Get all cases, newest first
  async getAllCases(): Promise<Case[]> {
    try {
      const db = await this.getDB();
      const all = (await requestToPromise(db.transaction('cases', 'readonly').objectStore('cases').getAll())) as Case[];
      return all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (error) {
      console.error('Error getting all cases:', error);
      throw error;
    }
  }

  // Sync offline cases when online
  async syncOfflineCases(): Promise<void> {
    try {
      const db = await this.getDB();
      
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const index = store.index('byStatus');
      const request = index.getAll('pending');
      
      const pendingItems = await new Promise<any[]>((resolve) => {
        request.onsuccess = () => resolve(request.result);
      });
      
      for (const item of pendingItems) {
        try {
          switch (item.action) {
            case 'create':
              if (item.type === 'case') {
                const syncTx = db.transaction('syncQueue', 'readwrite');
                const syncStore = syncTx.objectStore('syncQueue');
                await syncStore.put({
                  ...item,
                  status: 'success',
                  updatedAt: Date.now(),
                });
              }
              break;
            case 'update':
              if (item.type === 'case') {
                const syncTx = db.transaction('syncQueue', 'readwrite');
                const syncStore = syncTx.objectStore('syncQueue');
                await syncStore.put({
                  ...item,
                  status: 'success',
                  updatedAt: Date.now(),
                });
              }
              break;
            case 'delete':
              if (item.type === 'case') {
                const syncTx = db.transaction('syncQueue', 'readwrite');
                const syncStore = syncTx.objectStore('syncQueue');
                await syncStore.put({
                  ...item,
                  status: 'success',
                  updatedAt: Date.now(),
                });
              }
              break;
          }
        } catch (error) {
          const syncTx = db.transaction('syncQueue', 'readwrite');
          const syncStore = syncTx.objectStore('syncQueue');
          await syncStore.put({
            ...item,
            status: 'failed',
            lastError: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: Date.now(),
          });
        }
      }
    } catch (error) {
      console.error('Error syncing offline cases:', error);
      throw error;
    }
  }
}

export const caseService = new CaseService();
