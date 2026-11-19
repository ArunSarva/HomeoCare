import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Field } from 'react-typescript-ui';
import { Prescription } from '../../../types';
import { prescriptionService } from '../services/prescriptionService';

interface FilterState {
  searchTerm: string;
  dateRange: {
    start: string;
    end: string;
  };
}

const PrescriptionList: React.FC = () => {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    dateRange: {
      start: '',
      end: '',
    },
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
  });

  useEffect(() => {
    fetchPrescriptions();
  }, [filters]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const data = await prescriptionService.searchPrescriptions(
        filters.searchTerm,
        filters.dateRange
      );
      setPrescriptions(data);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, searchTerm: value }));
  };

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [type]: value,
      },
    }));
  };

  const handleView = (id: string) => {
    navigate(`/prescriptions/${id}`);
  };

  const handleAddNew = () => {
    navigate('/prescriptions/new');
  };

  const paginatedPrescriptions = prescriptions.slice(
    (pagination.currentPage - 1) * pagination.itemsPerPage,
    pagination.currentPage * pagination.itemsPerPage
  );

  const totalPages = Math.ceil(prescriptions.length / pagination.itemsPerPage);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Prescriptions</h2>
        <Button onClick={handleAddNew}>
          New Prescription
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label="Search">
            <Input
              type="text"
              value={filters.searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search by patient name or medicine"
            />
          </Field>
          
          <Field label="From Date">
            <Input
              type="date"
              value={filters.dateRange.start}
              onChange={e => handleDateRangeChange('start', e.target.value)}
            />
          </Field>
          
          <Field label="To Date">
            <Input
              type="date"
              value={filters.dateRange.end}
              onChange={e => handleDateRangeChange('end', e.target.value)}
            />
          </Field>
          
          <div className="flex items-end">
            <Button variant="outline" onClick={fetchPrescriptions}>
              Apply Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Prescriptions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Prescription ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Patient Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Patient ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Medicines</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading prescriptions...
                  </td>
                </tr>
              ) : paginatedPrescriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No prescriptions found
                  </td>
                </tr>
              ) : (
                paginatedPrescriptions.map((prescription) => (
                  <tr key={prescription.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{prescription.id}</td>
                    <td className="px-4 py-3 text-gray-900">{prescription.patientName}</td>
                    <td className="px-4 py-3 text-gray-500">{prescription.patientId}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(prescription.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {prescription.medicines.length} medicine(s)
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => handleView(prescription.id)}>
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.itemsPerPage, prescriptions.length)} of{' '}
              {prescriptions.length} prescriptions
            </span>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                disabled={pagination.currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm text-gray-700">
                Page {pagination.currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.min(totalPages, prev.currentPage + 1) }))}
                disabled={pagination.currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PrescriptionList;
