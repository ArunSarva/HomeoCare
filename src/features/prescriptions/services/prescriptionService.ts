import { Prescription, PrescriptionMedicine } from '../../../types';
import {
  createCloudRecord,
  deleteCloudRecord,
  getCloudRecord,
  getCloudRecords,
  nextCloudId,
  updateCloudRecord,
} from '../../../services/googleCloudStore';

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

interface PrescriptionTemplate {
  id: string;
  name: string;
  prescriptionData: Pick<Prescription, 'medicines' | 'notes' | 'doctorId' | 'doctorName'>;
  createdAt: string;
}

/** Prescription records and templates are stored in the connected Google Sheet. */
export class PrescriptionService {
  async generatePrescriptionId(): Promise<string> {
    return nextCloudId('prescriptions', 'Rx', 9);
  }

  async createPrescription(prescriptionData: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const prescriptionId = await this.generatePrescriptionId();
    const now = new Date().toISOString();
    const record = { ...prescriptionData, id: prescriptionId, createdAt: now, updatedAt: now } as Prescription;
    await createCloudRecord('prescriptions', record);
    return prescriptionId;
  }

  async updatePrescription(id: string, prescriptionData: Partial<Prescription>): Promise<void> {
    const existing = await this.getPrescriptionById(id);
    if (!existing) throw new Error('Prescription not found');
    await updateCloudRecord<Prescription>('prescriptions', id, {
      ...prescriptionData,
      updatedAt: new Date().toISOString(),
    });
  }

  async deletePrescription(id: string): Promise<void> {
    await deleteCloudRecord('prescriptions', id);
  }

  async getPrescriptionById(id: string): Promise<Prescription | null> {
    return getCloudRecord<Prescription>('prescriptions', id);
  }

  async getPrescriptionsByPatientId(patientId: string): Promise<Prescription[]> {
    return (await getCloudRecords<Prescription>('prescriptions')).filter((record) => record.patientId === patientId);
  }

  async getAllPrescriptions(): Promise<Prescription[]> {
    const all = await getCloudRecords<Prescription>('prescriptions');
    return all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
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
    const template: PrescriptionTemplate = {
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
    await createCloudRecord('prescriptionTemplates', template);
  }

  async getTemplates(): Promise<PrescriptionTemplate[]> {
    return getCloudRecords<PrescriptionTemplate>('prescriptionTemplates');
  }

  async loadTemplate(templateId: string): Promise<PrescriptionMedicine[] | null> {
    const template = await getCloudRecord<PrescriptionTemplate>('prescriptionTemplates', templateId);
    return template?.prescriptionData.medicines ?? null;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await deleteCloudRecord('prescriptionTemplates', templateId);
  }
}

export const prescriptionService = new PrescriptionService();
