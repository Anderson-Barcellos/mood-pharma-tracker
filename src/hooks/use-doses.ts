import { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { MedicationDose } from '@/shared/types';
import { usePersistentState } from '@/core/storage/persistent-store';

const STORAGE_KEY = 'doses';

interface DoseCreateInput extends Omit<MedicationDose, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: number;
}

interface DoseUpdateInput extends Partial<Omit<MedicationDose, 'id' | 'createdAt'>> {
  createdAt?: number;
}

export function useDoses(medicationId?: string) {
  const { value, setValue, isReady } = usePersistentState<MedicationDose[]>(STORAGE_KEY, []);

  const doses = useMemo(() => {
    const source = medicationId
      ? value.filter((dose) => dose.medicationId === medicationId)
      : value;
    return [...source].sort((a, b) => b.timestamp - a.timestamp);
  }, [value, medicationId]);

  const createDose = useCallback(async (payload: DoseCreateInput) => {
    const timestamp = payload.timestamp ?? Date.now();
    const dose: MedicationDose = {
      id: payload.id ?? uuidv4(),
      medicationId: payload.medicationId,
      timestamp,
      doseAmount: payload.doseAmount,
      route: payload.route,
      notes: payload.notes,
      createdAt: payload.createdAt ?? Date.now(),
    };

    setValue((current) => [...current, dose]);
    return dose;
  }, [setValue]);

  const updateDose = useCallback(async (id: string, updates: DoseUpdateInput) => {
    setValue((current) => current.map((dose) => (
      dose.id === id
        ? { ...dose, ...updates }
        : dose
    )));
  }, [setValue]);

  const deleteDose = useCallback(async (id: string) => {
    setValue((current) => current.filter((dose) => dose.id !== id));
  }, [setValue]);

  return {
    doses,
    createDose,
    updateDose,
    deleteDose,
    isLoading: !isReady,
  } as const;
}
