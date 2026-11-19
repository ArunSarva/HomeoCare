import { Case } from '../../../types';
import { createCloudRecord, deleteCloudRecord, getCloudRecord, getCloudRecords, updateCloudRecord } from '../../../services/googleCloudStore';

export class CaseService {
  async generateCaseId(): Promise<string> {
    const records = await getCloudRecords<Case>('cases');
    let highest = 0;
    for (const record of records) {
      const number = Number.parseInt(record.id.replace(/^C/, ''), 10);
      if (!Number.isNaN(number)) highest = Math.max(highest, number);
    }
    return `C${String(highest + 1).padStart(9, '0')}`;
  }

  async createCase(caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = await this.generateCaseId();
    const now = new Date().toISOString();
    await createCloudRecord('cases', { ...caseData, id, createdAt: now, updatedAt: now } as Case);
    return id;
  }

  async updateCase(id: string, caseData: Partial<Case>): Promise<void> {
    const existing = await this.getCaseById(id);
    if (!existing) throw new Error('Case not found');
    await updateCloudRecord<Case>('cases', id, { ...caseData, updatedAt: new Date().toISOString() });
  }

  async deleteCase(id: string): Promise<void> {
    await deleteCloudRecord('cases', id);
  }

  async getCaseById(id: string): Promise<Case | null> {
    return getCloudRecord<Case>('cases', id);
  }

  async getCasesByPatientId(patientId: string): Promise<Case[]> {
    return (await getCloudRecords<Case>('cases')).filter((record) => record.patientId === patientId);
  }

  async getAllCases(): Promise<Case[]> {
    const records = await getCloudRecords<Case>('cases');
    return records.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }
}

export const caseService = new CaseService();
