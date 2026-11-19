import { Patient } from '../../../types';
import { createCloudRecord, deleteCloudRecord, getCloudRecord, getCloudRecords, nextCloudId, updateCloudRecord } from '../../../services/googleCloudStore';

export async function generatePatientId(): Promise<string> {
  return nextCloudId('patients', 'P');
}

export class PatientService {
  async getAllPatients(): Promise<Patient[]> {
    return getCloudRecords<Patient>('patients');
  }

  async getPatientById(id: string): Promise<Patient | null> {
    return getCloudRecord<Patient>('patients', id);
  }

  async createPatient(
    patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>,
    customCreatedAt?: string,
  ): Promise<Patient> {
    const patientId = await generatePatientId();
    const now = customCreatedAt || new Date().toISOString();
    const patient: Patient = {
      ...patientData,
      id: crypto.randomUUID(),
      patientId,
      createdAt: now,
      updatedAt: now,
    };
    return createCloudRecord('patients', patient);
  }

  async updatePatient(id: string, patientData: Partial<Patient>): Promise<void> {
    await updateCloudRecord<Patient>('patients', id, {
      ...patientData,
      updatedAt: new Date().toISOString(),
    });
  }

  async deletePatient(id: string): Promise<void> {
    await deleteCloudRecord('patients', id);
  }

  async searchPatients(searchTerm: string): Promise<Patient[]> {
    const term = searchTerm.toLowerCase();
    return (await this.getAllPatients()).filter((patient) =>
      patient.fullName.toLowerCase().includes(term) ||
      patient.patientId.toLowerCase().includes(term) ||
      patient.mobile.toLowerCase().includes(term) ||
      Boolean(patient.email?.toLowerCase().includes(term))
    );
  }

  async getPatientCount(): Promise<number> {
    return (await this.getAllPatients()).length;
  }
}

export const patientService = new PatientService();
