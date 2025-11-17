import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/database/db';
import type { MedicationDose } from '@/shared/types';

interface UseDosesRangeOptions {
  medicationId: string;
  startTime: number;
  endTime: number;
}

export function useDosesRange({ medicationId, startTime, endTime }: UseDosesRangeOptions) {
  const queryResult = useLiveQuery(
    async () => {
      const doses = await db.doses
        .where('[medicationId+timestamp]')
        .between(
          [medicationId, startTime],
          [medicationId, endTime],
          true,
          true
        )
        .toArray();

      return doses.sort((a, b) => a.timestamp - b.timestamp);
    },
    [medicationId, startTime, endTime]
  );

  const doses = useMemo(() => queryResult ?? [], [queryResult]);

  return {
    doses,
    isLoading: queryResult === undefined,
    count: doses.length
  } as const;
}

export function useDosesRangeMultiple(
  medicationIds: string[],
  startTime: number,
  endTime: number
) {
  const queryResult = useLiveQuery(
    async () => {
      if (medicationIds.length === 0) return [];

      const allDoses = await Promise.all(
        medicationIds.map(medicationId =>
          db.doses
            .where('[medicationId+timestamp]')
            .between(
              [medicationId, startTime],
              [medicationId, endTime],
              true,
              true
            )
            .toArray()
        )
      );

      return allDoses.flat().sort((a, b) => a.timestamp - b.timestamp);
    },
    [medicationIds.join(','), startTime, endTime]
  );

  const doses = useMemo(() => queryResult ?? [], [queryResult]);

  return {
    doses,
    isLoading: queryResult === undefined,
    count: doses.length
  } as const;
}
