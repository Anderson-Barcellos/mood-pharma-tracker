import { useCallback, useEffect, useState } from 'react';
import {
  getDoses,
  initializeDatabase,
  removeDose,
  removeDosesByMedication,
  saveDose,
  subscribeToTable
} from '@/core/database/db';
import type { MedicationDose } from '@/lib/types';

interface UseDosesResult {
  doses: MedicationDose[];
  isLoading: boolean;
  error: unknown;
  upsertDose: (dose: MedicationDose) => Promise<void>;
  deleteDose: (id: string) => Promise<void>;
  deleteDosesByMedication: (medicationId: string) => Promise<void>;
}

export function useDoses(): UseDosesResult {
  const [doses, setDoses] = useState<MedicationDose[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    const loadDoses = async () => {
      try {
        const records = await getDoses();
        if (!isActive) return;
        setDoses(records);
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
        void loadDoses();
        unsubscribe = subscribeToTable('doses', () => {
          void loadDoses();
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

  const upsertDose = useCallback(async (dose: MedicationDose) => {
    try {
      await initializeDatabase();
      await saveDose(dose);
      setDoses((current) => {
        const next = [...current];
        const index = next.findIndex((item) => item.id === dose.id);
        if (index >= 0) {
          next[index] = dose;
        } else {
          next.push(dose);
        }
        next.sort((a, b) => a.timestamp - b.timestamp);
        return next;
      });
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const deleteDose = useCallback(async (id: string) => {
    try {
      await initializeDatabase();
      await removeDose(id);
      setDoses((current) => current.filter((dose) => dose.id !== id));
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const deleteDosesByMedication = useCallback(async (medicationId: string) => {
    try {
      await initializeDatabase();
      await removeDosesByMedication(medicationId);
      setDoses((current) => current.filter((dose) => dose.medicationId !== medicationId));
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  return { doses, isLoading, error, upsertDose, deleteDose, deleteDosesByMedication };
}
