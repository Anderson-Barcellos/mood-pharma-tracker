import { useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type { Medication } from '@/shared/types';
import { createMedicationRecord, mergeMedicationRecord, type MedicationDraft } from '@/core/database/medication-helpers';
import * as serverApi from '@/core/services/server-api';

type MedicationCreateInput = MedicationDraft & Required<Pick<Medication, 'name' | 'halfLife' | 'volumeOfDistribution' | 'bioavailability'>>;
type MedicationUpdateInput = MedicationDraft;

export function useMedications() {
  const queryClient = useQueryClient();

  // Fetch medications from server
  const { data: medications = [], isLoading, error } = useQuery({
    queryKey: ['medications'],
    queryFn: () => serverApi.fetchMedications(),
    staleTime: 1000 * 60, // 1 minute
  });

  // Sort by createdAt descending (most recent first)
  const sortedMedications = [...medications].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const createMutation = useMutation({
    mutationFn: (payload: MedicationCreateInput) => {
      const record = createMedicationRecord(payload);
      return serverApi.createMedication(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: MedicationUpdateInput }) => {
      // Get existing medication from cache or server
      const existing = medications.find(m => m.id === id);
      if (!existing) {
        throw new Error('Medication not found');
      }
      const merged = mergeMedicationRecord(existing, updates);
      return serverApi.updateMedication(id, merged);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => serverApi.deleteMedication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['doses'] });
    },
  });

  const createMedication = useCallback(async (payload: MedicationCreateInput) => {
    return createMutation.mutateAsync(payload);
  }, [createMutation]);

  const updateMedication = useCallback(async (id: string, updates: MedicationUpdateInput) => {
    await updateMutation.mutateAsync({ id, updates });
  }, [updateMutation]);

  const deleteMedication = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  return {
    medications: sortedMedications,
    createMedication,
    updateMedication,
    deleteMedication,
    isLoading,
    error,
  } as const;
}
