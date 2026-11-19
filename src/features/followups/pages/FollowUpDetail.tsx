import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card } from 'react-typescript-ui';
import { followUpService } from '../services/followUpService';
import { FollowUp } from '../../../types';
import FollowUpForm from '../components/FollowUpForm';

const FollowUpDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchFollowUp(id);
    }
  }, [id]);

  const fetchFollowUp = async (followUpId: string) => {
    try {
      const data = await followUpService.getFollowUpById(followUpId);
      setFollowUp(data);
    } catch (error) {
      console.error('Error fetching follow-up:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updatedFollowUp: FollowUp) => {
    try {
      await followUpService.updateFollowUp(updatedFollowUp.id, updatedFollowUp);
      setFollowUp(updatedFollowUp);
      setEditing(false);
    } catch (error) {
      console.error('Error updating follow-up:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading follow-up...</div>
      </div>
    );
  }

  if (!followUp) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Follow-up not found</div>
      </div>
    );
  }

  const statusColors = {
    Improved: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    Stable: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    Worse: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  };

  const getStatusBadge = (status: string) => {
    const colors = statusColors[status as keyof typeof statusColors];
    return (
      <span className={`px-3 py-1 rounded text-sm font-medium ${colors.bg} ${colors.text}`}>
        {status}
      </span>
    );
  };

  if (editing) {
    return (
      <FollowUpForm
        patientId={followUp.patientId}
        patientName={followUp.patientName}
        onFollowUpCreated={handleUpdate}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-900">Follow-Up {followUp.id}</h2>
          {getStatusBadge(followUp.status)}
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate('/followups')}>
            Back to List
          </Button>
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </div>

      {/* Follow-Up Details */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Patient ID</p>
                <p className="text-gray-900 font-medium">{followUp.patientId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Patient Name</p>
                <p className="text-gray-900 font-medium">{followUp.patientName}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Visit Information</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Visit Date</p>
                <p className="text-gray-900">{new Date(followUp.visitDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Improvement %</p>
                <p className="text-gray-900 font-semibold text-lg">{followUp.improvementPercentage}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Energy Level</p>
                <p className="text-gray-900 font-semibold">{followUp.energyLevel}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Next Review</p>
                <p className="text-gray-900">{followUp.nextReview ? new Date(followUp.nextReview).toLocaleDateString() : 'Not scheduled'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Symptoms */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Symptoms</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">{followUp.symptoms.join('\n')}</p>
            </div>
          </div>

          {/* Aggravation & New Symptoms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {followUp.aggravation && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Aggravation</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{followUp.aggravation}</p>
                </div>
              </div>
            )}
            {followUp.newSymptoms && followUp.newSymptoms.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">New Symptoms</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{followUp.newSymptoms.join(', ')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Prescription Changes */}
          {followUp.prescriptionChanges && followUp.prescriptionChanges.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Prescription Changes</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{followUp.prescriptionChanges.join('\n')}</p>
              </div>
            </div>
          )}

          {/* Doctor Notes */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Doctor Notes</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">{followUp.notes}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Patient Follow-Up History */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Follow-Up History</h3>
        <p className="text-sm text-gray-600 mb-4">
          Review the patient's complete follow-up history and treatment progress over time.
        </p>
        <Button variant="outline" onClick={() => navigate(`/followups?patientId=${followUp.patientId}&patientName=${encodeURIComponent(followUp.patientName)}`)}>
          View Patient Follow-Ups
        </Button>
      </Card>
    </div>
  );
};

export default FollowUpDetail;
