import { useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import type { MoodEntry } from '@/shared/types';
import * as serverApi from '@/core/services/server-api';

interface MoodEntryCreateInput extends Omit<MoodEntry, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: number;
}

interface MoodEntryUpdateInput extends Partial<Omit<MoodEntry, 'id' | 'createdAt'>> {
  createdAt?: number;
}

export function useMoodEntries() {
  const queryClient = useQueryClient();

  // Fetch mood entries from server
  const { data: allMoodEntries = [], isLoading, error } = useQuery({
    queryKey: ['moodEntries'],
    queryFn: () => serverApi.fetchMoodEntries(),
    staleTime: 1000 * 60, // 1 minute
  });

  // Sort by timestamp descending (most recent first)
  const moodEntries = [...allMoodEntries].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const createMutation = useMutation({
    mutationFn: (payload: MoodEntryCreateInput) => {
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
      return serverApi.createMoodEntry(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moodEntries'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: MoodEntryUpdateInput }) => {
      return serverApi.updateMoodEntry(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moodEntries'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => serverApi.deleteMoodEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moodEntries'] });
    },
  });

  const createMoodEntry = useCallback(async (payload: MoodEntryCreateInput) => {
    return createMutation.mutateAsync(payload);
  }, [createMutation]);

  const updateMoodEntry = useCallback(async (id: string, updates: MoodEntryUpdateInput) => {
    await updateMutation.mutateAsync({ id, updates });
  }, [updateMutation]);

  const deleteMoodEntry = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  return {
    moodEntries,
    createMoodEntry,
    updateMoodEntry,
    deleteMoodEntry,
    isLoading,
    error,
  } as const;
}
