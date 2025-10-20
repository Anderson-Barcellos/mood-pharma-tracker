import { useCallback, useEffect, useState } from 'react';
import {
  getCognitiveTests,
  initializeDatabase,
  removeCognitiveTest,
  saveCognitiveTest,
  subscribeToTable
} from '@/core/database/db';
import type { CognitiveTest } from '@/lib/types';

interface UseCognitiveTestsResult {
  cognitiveTests: CognitiveTest[];
  isLoading: boolean;
  error: unknown;
  upsertCognitiveTest: (test: CognitiveTest) => Promise<void>;
  deleteCognitiveTest: (id: string) => Promise<void>;
}

export function useCognitiveTests(): UseCognitiveTestsResult {
  const [cognitiveTests, setCognitiveTests] = useState<CognitiveTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    const loadTests = async () => {
      try {
        const records = await getCognitiveTests();
        if (!isActive) return;
        setCognitiveTests(records);
        setIsLoading(false);
      } catch (err) {
        if (!isActive) return;
        setError(err);
        setIsLoading(false);
      }
    };

    initializeDatabase()
      .then(() => {
        if (!isActive) return;
        void loadTests();
        unsubscribe = subscribeToTable('cognitiveTests', () => {
          void loadTests();
        });
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err);
        setIsLoading(false);
      });

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, []);

  const upsertCognitiveTest = useCallback(async (test: CognitiveTest) => {
    try {
      await initializeDatabase();
      await saveCognitiveTest(test);
      setCognitiveTests((current) => {
        const next = [...current];
        const index = next.findIndex((item) => item.id === test.id);
        if (index >= 0) {
          next[index] = test;
        } else {
          next.push(test);
        }
        next.sort((a, b) => a.timestamp - b.timestamp);
        return next;
      });
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const deleteCognitiveTest = useCallback(async (id: string) => {
    try {
      await initializeDatabase();
      await removeCognitiveTest(id);
      setCognitiveTests((current) => current.filter((test) => test.id !== id));
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  return { cognitiveTests, isLoading, error, upsertCognitiveTest, deleteCognitiveTest };
}
