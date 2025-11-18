import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { MedicationDose } from '@/shared/types';
import * as serverApi from '@/core/services/server-api';

interface UseDosesRangeOptions {
  medicationId: string;
  startTime: number;
  endTime: number;
}

export function useDosesRange({ medicationId, startTime, endTime }: UseDosesRangeOptions) {
  const { data: allDoses = [], isLoading } = useQuery({
    queryKey: ['doses', medicationId],
    queryFn: () => serverApi.fetchDoses(medicationId),
    staleTime: 1000 * 60, // 1 minute
  });

  const doses = useMemo(() => {
    return allDoses
      .filter(dose => dose.timestamp >= startTime && dose.timestamp <= endTime)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [allDoses, startTime, endTime]);

  return {
    doses,
    isLoading,
    count: doses.length
  } as const;
}

export function useDosesRangeMultiple(
  medicationIds: string[],
  startTime: number,
  endTime: number
) {
  // Fetch all doses (no medication filter)
  const { data: allDoses = [], isLoading } = useQuery({
    queryKey: ['doses'],
    queryFn: () => serverApi.fetchDoses(),
    staleTime: 1000 * 60, // 1 minute
  });

  const doses = useMemo(() => {
    if (medicationIds.length === 0) return [];

    return allDoses
      .filter(dose => 
        medicationIds.includes(dose.medicationId) &&
        dose.timestamp >= startTime && 
        dose.timestamp <= endTime
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [allDoses, medicationIds, startTime, endTime]);

  return {
    doses,
    isLoading,
    count: doses.length
  } as const;
}
