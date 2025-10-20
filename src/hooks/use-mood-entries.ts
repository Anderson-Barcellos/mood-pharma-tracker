import { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { MoodEntry } from '@/shared/types';
import { usePersistentState } from '@/core/storage/persistent-store';

const STORAGE_KEY = 'moodEntries';

interface MoodEntryCreateInput extends Omit<MoodEntry, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: number;
}

interface MoodEntryUpdateInput extends Partial<Omit<MoodEntry, 'id' | 'createdAt'>> {
  createdAt?: number;
}

export function useMoodEntries() {
  const { value, setValue, isReady } = usePersistentState<MoodEntry[]>(STORAGE_KEY, []);

  const moodEntries = useMemo(() => {
    return [...value].sort((a, b) => b.timestamp - a.timestamp);
  }, [value]);

  const createMoodEntry = useCallback(async (payload: MoodEntryCreateInput) => {
    const timestamp = payload.timestamp ?? Date.now();
    const entry: MoodEntry = {
      id: payload.id ?? uuidv4(),
      timestamp,
      moodScore: payload.moodScore,
      anxietyLevel: payload.anxietyLevel,
      energyLevel: payload.energyLevel,
      focusLevel: payload.focusLevel,
      notes: payload.notes,
      createdAt: payload.createdAt ?? timestamp,
    };

    setValue((current) => [...current, entry]);
    return entry;
  }, [setValue]);

  const updateMoodEntry = useCallback(async (id: string, updates: MoodEntryUpdateInput) => {
    setValue((current) => current.map((entry) => (
      entry.id === id
        ? { ...entry, ...updates }
        : entry
    )));
  }, [setValue]);

  const deleteMoodEntry = useCallback(async (id: string) => {
    setValue((current) => current.filter((entry) => entry.id !== id));
  }, [setValue]);

  return {
    moodEntries,
    createMoodEntry,
    updateMoodEntry,
    deleteMoodEntry,
    isLoading: !isReady,
  } as const;
}
