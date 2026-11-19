import { Appointment } from '../../../types';
import { getDB } from '../../../hooks/useIndexedDB';

/**
 * Generate appointment ID
 */
export const generateAppointmentId = async (): Promise<string> => {
  try {
    const db = await getDB();
    const tx = db.transaction('appointments', 'readonly');
    const store = tx.objectStore('appointments');
    const request = store.getAll();
    
    return new Promise<string>((resolve, reject) => {
      request.onsuccess = () => {
        const appointments: Appointment[] = request.result;
        
        // Get all appointments sorted by ID to find the highest
        const sortedAppointments = appointments.sort((a, b) => {
          const numA = parseInt(a.id.replace('APT', ''), 10) || 0;
          const numB = parseInt(b.id.replace('APT', ''), 10) || 0;
          return numB - numA;
        });
        
        if (sortedAppointments.length > 0) {
          const lastId = sortedAppointments[0].id;
          const num = parseInt(lastId.replace('APT', ''), 10) || 0;
          resolve(`APT${String(num + 1).padStart(6, '0')}`);
        } else {
          resolve('APT000001');
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error generating appointment ID:', error);
    return 'APT000001';
  }
};

/**
 * Appointment service for CRUD operations with offline-first support
 */
export class AppointmentService {
  private async getDB() {
    return getDB();
  }

  async getAllAppointments(): Promise<Appointment[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('appointments', 'readonly');
      const store = tx.objectStore('appointments');
      const request = store.getAll();
      
      const appointments = await new Promise<Appointment[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as Appointment[]);
        request.onerror = () => reject(request.error);
      });
      
      return appointments;
    } catch (error) {
      console.error('Error getting appointments:', error);
      return [];
    }
  }

  async getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('appointments', 'readonly');
      const store = tx.objectStore('appointments');
      const request = store.getAll();
      
      const appointments = await new Promise<Appointment[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as Appointment[]);
        request.onerror = () => reject(request.error);
      });
      
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      
      return appointments.filter(apt => {
        const aptDate = new Date(apt.appointmentDate).getTime();
        return aptDate >= start && aptDate <= end;
      });
    } catch (error) {
      console.error('Error getting appointments by date range:', error);
      return [];
    }
  }

  async getTodayAppointments(): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];
    const appointments = await this.getAllAppointments();
    return appointments.filter(apt => apt.appointmentDate === today);
  }

  async getUpcomingAppointments(): Promise<Appointment[]> {
    const appointments = await this.getAllAppointments();
    const now = new Date().getTime();
    return appointments.filter(apt => {
      const aptDateTime = new Date(`${apt.appointmentDate}T${apt.startTime}`).getTime();
      return aptDateTime > now;
    });
  }

  async getAppointmentsByPatientId(patientId: string): Promise<Appointment[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('appointments', 'readonly');
      const store = tx.objectStore('appointments');
      const request = store.getAll();
      
      const appointments = await new Promise<Appointment[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as Appointment[]);
        request.onerror = () => reject(request.error);
      });
      
      return appointments.filter(apt => apt.patientId === patientId);
    } catch (error) {
      console.error('Error getting appointments by patient ID:', error);
      return [];
    }
  }

  async getAppointmentById(id: string): Promise<Appointment | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('appointments', 'readonly');
      const store = tx.objectStore('appointments');
      const request = store.get(id);
      
      return new Promise<Appointment | null>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting appointment:', error);
      return null;
    }
  }

  async createAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment> {
    try {
      const db = await this.getDB();
      // Generate the ID first: awaiting it after opening the write
      // transaction let IndexedDB auto-commit it, so store.put() threw.
      const appointmentId = await generateAppointmentId();

      // Check for conflicts (also before the write transaction opens)
      const conflicts = await this.checkAppointmentConflict(
        appointmentData.appointmentDate,
        appointmentData.startTime,
        appointmentData.endTime,
        appointmentData.doctorId,
        appointmentData.patientId
      );
      
      if (conflicts.length > 0) {
        throw new Error('Appointment conflicts with existing appointment(s)');
      }

      const tx = db.transaction('appointments', 'readwrite');
      const store = tx.objectStore('appointments');
      
      const appointment: Appointment = {
        ...appointmentData,
        id: appointmentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.put(appointment);
      
      // Add to sync queue
      await this.addToSyncQueue('appointment', 'create', appointment);

      return appointment;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  async updateAppointment(id: string, appointmentData: Partial<Appointment>): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('appointments', 'readonly');
      const store = tx.objectStore('appointments');
      
      const existing = await new Promise<Appointment | undefined>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (!existing) {
        throw new Error('Appointment not found');
      }

      // If date or time changed, check for conflicts
      if (appointmentData.appointmentDate || appointmentData.startTime || appointmentData.endTime) {
        const conflicts = await this.checkAppointmentConflict(
          appointmentData.appointmentDate || existing.appointmentDate,
          appointmentData.startTime || existing.startTime,
          appointmentData.endTime || existing.endTime,
          appointmentData.doctorId || existing.doctorId,
          appointmentData.patientId || existing.patientId
        );
        
        const conflicting = conflicts.filter(c => c.id !== id);
        if (conflicting.length > 0) {
          throw new Error('Appointment conflicts with existing appointment(s)');
        }
      }

      const updatedAppointment: Appointment = {
        ...existing,
        ...appointmentData,
        updatedAt: new Date().toISOString(),
      };

      // Write in a fresh transaction: the one used to read `existing` has
      // auto-committed by now (the conflict check above awaits other reads),
      // so putting into it threw TransactionInactiveError and edits were lost.
      await new Promise<void>((resolve, reject) => {
        const writeTx = db.transaction('appointments', 'readwrite');
        writeTx.objectStore('appointments').put(updatedAppointment);
        writeTx.oncomplete = () => resolve();
        writeTx.onerror = () => reject(writeTx.error);
        writeTx.onabort = () => reject(writeTx.error);
      });
      await this.addToSyncQueue('appointment', 'update', updatedAppointment);
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  }

  async deleteAppointment(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('appointments', 'readwrite');
      const store = tx.objectStore('appointments');
      store.delete(id);
      
      await this.addToSyncQueue('appointment', 'delete', { id });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  }

  async searchAppointments(
    patientName?: string, 
    dateRange?: { start: string; end: string }, 
    status?: string,
    type?: string
  ): Promise<Appointment[]> {
    try {
      const appointments = await this.getAllAppointments();
      
      let filtered = appointments;
      
      // Filter by patient name
      if (patientName) {
        const term = patientName.toLowerCase();
        filtered = filtered.filter(apt => 
          apt.patientName.toLowerCase().includes(term)
        );
      }
      
      // Filter by date range
      if (dateRange?.start || dateRange?.end) {
        filtered = filtered.filter(apt => {
          const aptDate = new Date(apt.appointmentDate).getTime();
          const startDate = dateRange.start ? new Date(dateRange.start).getTime() : 0;
          const endDate = dateRange.end ? new Date(dateRange.end).getTime() : Infinity;
          return aptDate >= startDate && aptDate <= endDate;
        });
      }
      
      // Filter by status
      if (status) {
        filtered = filtered.filter(apt => apt.status === status);
      }
      
      // Filter by type
      if (type) {
        filtered = filtered.filter(apt => apt.type === type);
      }
      
      return filtered;
    } catch (error) {
      console.error('Error searching appointments:', error);
      return [];
    }
  }

  async getAppointmentCount(): Promise<number> {
    const appointments = await this.getAllAppointments();
    return appointments.length;
  }

  async getPendingAppointmentsCount(): Promise<number> {
    const appointments = await this.getAllAppointments();
    const now = new Date().getTime();
    return appointments.filter(apt => {
      const aptDateTime = new Date(`${apt.appointmentDate}T${apt.startTime}`).getTime();
      return aptDateTime > now;
    }).length;
  }

  async checkAppointmentConflict(
    date: string,
    startTime: string,
    endTime: string,
    doctorId?: string,
    patientId?: string
  ): Promise<Appointment[]> {
    try {
      const appointments = await this.getAllAppointments();
      
      const startMinutes = this.getTimeMinutes(startTime);
      const endMinutes = this.getTimeMinutes(endTime);
      
      return appointments.filter(apt => {
        if (apt.appointmentDate !== date) return false;
        
        const aptStartMinutes = this.getTimeMinutes(apt.startTime);
        const aptEndMinutes = this.getTimeMinutes(apt.endTime);
        
        // Check overlap
        const overlap = startMinutes < aptEndMinutes && endMinutes > aptStartMinutes;
        
        // If doctor or patient filter is provided, only check conflicts with that doctor/patient
        if (doctorId && apt.doctorId !== doctorId) return false;
        if (patientId && apt.patientId !== patientId) return false;
        
        return overlap;
      });
    } catch (error) {
      console.error('Error checking appointment conflicts:', error);
      return [];
    }
  }

  private getTimeMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
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

export const appointmentService = new AppointmentService();
