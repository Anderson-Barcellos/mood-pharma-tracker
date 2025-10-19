import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/database/db';
import type { Medication } from '@/lib/types';

interface MedicationCreateInput extends Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string;
  createdAt?: number;
  updatedAt?: number;
}

interface MedicationUpdateInput extends Partial<Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>> {
  updatedAt?: number;
}

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
    const now = Date.now();
    const record: Medication = {
      id: payload.id ?? uuidv4(),
      name: payload.name,
      brandName: payload.brandName,
      category: payload.category,
      halfLife: payload.halfLife,
      volumeOfDistribution: payload.volumeOfDistribution,
      bioavailability: payload.bioavailability,
      absorptionRate: payload.absorptionRate ?? 1,
      therapeuticRange: payload.therapeuticRange,
      notes: payload.notes,
      createdAt: payload.createdAt ?? now,
      updatedAt: payload.updatedAt ?? now
    };

    await db.medications.put(record);
    return record;
  }, []);

  const updateMedication = useCallback(async (id: string, updates: MedicationUpdateInput) => {
    const now = Date.now();
    await db.medications.update(id, {
      ...updates,
      updatedAt: updates.updatedAt ?? now
    });
  }, []);

  const deleteMedication = useCallback(async (id: string) => {
    await db.transaction('rw', db.medications, db.doses, async () => {
      await db.medications.delete(id);
      await db.doses.where('medicationId').equals(id).delete();
    });
  }, []);

  return {
    medications,
    createMedication,
    updateMedication,
    deleteMedication,
    isLoading: queryResult === undefined
  } as const;
}
