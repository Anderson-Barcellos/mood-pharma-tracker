/**
 * Chronic Analysis - Analysis for medications in long-term use (SSRIs, etc.)
 *
 * For patients on chronic medication therapy, the steady-state is established,
 * but mood variations still occur in windows of 3-4 days due to:
 * - Adherence variations
 * - Circadian rhythms
 * - External stressors
 * - Drug interactions
 *
 * This module provides analysis specifically for chronic medication users.
 */

import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import { StatisticsEngine } from './statistics-engine';

// ============================================
// Types
// ============================================

export interface ChronicEffectAnalysis {
  medication: string;
  medicationId: string;
  windowDays: number;
  baselineMood: number;
  baselineStdDev: number;
  recentMean: number;
  recentStdDev: number;
  deviation: number; // Recent mean - baseline
  deviationPercent: number;
  adherenceScore: number; // 0-100%
  expectedDosesInWindow: number;
  actualDosesInWindow: number;
  correlationWithAdherence: number | null;
  trend: 'improving' | 'stable' | 'declining';
  interpretation: string;
}

export interface AdherencePattern {
  medication: string;
  medicationId: string;
  last7Days: number;
  last14Days: number;
  last30Days: number;
  averageTimeBetweenDoses: number; // hours
  stdDevTimeBetweenDoses: number;
  consistency: 'excellent' | 'good' | 'fair' | 'poor';
  missedDoseEstimate: number;
  interpretation: string;
}

export interface TemporalMoodPattern {
  metric: 'mood' | 'anxiety' | 'energy' | 'focus' | 'cognition';
  metricLabel: string;
  patterns: {
    morningMean: number | null;
    afternoonMean: number | null;
    eveningMean: number | null;
    nightMean: number | null;
    weekdayMean: number | null;
    weekendMean: number | null;
    bestTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | null;
    weekdayVsWeekendDiff: number | null;
  };
  sampleSizes: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
    weekday: number;
    weekend: number;
  };
}

// ============================================
// Constants
// ============================================

const CHRONIC_MEDICATIONS = ['SSRI', 'SNRI', 'Mood Stabilizer', 'Antipsychotic'];
const DEFAULT_WINDOW_DAYS = 4;
const MIN_DATA_POINTS = 5;

// Time of day buckets (hours)
const TIME_BUCKETS = {
  morning: [6, 12],   // 6am - 12pm
  afternoon: [12, 18], // 12pm - 6pm
  evening: [18, 22],  // 6pm - 10pm
  night: [22, 6]      // 10pm - 6am (wraps around)
};

// ============================================
// Helper Functions
// ============================================

function getTimeOfDay(timestamp: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date(timestamp).getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

function isWeekend(timestamp: number): boolean {
  const day = new Date(timestamp).getDay();
  return day === 0 || day === 6;
}

function isChronicMedication(medication: Medication): boolean {
  const medClass = medication.class || medication.category || 'Other';
  return CHRONIC_MEDICATIONS.includes(medClass);
}

// ============================================
// Main Analysis Functions
// ============================================

/**
 * Analyze medication effect in sliding windows for chronic users
 */
export function analyzeChronicEffect(
  medication: Medication,
  doses: MedicationDose[],
  moodEntries: MoodEntry[],
  windowDays: number = DEFAULT_WINDOW_DAYS
): ChronicEffectAnalysis | null {
  const medDoses = doses.filter(d => d.medicationId === medication.id);
  const now = Date.now();

  if (medDoses.length < 3 || moodEntries.length < MIN_DATA_POINTS) {
    return null;
  }

  // Calculate baseline (last 30 days, excluding most recent window)
  const baselineStart = now - 30 * 24 * 60 * 60 * 1000;
  const windowStart = now - windowDays * 24 * 60 * 60 * 1000;

  const baselineMoods = moodEntries.filter(
    e => e.timestamp >= baselineStart && e.timestamp < windowStart
  );
  const recentMoods = moodEntries.filter(
    e => e.timestamp >= windowStart && e.timestamp <= now
  );

  if (baselineMoods.length < MIN_DATA_POINTS || recentMoods.length < 2) {
    return null;
  }

  // Calculate statistics
  const baselineScores = baselineMoods.map(m => m.moodScore);
  const recentScores = recentMoods.map(m => m.moodScore);

  const baselineStats = StatisticsEngine.descriptiveStats(baselineScores);
  const recentStats = StatisticsEngine.descriptiveStats(recentScores);

  // Calculate adherence in window
  const windowDoses = medDoses.filter(
    d => d.timestamp >= windowStart && d.timestamp <= now
  );

  // Assume daily dosing for chronic medications
  const expectedDoses = windowDays;
  const actualDoses = windowDoses.length;
  const adherenceScore = Math.min(100, (actualDoses / expectedDoses) * 100);

  // Calculate deviation
  const deviation = recentStats.mean - baselineStats.mean;
  const deviationPercent = baselineStats.mean > 0 
    ? (deviation / baselineStats.mean) * 100 
    : 0;

  // Determine trend
  let trend: 'improving' | 'stable' | 'declining';
  if (deviation > baselineStats.stdDev * 0.5) {
    trend = 'improving';
  } else if (deviation < -baselineStats.stdDev * 0.5) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  // Try to correlate mood with adherence (simplified)
  let correlationWithAdherence: number | null = null;

  // Generate interpretation
  let interpretation = '';
  if (trend === 'declining' && adherenceScore < 80) {
    interpretation = `Seu humor caiu ${Math.abs(deviationPercent).toFixed(0)}% nos últimos ${windowDays} dias. ` +
      `A adesão ao ${medication.name} está em ${adherenceScore.toFixed(0)}% - ` +
      `doses perdidas podem estar afetando o efeito terapêutico.`;
  } else if (trend === 'declining') {
    interpretation = `Seu humor caiu ${Math.abs(deviationPercent).toFixed(0)}% nos últimos ${windowDays} dias, ` +
      `mesmo com boa adesão. Considere outros fatores (estresse, sono, etc.).`;
  } else if (trend === 'improving') {
    interpretation = `Seu humor melhorou ${deviationPercent.toFixed(0)}% nos últimos ${windowDays} dias. ` +
      `Continue mantendo a adesão ao tratamento.`;
  } else {
    interpretation = `Seu humor está estável nos últimos ${windowDays} dias ` +
      `(variação de ${deviationPercent.toFixed(0)}%). Tratamento seguindo como esperado.`;
  }

  return {
    medication: medication.name,
    medicationId: medication.id,
    windowDays,
    baselineMood: baselineStats.mean,
    baselineStdDev: baselineStats.stdDev,
    recentMean: recentStats.mean,
    recentStdDev: recentStats.stdDev,
    deviation,
    deviationPercent,
    adherenceScore,
    expectedDosesInWindow: expectedDoses,
    actualDosesInWindow: actualDoses,
    correlationWithAdherence,
    trend,
    interpretation
  };
}

/**
 * Analyze medication adherence patterns
 */
export function analyzeAdherence(
  medication: Medication,
  doses: MedicationDose[]
): AdherencePattern | null {
  const medDoses = doses
    .filter(d => d.medicationId === medication.id)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (medDoses.length < 3) return null;

  const now = Date.now();
  const day7 = now - 7 * 24 * 60 * 60 * 1000;
  const day14 = now - 14 * 24 * 60 * 60 * 1000;
  const day30 = now - 30 * 24 * 60 * 60 * 1000;

  // Count doses in each period
  const last7Days = medDoses.filter(d => d.timestamp >= day7).length;
  const last14Days = medDoses.filter(d => d.timestamp >= day14).length;
  const last30Days = medDoses.filter(d => d.timestamp >= day30).length;

  // Calculate time between doses
  const timeBetweenDoses: number[] = [];
  for (let i = 1; i < medDoses.length; i++) {
    const diff = (medDoses[i].timestamp - medDoses[i - 1].timestamp) / (1000 * 3600);
    timeBetweenDoses.push(diff);
  }

  const avgTime = timeBetweenDoses.length > 0
    ? timeBetweenDoses.reduce((a, b) => a + b, 0) / timeBetweenDoses.length
    : 24;

  const stdDev = timeBetweenDoses.length > 1
    ? Math.sqrt(
        timeBetweenDoses.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / 
        (timeBetweenDoses.length - 1)
      )
    : 0;

  // Determine consistency
  let consistency: 'excellent' | 'good' | 'fair' | 'poor';
  const adherence7d = last7Days / 7;
  if (adherence7d >= 0.95 && stdDev < 4) {
    consistency = 'excellent';
  } else if (adherence7d >= 0.8 && stdDev < 8) {
    consistency = 'good';
  } else if (adherence7d >= 0.6) {
    consistency = 'fair';
  } else {
    consistency = 'poor';
  }

  // Estimate missed doses (assuming daily)
  const missedDoseEstimate = Math.max(0, 7 - last7Days);

  // Generate interpretation
  let interpretation = '';
  switch (consistency) {
    case 'excellent':
      interpretation = `Excelente adesão ao ${medication.name}! Mantendo doses regulares com intervalo médio de ${avgTime.toFixed(1)}h.`;
      break;
    case 'good':
      interpretation = `Boa adesão ao ${medication.name}. Algumas variações no horário (±${stdDev.toFixed(1)}h), mas dentro do aceitável.`;
      break;
    case 'fair':
      interpretation = `Adesão moderada ao ${medication.name}. Cerca de ${missedDoseEstimate} dose(s) podem ter sido perdidas na última semana.`;
      break;
    case 'poor':
      interpretation = `Adesão baixa ao ${medication.name}. ${missedDoseEstimate} dose(s) perdidas na última semana pode comprometer o efeito terapêutico.`;
      break;
  }

  return {
    medication: medication.name,
    medicationId: medication.id,
    last7Days,
    last14Days,
    last30Days,
    averageTimeBetweenDoses: avgTime,
    stdDevTimeBetweenDoses: stdDev,
    consistency,
    missedDoseEstimate,
    interpretation
  };
}

/**
 * Analyze temporal mood patterns (time of day, weekday vs weekend)
 */
export function analyzeTemporalPatterns(
  moodEntries: MoodEntry[]
): TemporalMoodPattern[] {
  if (moodEntries.length < MIN_DATA_POINTS) return [];

  const patterns: TemporalMoodPattern[] = [];

  // Analyze mood score
  const moodByTime = {
    morning: [] as number[],
    afternoon: [] as number[],
    evening: [] as number[],
    night: [] as number[]
  };
  const moodByDayType = {
    weekday: [] as number[],
    weekend: [] as number[]
  };

  moodEntries.forEach(entry => {
    const timeOfDay = getTimeOfDay(entry.timestamp);
    const weekend = isWeekend(entry.timestamp);

    moodByTime[timeOfDay].push(entry.moodScore);
    moodByDayType[weekend ? 'weekend' : 'weekday'].push(entry.moodScore);
  });

  // Calculate means for each bucket
  const calcMean = (arr: number[]): number | null => 
    arr.length >= 2 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const morningMean = calcMean(moodByTime.morning);
  const afternoonMean = calcMean(moodByTime.afternoon);
  const eveningMean = calcMean(moodByTime.evening);
  const nightMean = calcMean(moodByTime.night);
  const weekdayMean = calcMean(moodByDayType.weekday);
  const weekendMean = calcMean(moodByDayType.weekend);

  // Determine best time of day
  const timeMeans: [string, number | null][] = [
    ['morning', morningMean],
    ['afternoon', afternoonMean],
    ['evening', eveningMean],
    ['night', nightMean]
  ];
  const validMeans = timeMeans.filter(([, v]) => v !== null) as [string, number][];
  const bestTimeOfDay = validMeans.length > 0
    ? validMeans.sort((a, b) => b[1] - a[1])[0][0] as 'morning' | 'afternoon' | 'evening' | 'night'
    : null;

  // Weekday vs weekend difference
  const weekdayVsWeekendDiff = weekdayMean !== null && weekendMean !== null
    ? weekendMean - weekdayMean
    : null;

  patterns.push({
    metric: 'mood',
    metricLabel: 'Humor',
    patterns: {
      morningMean,
      afternoonMean,
      eveningMean,
      nightMean,
      weekdayMean,
      weekendMean,
      bestTimeOfDay,
      weekdayVsWeekendDiff
    },
    sampleSizes: {
      morning: moodByTime.morning.length,
      afternoon: moodByTime.afternoon.length,
      evening: moodByTime.evening.length,
      night: moodByTime.night.length,
      weekday: moodByDayType.weekday.length,
      weekend: moodByDayType.weekend.length
    }
  });

  // TODO: Add analysis for other metrics (anxiety, energy, focus, cognition)

  return patterns;
}

/**
 * Generate comprehensive chronic medication report
 */
export function generateChronicReport(
  medications: Medication[],
  doses: MedicationDose[],
  moodEntries: MoodEntry[],
  windowDays: number = DEFAULT_WINDOW_DAYS
): {
  chronicAnalyses: ChronicEffectAnalysis[];
  adherencePatterns: AdherencePattern[];
  temporalPatterns: TemporalMoodPattern[];
  chronicMedications: string[];
} {
  // Filter to chronic medications only
  const chronicMeds = medications.filter(isChronicMedication);

  // Generate analyses
  const chronicAnalyses: ChronicEffectAnalysis[] = [];
  const adherencePatterns: AdherencePattern[] = [];

  chronicMeds.forEach(med => {
    const chronicAnalysis = analyzeChronicEffect(med, doses, moodEntries, windowDays);
    if (chronicAnalysis) {
      chronicAnalyses.push(chronicAnalysis);
    }

    const adherencePattern = analyzeAdherence(med, doses);
    if (adherencePattern) {
      adherencePatterns.push(adherencePattern);
    }
  });

  // Generate temporal patterns
  const temporalPatterns = analyzeTemporalPatterns(moodEntries);

  return {
    chronicAnalyses,
    adherencePatterns,
    temporalPatterns,
    chronicMedications: chronicMeds.map(m => m.name)
  };
}

export default {
  analyzeChronicEffect,
  analyzeAdherence,
  analyzeTemporalPatterns,
  generateChronicReport
};
