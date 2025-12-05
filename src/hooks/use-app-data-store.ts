import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAppData,
  saveAppData,
  cloneSnapshot,
  normalizeSnapshot,
  type AppDataSnapshot,
  type AppDataUpdater
} from '@/core/services/app-data-service';

export const APP_DATA_QUERY_KEY = ['app-data'];

export function useAppDataSnapshot() {
  return useQuery({
    queryKey: APP_DATA_QUERY_KEY,
    queryFn: fetchAppData,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 60_000,
    retry: 2,
    retryDelay: 1000
  });
}

export function useAppDataMutator() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: saveAppData,
    onSuccess: (saved) => {
      queryClient.setQueryData(APP_DATA_QUERY_KEY, saved);
    }
  });

  const mutateAppData = useCallback(
    async (updater: AppDataUpdater) => {
      const current = queryClient.getQueryData<AppDataSnapshot>(APP_DATA_QUERY_KEY);
      if (!current) {
        throw new Error('App data snapshot is not loaded yet');
      }

      const workingCopy = cloneSnapshot(current);
      const updated = updater(workingCopy);
      const nextSnapshot = normalizeSnapshot(updated);

      queryClient.setQueryData(APP_DATA_QUERY_KEY, nextSnapshot);

      try {
        const saved = await mutation.mutateAsync(nextSnapshot);
        queryClient.setQueryData(APP_DATA_QUERY_KEY, saved);
        return saved;
      } catch (error) {
        console.error('[AppData] Falha ao salvar no backend; revertendo snapshot otimista', error);
        queryClient.setQueryData(APP_DATA_QUERY_KEY, current);
        throw error;
      }
    },
    [mutation, queryClient]
  );

  return {
    mutateAppData,
    isSaving: mutation.isPending
  };
}
