import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { Medication, MedicationDose } from '@/shared/types';
import { pkCache } from '../utils/pharmacokinetics-cache';

interface ConcentrationDataParams {
  medication: Medication;
  doses: MedicationDose[];
  startTime: number;
  endTime: number;
  points?: number;
  bodyWeight?: number;
}

interface ConcentrationDataPoint {
  time: number;
  timestamp: number;
  concentration: number | null;
}

export function useConcentrationCurve({
  medication,
  doses,
  startTime,
  endTime,
  points = 100,
  bodyWeight = 70
}: ConcentrationDataParams) {
  const queryKey = [
    'concentration-curve',
    medication.id,
    doses.map(d => `${d.id}:${d.timestamp}:${d.doseAmount}`).join('|'),
    startTime,
    endTime,
    points,
    bodyWeight
  ];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<ConcentrationDataPoint[]> => {
      const curve = pkCache.getCurve(medication, doses, startTime, endTime, points, bodyWeight);

      return curve.map(point => ({
        time: point.time,
        timestamp: point.time,
        concentration: point.concentration > 0.001 ? point.concentration : null
      }));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error
  };
}

export function useConcentrationPoint(
  medication: Medication,
  doses: MedicationDose[],
  targetTime: number,
  bodyWeight: number = 70
) {
  const queryKey = [
    'concentration-point',
    medication.id,
    doses.map(d => `${d.id}:${d.timestamp}:${d.doseAmount}`).join('|'),
    targetTime,
    bodyWeight
  ];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return pkCache.getConcentration(medication, doses, targetTime, bodyWeight);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  return {
    concentration: query.data ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error
  };
}

export function useInvalidateConcentrationCache() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    pkCache.invalidate();
    queryClient.invalidateQueries({ queryKey: ['concentration-curve'] });
    queryClient.invalidateQueries({ queryKey: ['concentration-point'] });
  }, [queryClient]);

  const invalidateMedication = useCallback((medicationId: string) => {
    pkCache.invalidate(medicationId);
    queryClient.invalidateQueries({
      queryKey: ['concentration-curve'],
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[1] === medicationId;
      }
    });
    queryClient.invalidateQueries({
      queryKey: ['concentration-point'],
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[1] === medicationId;
      }
    });
  }, [queryClient]);

  return {
    invalidateAll,
    invalidateMedication
  };
}
