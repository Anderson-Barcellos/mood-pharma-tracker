import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/database/db';
import type { Medication } from '@/shared/types';
import { createMedicationRecord, mergeMedicationRecord, type MedicationDraft } from '@/core/database/medication-helpers';
import { scheduleServerSync } from '@/core/services/server-sync';

type MedicationCreateInput = MedicationDraft & Required<Pick<Medication, 'name' | 'halfLife' | 'volumeOfDistribution' | 'bioavailability'>>;
type MedicationUpdateInput = MedicationDraft;

export function useMedications() {
  const queryResult = useLiveQuery(
    async () => {
      const records = await db.medications.orderBy('createdAt').reverse().toArray();
      return records ?? [];
    },
    []
  );

  const medications = queryResult ?? [];

  const createMedication = useCallback(async (payload: MedicationCreateInput) => {
    const record = createMedicationRecord(payload);
    await db.medications.put(record);
    scheduleServerSync('medication:create');
    return record;
  }, []);

  const updateMedication = useCallback(async (id: string, updates: MedicationUpdateInput) => {
    const existing = await db.medications.get(id);
    if (!existing) {
      return;
    }

    const merged = mergeMedicationRecord(existing, updates);
    await db.medications.put(merged);
    scheduleServerSync('medication:update');
  }, []);

  const deleteMedication = useCallback(async (id: string) => {
    await db.transaction('rw', db.medications, db.doses, async () => {
      await db.medications.delete(id);
      await db.doses.where('medicationId').equals(id).delete();
    });
    scheduleServerSync('medication:delete');
  }, []);

  return {
    medications,
    createMedication,
    updateMedication,
    deleteMedication,
    isLoading: queryResult === undefined
  } as const;
}
