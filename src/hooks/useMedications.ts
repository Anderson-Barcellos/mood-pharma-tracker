import { useCallback, useEffect, useState } from 'react';
import {
  getMedications,
  initializeDatabase,
  removeMedication,
  saveMedication,
  subscribeToTable
} from '@/core/database/db';
import type { Medication } from '@/lib/types';

interface UseMedicationsResult {
  medications: Medication[];
  isLoading: boolean;
  error: unknown;
  upsertMedication: (medication: Medication) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
}

export function useMedications(): UseMedicationsResult {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    const loadMedications = async () => {
      try {
        const records = await getMedications();
        if (!isActive) return;
        setMedications(records);
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
        void loadMedications();
        unsubscribe = subscribeToTable('medications', () => {
          void loadMedications();
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

  const upsertMedication = useCallback(async (medication: Medication) => {
    try {
      await initializeDatabase();
      await saveMedication(medication);
      setMedications((current) => {
        const next = [...current];
        const index = next.findIndex((item) => item.id === medication.id);
        if (index >= 0) {
          next[index] = medication;
        } else {
          next.push(medication);
        }
        next.sort((a, b) => a.createdAt - b.createdAt);
        return next;
      });
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const deleteMedication = useCallback(async (id: string) => {
    try {
      await initializeDatabase();
      await removeMedication(id);
      setMedications((current) => current.filter((medication) => medication.id !== id));
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  return { medications, isLoading, error, upsertMedication, deleteMedication };
}
