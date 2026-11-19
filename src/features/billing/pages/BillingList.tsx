import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Select } from 'react-typescript-ui';
import { billingService } from '../services/billingService';
import { Billing } from '../../../types';

import { usePatientNumber } from '../../patients/hooks/usePatientNumber';
export function BillingList() {
  const navigate = useNavigate();
  const patientNumber = usePatientNumber();
  const [billings, setBillings] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchBillings();
  }, []);

  const fetchBillings = async () => {
    setLoading(true);
    try {
      const data = await billingService.getAllBillings();
      setBillings(data);
    } catch (error) {
      console.error('Error fetching billings:', error);
      setToast({ message: 'Failed to load billing records', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this billing record?')) {
      return;
    }

    try {
      await billingService.deleteBilling(id);
      setToast({ message: 'Billing record deleted successfully', type: 'success' });
      fetchBillings();
    } catch (error) {
      console.error('Error deleting billing:', error);
      setToast({ message: 'Failed to delete billing record', type: 'error' });
    }
  };

  const filteredBillings = billings.filter(bill => {
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!bill.patientName.toLowerCase().includes(term) &&
          !bill.invoiceNumber.toLowerCase().includes(term) &&
          !bill.patientId.toLowerCase().includes(term)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter && bill.status !== statusFilter) {
      return false;
    }

    // Date range filter
    if (dateRange?.start || dateRange?.end) {
      const billDate = new Date(bill.createdAt).getTime();
      const startDate = dateRange.start ? new Date(dateRange.start).getTime() : 0;
      const endDate = dateRange.end ? new Date(dateRange.end).getTime() : Infinity;
      if (billDate < startDate || billDate > endDate) {
        return false;
      }
    }

    return true;
  });

  const handleExport = () => {
    billingService.exportToCSV().then(csv => {
      if (!csv) {
        setToast({ message: 'Failed to export billing data', type: 'error' });
        return;
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `billing_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ message: 'Billing data exported successfully', type: 'success' });
    }).catch(() => {
      setToast({ message: 'Failed to export billing data', type: 'error' });
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Billing Records</h2>
          <div className="flex space-x-3">
            <Button onClick={() => navigate('/billing/new')} color="primary">
              + New Invoice
            </Button>
            <Button onClick={handleExport} variant="outline">
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <Input
              type="text"
              placeholder="Search by patient name, ID, invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Partial', label: 'Partial' },
                { value: 'Pending', label: 'Pending' },
              ]}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <Input
              type="date"
              value={dateRange?.start || ''}
              onChange={(e) => setDateRange(dateRange ? { ...dateRange, start: e.target.value } : { start: e.target.value, end: '' })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <Input
              type="date"
              value={dateRange?.end || ''}
              onChange={(e) => setDateRange(dateRange ? { ...dateRange, end: e.target.value } : { start: '', end: e.target.value })}
              className="w-full"
            />
          </div>
        </div>

        {/* Billing Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Patient</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Payment</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredBillings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No billing records found
                  </td>
                </tr>
              ) : (
                filteredBillings.map(bill => (
                  <tr key={bill.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/billing/${bill.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {bill.invoiceNumber}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{bill.patientName}</div>
                        <div className="text-sm text-gray-500">{patientNumber(bill.patientId)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900">₹{bill.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{bill.paymentMethod}</div>
                      <div className="text-sm text-gray-500">Paid: ₹{bill.paidAmount.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${bill.status === 'Paid' ? 'bg-green-100 text-green-800' :
                          bill.status === 'Partial' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'}`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{bill.createdAt.split('T')[0]}</td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/billing/${bill.id}/edit`)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(bill.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50
          ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default BillingList;