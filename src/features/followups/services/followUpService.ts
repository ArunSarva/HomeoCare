import { FollowUp } from '../../../types';
import { getDB } from '../../../hooks/useIndexedDB';

/**
 * Generate follow-up ID
 */
export const generateFollowUpId = async (): Promise<string> => {
  try {
    const db = await getDB();
    const tx = db.transaction('followups', 'readonly');
    const store = tx.objectStore('followups');
    const request = store.getAll();
    
    return new Promise<string>((resolve, reject) => {
      request.onsuccess = () => {
        const followUps: FollowUp[] = request.result;
        
        // Get all follow-ups sorted by ID to find the highest
        const sortedFollowUps = followUps.sort((a, b) => {
          const numA = parseInt(a.id.replace('FU', ''), 10) || 0;
          const numB = parseInt(b.id.replace('FU', ''), 10) || 0;
          return numB - numA;
        });
        
        if (sortedFollowUps.length > 0) {
          const lastId = sortedFollowUps[0].id;
          const num = parseInt(lastId.replace('FU', ''), 10) || 0;
          resolve(`FU${String(num + 1).padStart(6, '0')}`);
        } else {
          resolve('FU000001');
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error generating follow-up ID:', error);
    return 'FU000001';
  }
};

/**
 * Follow-up service for CRUD operations with offline-first support
 */
export class FollowUpService {
  private async getDB() {
    return getDB();
  }

  async getAllFollowUps(): Promise<FollowUp[]> {
    try {
      const db = await getDB();
      const tx = db.transaction('followups', 'readonly');
      const store = tx.objectStore('followups');
      const request = store.getAll();
      
      const followUps = await new Promise<FollowUp[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as FollowUp[]);
        request.onerror = () => reject(request.error);
      });
      
      return followUps;
    } catch (error) {
      console.error('Error getting follow-ups:', error);
      return [];
    }
  }

  async getFollowUpById(id: string): Promise<FollowUp | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('followups', 'readonly');
      const store = tx.objectStore('followups');
      const request = store.get(id);
      
      return new Promise<FollowUp | null>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting follow-up:', error);
      return null;
    }
  }

  async getFollowUpsByPatientId(patientId: string): Promise<FollowUp[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('followups', 'readonly');
      const store = tx.objectStore('followups');
      const index = store.index('byPatientId');
      const request = index.getAll(patientId);
      
      const followUps = await new Promise<FollowUp[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as FollowUp[]);
        request.onerror = () => reject(request.error);
      });
      
      // Sort by visit date (most recent first)
      return followUps.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
    } catch (error) {
      console.error('Error getting follow-ups by patient ID:', error);
      return [];
    }
  }

  async createFollowUp(followUpData: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt'>): Promise<FollowUp> {
    try {
      const db = await this.getDB();
      // Generate the ID first: awaiting it after opening the write
      // transaction let IndexedDB auto-commit it, so store.put() threw.
      const followUpId = await generateFollowUpId();

      const tx = db.transaction('followups', 'readwrite');
      const store = tx.objectStore('followups');
      
      const followUp: FollowUp = {
        ...followUpData,
        id: followUpId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.put(followUp);
      
      // Add to sync queue
      await this.addToSyncQueue('followup', 'create', followUp);

      return followUp;
    } catch (error) {
      console.error('Error creating follow-up:', error);
      throw error;
    }
  }

  async updateFollowUp(id: string, followUpData: Partial<FollowUp>): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('followups', 'readwrite');
      const store = tx.objectStore('followups');
      
      const existing = await new Promise<FollowUp | undefined>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (!existing) {
        throw new Error('Follow-up not found');
      }

      const updatedFollowUp: FollowUp = {
        ...existing,
        ...followUpData,
        updatedAt: new Date().toISOString(),
      };

      store.put(updatedFollowUp);
      await this.addToSyncQueue('followup', 'update', updatedFollowUp);
    } catch (error) {
      console.error('Error updating follow-up:', error);
      throw error;
    }
  }

  async deleteFollowUp(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('followups', 'readwrite');
      const store = tx.objectStore('followups');
      store.delete(id);
      
      await this.addToSyncQueue('followup', 'delete', { id });
    } catch (error) {
      console.error('Error deleting follow-up:', error);
      throw error;
    }
  }

  async searchFollowUps(patientName?: string, dateRange?: { start: string; end: string }, status?: string): Promise<FollowUp[]> {
    try {
      const followUps = await this.getAllFollowUps();
      
      let filtered = followUps;
      
      // Filter by patient name
      if (patientName) {
        const term = patientName.toLowerCase();
        filtered = filtered.filter(fu => 
          fu.patientName.toLowerCase().includes(term)
        );
      }
      
      // Filter by date range
      if (dateRange?.start || dateRange?.end) {
        filtered = filtered.filter(fu => {
          const visitDate = new Date(fu.visitDate).getTime();
          const startDate = dateRange.start ? new Date(dateRange.start).getTime() : 0;
          const endDate = dateRange.end ? new Date(dateRange.end).getTime() : Infinity;
          return visitDate >= startDate && visitDate <= endDate;
        });
      }
      
      // Filter by status
      if (status) {
        filtered = filtered.filter(fu => fu.status === status);
      }
      
      return filtered;
    } catch (error) {
      console.error('Error searching follow-ups:', error);
      return [];
    }
  }

  async getFollowUpCount(): Promise<number> {
    const followUps = await this.getAllFollowUps();
    return followUps.length;
  }

  async getPendingFollowUpsCount(): Promise<number> {
    const followUps = await this.getAllFollowUps();
    return followUps.filter(fu => new Date(fu.visitDate).getTime() > Date.now()).length;
  }

  private async addToSyncQueue(type: string, action: string, data: any): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const id = crypto.randomUUID();
      await store.put({
        id,
        type,
        action,
        data,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      });
    } catch (error) {
      console.error('Error adding to sync queue:', error);
    }
  }
}

export const followUpService = new FollowUpService();
