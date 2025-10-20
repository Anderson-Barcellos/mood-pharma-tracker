import { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CognitiveTest } from '@/shared/types';
import { usePersistentState } from '@/core/storage/persistent-store';

const STORAGE_KEY = 'cognitiveTests';

interface CognitiveTestCreateInput extends Omit<CognitiveTest, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: number;
}

interface CognitiveTestUpdateInput extends Partial<Omit<CognitiveTest, 'id' | 'createdAt'>> {
  createdAt?: number;
}

export function useCognitiveTests() {
  const { value, setValue, isReady } = usePersistentState<CognitiveTest[]>(STORAGE_KEY, []);

  const cognitiveTests = useMemo(() => {
    return [...value].sort((a, b) => b.timestamp - a.timestamp);
  }, [value]);

  const createCognitiveTest = useCallback(async (payload: CognitiveTestCreateInput) => {
    const timestamp = payload.timestamp ?? Date.now();
    const record: CognitiveTest = {
      id: payload.id ?? uuidv4(),
      timestamp,
      matrices: payload.matrices,
      totalScore: payload.totalScore,
      averageResponseTime: payload.averageResponseTime,
      accuracy: payload.accuracy,
      createdAt: payload.createdAt ?? timestamp,
    };

    setValue((current) => [...current, record]);
    return record;
  }, [setValue]);

  const updateCognitiveTest = useCallback(async (id: string, updates: CognitiveTestUpdateInput) => {
    setValue((current) => current.map((test) => (
      test.id === id
        ? { ...test, ...updates }
        : test
    )));
  }, [setValue]);

  const deleteCognitiveTest = useCallback(async (id: string) => {
    setValue((current) => current.filter((test) => test.id !== id));
  }, [setValue]);

  return {
    cognitiveTests,
    createCognitiveTest,
    updateCognitiveTest,
    deleteCognitiveTest,
    isLoading: !isReady,
  } as const;
}
