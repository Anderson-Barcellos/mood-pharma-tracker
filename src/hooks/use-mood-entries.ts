import { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { MoodEntry } from '@/shared/types';
import { useAppDataSnapshot, useAppDataMutator } from '@/hooks/use-app-data-store';

interface MoodEntryCreateInput extends Omit<MoodEntry, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: number;
}

interface MoodEntryUpdateInput extends Partial<Omit<MoodEntry, 'id' | 'createdAt'>> {
  createdAt?: number;
}

export function useMoodEntries() {
  const { data, isLoading, isFetching } = useAppDataSnapshot();
  const { mutateAppData } = useAppDataMutator();
  const sourceMoodEntries = data?.moodEntries ?? [];

  const moodEntries = useMemo(() => {
    return [...sourceMoodEntries].sort((a, b) => b.timestamp - a.timestamp);
  }, [sourceMoodEntries]);

  const createMoodEntry = useCallback(async (payload: MoodEntryCreateInput) => {
    const timestamp = payload.timestamp ?? Date.now();
    const record: MoodEntry = {
      id: payload.id ?? uuidv4(),
      timestamp,
      moodScore: payload.moodScore,
      anxietyLevel: payload.anxietyLevel,
      energyLevel: payload.energyLevel,
      focusLevel: payload.focusLevel,
      notes: payload.notes,
      createdAt: payload.createdAt ?? timestamp
    };

    await mutateAppData((snapshot) => ({
      ...snapshot,
      moodEntries: [record, ...snapshot.moodEntries]
    }));
    return record;
  }, [mutateAppData]);

  const updateMoodEntry = useCallback(async (id: string, updates: MoodEntryUpdateInput) => {
    if (!sourceMoodEntries.some((entry) => entry.id === id)) {
      return;
    }

    await mutateAppData((snapshot) => ({
      ...snapshot,
      moodEntries: snapshot.moodEntries.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
    }));
  }, [mutateAppData, sourceMoodEntries]);

  const deleteMoodEntry = useCallback(async (id: string) => {
    if (!sourceMoodEntries.some((entry) => entry.id === id)) {
      return;
    }

    await mutateAppData((snapshot) => ({
      ...snapshot,
      moodEntries: snapshot.moodEntries.filter((entry) => entry.id !== id)
    }));
  }, [mutateAppData, sourceMoodEntries]);

  return {
    moodEntries,
    createMoodEntry,
    updateMoodEntry,
    deleteMoodEntry,
    isLoading: (!data && (isLoading || isFetching))
  } as const;
}
