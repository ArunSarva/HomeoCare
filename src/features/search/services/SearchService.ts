import { Patient } from '../../../types';
import { SearchResult, SearchOptions } from '../types/Search';
import { patientService } from '../../patients/services/patientService';
import { inventoryService } from '../../inventory/services/inventoryService';
import { prescriptionService } from '../../prescriptions/services/prescriptionService';
import { caseService } from '../../cases/services/caseService';
import { followUpService } from '../../followups/services/followUpService';
import { appointmentService } from '../../appointments/services/appointmentService';
import { billingService } from '../../billing/services/billingService';

/** Search queries the Google Sheets backend; results are not persisted locally. */
export class SearchService {
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    const { maxResults = 50, includeTypes = [] } = options;
    const term = query.toLowerCase().trim();
    let results: SearchResult[] = [];

    if (includeTypes.length === 0 || includeTypes.includes('patient')) {
      results.push(...await this.searchPatients(term, maxResults));
    }
    if (includeTypes.length === 0 || includeTypes.includes('medicine')) {
      results.push(...await this.searchMedicines(term, maxResults));
    }
    if (includeTypes.length === 0 || includeTypes.includes('prescription')) {
      results.push(...await this.searchPrescriptions(term, maxResults));
    }
    if (includeTypes.length === 0 || includeTypes.includes('case')) {
      results.push(...await this.searchCases(term, maxResults));
    }
    if (includeTypes.length === 0 || includeTypes.includes('followup')) {
      results.push(...await this.searchFollowUps(term, maxResults));
    }
    if (includeTypes.length === 0 || includeTypes.includes('appointment')) {
      results.push(...await this.searchAppointments(term, maxResults));
    }
    if (includeTypes.length === 0 || includeTypes.includes('billing')) {
      results.push(...await this.searchBilling(term, maxResults));
    }

    return this.sortResultsByRelevance(results, term).slice(0, maxResults);
  }

  async searchPatients(term: string, maxResults = 20): Promise<SearchResult[]> {
    const patients = await patientService.getAllPatients();
    return patients
      .filter((patient) =>
        patient.fullName.toLowerCase().includes(term) ||
        patient.patientId.toLowerCase().includes(term) ||
        patient.mobile.toLowerCase().includes(term)
      )
      .slice(0, maxResults)
      .map((patient) => ({
        id: patient.id,
        type: 'patient',
        title: `${patient.fullName} (${patient.patientId})`,
        subtitle: patient.mobile,
        highlight: this.getHighlight(patient.fullName, term),
        matchType: this.getMatchType(patient, term),
      }));
  }

  async searchMedicines(term: string, maxResults = 20): Promise<SearchResult[]> {
    const items = await inventoryService.getAllInventoryItems();
    return items
      .filter((item) => item.medicineName.toLowerCase().includes(term) || item.batch.toLowerCase().includes(term))
      .slice(0, maxResults)
      .map((item) => ({
        id: item.id,
        type: 'medicine',
        title: `${item.medicineName} - ${item.batch}`,
        subtitle: `${item.quantity} in stock`,
        highlight: this.getHighlight(item.medicineName, term),
        matchType: 'medicine' as const,
      }));
  }

  async searchPrescriptions(term: string, maxResults = 20): Promise<SearchResult[]> {
    const records = await prescriptionService.getAllPrescriptions();
    return records
      .filter((record) =>
        record.medicines?.some((medicine) => medicine.medicine.toLowerCase().includes(term)) ||
        record.patientName?.toLowerCase().includes(term) ||
        record.notes?.toLowerCase().includes(term)
      )
      .slice(0, maxResults)
      .map((record) => ({
        id: record.id,
        type: 'prescription',
        title: `Prescription for ${record.patientName}`,
        subtitle: record.createdAt,
        highlight: this.getHighlight(record.patientName, term),
        matchType: 'prescription' as const,
      }));
  }

  async searchCases(term: string, maxResults = 20): Promise<SearchResult[]> {
    const records = await caseService.getAllCases();
    return records
      .filter((record) =>
        record.patientName?.toLowerCase().includes(term) ||
        record.chiefComplaints?.some((complaint) => complaint.complaint.toLowerCase().includes(term)) ||
        record.notes?.toLowerCase().includes(term)
      )
      .slice(0, maxResults)
      .map((record) => ({
        id: record.id,
        type: 'case',
        title: `Case for ${record.patientName}`,
        subtitle: record.createdAt,
        highlight: this.getHighlight(record.patientName, term),
        matchType: 'disease' as const,
      }));
  }

  async searchFollowUps(term: string, maxResults = 20): Promise<SearchResult[]> {
    const records = await followUpService.getAllFollowUps();
    return records
      .filter((record) =>
        record.patientName?.toLowerCase().includes(term) ||
        record.symptoms?.some((symptom) => symptom.toLowerCase().includes(term)) ||
        record.notes?.toLowerCase().includes(term)
      )
      .slice(0, maxResults)
      .map((record) => ({
        id: record.id,
        type: 'followup',
        title: `Follow-up for ${record.patientName}`,
        subtitle: record.visitDate,
        highlight: this.getHighlight(record.patientName, term),
        matchType: 'symptoms' as const,
      }));
  }

  async searchAppointments(term: string, maxResults = 20): Promise<SearchResult[]> {
    const records = await appointmentService.getAllAppointments();
    return records
      .filter((record) =>
        record.patientName?.toLowerCase().includes(term) ||
        record.reason?.toLowerCase().includes(term) ||
        record.appointmentDate?.includes(term)
      )
      .slice(0, maxResults)
      .map((record) => ({
        id: record.id,
        type: 'appointment',
        title: `Appointment for ${record.patientName}`,
        subtitle: `${record.appointmentDate} ${record.startTime}`,
        highlight: this.getHighlight(record.patientName, term),
        matchType: 'name' as const,
      }));
  }

  async searchBilling(term: string, maxResults = 20): Promise<SearchResult[]> {
    const records = await billingService.getAllBillings();
    return records
      .filter((record) =>
        record.patientName?.toLowerCase().includes(term) ||
        record.invoiceNumber?.toLowerCase().includes(term) ||
        record.notes?.toLowerCase().includes(term)
      )
      .slice(0, maxResults)
      .map((record) => ({
        id: record.id,
        type: 'billing',
        title: `Invoice ${record.invoiceNumber} for ${record.patientName}`,
        subtitle: `${record.totalAmount.toFixed(2)}`,
        highlight: this.getHighlight(record.patientName, term),
        matchType: 'name' as const,
      }));
  }

  private getHighlight(text: string, term: string): string {
    if (!text) return '';
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }

  private getMatchType(patient: Patient, term: string): 'id' | 'name' | 'mobile' | undefined {
    if (patient.patientId.toLowerCase().includes(term)) return 'id';
    if (patient.fullName.toLowerCase().includes(term)) return 'name';
    if (patient.mobile.toLowerCase().includes(term)) return 'mobile';
    return undefined;
  }

  private sortResultsByRelevance(results: SearchResult[], term: string): SearchResult[] {
    const lowerTerm = term.toLowerCase();
    const priority: Record<string, number> = {
      patient: 1, prescription: 2, medicine: 3, case: 4, followup: 5, appointment: 6, billing: 7,
    };
    return results.sort((a, b) => {
      const aExact = a.title.toLowerCase() === lowerTerm;
      const bExact = b.title.toLowerCase() === lowerTerm;
      if (aExact !== bExact) return aExact ? -1 : 1;
      const aIncludes = a.title.toLowerCase().includes(lowerTerm);
      const bIncludes = b.title.toLowerCase().includes(lowerTerm);
      if (aIncludes !== bIncludes) return aIncludes ? -1 : 1;
      return priority[a.type] - priority[b.type];
    });
  }
}

export const searchService = new SearchService();
