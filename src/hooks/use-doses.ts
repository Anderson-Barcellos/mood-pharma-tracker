import { useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import type { MedicationDose } from '@/shared/types';
import { pkCache } from '@/features/analytics/utils/pharmacokinetics-cache';
import * as serverApi from '@/core/services/server-api';

interface DoseCreateInput extends Omit<MedicationDose, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: number;
}

interface DoseUpdateInput extends Partial<Omit<MedicationDose, 'id' | 'createdAt'>> {
  createdAt?: number;
}

export function useDoses(medicationId?: string) {
  const queryClient = useQueryClient();

  // Fetch doses from server
  const { data: allDoses = [], isLoading, error } = useQuery({
    queryKey: ['doses', medicationId],
    queryFn: () => serverApi.fetchDoses(medicationId),
    staleTime: 1000 * 60, // 1 minute
  });

  // Sort by timestamp descending (most recent first)
  const doses = [...allDoses].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

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

  const createMutation = useMutation({
    mutationFn: (payload: DoseCreateInput) => {
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
      return serverApi.createDose(record);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['doses'] });
      invalidateCache(data.medicationId);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: DoseUpdateInput }) => {
      return serverApi.updateDose(id, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['doses'] });
      invalidateCache(data.medicationId);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Get dose from cache to know which medication to invalidate
      const dose = allDoses.find(d => d.id === id);
      await serverApi.deleteDose(id);
      return dose?.medicationId;
    },
    onSuccess: (medicationId) => {
      queryClient.invalidateQueries({ queryKey: ['doses'] });
      if (medicationId) {
        invalidateCache(medicationId);
      }
    },
  });

  const createDose = useCallback(async (payload: DoseCreateInput) => {
    return createMutation.mutateAsync(payload);
  }, [createMutation]);

  const updateDose = useCallback(async (id: string, updates: DoseUpdateInput) => {
    await updateMutation.mutateAsync({ id, updates });
  }, [updateMutation]);

  const deleteDose = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  return {
    doses,
    createDose,
    updateDose,
    deleteDose,
    isLoading,
    error,
  } as const;
}
