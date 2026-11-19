import { useState, useEffect } from 'react';
import { Card, Button, Input } from 'react-typescript-ui';
import { billingService } from '../services/billingService';
import { ReportChart } from '../components/ReportChart';

export function RevenueReports() {
  const [revenueData, setRevenueData] = useState<{
    daily: { date: string; total: number; count: number }[];
    monthly: { month: string; total: number; count: number }[];
    yearly: { year: string; total: number; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => {
    fetchRevenueReports();
  }, []);

  const fetchRevenueReports = async () => {
    setLoading(true);
    try {
      const data = await billingService.getRevenueReports(dateRange ?? undefined);
      setRevenueData(data);
    } catch (error) {
      console.error('Error fetching revenue reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    billingService.exportToCSV().then(csv => {
      if (!csv) {
        console.error('Failed to export data');
        return;
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `revenue_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }).catch(() => {
      console.error('Failed to export data');
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  if (loading && !revenueData) {
    return (
      <Card className="p-6">
        <p>Loading revenue reports...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Revenue Reports</h2>
            <p className="text-gray-600 mt-1">View and export billing revenue reports</p>
          </div>
          <div className="flex space-x-3">
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                placeholder="Start Date"
                value={dateRange?.start || ''}
                onChange={(e) => setDateRange(dateRange ? { ...dateRange, start: e.target.value } : { start: e.target.value, end: '' })}
                className="w-40"
              />
              <Input
                type="date"
                placeholder="End Date"
                value={dateRange?.end || ''}
                onChange={(e) => setDateRange(dateRange ? { ...dateRange, end: e.target.value } : { start: '', end: e.target.value })}
                className="w-40"
              />
            </div>
            <Button onClick={fetchRevenueReports}>Apply</Button>
            <Button onClick={handleExport} variant="outline">
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      {revenueData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-600">Daily Revenue</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(revenueData.daily.reduce((sum, day) => sum + day.total, 0))}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {revenueData.daily.reduce((sum, day) => sum + day.count, 0)} transactions
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-600">Monthly Revenue</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(revenueData.monthly.reduce((sum, month) => sum + month.total, 0))}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {revenueData.monthly.length} months with billing
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-600">Yearly Revenue</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(revenueData.yearly.reduce((sum, year) => sum + year.total, 0))}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {revenueData.yearly.length} years with billing
              </p>
            </Card>
          </div>

          {/* Revenue Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ReportChart
              title="Daily Revenue Trend"
              data={revenueData.daily.slice(0, 7)}
              dataKey="total"
              labelKey="date"
              formatLabel={(val: number) => formatCurrency(val)}
            />
            <ReportChart
              title="Monthly Revenue Trend"
              data={revenueData.monthly.slice(0, 12)}
              dataKey="total"
              labelKey="month"
              formatLabel={(val: number) => formatCurrency(val)}
            />
            <ReportChart
              title="Yearly Revenue Trend"
              data={revenueData.yearly.slice(0, 5)}
              dataKey="total"
              labelKey="year"
              formatLabel={(val: number) => formatCurrency(val)}
            />
          </div>

          {/* Detailed Tables */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Daily Revenue Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {revenueData.daily.map((day) => (
                    <tr key={day.date}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{day.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(day.total)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{day.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Revenue Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {revenueData.monthly.map((month) => (
                    <tr key={month.month}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{month.month}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(month.total)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{month.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Yearly Revenue Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {revenueData.yearly.map((year) => (
                    <tr key={year.year}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{year.year}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(year.total)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{year.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default RevenueReports;