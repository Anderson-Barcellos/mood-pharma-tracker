import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import type { MedicationDose } from '@/shared/types';
import { pkCache } from '@/features/analytics/utils/pharmacokinetics-cache';
import { useAppDataSnapshot, useAppDataMutator } from '@/hooks/use-app-data-store';

interface DoseCreateInput extends Omit<MedicationDose, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: number;
}

interface DoseUpdateInput extends Partial<Omit<MedicationDose, 'id' | 'createdAt'>> {
  createdAt?: number;
}

export function useDoses(medicationId?: string) {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = useAppDataSnapshot();
  const { mutateAppData } = useAppDataMutator();
  const allDoses = data?.doses ?? [];

  const doses = useMemo(() => {
    const filtered = medicationId ? allDoses.filter((dose) => dose.medicationId === medicationId) : allDoses;
    return [...filtered].sort((a, b) => b.timestamp - a.timestamp);
  }, [allDoses, medicationId]);

  const invalidateCache = useCallback((medId: string) => {
    pkCache.invalidate(medId);
    queryClient.invalidateQueries({
      queryKey: ['concentration-curve'],
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[1] === medId;
      }
    });
    queryClient.invalidateQueries({
      queryKey: ['concentration-point'],
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[1] === medId;
      }
    });
  }, [queryClient]);

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

    await mutateAppData((snapshot) => ({
      ...snapshot,
      doses: [record, ...snapshot.doses]
    }));
    invalidateCache(payload.medicationId);

    return record;
  }, [invalidateCache, mutateAppData]);

  const updateDose = useCallback(async (id: string, updates: DoseUpdateInput) => {
    const currentDose = allDoses.find((dose) => dose.id === id);
    if (!currentDose) {
      return;
    }

    await mutateAppData((snapshot) => ({
      ...snapshot,
      doses: snapshot.doses.map((dose) => (dose.id === id ? { ...dose, ...updates } : dose))
    }));
    invalidateCache(currentDose.medicationId);
  }, [allDoses, invalidateCache, mutateAppData]);

  const deleteDose = useCallback(async (id: string) => {
    const currentDose = allDoses.find((dose) => dose.id === id);
    if (!currentDose) {
      return;
    }

    await mutateAppData((snapshot) => ({
      ...snapshot,
      doses: snapshot.doses.filter((dose) => dose.id !== id)
    }));
    invalidateCache(currentDose.medicationId);
  }, [allDoses, invalidateCache, mutateAppData]);

  return {
    doses,
    createDose,
    updateDose,
    deleteDose,
    isLoading: (!data && (isLoading || isFetching))
  } as const;
}
