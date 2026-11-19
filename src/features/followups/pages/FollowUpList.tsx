import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Card } from 'react-typescript-ui';
import { followUpService } from '../services/followUpService';
import { FollowUp } from '../../../types';

import { usePatientNumber } from '../../patients/hooks/usePatientNumber';
const FollowUpList: React.FC = () => {
  const navigate = useNavigate();
  const patientNumber = usePatientNumber();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const fetchFollowUps = async () => {
    try {
      const data = await followUpService.getAllFollowUps();
      setFollowUps(data);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFollowUps = followUps.filter(fu => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      fu.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fu.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === '' || fu.status === statusFilter;
    
    // Date range filter
    const visitDate = new Date(fu.visitDate).getTime();
    const startDate = dateRange.start ? new Date(dateRange.start).getTime() : 0;
    const endDate = dateRange.end ? new Date(dateRange.end).getTime() : Infinity;
    const matchesDate = visitDate >= startDate && visitDate <= endDate;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleViewHistory = (followUp: FollowUp) => {
    // Navigate to follow-up detail page (history view)
    navigate(`/followups/${followUp.id}`);
  };

  const statusColors = {
    Improved: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    Stable: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    Worse: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  };

  const getStatusBadge = (status: string) => {
    const colors = statusColors[status as keyof typeof statusColors];
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading follow-ups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Follow-Ups</h2>
        <Button onClick={() => navigate('/followups/new')} color="primary">
          New Follow-Up
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              type="text"
              placeholder="Search by patient name or ID..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              placeholder="Filter by status"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Improved', label: 'Improved' },
                { value: 'Stable', label: 'Stable' },
                { value: 'Worse', label: 'Worse' },
              ]}
            />
          </div>
          <div className="flex space-x-2">
            <Input
              type="date"
              placeholder="Start date"
              value={dateRange.start}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full"
            />
            <Input
              type="date"
              placeholder="End date"
              value={dateRange.end}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* Follow-Up List */}
      <div className="space-y-4">
        {filteredFollowUps.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No follow-ups found</p>
          </div>
        ) : (
          filteredFollowUps.map((followUp) => (
            <Card key={followUp.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">Follow-Up {followUp.id}</h3>
                    {getStatusBadge(followUp.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-500">Patient</p>
                      <p className="text-gray-900 font-medium">{followUp.patientName}</p>
                      <p className="text-sm text-gray-500">{patientNumber(followUp.patientId)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Visit Date</p>
                      <p className="text-gray-900">{new Date(followUp.visitDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Improvement</p>
                      <p className="text-gray-900 font-semibold">{followUp.improvementPercentage}%</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                      <strong>Symptoms:</strong> {followUp.symptoms.length > 0 ? followUp.symptoms[0] : 'N/A'}
                    </p>
                    {followUp.newSymptoms && followUp.newSymptoms.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>New Symptoms:</strong> {followUp.newSymptoms[0]}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleViewHistory(followUp)}
                  >
                    History
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/followups/${followUp.id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/followups/new?patientId=${followUp.patientId}&patientName=${encodeURIComponent(followUp.patientName)}`)}
                  >
                    New Visit
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Patient Follow-Up History */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Follow-Up History</h3>
        <p className="text-sm text-gray-600 mb-4">
          View the patient's complete follow-up history and treatment progress over time.
        </p>
        <Button variant="outline" onClick={() => navigate('/followups')}>
          View Follow-Up List
        </Button>
      </div>

      {/* Patient Detail Follow-Up Section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Follow-Up Timeline</h3>
        <p className="text-sm text-gray-500 mb-4">Select a patient to see their complete follow-up history.</p>
      </div>
    </div>
  );
};

export { FollowUpList };
export default FollowUpList;
