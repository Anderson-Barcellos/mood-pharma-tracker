import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/database/db';
import type { CognitiveTest } from '@/lib/types';

interface CognitiveTestCreateInput extends Omit<CognitiveTest, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: number;
}

interface CognitiveTestUpdateInput extends Partial<Omit<CognitiveTest, 'id' | 'createdAt'>> {
  createdAt?: number;
}

export function useCognitiveTests() {
  const queryResult = useLiveQuery(async () => {
    const records = await db.cognitiveTests.orderBy('timestamp').reverse().toArray();
    return records ?? [];
  }, []);

  const cognitiveTests = queryResult ?? [];

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

    await db.cognitiveTests.put(record);
    return record;
  }, []);

  const updateCognitiveTest = useCallback(async (id: string, updates: CognitiveTestUpdateInput) => {
    await db.cognitiveTests.update(id, updates);
  }, []);

  const deleteCognitiveTest = useCallback(async (id: string) => {
    await db.cognitiveTests.delete(id);
  }, []);

  return {
    cognitiveTests,
    createCognitiveTest,
    updateCognitiveTest,
    deleteCognitiveTest,
    isLoading: queryResult === undefined
  } as const;
}
