import { Appointment } from '../../../types';
import {
  createCloudRecord,
  deleteCloudRecord,
  getCloudRecord,
  getCloudRecords,
  nextCloudId,
  updateCloudRecord,
} from '../../../services/googleCloudStore';

/**
 * Generate appointment ID
 */
export const generateAppointmentId = async (): Promise<string> => {
  return nextCloudId('appointments', 'APT');
};

/**
 * Appointment service backed by Google Sheets.
 */
export class AppointmentService {
  async getAllAppointments(): Promise<Appointment[]> {
    return getCloudRecords<Appointment>('appointments');
  }

  async getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
    const appointments = await this.getAllAppointments();
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    const end = new Date(endDate).setHours(23, 59, 59, 999);
    return appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.appointmentDate).getTime();
      return appointmentDate >= start && appointmentDate <= end;
    });
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
    return (await this.getAllAppointments()).filter((appointment) => appointment.patientId === patientId);
  }

  async getAppointmentById(id: string): Promise<Appointment | null> {
    return getCloudRecord<Appointment>('appointments', id);
  }

  async createAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment> {
    const appointmentId = await generateAppointmentId();
    const conflicts = await this.checkAppointmentConflict(
      appointmentData.appointmentDate,
      appointmentData.startTime,
      appointmentData.endTime,
      appointmentData.doctorId,
      appointmentData.patientId,
    );
    if (conflicts.length > 0) throw new Error('Appointment conflicts with existing appointment(s)');
    const now = new Date().toISOString();
    const appointment: Appointment = { ...appointmentData, id: appointmentId, createdAt: now, updatedAt: now };
    return createCloudRecord('appointments', appointment);
  }

  async updateAppointment(id: string, appointmentData: Partial<Appointment>): Promise<void> {
    const existing = await this.getAppointmentById(id);
    if (!existing) throw new Error('Appointment not found');
    if (appointmentData.appointmentDate || appointmentData.startTime || appointmentData.endTime) {
      const conflicts = await this.checkAppointmentConflict(
        appointmentData.appointmentDate || existing.appointmentDate,
        appointmentData.startTime || existing.startTime,
        appointmentData.endTime || existing.endTime,
        appointmentData.doctorId || existing.doctorId,
        appointmentData.patientId || existing.patientId,
      );
      if (conflicts.some((conflict) => conflict.id !== id)) {
        throw new Error('Appointment conflicts with existing appointment(s)');
      }
    }
    await updateCloudRecord<Appointment>('appointments', id, {
      ...appointmentData,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteAppointment(id: string): Promise<void> {
    await deleteCloudRecord('appointments', id);
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
      throw error;
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
      throw error;
    }
  }

  private getTimeMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

}

export const appointmentService = new AppointmentService();
