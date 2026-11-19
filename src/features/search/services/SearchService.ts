import { getDB } from '../../../hooks/useIndexedDB';
import { Patient } from '../../../types';
import { SearchResult, SearchCacheEntry, SearchOptions } from '../types/Search';
import { patientService } from '../../patients/services/patientService';
import { inventoryService } from '../../inventory/services/inventoryService';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

/**
 * Search service with IndexedDB caching and offline support
 */
export class SearchService {
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    const { maxResults = 50, includeTypes = [] } = options;
    const term = query.toLowerCase().trim();

    // Check cache first
    const cached = await this.getCachedResults(query);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.results;
    }

    let results: SearchResult[] = [];

    // Search patients
    if (includeTypes.length === 0 || includeTypes.includes('patient')) {
      const patientResults = await this.searchPatients(term, maxResults);
      results = [...results, ...patientResults];
    }

    // Search medicines
    if (includeTypes.length === 0 || includeTypes.includes('medicine')) {
      const medicineResults = await this.searchMedicines(term, maxResults);
      results = [...results, ...medicineResults];
    }

    // Search prescriptions
    if (includeTypes.length === 0 || includeTypes.includes('prescription')) {
      const prescriptionResults = await this.searchPrescriptions(term, maxResults);
      results = [...results, ...prescriptionResults];
    }

    // Search cases
    if (includeTypes.length === 0 || includeTypes.includes('case')) {
      const caseResults = await this.searchCases(term, maxResults);
      results = [...results, ...caseResults];
    }

    // Search followups
    if (includeTypes.length === 0 || includeTypes.includes('followup')) {
      const followupResults = await this.searchFollowUps(term, maxResults);
      results = [...results, ...followupResults];
    }

    // Search appointments
    if (includeTypes.length === 0 || includeTypes.includes('appointment')) {
      const appointmentResults = await this.searchAppointments(term, maxResults);
      results = [...results, ...appointmentResults];
    }

    // Search billing
    if (includeTypes.length === 0 || includeTypes.includes('billing')) {
      const billingResults = await this.searchBilling(term, maxResults);
      results = [...results, ...billingResults];
    }

    // Sort by relevance (exact matches first, then partial matches)
    results = this.sortResultsByRelevance(results, term);

    // Limit results
    if (results.length > maxResults) {
      results = results.slice(0, maxResults);
    }

    // Cache results
    await this.cacheResults(query, results);

    return results;
  }

  async searchPatients(term: string, maxResults: number = 20): Promise<SearchResult[]> {
    try {
      const patients = await patientService.getAllPatients();
      
      return patients
        .filter(patient => 
          patient.fullName.toLowerCase().includes(term) ||
          patient.patientId.toLowerCase().includes(term) ||
          patient.mobile.toLowerCase().includes(term)
        )
        .slice(0, maxResults)
        .map(patient => ({
          id: patient.id,
          type: 'patient',
          title: `${patient.fullName} (${patient.patientId})`,
          subtitle: patient.mobile,
          highlight: this.getHighlight(patient.fullName, term),
          matchType: this.getMatchType(patient, term)
        }));
    } catch (error) {
      console.error('Error searching patients:', error);
      return [];
    }
  }

  async searchMedicines(term: string, maxResults: number = 20): Promise<SearchResult[]> {
    try {
      const items = await inventoryService.getAllInventoryItems();
      
      return items
        .filter(item => 
          item.medicineName.toLowerCase().includes(term) ||
          item.batch.toLowerCase().includes(term)
        )
        .slice(0, maxResults)
        .map(item => ({
          id: item.id,
          type: 'medicine',
          title: `${item.medicineName} - ${item.batch}`,
          subtitle: `${item.quantity} in stock`,
          highlight: this.getHighlight(item.medicineName, term),
          matchType: 'medicine' as const
        }));
    } catch (error) {
      console.error('Error searching medicines:', error);
      return [];
    }
  }

  async searchPrescriptions(term: string, maxResults: number = 20): Promise<SearchResult[]> {
    try {
      const db = await getDB();
      const tx = db.transaction('prescriptions', 'readonly');
      const store = tx.objectStore('prescriptions');
      const request = store.getAll();
      
      const prescriptions = await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return prescriptions
        .filter((prescription: any) => {
          const medicineMatches = prescription.medicines?.some((med: any) => 
            med.medicine?.toLowerCase().includes(term)
          );
          const patientMatches = prescription.patientName?.toLowerCase().includes(term);
          const notesMatches = prescription.notes?.toLowerCase().includes(term);
          
          return medicineMatches || patientMatches || notesMatches;
        })
        .slice(0, maxResults)
        .map((prescription: any) => ({
          id: prescription.id,
          type: 'prescription',
          title: `Prescription for ${prescription.patientName}`,
          subtitle: prescription.createdAt,
          highlight: this.getHighlight(prescription.patientName, term),
          matchType: 'prescription' as const
        }));
    } catch (error) {
      console.error('Error searching prescriptions:', error);
      return [];
    }
  }

  async searchCases(term: string, maxResults: number = 20): Promise<SearchResult[]> {
    try {
      const db = await getDB();
      const tx = db.transaction('cases', 'readonly');
      const store = tx.objectStore('cases');
      const request = store.getAll();
      
      const cases = await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return cases
        .filter((c: any) => {
          const patientMatches = c.patientName?.toLowerCase().includes(term);
          const complaintMatches = c.chiefComplaints?.some((cc: any) => 
            cc.complaint?.toLowerCase().includes(term)
          );
          const notesMatches = c.notes?.toLowerCase().includes(term);
          
          return patientMatches || complaintMatches || notesMatches;
        })
        .slice(0, maxResults)
        .map((c: any) => ({
          id: c.id,
          type: 'case',
          title: `Case for ${c.patientName}`,
          subtitle: c.createdAt,
          highlight: this.getHighlight(c.patientName, term),
          matchType: 'disease' as const
        }));
    } catch (error) {
      console.error('Error searching cases:', error);
      return [];
    }
  }

  async searchFollowUps(term: string, maxResults: number = 20): Promise<SearchResult[]> {
    try {
      const db = await getDB();
      const tx = db.transaction('followups', 'readonly');
      const store = tx.objectStore('followups');
      const request = store.getAll();
      
      const followups = await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return followups
        .filter((f: any) => {
          const patientMatches = f.patientName?.toLowerCase().includes(term);
          const symptomsMatches = f.symptoms?.some((s: string) => 
            s.toLowerCase().includes(term)
          );
          const notesMatches = f.notes?.toLowerCase().includes(term);
          
          return patientMatches || symptomsMatches || notesMatches;
        })
        .slice(0, maxResults)
        .map((f: any) => ({
          id: f.id,
          type: 'followup',
          title: `Follow-up for ${f.patientName}`,
          subtitle: f.visitDate,
          highlight: this.getHighlight(f.patientName, term),
          matchType: 'symptoms' as const
        }));
    } catch (error) {
      console.error('Error searching followups:', error);
      return [];
    }
  }

  async searchAppointments(term: string, maxResults: number = 20): Promise<SearchResult[]> {
    try {
      const db = await getDB();
      const tx = db.transaction('appointments', 'readonly');
      const store = tx.objectStore('appointments');
      const request = store.getAll();
      
      const appointments = await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return appointments
        .filter((a: any) => {
          const patientMatches = a.patientName?.toLowerCase().includes(term);
          const reasonMatches = a.reason?.toLowerCase().includes(term);
          const dateMatches = a.appointmentDate?.includes(term);
          
          return patientMatches || reasonMatches || dateMatches;
        })
        .slice(0, maxResults)
        .map((a: any) => ({
          id: a.id,
          type: 'appointment',
          title: `Appointment for ${a.patientName}`,
          subtitle: `${a.appointmentDate} ${a.startTime}`,
          highlight: this.getHighlight(a.patientName, term),
          matchType: 'name' as const
        }));
    } catch (error) {
      console.error('Error searching appointments:', error);
      return [];
    }
  }

  async searchBilling(term: string, maxResults: number = 20): Promise<SearchResult[]> {
    try {
      const db = await getDB();
      const tx = db.transaction('billing', 'readonly');
      const store = tx.objectStore('billing');
      const request = store.getAll();
      
      const billingRecords = await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return billingRecords
        .filter((b: any) => {
          const patientMatches = b.patientName?.toLowerCase().includes(term);
          const invoiceMatches = b.invoiceNumber?.toLowerCase().includes(term);
          const notesMatches = b.notes?.toLowerCase().includes(term);
          
          return patientMatches || invoiceMatches || notesMatches;
        })
        .slice(0, maxResults)
        .map((b: any) => ({
          id: b.id,
          type: 'billing',
          title: `Invoice ${b.invoiceNumber} for ${b.patientName}`,
          subtitle: `$${b.totalAmount.toFixed(2)}`,
          highlight: this.getHighlight(b.patientName, term),
          matchType: 'name' as const
        }));
    } catch (error) {
      console.error('Error searching billing:', error);
      return [];
    }
  }

  // Cache management
  private async getCachedResults(query: string): Promise<SearchCacheEntry | null> {
    try {
      const db = await getDB();
      const tx = db.transaction('localCache', 'readonly');
      const store = tx.objectStore('localCache');
      const key = `search:${query.toLowerCase()}`;
      
      const request = store.get(key);
      return new Promise<SearchCacheEntry | null>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result?.value || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting cached search results:', error);
      return null;
    }
  }

  private async cacheResults(query: string, results: SearchResult[]): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction('localCache', 'readwrite');
      const store = tx.objectStore('localCache');
      
      const key = `search:${query.toLowerCase()}`;
      const entry: SearchCacheEntry = {
        query,
        results,
        timestamp: Date.now()
      };
      
      await store.put({
        key,
        value: entry,
        timestamp: Date.now()
      });
      
      // Clean up old cache entries if needed
      await this.cleanupCache();
    } catch (error) {
      console.error('Error caching search results:', error);
    }
  }

  private async cleanupCache(): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction('localCache', 'readwrite');
      const store = tx.objectStore('localCache');
      const request = store.getAll();
      
      const entries = await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (entries.length > MAX_CACHE_SIZE) {
        // Sort by timestamp and remove oldest
        const sorted = entries.sort((a, b) => a.timestamp - b.timestamp);
        const toRemove = sorted.slice(0, sorted.length - MAX_CACHE_SIZE);
        
        for (const entry of toRemove) {
          store.delete(entry.key);
        }
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }

  // Helper methods
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
    const termLower = term.toLowerCase();
    
    return results.sort((a, b) => {
      // Exact matches first
      const aExact = a.title.toLowerCase() === termLower;
      const bExact = b.title.toLowerCase() === termLower;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then matches in title
      const aTitleMatch = a.title.toLowerCase().includes(termLower);
      const bTitleMatch = b.title.toLowerCase().includes(termLower);
      
      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;
      
      // Then by type priority
      const typePriority: Record<string, number> = {
        patient: 1,
        prescription: 2,
        medicine: 3,
        case: 4,
        followup: 5,
        appointment: 6,
        billing: 7
      };
      
      return typePriority[a.type] - typePriority[b.type];
    });
  }
}

export const searchService = new SearchService();