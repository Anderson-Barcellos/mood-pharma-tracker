import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/database/db';
import type { MedicationDose } from '@/shared/types';
import { pkCache } from '@/features/analytics/utils/pharmacokinetics-cache';
import { scheduleServerSync } from '@/core/services/server-sync';

interface DoseCreateInput extends Omit<MedicationDose, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: number;
}

interface DoseUpdateInput extends Partial<Omit<MedicationDose, 'id' | 'createdAt'>> {
  createdAt?: number;
}

export function useDoses(medicationId?: string) {
  const queryClient = useQueryClient();

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

    await db.doses.put(record);
    invalidateCache(payload.medicationId);
    scheduleServerSync('dose:create');

    return record;
  }, [invalidateCache]);

  const updateDose = useCallback(async (id: string, updates: DoseUpdateInput) => {
    const dose = await db.doses.get(id);
    if (dose) {
      await db.doses.update(id, updates);
      invalidateCache(dose.medicationId);
      scheduleServerSync('dose:update');
    }
  }, [invalidateCache]);

  const deleteDose = useCallback(async (id: string) => {
    const dose = await db.doses.get(id);
    if (dose) {
      await db.doses.delete(id);
      invalidateCache(dose.medicationId);
      scheduleServerSync('dose:delete');
    }
  }, [invalidateCache]);

  return {
    doses,
    createDose,
    updateDose,
    deleteDose,
    isLoading: queryResult === undefined
  } as const;
}
