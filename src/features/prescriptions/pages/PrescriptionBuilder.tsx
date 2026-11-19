import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Field, Select, Skeleton } from 'react-typescript-ui';
import { Users } from 'lucide-react';
import PrescriptionForm from '../components/PrescriptionForm';
import { Prescription } from '../../../types';
import { prescriptionService } from '../services/prescriptionService';
import { patientService } from '../../patients/services/patientService';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';

/**
 * /prescriptions/new. This page used to wait for a patient id in the URL
 * that the route never supplied, so it showed "Loading patient
 * information..." forever and the form never appeared. It now lets the
 * doctor pick the patient, and accepts ?patientId=<id> to preselect one.
 */
const PrescriptionBuilder: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('patientId') ?? '';

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.getAllPatients(),
  });

  const patient = useMemo(() => patients.find(p => p.id === selectedId), [patients, selectedId]);

  const handlePrescribe = async (prescription: Prescription) => {
    try {
      await prescriptionService.createPrescription(prescription);
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      navigate('/prescriptions');
    } catch (error) {
      console.error('Error prescribing:', error);
      throw new Error("Couldn't save the prescription. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="text" width="30%" height={32} />
        <Skeleton variant="rect" height={96} />
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div>
        <PageHeader title="New prescription" />
        <EmptyState
          icon={Users}
          title="Add a patient first"
          description="A prescription is always written for a registered patient."
          actionLabel="Add patient"
          onAction={() => navigate('/patients/new')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={patient ? `New prescription for ${patient.fullName}` : 'New prescription'}
        subtitle="Choose the patient, then add remedies, potency and dosage."
      />

      <Card padding="md" className="shadow-xs">
        <div className="max-w-md">
          <Field label="Patient" required>
            <Select
              value={selectedId}
              placeholder="Select a patient"
              onChange={e => setParams(e.target.value ? { patientId: e.target.value } : {}, { replace: true })}
              options={patients.map(p => ({ value: p.id, label: `${p.fullName} · ${p.patientId}` }))}
              aria-label="Patient"
            />
          </Field>
        </div>
      </Card>

      {patient && (
        // key: remount if the patient changes so medicines don't carry over.
        <PrescriptionForm
          key={patient.id}
          patientId={patient.patientId}
          patientName={patient.fullName}
          onPrescribe={handlePrescribe}
        />
      )}
    </div>
  );
};

export default PrescriptionBuilder;
