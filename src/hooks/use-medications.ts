import { useCallback, useMemo } from 'react';
import type { Medication } from '@/shared/types';
import { createMedicationRecord, mergeMedicationRecord, type MedicationDraft } from '@/core/database/medication-helpers';
import { useAppDataSnapshot, useAppDataMutator } from '@/hooks/use-app-data-store';

type MedicationCreateInput = MedicationDraft & Required<Pick<Medication, 'name' | 'halfLife' | 'volumeOfDistribution' | 'bioavailability'>>;
type MedicationUpdateInput = MedicationDraft;

export function useMedications() {
  const { data, isLoading, isFetching } = useAppDataSnapshot();
  const { mutateAppData } = useAppDataMutator();
  const sourceMedications = data?.medications ?? [];

  const medications = useMemo(() => {
    return [...sourceMedications].sort((a, b) => b.createdAt - a.createdAt);
  }, [sourceMedications]);

  const createMedication = useCallback(async (payload: MedicationCreateInput) => {
    const record = createMedicationRecord(payload);
    await mutateAppData((snapshot) => ({
      ...snapshot,
      medications: [record, ...snapshot.medications]
    }));
    return record;
  }, [mutateAppData]);

  const updateMedication = useCallback(async (id: string, updates: MedicationUpdateInput) => {
    const existing = sourceMedications.find((med) => med.id === id);
    if (!existing) {
      return;
    }

    await mutateAppData((snapshot) => ({
      ...snapshot,
      medications: snapshot.medications.map((med) => (med.id === id ? mergeMedicationRecord(med, updates) : med))
    }));
  }, [mutateAppData, sourceMedications]);

  const deleteMedication = useCallback(async (id: string) => {
    if (!sourceMedications.some((med) => med.id === id)) {
      return;
    }

    await mutateAppData((snapshot) => ({
      ...snapshot,
      medications: snapshot.medications.filter((med) => med.id !== id),
      doses: snapshot.doses.filter((dose) => dose.medicationId !== id)
    }));
  }, [mutateAppData, sourceMedications]);

  return {
    medications,
    createMedication,
    updateMedication,
    deleteMedication,
    isLoading: (!data && (isLoading || isFetching))
  } as const;
}
