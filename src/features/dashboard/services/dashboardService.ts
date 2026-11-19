import { patientService } from '../../patients/services/patientService';
import { appointmentService } from '../../appointments/services/appointmentService';
import { followUpService } from '../../followups/services/followUpService';
import { caseService } from '../../cases/services/caseService';
import { prescriptionService } from '../../prescriptions/services/prescriptionService';
import { billingService } from '../../billing/services/billingService';
import { inventoryService } from '../../inventory/services/inventoryService';
import { KPISummary, Appointment, FollowUp, Patient } from '../../../types';

/**
 * Dashboard service for fetching KPI data and chart data
 */
export class DashboardService {
  async fetchKPIs(): Promise<KPISummary> {
    try {
      // Fetch all data in parallel
      const [patients, appointments, followUps, cases, prescriptions, billings, inventory] = await Promise.all([
        patientService.getPatientCount(),
        appointmentService.getTodayAppointments(),
        followUpService.getPendingFollowUpsCount(),
        caseService.getAllCases().then(cases => cases.length),
        prescriptionService.getAllPrescriptions().then(prescriptions => prescriptions.length),
        billingService.getKPIs(),
        inventoryService.getAlerts(),
      ]);

      // Calculate monthly revenue
      const monthlyRevenue = billings.totalRevenue;

      // Count low stock alerts
      const lowStockCount = inventory.lowStock.length + inventory.nearExpiry.length + inventory.expired.length;

      return {
        totalPatients: patients,
        todayAppointments: appointments.length,
        pendingFollowUps: followUps,
        activeCases: cases,
        monthlyRevenue: monthlyRevenue,
        totalPrescriptions: prescriptions,
        lowStockAlerts: lowStockCount,
      };
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      throw error;
    }
  }

  async fetchPatientGrowthData(): Promise<{ month: string; count: number }[]> {
    try {
      const patients = await patientService.getAllPatients();
      
      // Group patients by month
      const monthlyCounts = new Map<string, number>();
      
      patients.forEach(patient => {
        const month = patient.createdAt.substring(0, 7);
        monthlyCounts.set(month, (monthlyCounts.get(month) || 0) + 1);
      });

      // Convert to array and sort by month
      const data = Array.from(monthlyCounts.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Limit to last 12 months
      const now = new Date();
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(now.getMonth() - 11);
      twelveMonthsAgo.setDate(1); // Start from first day of month
      twelveMonthsAgo.setHours(0, 0, 0, 0);

      return data.filter(item => new Date(item.month + '-01') >= twelveMonthsAgo);
    } catch (error) {
      console.error('Error fetching patient growth data:', error);
      throw error;
    }
  }

  async fetchMonthlyVisitsData(): Promise<{ month: string; count: number }[]> {
    try {
      const appointments = await appointmentService.getAllAppointments();
      
      // Group appointments by month
      const monthlyCounts = new Map<string, number>();
      
      appointments.forEach(apt => {
        const month = apt.appointmentDate.substring(0, 7);
        monthlyCounts.set(month, (monthlyCounts.get(month) || 0) + 1);
      });

      // Convert to array and sort by month
      return Array.from(monthlyCounts.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));
    } catch (error) {
      console.error('Error fetching monthly visits data:', error);
      throw error;
    }
  }

  async fetchRevenueTrendData(): Promise<{ month: string; revenue: number }[]> {
    try {
      const billings = await billingService.getAllBillings();
      
      // Group billings by month
      const monthlyRevenue = new Map<string, number>();
      
      billings.forEach(bill => {
        const month = bill.createdAt.substring(0, 7);
        monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + bill.totalAmount);
      });

      // Convert to array and sort by month
      return Array.from(monthlyRevenue.entries())
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => a.month.localeCompare(b.month));
    } catch (error) {
      console.error('Error fetching revenue trend data:', error);
      throw error;
    }
  }

  async fetchDiseaseCategoriesData(): Promise<{ category: string; count: number }[]> {
    try {
      const cases = await caseService.getAllCases();
      
      // Group by chief complaint (as disease category)
      const categoryCounts = new Map<string, number>();
      
      cases.forEach(caseItem => {
        caseItem.chiefComplaints.forEach(complaint => {
          categoryCounts.set(complaint.complaint, (categoryCounts.get(complaint.complaint) || 0) + 1);
        });
      });

      // Convert to array and sort by count
      return Array.from(categoryCounts.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5 categories
    } catch (error) {
      console.error('Error fetching disease categories data:', error);
      throw error;
    }
  }

  async fetchFollowUpSuccessData(): Promise<{ status: string; count: number }[]> {
    try {
      const followUps = await followUpService.getAllFollowUps();
      
      // Group by status
      const statusCounts = new Map<string, number>();
      
      followUps.forEach(followUp => {
        statusCounts.set(followUp.status, (statusCounts.get(followUp.status) || 0) + 1);
      });

      // Convert to array
      return Array.from(statusCounts.entries())
        .map(([status, count]) => ({ status, count }));
    } catch (error) {
      console.error('Error fetching follow-up success data:', error);
      throw error;
    }
  }

  async fetchRecentActivities(): Promise<{ text: string; time: string; type: string }[]> {
    try {
      const activities: { text: string; time: string; type: string }[] = [];
      
      // Get recent patients
      const patients = await patientService.getAllPatients();
      if (patients.length > 0) {
        const recentPatients = patients.slice(0, 2).map(p => ({
          text: `New patient registered: ${p.patientId} - ${p.fullName}`,
          time: this.getTimeAgo(p.createdAt),
          type: 'patient',
        }));
        activities.push(...recentPatients);
      }
      
      // Get recent appointments
      const appointments = await appointmentService.getAllAppointments();
      if (appointments.length > 0) {
        const recentAppointments = appointments.slice(0, 2).map(a => ({
          text: `Appointment scheduled: ${a.patientName} at ${a.startTime}`,
          time: this.getTimeAgo(a.createdAt),
          type: 'appointment',
        }));
        activities.push(...recentAppointments);
      }
      
      // Get recent prescriptions
      const prescriptions = await prescriptionService.getAllPrescriptions();
      if (prescriptions.length > 0) {
        const recentPrescriptions = prescriptions.slice(0, 2).map(p => ({
          text: `Prescription generated for ${p.patientId}`,
          time: this.getTimeAgo(p.createdAt),
          type: 'prescription',
        }));
        activities.push(...recentPrescriptions);
      }
      
      // Get recent follow-ups
      const followUps = await followUpService.getAllFollowUps();
      if (followUps.length > 0) {
        const recentFollowUps = followUps.slice(0, 2).map(f => ({
          text: `Follow-up completed: ${f.patientId} - ${f.improvementPercentage}% improvement`,
          time: this.getTimeAgo(f.createdAt),
          type: 'followup',
        }));
        activities.push(...recentFollowUps);
      }
      
      // Sort by time (most recent first) and limit to 10
      activities.sort((a, b) => this.parseTimeAgo(b.time) - this.parseTimeAgo(a.time));
      
      return activities.slice(0, 10);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  }

  /** Today's appointments in every status, earliest first. */
  async fetchTodaysAppointmentsList(): Promise<Appointment[]> {
    try {
      const appointments = await appointmentService.getTodayAppointments();
      return appointments
        .slice()
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    } catch (error) {
      console.error('Error fetching today\'s appointments:', error);
      throw error;
    }
  }

  /**
   * Follow-ups due: a next-review date that has arrived or passed, or is
   * coming up within 3 days. Most overdue first, since that is the most
   * urgent to act on.
   */
  async fetchFollowUpsDue(): Promise<FollowUp[]> {
    try {
      const followUps = await followUpService.getAllFollowUps();
      const horizon = new Date();
      horizon.setDate(horizon.getDate() + 3);
      horizon.setHours(23, 59, 59, 999);

      return followUps
        .filter(f => f.nextReview && new Date(f.nextReview) <= horizon)
        .sort((a, b) => new Date(a.nextReview!).getTime() - new Date(b.nextReview!).getTime())
        .slice(0, 6);
    } catch (error) {
      console.error('Error fetching follow-ups due:', error);
      throw error;
    }
  }

  /**
   * Phone/WhatsApp numbers keyed by both the internal id and the P000001
   * patient ID, since follow-ups and appointments store the internal id.
   */
  async fetchPatientContacts(): Promise<Map<string, { mobile: string; whatsapp?: string }>> {
    const contacts = new Map<string, { mobile: string; whatsapp?: string }>();
    try {
      const patients = await patientService.getAllPatients();
      patients.forEach(p => {
        const entry = { mobile: p.mobile, whatsapp: p.whatsapp };
        contacts.set(p.id, entry);
        contacts.set(p.patientId, entry);
      });
    } catch (error) {
      console.error('Error fetching patient contacts:', error);
      throw error;
    }
    return contacts;
  }

  /** Most recently registered patients, newest first. */
  async fetchRecentPatients(): Promise<Patient[]> {
    try {
      const patients = await patientService.getAllPatients();
      return patients
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
    } catch (error) {
      console.error('Error fetching recent patients:', error);
      throw error;
    }
  }

  private getTimeAgo(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  }

  private parseTimeAgo(timeStr: string): number {
    if (timeStr === 'Just now') return Date.now();
    const num = parseInt(timeStr, 10);
    if (timeStr.endsWith('m')) return Date.now() - num * 60000;
    if (timeStr.endsWith('h')) return Date.now() - num * 3600000;
    if (timeStr.endsWith('d')) return Date.now() - num * 86400000;
    return Date.now();
  }
}

export const dashboardService = new DashboardService();
