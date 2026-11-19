import { Billing } from '../../../types';
import { getDB } from '../../../hooks/useIndexedDB';

/**
 * Generate billing ID
 */
export const generateBillingId = async (): Promise<string> => {
  try {
    const db = await getDB();
    const tx = db.transaction('billing', 'readonly');
    const store = tx.objectStore('billing');
    const request = store.getAll();
    
    return new Promise<string>((resolve, reject) => {
      request.onsuccess = () => {
        const bills: Billing[] = request.result;
        
        // Get all bills sorted by ID to find the highest
        const sortedBills = bills.sort((a, b) => {
          const numA = parseInt(a.id.replace('BILL', ''), 10) || 0;
          const numB = parseInt(b.id.replace('BILL', ''), 10) || 0;
          return numB - numA;
        });
        
        if (sortedBills.length > 0) {
          const lastId = sortedBills[0].id;
          const num = parseInt(lastId.replace('BILL', ''), 10) || 0;
          resolve(`BILL${String(num + 1).padStart(6, '0')}`);
        } else {
          resolve('BILL000001');
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error generating billing ID:', error);
    return 'BILL000001';
  }
};

/**
 * Billing service for CRUD operations with offline-first support
 */
export class BillingService {
  private async getDB() {
    return getDB();
  }

  async getAllBillings(): Promise<Billing[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('billing', 'readonly');
      const store = tx.objectStore('billing');
      const request = store.getAll();
      
      const bills = await new Promise<Billing[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as Billing[]);
        request.onerror = () => reject(request.error);
      });
      
      return bills;
    } catch (error) {
      console.error('Error getting billing records:', error);
      return [];
    }
  }

  async getBillingById(id: string): Promise<Billing | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('billing', 'readonly');
      const store = tx.objectStore('billing');
      const request = store.get(id);
      
      return new Promise<Billing | null>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting billing record:', error);
      return null;
    }
  }

  async getBillingsByPatientId(patientId: string): Promise<Billing[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('billing', 'readonly');
      const store = tx.objectStore('billing');
      const request = store.getAll();
      
      const bills = await new Promise<Billing[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as Billing[]);
        request.onerror = () => reject(request.error);
      });
      
      return bills.filter(bill => bill.patientId === patientId);
    } catch (error) {
      console.error('Error getting billings by patient ID:', error);
      return [];
    }
  }

  async createBilling(billingData: Omit<Billing, 'id' | 'createdAt' | 'updatedAt'>, customCreatedAt?: string): Promise<Billing> {
    try {
      const db = await this.getDB();
      // Generate the ID first: awaiting it after opening the write
      // transaction let IndexedDB auto-commit it, so store.put() threw.
      const billingId = await generateBillingId();

      const tx = db.transaction('billing', 'readwrite');
      const store = tx.objectStore('billing');
      
      const billing: Billing = {
        ...billingData,
        id: billingId,
        createdAt: customCreatedAt || new Date().toISOString(),
        updatedAt: customCreatedAt || new Date().toISOString(),
      };

      store.put(billing);
      
      // Add to sync queue
      await this.addToSyncQueue('billing', 'create', billing);

      return billing;
    } catch (error) {
      console.error('Error creating billing record:', error);
      throw error;
    }
  }

  async updateBilling(id: string, billingData: Partial<Billing>): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('billing', 'readwrite');
      const store = tx.objectStore('billing');
      
      const existing = await new Promise<Billing | undefined>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (!existing) {
        throw new Error('Billing record not found');
      }

      const updatedBilling: Billing = {
        ...existing,
        ...billingData,
        updatedAt: new Date().toISOString(),
      };

      store.put(updatedBilling);
      await this.addToSyncQueue('billing', 'update', updatedBilling);
    } catch (error) {
      console.error('Error updating billing record:', error);
      throw error;
    }
  }

  async deleteBilling(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('billing', 'readwrite');
      const store = tx.objectStore('billing');
      store.delete(id);
      
      await this.addToSyncQueue('billing', 'delete', { id });
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
      return [];
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
      return { daily: [], monthly: [], yearly: [] };
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
      return {
        totalRevenue: 0,
        pendingPayments: 0,
        totalPatientsBilled: 0,
        todayRevenue: 0,
        thisMonthRevenue: 0,
        thisYearRevenue: 0,
      };
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
      return '';
    }
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

export const billingService = new BillingService();