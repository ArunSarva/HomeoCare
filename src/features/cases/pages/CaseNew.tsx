import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Field, Select, Skeleton } from 'react-typescript-ui';
import { Users } from 'lucide-react';
import CaseForm from '../components/CaseForm';
import { patientService } from '../../patients/services/patientService';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';

/**
 * /cases/new. The case list's "New case" button linked here, but the route
 * didn't exist (it fell through to /cases/:id with id "new"), and CaseForm
 * needs a patient but has no picker. This page supplies both.
 * Accepts ?patientId=<id> to preselect a patient.
 */
export function CaseNew() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('patientId') ?? '';

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.getAllPatients(),
  });

  const selected = useMemo(() => patients.find(p => p.id === selectedId), [patients, selectedId]);

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
        <PageHeader title="New case" />
        <EmptyState
          icon={Users}
          title="Add a patient first"
          description="A case is always recorded against a registered patient."
          actionLabel="Add patient"
          onAction={() => navigate('/patients/new')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="New case" subtitle="Choose the patient, then record the case history." />

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

      {selected && (
        // key: remount the form if the patient changes so nothing carries over.
        <CaseForm key={selected.id} patientId={selected.id} patientName={selected.fullName} />
      )}
    </div>
  );
}

export default CaseNew;
