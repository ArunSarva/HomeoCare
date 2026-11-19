import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from 'react-typescript-ui';
import { FileX } from 'lucide-react';
import CaseForm from '../components/CaseForm';
import { caseService } from '../services/caseService';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';

/**
 * /cases/:id/edit. CaseDetail's "Edit Case" linked here and CaseForm already
 * supported editing via `caseData`; only the route was missing.
 */
export function CaseEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => (id ? caseService.getCaseById(id) : null),
  });

  if (isLoading) {
    return <Skeleton variant="rect" height={320} />;
  }

  if (!caseData) {
    return (
      <EmptyState
        icon={FileX}
        title="Case not found"
        description="This case may have been deleted."
        actionLabel="Back to cases"
        onAction={() => navigate('/cases')}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={`Edit case ${caseData.id}`} subtitle={caseData.patientName} />
      <CaseForm caseData={caseData} patientId={caseData.patientId} patientName={caseData.patientName} />
    </div>
  );
}

export default CaseEdit;
