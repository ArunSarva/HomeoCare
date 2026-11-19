import { Prescription, PrescriptionMedicine } from '../../../types';
import { getDB } from '../../../hooks/useIndexedDB';

// Common homeopathy remedies
export const COMMON_REMEDIES = [
  'Sulphur 200C',
  'Nux Vomica 30C',
  'Lycopodium 1M',
  'Calcarea Carb 200C',
  'Natrum Mur 200C',
  'Pulsatilla 200C',
  'China 30C',
  'Arsenic Album 200C',
  'Sepia 200C',
  'Lachesis 200C',
];

/**
 * Prescriptions are offline-first: the local `prescriptions` store is the
 * source of truth, every change is queued in `syncQueue`.
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

// Prescription service for managing prescriptions
export class PrescriptionService {
  private async getDB() {
    return getDB();
  }

  // Generate prescription ID
  async generatePrescriptionId(): Promise<string> {
    return `Rx${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }

  /** Write the prescription and its sync-queue entry in one transaction. */
  private async saveLocally(record: Prescription | { id: string }, action: 'create' | 'update' | 'delete'): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(['prescriptions', 'syncQueue'], 'readwrite');
    if (action === 'delete') {
      tx.objectStore('prescriptions').delete(record.id);
    } else {
      tx.objectStore('prescriptions').put(record);
    }
    tx.objectStore('syncQueue').put({
      id: crypto.randomUUID(),
      type: 'prescription',
      action,
      data: record,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    });
    await txDone(tx);
  }



  // Create a new prescription
  async createPrescription(prescriptionData: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const prescriptionId = await this.generatePrescriptionId();
      const now = new Date().toISOString();
      const record = { ...prescriptionData, id: prescriptionId, createdAt: now, updatedAt: now } as Prescription;
      await this.saveLocally(record, 'create');
      return prescriptionId;
    } catch (error) {
      console.error('Error creating prescription:', error);
      throw error;
    }
  }

  // Update an existing prescription
  async updatePrescription(id: string, prescriptionData: Partial<Prescription>): Promise<void> {
    try {
      const existing = await this.getPrescriptionById(id);
      const record = { ...(existing ?? {}), ...prescriptionData, id, updatedAt: new Date().toISOString() } as Prescription;
      await this.saveLocally(record, 'update');
    } catch (error) {
      console.error('Error updating prescription:', error);
      throw error;
    }
  }

  // Delete a prescription
  async deletePrescription(id: string): Promise<void> {
    try {
      await this.saveLocally({ id }, 'delete');
    } catch (error) {
      console.error('Error deleting prescription:', error);
      throw error;
    }
  }

  // Get prescription by ID
  async getPrescriptionById(id: string): Promise<Prescription | null> {
    try {
      const db = await this.getDB();
      const local = await requestToPromise(db.transaction('prescriptions', 'readonly').objectStore('prescriptions').get(id));
      return (local as Prescription | undefined) ?? null;
    } catch (error) {
      console.error('Error getting prescription by ID:', error);
      throw error;
    }
  }

  // Get all prescriptions for a patient
  async getPrescriptionsByPatientId(patientId: string): Promise<Prescription[]> {
    try {
      const db = await this.getDB();
      const index = db.transaction('prescriptions', 'readonly').objectStore('prescriptions').index('byPatientId');
      return (await requestToPromise(index.getAll(patientId))) as Prescription[];
    } catch (error) {
      console.error('Error getting prescriptions by patient ID:', error);
      throw error;
    }
  }

  // Get all prescriptions, newest first
  async getAllPrescriptions(): Promise<Prescription[]> {
    try {
      const db = await this.getDB();
      const all = (await requestToPromise(
        db.transaction('prescriptions', 'readonly').objectStore('prescriptions').getAll()
      )) as Prescription[];
      return all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (error) {
      console.error('Error getting all prescriptions:', error);
      throw error;
    }
  }

  // Get prescriptions by search criteria
  async searchPrescriptions(searchTerm: string, dateRange?: { start: string; end: string }): Promise<Prescription[]> {
    try {
      const allPrescriptions = await this.getAllPrescriptions();
      
      let filtered = allPrescriptions;
      
      // Filter by search term (patient name or medicine name)
      if (searchTerm) {
        filtered = filtered.filter((prescription: Prescription) => {
          const searchLower = searchTerm.toLowerCase();
          const matchesPatient = prescription.patientName?.toLowerCase().includes(searchLower);
          const matchesMedicine = prescription.medicines?.some((m: PrescriptionMedicine) => 
            m.medicine?.toLowerCase().includes(searchLower)
          );
          return matchesPatient || matchesMedicine;
        });
      }
      
      // Filter by date range
      if (dateRange?.start || dateRange?.end) {
        filtered = filtered.filter((prescription: Prescription) => {
          const prescriptionDate = new Date(prescription.createdAt).getTime();
          const startDate = dateRange.start ? new Date(dateRange.start).getTime() : 0;
          const endDate = dateRange.end ? new Date(dateRange.end).getTime() : Infinity;
          return prescriptionDate >= startDate && prescriptionDate <= endDate;
        });
      }
      
      return filtered;
    } catch (error) {
      console.error('Error searching prescriptions:', error);
      throw error;
    }
  }

  // Sync offline prescriptions when online
  async syncOfflinePrescriptions(): Promise<void> {
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
              if (item.type === 'prescription') {
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
              if (item.type === 'prescription') {
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
              if (item.type === 'prescription') {
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
      console.error('Error syncing offline prescriptions:', error);
      throw error;
    }
  }

  // Generate PDF content for prescription
  generatePDFContent(prescription: Prescription, clinicInfo?: {
    name: string;
    address: string;
    phone: string;
    doctorName: string;
    qualification: string;
  }): string {
    const medicinesTable = prescription.medicines
      .map(m => `<tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${m.medicine}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${m.potency}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${m.dosage}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${m.frequency}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${m.duration}</td>
      </tr>`)
      .join('');

    const styles = `
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #2563eb; margin: 0; }
        .header p { margin: 5px 0; color: #666; }
        .section { margin-bottom: 20px; }
        .section h3 { border-bottom: 2px solid #2563eb; padding-bottom: 5px; color: #2563eb; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background-color: #2563eb; color: white; padding: 10px; text-align: left; }
        td { padding: 8px; border: 1px solid #ddd; }
        .signature { margin-top: 40px; text-align: right; }
        .signature p { margin: 5px 0; }
      </style>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Prescription - ${prescription.patientName}</title>
        ${styles}
      </head>
      <body>
        <div class="header">
          <h1>${clinicInfo?.name || 'HomeoCare Pro Clinic'}</h1>
          <p>${clinicInfo?.address || 'Clinic Address'}</p>
          <p>Phone: ${clinicInfo?.phone || 'N/A'}</p>
        </div>

        <div class="section">
          <h3>Patient Details</h3>
          <table>
            <tr>
              <td><strong>Patient Name:</strong> ${prescription.patientName}</td>
              <td><strong>Patient ID:</strong> ${prescription.patientId}</td>
            </tr>
            <tr>
              <td><strong>Prescription Date:</strong> ${new Date(prescription.createdAt).toLocaleDateString()}</td>
              <td><strong>Doctor:</strong> ${clinicInfo?.doctorName || prescription.doctorName || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <h3>Medicines</h3>
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Potency</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              ${medicinesTable}
            </tbody>
          </table>
        </div>

        ${prescription.notes ? `
        <div class="section">
          <h3>Instructions</h3>
          <p>${prescription.notes}</p>
        </div>
        ` : ''}

        <div class="signature">
          <p>_________________________</p>
          <p><strong>${clinicInfo?.doctorName || prescription.doctorName || 'Doctor Name'}</strong></p>
          <p>${clinicInfo?.qualification || 'Qualification'}</p>
          <p>${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  // Open PDF in new window
  openPrescriptionPDF(prescription: Prescription, clinicInfo?: {
    name: string;
    address: string;
    phone: string;
    doctorName: string;
    qualification: string;
  }): Window | null {
    const htmlContent = this.generatePDFContent(prescription, clinicInfo);
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Add print button to the document
      setTimeout(() => {
        printWindow.document.body.insertAdjacentHTML('afterbegin', `
          <div style="padding: 10px; background: #f3f4f6; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
              Print Prescription
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px; font-size: 16px;">
              Close
            </button>
          </div>
        `);
      }, 500);
    }
    
    return printWindow;
  }

  // Save prescription as template
  async saveAsTemplate(prescription: Prescription, templateName: string): Promise<void> {
    try {
      // Store template in localStorage
      const templates = this.getTemplates();
      const template = {
        id: crypto.randomUUID(),
        name: templateName,
        prescriptionData: {
          medicines: prescription.medicines,
          notes: prescription.notes,
          doctorId: prescription.doctorId,
          doctorName: prescription.doctorName,
        },
        createdAt: new Date().toISOString(),
      };
      
      templates.push(template);
      localStorage.setItem('prescriptionTemplates', JSON.stringify(templates));
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }

  // Get all templates
  getTemplates(): any[] {
    try {
      const templates = localStorage.getItem('prescriptionTemplates');
      return templates ? JSON.parse(templates) : [];
    } catch (error) {
      console.error('Error getting templates:', error);
      return [];
    }
  }

  // Load template
  loadTemplate(templateId: string): PrescriptionMedicine[] | null {
    try {
      const templates = this.getTemplates();
      const template = templates.find(t => t.id === templateId);
      return template ? template.prescriptionData.medicines : null;
    } catch (error) {
      console.error('Error loading template:', error);
      return null;
    }
  }

  // Delete template
  deleteTemplate(templateId: string): void {
    try {
      const templates = this.getTemplates();
      const filtered = templates.filter(t => t.id !== templateId);
      localStorage.setItem('prescriptionTemplates', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }
}

export const prescriptionService = new PrescriptionService();
