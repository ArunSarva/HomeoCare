import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Input, Select } from 'react-typescript-ui';
import { CircleX } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import NoteEditor from '../../../components/NoteEditor';
import { FollowUp } from '../../../types';
import { followUpService } from '../services/followUpService';

interface FollowUpFormProps {
  patientId?: string;
  patientName?: string;
  patient?: any;
  onFollowUpCreated?: (followUp: FollowUp) => void;
  existingData?: FollowUp;
}

const FollowUpForm: React.FC<FollowUpFormProps> = ({
  patientId,
  patientName,
  patient,
  onFollowUpCreated,
  existingData
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [improvementPercent, setImprovementPercent] = useState<number>(0);
  const [energyLevel, setEnergyLevel] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [status, setStatus] = useState<'Improved' | 'Stable' | 'Worse'>('Improved');

  // Set initial values if patient is provided
  // For edit mode, use data from existing follow-up
  const [formData, setFormData] = useState({
    patientId: existingData ? existingData.patientId : (patient?.id || patientId || ''),
    patientName: existingData ? existingData.patientName : (patient?.fullName || patientName || ''),
    visitDate: existingData ? existingData.visitDate : new Date().toISOString().split('T')[0],
    symptoms: existingData?.symptoms && existingData.symptoms.length > 0 ? existingData.symptoms[0] : '',
    improvementPercentage: existingData ? existingData.improvementPercentage : 0,
    aggravation: existingData?.aggravation || '',
    newSymptoms: existingData?.newSymptoms && existingData.newSymptoms.length > 0 ? existingData.newSymptoms[0] : '',
    energyLevel: existingData ? existingData.energyLevel : 'Medium',
    prescriptionChanges: existingData?.prescriptionChanges && existingData.prescriptionChanges.length > 0 ? existingData.prescriptionChanges[0] : '',
    nextReview: existingData?.nextReview || '',
    notes: existingData?.notes || '',
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditorChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId) {
      setError('Choose a patient for this follow-up.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const followUpData: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt'> = {
        patientId: formData.patientId,
        patientName: formData.patientName,
        visitDate: formData.visitDate,
        symptoms: formData.symptoms ? [formData.symptoms] : [],
        improvementPercentage: Number(formData.improvementPercentage),
        aggravation: formData.aggravation,
        newSymptoms: formData.newSymptoms ? [formData.newSymptoms] : [],
        status,
        energyLevel,
        prescriptionChanges: formData.prescriptionChanges ? [formData.prescriptionChanges] : [],
        nextReview: formData.nextReview,
        notes: formData.notes,
        doctorId: user?.id ?? '',
        doctorName: user?.name ?? '',
      };

      const followUp = await followUpService.createFollowUp(followUpData);

      if (onFollowUpCreated) {
        onFollowUpCreated(followUp);
      }

      navigate('/followups');
    } catch (error) {
      console.error('Error creating follow-up:', error);
      setLoading(false);
      setError("Couldn't save the follow-up. Please try again.");
    }
  };

  const statusColors = {
    Improved: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    Stable: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    Worse: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          New Follow-Up for {patient?.fullName || patientName || 'Unknown Patient'}
        </h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate('/followups')}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} color="primary">
            {loading ? 'Saving...' : 'Save Follow-Up'}
          </Button>
        </div>
      </div>

      <div aria-live="polite">
        {error && (
          <Alert color="danger" icon={<CircleX size={18} />}>
            {error}
          </Alert>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
              <Input value={formData.patientId || ''} readOnly className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
              <Input value={formData.patientName || ''} readOnly className="w-full" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visit Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date *</label>
              <Input
                type="date"
                value={formData.visitDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('visitDate', e.target.value)}
                required
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
              <div className="flex space-x-3">
                {Object.keys(statusColors).map((s) => (
                  <label key={s} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={status === s}
                      onChange={() => setStatus(s as 'Improved' | 'Stable' | 'Worse')}
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className={`px-2 py-1 rounded text-sm font-medium ${statusColors[s as keyof typeof statusColors].bg} ${statusColors[s as keyof typeof statusColors].text}`}>
                      {s}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Symptoms & Improvement</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Symptoms *</label>
              <NoteEditor
                value={formData.symptoms}
                onChange={(value) => handleEditorChange('symptoms', value)}
                placeholder="Describe the patient's current symptoms..."
                height="200px"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Improvement %</label>
                <Input
                  type="number"
                  value={improvementPercent}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const val = parseInt(e.target.value) || 0;
                    setImprovementPercent(val);
                    handleInputChange('improvementPercentage', val);
                  }}
                  min={0}
                  max={100}
                  placeholder="0-100"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Energy Level</label>
                <Select
                  value={energyLevel}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEnergyLevel(e.target.value as 'High' | 'Medium' | 'Low')}
                  options={[
                    { value: 'High', label: 'High' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'Low', label: 'Low' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aggravation Factors</label>
              <Input
                value={formData.aggravation}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('aggravation', e.target.value)}
                placeholder="What makes symptoms worse?"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Symptoms</label>
              <Input
                value={formData.newSymptoms}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('newSymptoms', e.target.value)}
                placeholder="Any new symptoms since last visit?"
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Prescription & Next Steps</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prescription Changes</label>
              <NoteEditor
                value={formData.prescriptionChanges}
                onChange={(value) => handleEditorChange('prescriptionChanges', value)}
                placeholder="Describe any prescription changes..."
                height="150px"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Review Date</label>
              <Input
                type="date"
                value={formData.nextReview}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('nextReview', e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Notes</label>
              <NoteEditor
                value={formData.notes}
                onChange={(value) => handleInputChange('notes', value)}
                placeholder="Additional notes..."
                height="150px"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default FollowUpForm;
