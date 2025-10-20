import { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Medication } from '@/shared/types';
import { usePersistentState } from '@/core/storage/persistent-store';

const STORAGE_KEY = 'medications';

interface MedicationCreateInput extends Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string;
  createdAt?: number;
  updatedAt?: number;
}

interface MedicationUpdateInput extends Partial<Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>> {
  updatedAt?: number;
}

function normalizeMedication(payload: MedicationCreateInput): Medication {
  const now = Date.now();
  return {
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
    updatedAt: payload.updatedAt ?? now,
  };
}

export function useMedications() {
  const { value, setValue, isReady } = usePersistentState<Medication[]>(STORAGE_KEY, []);

  const medications = useMemo(() => {
    return [...value].sort((a, b) => b.createdAt - a.createdAt);
  }, [value]);

  const createMedication = useCallback(async (payload: MedicationCreateInput) => {
    const medication = normalizeMedication(payload);
    setValue((current) => [...current, medication]);
    return medication;
  }, [setValue]);

  const updateMedication = useCallback(async (id: string, updates: MedicationUpdateInput) => {
    const timestamp = updates.updatedAt ?? Date.now();
    setValue((current) => current.map((medication) => (
      medication.id === id
        ? {
            ...medication,
            ...updates,
            absorptionRate: updates.absorptionRate ?? medication.absorptionRate,
            updatedAt: timestamp,
          }
        : medication
    )));
  }, [setValue]);

  const deleteMedication = useCallback(async (id: string) => {
    setValue((current) => current.filter((medication) => medication.id !== id));
  }, [setValue]);

  return {
    medications,
    createMedication,
    updateMedication,
    deleteMedication,
    isLoading: !isReady,
  } as const;
}
