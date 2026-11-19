import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, IconButton } from 'react-typescript-ui';
import { BellRing, CalendarCheck, CalendarPlus, ClipboardList, IndianRupee, PackageX, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { dashboardService } from '../services/dashboardService';
import type { Appointment, FollowUp, KPISummary } from '../../../types';
import { KPICard } from '../components/KPICard';
import { TodaySchedule } from '../components/TodaySchedule';
import { FollowUpsDue } from '../components/FollowUpsDue';
import { QuickActions } from '../components/QuickActions';
import { AreaTrendChart, BarTrendChart, DonutChart, type ChartPoint } from '../components/AnalyticsCharts';
import { daysFromToday, formatRupees } from '../components/format';

const EMPTY_KPI: KPISummary = {
  totalPatients: 0,
  todayAppointments: 0,
  pendingFollowUps: 0,
  activeCases: 0,
  monthlyRevenue: 0,
  totalPrescriptions: 0,
  lowStockAlerts: 0,
};

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "2026-11" -> "Nov". */
function monthLabel(month: string) {
  const d = new Date(`${month}-01T00:00:00`);
  return Number.isNaN(d.getTime()) ? month : d.toLocaleDateString('en-GB', { month: 'short' });
}

function monthKey(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPISummary>(EMPTY_KPI);
  const [schedule, setSchedule] = useState<Appointment[]>([]);
  const [followUpsDue, setFollowUpsDue] = useState<FollowUp[]>([]);
  const [contacts, setContacts] = useState<Map<string, { mobile: string; whatsapp?: string }>>(new Map());
  const [patientGrowth, setPatientGrowth] = useState<ChartPoint[]>([]);
  const [monthlyVisits, setMonthlyVisits] = useState<ChartPoint[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<ChartPoint[]>([]);
  const [followUpOutcomes, setFollowUpOutcomes] = useState<ChartPoint[]>([]);
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [revenueLastMonth, setRevenueLastMonth] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiData, growth, visits, revenue, outcomes, todays, due, contactMap] = await Promise.all([
        dashboardService.fetchKPIs(),
        dashboardService.fetchPatientGrowthData(),
        dashboardService.fetchMonthlyVisitsData(),
        dashboardService.fetchRevenueTrendData(),
        dashboardService.fetchFollowUpSuccessData(),
        dashboardService.fetchTodaysAppointmentsList(),
        dashboardService.fetchFollowUpsDue(),
        dashboardService.fetchPatientContacts(),
      ]);
      setKpi(kpiData);
      setPatientGrowth(growth.map(g => ({ name: monthLabel(g.month), value: g.count })));
      setMonthlyVisits(visits.map(v => ({ name: monthLabel(v.month), value: v.count })));
      setRevenueTrend(revenue.map(r => ({ name: monthLabel(r.month), value: r.revenue })));
      setFollowUpOutcomes(outcomes.map(o => ({ name: o.status, value: o.count })));
      setSchedule(todays);
      setFollowUpsDue(due);
      setContacts(contactMap);
      setRevenueThisMonth(revenue.find(r => r.month === monthKey(0))?.revenue ?? 0);
      setRevenueLastMonth(revenue.find(r => r.month === monthKey(-1))?.revenue ?? 0);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const name = user?.name ?? '';
  const displayName = user?.role === 'Doctor' && !/^dr\.?\s/i.test(name) ? `Dr. ${name}` : name;
  const completedToday = schedule.filter(a => a.status === 'Completed').length;
  // A delta only when last month actually had revenue (style guide 8.2).
  const revenueDelta = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : undefined;

  return (
    <div className="space-y-4 xl:space-y-5">
      {/* 1. Greeting row */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-2">
        <div>
          <h1 className="text-[30px] leading-[38px] font-bold text-text">
            {greeting()}
            {displayName ? `, ${displayName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {loading
              ? 'Getting your day ready…'
              : `You have ${schedule.length} ${schedule.length === 1 ? 'appointment' : 'appointments'} today` +
                (followUpsDue.length > 0 ? ` and ${followUpsDue.length} follow-up${followUpsDue.length === 1 ? '' : 's'} due.` : '.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            aria-label={loading ? 'Refreshing dashboard' : 'Refresh dashboard'}
            icon={<RefreshCw size={16} className={loading ? 'animate-spin' : undefined} />}
            variant="outline"
            color="neutral"
            disabled={loading}
            onClick={fetchData}
          />
          <Button leftIcon={<CalendarPlus size={16} />} onClick={() => navigate('/appointments/new')}>
            New appointment
          </Button>
        </div>
      </div>

      {/* 2. KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-5">
        <KPICard
          label="Today's appointments"
          value={String(schedule.length)}
          icon={CalendarCheck}
          helper={schedule.length === 0 ? 'No visits yet today' : `${completedToday} completed`}
          onClick={() => navigate('/appointments')}
          loading={loading}
        />
        {/* Same count as the "Follow-ups due" panel. This used to show
            kpi.pendingFollowUps (follow-up visits dated in the future),
            which read "0" above "2 due in the next 3 days". */}
        <KPICard
          label="Follow-ups due"
          value={String(followUpsDue.length)}
          icon={BellRing}
          helper={
            followUpsDue.length === 0
              ? 'None due in the next 3 days'
              : (() => {
                  const overdue = followUpsDue.filter(f => f.nextReview && daysFromToday(f.nextReview) < 0).length;
                  return overdue > 0 ? `${overdue} overdue` : 'Within the next 3 days';
                })()
          }
          onClick={() => navigate('/followups')}
          loading={loading}
        />
        <KPICard
          label="Active cases"
          value={String(kpi.activeCases)}
          icon={ClipboardList}
          helper={`${kpi.totalPatients} ${kpi.totalPatients === 1 ? 'patient' : 'patients'} registered`}
          onClick={() => navigate('/cases')}
          loading={loading}
        />
        <KPICard
          label="Monthly revenue"
          value={formatRupees(revenueThisMonth)}
          icon={IndianRupee}
          deltaPercent={revenueDelta}
          helper={revenueThisMonth === 0 ? 'No bills this month yet' : 'No billing last month to compare'}
          onClick={() => navigate('/billing')}
          loading={loading}
        />
      </div>

      {/* 3. Low-stock banner, hidden entirely at 0 */}
      {!loading && kpi.lowStockAlerts > 0 && (
        <div role="status" className="flex items-center gap-3 px-4 py-3 rounded-lg border border-warning/30 bg-warning/10">
          <PackageX size={18} className="text-warning shrink-0" aria-hidden="true" />
          <p className="flex-1 text-sm text-text">
            {kpi.lowStockAlerts} {kpi.lowStockAlerts === 1 ? 'medicine needs' : 'medicines need'} attention: low stock, near expiry or expired.
          </p>
          <Button variant="link" size="sm" onClick={() => navigate('/inventory')}>
            View inventory
          </Button>
        </div>
      )}

      {/* 4. Work area, 8/4 split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-5">
        <div className="lg:col-span-8">
          <TodaySchedule appointments={schedule} loading={loading} />
        </div>
        <div className="lg:col-span-4 space-y-4 xl:space-y-5">
          <FollowUpsDue followUps={followUpsDue} contacts={contacts} loading={loading} />
          <QuickActions />
        </div>
      </div>

      {/* 5. Analytics, 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-5">
        <AreaTrendChart
          title="Patient growth"
          subtitle={`${kpi.totalPatients} patients in total`}
          data={patientGrowth}
          loading={loading}
          view="monthly"
          emptyTitle="No patients registered yet"
          emptyDescription="New registrations will be charted here month by month."
          emptyActionLabel="Add patient"
          emptyActionPath="/patients/new"
        />
        <BarTrendChart
          title="Monthly visits"
          data={monthlyVisits}
          loading={loading}
          emptyTitle="No visits recorded yet"
          emptyDescription="Visits will appear here once you add appointments."
          emptyActionLabel="Add appointment"
          emptyActionPath="/appointments/new"
        />
        <AreaTrendChart
          title="Revenue trend"
          data={revenueTrend}
          loading={loading}
          valueFormatter={formatRupees}
          view="monthly"
          emptyTitle="No revenue recorded yet"
          emptyDescription="Billed amounts will be charted here once you create bills."
          emptyActionLabel="Create bill"
          emptyActionPath="/billing/new"
        />
        <DonutChart
          title="Follow-up outcomes"
          subtitle="Improved, stable or worse at review"
          data={followUpOutcomes}
          loading={loading}
          emptyTitle="No follow-ups recorded yet"
          emptyDescription="Outcomes from follow-up visits will be summarised here."
        />
      </div>
    </div>
  );
}

export default Dashboard;
