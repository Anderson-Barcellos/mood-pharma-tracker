import { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CognitiveTest } from '@/shared/types';
import { useAppDataSnapshot, useAppDataMutator } from '@/hooks/use-app-data-store';

interface CognitiveTestCreateInput extends Omit<CognitiveTest, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: number;
}

interface CognitiveTestUpdateInput extends Partial<Omit<CognitiveTest, 'id' | 'createdAt'>> {
  createdAt?: number;
}

export function useCognitiveTests() {
  const { data, isLoading, isFetching } = useAppDataSnapshot();
  const { mutateAppData } = useAppDataMutator();
  const sourceTests = data?.cognitiveTests ?? [];

  const cognitiveTests = useMemo(() => {
    return [...sourceTests].sort((a, b) => b.timestamp - a.timestamp);
  }, [sourceTests]);

  const createCognitiveTest = useCallback(async (payload: CognitiveTestCreateInput) => {
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

    await mutateAppData((snapshot) => ({
      ...snapshot,
      cognitiveTests: [record, ...snapshot.cognitiveTests]
    }));
    return record;
  }, [mutateAppData]);

  const updateCognitiveTest = useCallback(async (id: string, updates: CognitiveTestUpdateInput) => {
    if (!sourceTests.some((test) => test.id === id)) {
      return;
    }

    await mutateAppData((snapshot) => ({
      ...snapshot,
      cognitiveTests: snapshot.cognitiveTests.map((test) => (test.id === id ? { ...test, ...updates } : test))
    }));
  }, [mutateAppData, sourceTests]);

  const deleteCognitiveTest = useCallback(async (id: string) => {
    if (!sourceTests.some((test) => test.id === id)) {
      return;
    }

    await mutateAppData((snapshot) => ({
      ...snapshot,
      cognitiveTests: snapshot.cognitiveTests.filter((test) => test.id !== id)
    }));
  }, [mutateAppData, sourceTests]);

  return {
    cognitiveTests,
    createCognitiveTest,
    updateCognitiveTest,
    deleteCognitiveTest,
    isLoading: (!data && (isLoading || isFetching))
  } as const;
}
