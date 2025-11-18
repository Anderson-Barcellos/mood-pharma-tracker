import { useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import type { CognitiveTest } from '@/shared/types';
import * as serverApi from '@/core/services/server-api';

interface CognitiveTestCreateInput extends Omit<CognitiveTest, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: number;
}

interface CognitiveTestUpdateInput extends Partial<Omit<CognitiveTest, 'id' | 'createdAt'>> {
  createdAt?: number;
}

export function useCognitiveTests() {
  const queryClient = useQueryClient();

  // Fetch cognitive tests from server
  const { data: allCognitiveTests = [], isLoading, error } = useQuery({
    queryKey: ['cognitiveTests'],
    queryFn: () => serverApi.fetchCognitiveTests(),
    staleTime: 1000 * 60, // 1 minute
  });

  // Sort by timestamp descending (most recent first)
  const cognitiveTests = [...allCognitiveTests].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const createMutation = useMutation({
    mutationFn: (payload: CognitiveTestCreateInput) => {
      const timestamp = payload.timestamp ?? Date.now();
      const record: CognitiveTest = {
        id: payload.id ?? uuidv4(),
        timestamp,
        matrices: payload.matrices,
        totalScore: payload.totalScore,
        averageResponseTime: payload.averageResponseTime,
        accuracy: payload.accuracy,
        createdAt: payload.createdAt ?? timestamp
      };
      return serverApi.createCognitiveTest(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cognitiveTests'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => serverApi.deleteCognitiveTest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cognitiveTests'] });
    },
  });

  const createCognitiveTest = useCallback(async (payload: CognitiveTestCreateInput) => {
    return createMutation.mutateAsync(payload);
  }, [createMutation]);

  const updateCognitiveTest = useCallback(async (id: string, updates: CognitiveTestUpdateInput) => {
    // Note: Update endpoint not implemented in API yet
    console.warn('[useCognitiveTests] Update not implemented for cognitive tests');
  }, []);

  const deleteCognitiveTest = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  return {
    cognitiveTests,
    createCognitiveTest,
    updateCognitiveTest,
    deleteCognitiveTest,
    isLoading,
    error,
  } as const;
}
