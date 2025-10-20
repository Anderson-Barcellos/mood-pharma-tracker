import { useCallback, useEffect, useState } from 'react';
import {
  getMoodEntries,
  initializeDatabase,
  removeMoodEntry,
  saveMoodEntry,
  subscribeToTable
} from '@/core/database/db';
import type { MoodEntry } from '@/lib/types';

interface UseMoodEntriesResult {
  moodEntries: MoodEntry[];
  isLoading: boolean;
  error: unknown;
  upsertMoodEntry: (entry: MoodEntry) => Promise<void>;
  deleteMoodEntry: (id: string) => Promise<void>;
}

export function useMoodEntries(): UseMoodEntriesResult {
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    const loadEntries = async () => {
      try {
        const records = await getMoodEntries();
        if (!isActive) return;
        setMoodEntries(records);
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
        void loadEntries();
        unsubscribe = subscribeToTable('moodEntries', () => {
          void loadEntries();
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

  const upsertMoodEntry = useCallback(async (entry: MoodEntry) => {
    try {
      await initializeDatabase();
      await saveMoodEntry(entry);
      setMoodEntries((current) => {
        const next = [...current];
        const index = next.findIndex((item) => item.id === entry.id);
        if (index >= 0) {
          next[index] = entry;
        } else {
          next.push(entry);
        }
        next.sort((a, b) => a.timestamp - b.timestamp);
        return next;
      });
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const deleteMoodEntry = useCallback(async (id: string) => {
    try {
      await initializeDatabase();
      await removeMoodEntry(id);
      setMoodEntries((current) => current.filter((entry) => entry.id !== id));
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  return { moodEntries, isLoading, error, upsertMoodEntry, deleteMoodEntry };
}
