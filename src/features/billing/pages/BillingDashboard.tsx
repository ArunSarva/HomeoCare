import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from 'react-typescript-ui';
import { billingService } from '../services/billingService';

export function BillingDashboard() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<{
    totalRevenue: number;
    pendingPayments: number;
    totalPatientsBilled: number;
    todayRevenue: number;
    thisMonthRevenue: number;
    thisYearRevenue: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      const data = await billingService.getKPIs();
      setKpis(data);
    } catch (error) {
      console.error('Error fetching billing KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  if (loading && !kpis) {
    return (
      <Card className="p-6">
        <p>Loading billing dashboard...</p>
      </Card>
    );
  }

  if (!kpis) {
    return (
      <Card className="p-6">
        <p>Billing dashboard not available</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Billing Dashboard</h2>
        <Button onClick={fetchKPIs} variant="outline">
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(kpis.totalRevenue)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Payments</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(kpis.pendingPayments)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Patients Billed</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {kpis.totalPatientsBilled}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue by Period</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Today</span>
                <span className="font-medium">{formatCurrency(kpis.todayRevenue)}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(kpis.todayRevenue / (kpis.totalRevenue || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">This Month</span>
                <span className="font-medium">{formatCurrency(kpis.thisMonthRevenue)}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(kpis.thisMonthRevenue / (kpis.totalRevenue || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">This Year</span>
                <span className="font-medium">{formatCurrency(kpis.thisYearRevenue)}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(kpis.thisYearRevenue / (kpis.totalRevenue || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => navigate('/billing/new')} color="primary" className="w-full">
              New Invoice
            </Button>
            <Button onClick={() => navigate('/billing/reports')} variant="outline" className="w-full">
              Reports
            </Button>
            <Button onClick={() => navigate('/billing')} variant="outline" className="w-full">
              All Invoices
            </Button>
            <Button onClick={fetchKPIs} variant="outline" className="w-full">
              Refresh
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Payment Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Paid Invoices</span>
              <span className="text-sm font-medium text-green-600">
                {kpis.totalRevenue > 0 ? '100%' : '0%'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending Payments</span>
              <span className="text-sm font-medium text-orange-600">
                {kpis.pendingPayments > 0 ? 'Pending' : 'None'}
              </span>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Pending amount: <span className="font-medium text-yellow-700">{formatCurrency(kpis.pendingPayments)}</span>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default BillingDashboard;