import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/database/db';
import type { MedicationDose } from '@/lib/types';

interface DoseCreateInput extends Omit<MedicationDose, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: number;
}

interface DoseUpdateInput extends Partial<Omit<MedicationDose, 'id' | 'createdAt'>> {
  createdAt?: number;
}

export function useDoses(medicationId?: string) {
  const queryResult = useLiveQuery(
    async () => {
      if (medicationId) {
        const records = await db.doses.where('medicationId').equals(medicationId).sortBy('timestamp');
        return records.reverse();
      }

      const records = await db.doses.orderBy('timestamp').reverse().toArray();
      return records ?? [];
    },
    [medicationId]
  );

  const doses = queryResult ?? [];

  const createDose = useCallback(async (payload: DoseCreateInput) => {
    const timestamp = payload.timestamp ?? Date.now();
    const record: MedicationDose = {
      id: payload.id ?? uuidv4(),
      medicationId: payload.medicationId,
      timestamp,
      doseAmount: payload.doseAmount,
      route: payload.route,
      notes: payload.notes,
      createdAt: payload.createdAt ?? Date.now()
    };

    await db.doses.put(record);
    return record;
  }, []);

  const updateDose = useCallback(async (id: string, updates: DoseUpdateInput) => {
    await db.doses.update(id, updates);
  }, []);

  const deleteDose = useCallback(async (id: string) => {
    await db.doses.delete(id);
  }, []);

  return {
    doses,
    createDose,
    updateDose,
    deleteDose,
    isLoading: queryResult === undefined
  } as const;
}
