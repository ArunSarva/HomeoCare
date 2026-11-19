import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { patientService } from '../services/patientService';

/**
 * Cases, follow-ups, appointments and bills store the patient's internal
 * record id, so their screens showed a long UUID labelled "Patient ID".
 * This maps that id to the clinic's patient number (P000001); anything it
 * can't resolve (e.g. an id that is already a P-number) is shown as-is.
 */
export function usePatientNumber() {
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.getAllPatients(),
  });
  const byId = useMemo(() => new Map(patients.map(p => [p.id, p.patientId])), [patients]);
  return useCallback((idOrNumber: string | undefined) => (idOrNumber ? byId.get(idOrNumber) ?? idOrNumber : ''), [byId]);
}

export default usePatientNumber;
