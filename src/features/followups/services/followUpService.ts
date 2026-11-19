import { FollowUp } from '../../../types';
import {
  createCloudRecord,
  deleteCloudRecord,
  getCloudRecord,
  getCloudRecords,
  nextCloudId,
  updateCloudRecord,
} from '../../../services/googleCloudStore';

export async function generateFollowUpId(): Promise<string> {
  return nextCloudId('followups', 'FU');
}

export class FollowUpService {
  async getAllFollowUps(): Promise<FollowUp[]> {
    return getCloudRecords<FollowUp>('followups');
  }

  async getFollowUpById(id: string): Promise<FollowUp | null> {
    return getCloudRecord<FollowUp>('followups', id);
  }

  async getFollowUpsByPatientId(patientId: string): Promise<FollowUp[]> {
    const records = (await this.getAllFollowUps()).filter((record) => record.patientId === patientId);
    return records.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  }

  async createFollowUp(followUpData: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt'>): Promise<FollowUp> {
    const id = await generateFollowUpId();
    const now = new Date().toISOString();
    const followUp: FollowUp = { ...followUpData, id, createdAt: now, updatedAt: now };
    return createCloudRecord('followups', followUp);
  }

  async updateFollowUp(id: string, followUpData: Partial<FollowUp>): Promise<void> {
    const existing = await this.getFollowUpById(id);
    if (!existing) throw new Error('Follow-up not found');
    await updateCloudRecord<FollowUp>('followups', id, {
      ...followUpData,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteFollowUp(id: string): Promise<void> {
    await deleteCloudRecord('followups', id);
  }

  async searchFollowUps(
    patientName?: string,
    dateRange?: { start: string; end: string },
    status?: string,
  ): Promise<FollowUp[]> {
    let records = await this.getAllFollowUps();
    if (patientName) {
      const term = patientName.toLowerCase();
      records = records.filter((record) => record.patientName.toLowerCase().includes(term));
    }
    if (dateRange?.start || dateRange?.end) {
      records = records.filter((record) => {
        const date = new Date(record.visitDate).getTime();
        const start = dateRange.start ? new Date(dateRange.start).getTime() : 0;
        const end = dateRange.end ? new Date(dateRange.end).getTime() : Infinity;
        return date >= start && date <= end;
      });
    }
    if (status) records = records.filter((record) => record.status === status);
    return records;
  }

  async getFollowUpCount(): Promise<number> {
    return (await this.getAllFollowUps()).length;
  }

  async getPendingFollowUpsCount(): Promise<number> {
    return (await this.getAllFollowUps()).filter((record) => new Date(record.visitDate).getTime() > Date.now()).length;
  }
}

export const followUpService = new FollowUpService();
