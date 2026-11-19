import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input } from 'react-typescript-ui';
import { useQuery } from '@tanstack/react-query';
import { caseService } from '../services/caseService';

import { usePatientNumber } from '../../patients/hooks/usePatientNumber';
export function CaseList() {
  const navigate = useNavigate();
  const patientNumber = usePatientNumber();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  const { data: cases = [], isLoading, error } = useQuery({
    queryKey: ['cases'],
    queryFn: async () => {
      return await caseService.getAllCases();
    },
  });

  useEffect(() => {
    if (error) {
      console.error('Error loading cases:', error);
    }
  }, [error]);

  // Filter cases
  const filteredCases = cases.filter(caseItem => {
    const matchesSearch = 
      caseItem.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.patientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.chiefComplaints?.some(c => c.complaint?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDate = !dateFilter || new Date(caseItem.createdAt || '').toISOString().startsWith(dateFilter);
    
    return matchesSearch && matchesDate;
  });

  const handleViewCase = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  const handleNewCase = () => {
    navigate('/cases/new');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Cases</h2>
        <Button onClick={handleNewCase}>
          + New Case
        </Button>
      </div>

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <Input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by patient name, ID, or complaint..."
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Filter</label>
            <Input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* Cases Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Case ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Patient ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Patient Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Visit Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Chief Complaint</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Severity</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCases.length > 0 ? (
                filteredCases.map((caseItem) => (
                  <tr key={caseItem.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">C{caseItem.id?.slice(-6)}</td>
                    <td className="px-4 py-3 text-gray-900">{patientNumber(caseItem.patientId)}</td>
                    <td className="px-4 py-3 text-gray-900">{caseItem.patientName}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(caseItem.createdAt || '').toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {caseItem.chiefComplaints?.[0]?.complaint || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${caseItem.severity === 'Severe' ? 'bg-red-100 text-red-800' : 
                          caseItem.severity === 'Moderate' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'}`}>
                        {caseItem.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewCase(caseItem.id || '')}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No cases found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Cases</p>
          <p className="text-2xl font-bold text-gray-900">{cases.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Active Cases</p>
          <p className="text-2xl font-bold text-primary">{cases.filter(c => c.severity !== 'Mild').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Severe Cases</p>
          <p className="text-2xl font-bold text-red-600">{cases.filter(c => c.severity === 'Severe').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Recent Cases (30 days)</p>
          <p className="text-2xl font-bold text-green-600">
            {cases.filter(c => {
              const caseDate = new Date(c.createdAt || '');
              const now = new Date();
              const diffDays = Math.floor((now.getTime() - caseDate.getTime()) / (1000 * 60 * 60 * 24));
              return diffDays <= 30;
            }).length}
          </p>
        </Card>
      </div>
    </div>
  );
}

export default CaseList;
