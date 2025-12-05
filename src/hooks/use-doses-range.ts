import { useMemo } from 'react';
import type { MedicationDose } from '@/shared/types';
import { useAppDataSnapshot } from '@/hooks/use-app-data-store';

interface UseDosesRangeOptions {
  medicationId: string;
  startTime: number;
  endTime: number;
}

export function useDosesRange({ medicationId, startTime, endTime }: UseDosesRangeOptions) {
  const { data, isLoading, isFetching } = useAppDataSnapshot();
  const allDoses = data?.doses ?? [];

  const doses = useMemo(() => {
    return allDoses
      .filter((dose) => dose.medicationId === medicationId && dose.timestamp >= startTime && dose.timestamp <= endTime)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [allDoses, medicationId, startTime, endTime]);

  return {
    doses,
    isLoading: (!data && (isLoading || isFetching)),
    count: doses.length
  } as const;
}

export function useDosesRangeMultiple(
  medicationIds: string[],
  startTime: number,
  endTime: number
) {
  const { data, isLoading, isFetching } = useAppDataSnapshot();
  const allDoses = data?.doses ?? [];

  const doses = useMemo(() => {
    if (medicationIds.length === 0) return [] as MedicationDose[];

    const set = new Set(medicationIds);
    return allDoses
      .filter((dose) => set.has(dose.medicationId) && dose.timestamp >= startTime && dose.timestamp <= endTime)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [allDoses, medicationIds, startTime, endTime]);

  return {
    doses,
    isLoading: (!data && (isLoading || isFetching)),
    count: doses.length
  } as const;
}
