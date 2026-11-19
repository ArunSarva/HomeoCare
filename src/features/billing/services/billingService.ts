import { Billing } from '../../../types';
import {
  createCloudRecord,
  deleteCloudRecord,
  getCloudRecord,
  getCloudRecords,
  nextCloudId,
  updateCloudRecord,
} from '../../../services/googleCloudStore';

/**
 * Generate billing ID
 */
export const generateBillingId = async (): Promise<string> => {
  return nextCloudId('billing', 'BILL');
};

/** Billing service backed by Google Sheets. */
export class BillingService {
  async getAllBillings(): Promise<Billing[]> {
    return getCloudRecords<Billing>('billing');
  }

  async getBillingById(id: string): Promise<Billing | null> {
    return getCloudRecord<Billing>('billing', id);
  }

  async getBillingsByPatientId(patientId: string): Promise<Billing[]> {
    return (await this.getAllBillings()).filter((bill) => bill.patientId === patientId);
  }

  async createBilling(billingData: Omit<Billing, 'id' | 'createdAt' | 'updatedAt'>, customCreatedAt?: string): Promise<Billing> {
    const billingId = await generateBillingId();
    const now = customCreatedAt || new Date().toISOString();
    const billing: Billing = { ...billingData, id: billingId, createdAt: now, updatedAt: now };
    return createCloudRecord('billing', billing);
  }

  async updateBilling(id: string, billingData: Partial<Billing>): Promise<void> {
    try {
      const existing = await this.getBillingById(id);
      
      if (!existing) {
        throw new Error('Billing record not found');
      }

      const updatedBilling: Billing = {
        ...existing,
        ...billingData,
        updatedAt: new Date().toISOString(),
      };

      await updateCloudRecord<Billing>('billing', id, updatedBilling);
    } catch (error) {
      console.error('Error updating billing record:', error);
      throw error;
    }
  }

  async deleteBilling(id: string): Promise<void> {
    try {
      await deleteCloudRecord('billing', id);
    } catch (error) {
      console.error('Error deleting billing record:', error);
      throw error;
    }
  }

  async searchBillings(
    patientName?: string, 
    dateRange?: { start: string; end: string }, 
    status?: string
  ): Promise<Billing[]> {
    try {
      const bills = await this.getAllBillings();
      
      let filtered = bills;
      
      // Filter by patient name
      if (patientName) {
        const term = patientName.toLowerCase();
        filtered = filtered.filter(bill => 
          bill.patientName.toLowerCase().includes(term)
        );
      }
      
      // Filter by date range
      if (dateRange?.start || dateRange?.end) {
        filtered = filtered.filter(bill => {
          const billDate = new Date(bill.createdAt).getTime();
          const startDate = dateRange.start ? new Date(dateRange.start).getTime() : 0;
          const endDate = dateRange.end ? new Date(dateRange.end).getTime() : Infinity;
          return billDate >= startDate && billDate <= endDate;
        });
      }
      
      // Filter by status
      if (status) {
        filtered = filtered.filter(bill => bill.status === status);
      }
      
      return filtered;
    } catch (error) {
      console.error('Error searching billing records:', error);
      throw error;
    }
  }

  async getRevenueReports(dateRange?: { start: string; end: string }): Promise<{
    daily: { date: string; total: number; count: number }[];
    monthly: { month: string; total: number; count: number }[];
    yearly: { year: string; total: number; count: number }[];
  }> {
    try {
      const bills = await this.getAllBillings();
      
      let filtered = bills;
      
      // Filter by date range if provided
      if (dateRange?.start || dateRange?.end) {
        filtered = bills.filter(bill => {
          const billDate = new Date(bill.createdAt).getTime();
          const startDate = dateRange.start ? new Date(dateRange.start).getTime() : 0;
          const endDate = dateRange.end ? new Date(dateRange.end).getTime() : Infinity;
          return billDate >= startDate && billDate <= endDate;
        });
      }

      // Calculate daily revenue
      const dailyMap = new Map<string, { total: number; count: number }>();
      filtered.forEach(bill => {
        const date = bill.createdAt.split('T')[0];
        const existing = dailyMap.get(date) || { total: 0, count: 0 };
        existing.total += bill.totalAmount;
        existing.count += 1;
        dailyMap.set(date, existing);
      });

      const daily = Array.from(dailyMap.entries())
        .map(([date, { total, count }]) => ({ date, total, count }))
        .sort((a, b) => b.date.localeCompare(a.date));

      // Calculate monthly revenue
      const monthlyMap = new Map<string, { total: number; count: number }>();
      filtered.forEach(bill => {
        const yearMonth = bill.createdAt.substring(0, 7);
        const existing = monthlyMap.get(yearMonth) || { total: 0, count: 0 };
        existing.total += bill.totalAmount;
        existing.count += 1;
        monthlyMap.set(yearMonth, existing);
      });

      const monthly = Array.from(monthlyMap.entries())
        .map(([month, { total, count }]) => ({ month, total, count }))
        .sort((a, b) => b.month.localeCompare(a.month));

      // Calculate yearly revenue
      const yearlyMap = new Map<string, { total: number; count: number }>();
      filtered.forEach(bill => {
        const year = bill.createdAt.substring(0, 4);
        const existing = yearlyMap.get(year) || { total: 0, count: 0 };
        existing.total += bill.totalAmount;
        existing.count += 1;
        yearlyMap.set(year, existing);
      });

      const yearly = Array.from(yearlyMap.entries())
        .map(([year, { total, count }]) => ({ year, total, count }))
        .sort((a, b) => b.year.localeCompare(a.year));

      return { daily, monthly, yearly };
    } catch (error) {
      console.error('Error getting revenue reports:', error);
      throw error;
    }
  }

  async getKPIs(): Promise<{
    totalRevenue: number;
    pendingPayments: number;
    totalPatientsBilled: number;
    todayRevenue: number;
    thisMonthRevenue: number;
    thisYearRevenue: number;
  }> {
    try {
      const bills = await this.getAllBillings();
      
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const thisMonth = now.toISOString().substring(0, 7);
      const thisYear = now.toISOString().substring(0, 4);

      const todayRevenue = bills
        .filter(bill => bill.createdAt.startsWith(today))
        .reduce((sum, bill) => sum + bill.totalAmount, 0);

      const thisMonthRevenue = bills
        .filter(bill => bill.createdAt.startsWith(thisMonth))
        .reduce((sum, bill) => sum + bill.totalAmount, 0);

      const thisYearRevenue = bills
        .filter(bill => bill.createdAt.startsWith(thisYear))
        .reduce((sum, bill) => sum + bill.totalAmount, 0);

      const pendingPayments = bills
        .filter(bill => bill.status === 'Pending' || bill.status === 'Partial')
        .reduce((sum, bill) => sum + bill.balanceAmount, 0);

      const totalPatientsBilled = new Set(bills.map(bill => bill.patientId)).size;
      const totalRevenue = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);

      return {
        totalRevenue,
        pendingPayments,
        totalPatientsBilled,
        todayRevenue,
        thisMonthRevenue,
        thisYearRevenue,
      };
    } catch (error) {
      console.error('Error getting billing KPIs:', error);
      throw error;
    }
  }

  async exportToCSV(): Promise<string> {
    try {
      const bills = await this.getAllBillings();
      
      const headers = [
        'Invoice Number',
        'Patient Name',
        'Patient ID',
        'Consultation Fee',
        'Medicine Charges',
        'Follow-Up Charges',
        'Other Charges',
        'Discount',
        'Total Amount',
        'Paid Amount',
        'Balance Amount',
        'Payment Method',
        'Status',
        'Created At',
        'Updated At',
      ];

      const rows = bills.map(bill => [
        `"${bill.invoiceNumber}"`,
        `"${bill.patientName}"`,
        `"${bill.patientId}"`,
        bill.consultationFee.toFixed(2),
        bill.medicineCharges.toFixed(2),
        bill.followUpCharges.toFixed(2),
        bill.otherCharges.toFixed(2),
        bill.discount.toFixed(2),
        bill.totalAmount.toFixed(2),
        bill.paidAmount.toFixed(2),
        bill.balanceAmount.toFixed(2),
        `"${bill.paymentMethod}"`,
        `"${bill.status}"`,
        `"${bill.createdAt}"`,
        `"${bill.updatedAt}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      return csvContent;
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  }
}

export const billingService = new BillingService();