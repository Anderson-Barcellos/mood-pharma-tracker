import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/database/db';
import type { MoodEntry } from '@/shared/types';
import { scheduleServerSync } from '@/core/services/server-sync';

interface MoodEntryCreateInput extends Omit<MoodEntry, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: number;
}

interface MoodEntryUpdateInput extends Partial<Omit<MoodEntry, 'id' | 'createdAt'>> {
  createdAt?: number;
}

export function useMoodEntries() {
  const queryResult = useLiveQuery(async () => {
    const records = await db.moodEntries.orderBy('timestamp').reverse().toArray();
    return records ?? [];
  }, []);

  const moodEntries = queryResult ?? [];

  const createMoodEntry = useCallback(async (payload: MoodEntryCreateInput) => {
    const timestamp = payload.timestamp ?? Date.now();
    const record: MoodEntry = {
      id: payload.id ?? uuidv4(),
      timestamp,
      moodScore: payload.moodScore,
      anxietyLevel: payload.anxietyLevel,
      energyLevel: payload.energyLevel,
      focusLevel: payload.focusLevel,
      sensitivityLevel: payload.sensitivityLevel,
      motivationLevel: payload.motivationLevel,
      notes: payload.notes,
      createdAt: payload.createdAt ?? timestamp
    };

    await db.moodEntries.put(record);
    scheduleServerSync('mood:create');
    return record;
  }, []);

  const updateMoodEntry = useCallback(async (id: string, updates: MoodEntryUpdateInput) => {
    await db.moodEntries.update(id, updates);
    scheduleServerSync('mood:update');
  }, []);

  const deleteMoodEntry = useCallback(async (id: string) => {
    await db.moodEntries.delete(id);
    scheduleServerSync('mood:delete');
  }, []);

  return {
    moodEntries,
    createMoodEntry,
    updateMoodEntry,
    deleteMoodEntry,
    isLoading: queryResult === undefined
  } as const;
}
