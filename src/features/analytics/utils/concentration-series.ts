import type { Medication, MedicationDose } from '@/shared/types';
import { calculateConcentration, isChronicMedication } from './pharmacokinetics';

const HOUR_MS = 60 * 60 * 1000;

export type ConcentrationSeriesMode = 'instant' | 'trend';

export function getDefaultConcentrationMode(medication: Medication): ConcentrationSeriesMode {
  // For chronic meds (SSRI/SNRI/Mood Stabilizer/Antipsychotic), trend is usually what
  // correlates with mood (days-scale), not peaks.
  return isChronicMedication(medication) ? 'trend' : 'instant';
}

export function getTrendWindowMs(medication: Medication): number {
  // Matches PKChart's intent:
  // - Chronic: 48h moving average (shows true level changes)
  // - Acute: smoother over a few half-lives
  const hours = isChronicMedication(medication) ? 48 : Math.max(6, 3.5 * medication.halfLife);
  return Math.round(hours * HOUR_MS);
}

export function sampleConcentrationAtTimes(
  medication: Medication,
  doses: MedicationDose[],
  timestamps: number[],
  bodyWeight: number = 70,
  minNonZero: number = 0.01
): Array<number | null> {
  return timestamps.map((t) => {
    const conc = calculateConcentration(medication, doses, t, bodyWeight);
    return conc > minNonZero ? conc : null;
  });
}

export function computeTrendFromSamples(
  timestamps: number[],
  values: Array<number | null>,
  windowMs: number,
  minPoints: number = 3
): Array<number | null> {
  // Works for irregular timestamps (we keep points within [t-windowMs, t])
  const result: Array<number | null> = new Array(values.length).fill(null);

  type Point = { t: number; v: number };
  const window: Point[] = [];
  let sum = 0;

  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    const v = values[i];

    if (typeof v === 'number' && Number.isFinite(v)) {
      window.push({ t, v });
      sum += v;
    }

    const cutoff = t - windowMs;
    while (window.length > 0 && window[0].t < cutoff) {
      const removed = window.shift()!;
      sum -= removed.v;
    }

    if (window.length >= minPoints) {
      result[i] = sum / window.length;
    }
  }

  return result;
}

export function sampleTrendConcentrationAtTimes(
  medication: Medication,
  doses: MedicationDose[],
  timestamps: number[],
  bodyWeight: number = 70
): Array<number | null> {
  const windowMs = getTrendWindowMs(medication);
  const raw = sampleConcentrationAtTimes(medication, doses, timestamps, bodyWeight);
  return computeTrendFromSamples(timestamps, raw, windowMs, 3);
}

