/**
 * Insights Generator - Generates actionable insights from medication and mood data
 *
 * This module provides:
 * - Ranking of medication impacts on mood metrics
 * - Red flags detection for concerning patterns
 * - Stability metrics calculation
 * - Temporal pattern analysis
 */

import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import { StatisticsEngine } from './statistics-engine';
import {
  getDefaultConcentrationMode,
  sampleConcentrationAtTimes,
  sampleTrendConcentrationAtTimes,
} from './concentration-series';
import { isChronicMedication, calculateConcentration } from './pharmacokinetics';

// ============================================
// Types
// ============================================

export type MoodMetric = 'humor' | 'ansiedade' | 'energia' | 'foco' | 'cognicao' | 'attShift';

export interface ActionableInsight {
  id: string;
  medication: string;
  medicationId: string;
  metric: MoodMetric;
  metricLabel: string;
  correlation: number;
  pValue: number;
  sampleSize?: number;
  lagHours?: number;
  method?: 'pearson' | 'spearman';
  significance: 'high' | 'medium' | 'low' | 'none';
  direction: 'positive' | 'negative';
  impactScore: number; // Absolute correlation * -log10(pValue) for ranking
  recommendation: string;
  interpretation: string;
  isDesirable: boolean; // For anxiety, negative correlation is good
}

export interface RedFlag {
  id: string;
  type: 'mood_low' | 'anxiety_high' | 'adherence' | 'cognitive_decline' | 'energy_low' | 'volatility';
  severity: 'warning' | 'alert';
  title: string;
  description: string;
  metric?: MoodMetric;
  value?: number;
  threshold?: number;
  daysAffected: number;
  suggestion: string;
}

export interface StabilityMetrics {
  metric: MoodMetric;
  metricLabel: string;
  mean: number;
  standardDeviation: number;
  coefficientOfVariation: number;
  stability: 'stable' | 'variable' | 'volatile';
  trend7d: number;
  trend30d: number;
  dataPoints: number;
}

export interface TemporalPattern {
  metric: MoodMetric;
  bestTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | null;
  weekdayVsWeekend: {
    weekdayMean: number;
    weekendMean: number;
    difference: number;
    significant: boolean;
  } | null;
}

export interface InsightsReport {
  generatedAt: number;
  timeframeStart: number;
  timeframeEnd: number;
  dataQuality: {
    moodEntries: number;
    doses: number;
    medications: number;
    coverage: number; // percentage of days with data
  };

  // Main insights
  topPositiveImpacts: ActionableInsight[];
  topNegativeImpacts: ActionableInsight[];
  allInsights: ActionableInsight[];

  // Warnings
  redFlags: RedFlag[];

  // Metrics
  stabilityMetrics: StabilityMetrics[];
  temporalPatterns: TemporalPattern[];
}

// ============================================
// Constants
// ============================================

export const METRIC_LABELS: Record<MoodMetric, string> = {
  humor: 'Humor',
  ansiedade: 'Ansiedade',
  energia: 'Energia',
  foco: 'Foco',
  cognicao: 'Cognição',
  attShift: 'Flexibilidade Atencional'
};

// For these metrics, HIGHER is BETTER
const POSITIVE_IS_GOOD: MoodMetric[] = ['humor', 'energia', 'foco', 'cognicao', 'attShift'];
// For these metrics, LOWER is BETTER
const NEGATIVE_IS_GOOD: MoodMetric[] = ['ansiedade'];

// Red flag thresholds
const RED_FLAG_THRESHOLDS = {
  mood_low: { value: 4, days: 3 },
  anxiety_high: { value: 7, days: 2 },
  energy_low: { value: 3, days: 3 },
  cognitive_decline: { stdDevs: 2 },
  volatility: { cv: 0.4 } // Coefficient of variation > 40%
};

// ============================================
// Helper Functions
// ============================================

function getMetricFromMoodEntry(entry: MoodEntry, metric: MoodMetric): number | undefined {
  switch (metric) {
    case 'humor': return entry.moodScore;
    case 'ansiedade': return entry.anxietyLevel;
    case 'energia': return entry.energyLevel;
    case 'foco': return entry.focusLevel;
    case 'cognicao': return entry.cognitiveScore;
    case 'attShift': return entry.attentionShift;
  }
}

function generateRecommendation(
  medName: string,
  metric: MoodMetric,
  correlation: number,
  isDesirable: boolean
): string {
  const metricLabel = METRIC_LABELS[metric].toLowerCase();

  if (isDesirable) {
    if (metric === 'ansiedade') {
      return `${medName} está associado à redução da sua ${metricLabel}. Mantenha a adesão ao tratamento.`;
    }
    return `${medName} está associado a melhor ${metricLabel}. Continue monitorando para confirmar o padrão.`;
  } else {
    if (metric === 'ansiedade') {
      return `${medName} pode estar aumentando sua ${metricLabel}. Discuta com seu médico.`;
    }
    return `${medName} pode estar afetando negativamente seu ${metricLabel}. Acompanhe os dados e converse com seu médico.`;
  }
}

function generateInterpretation(
  medName: string,
  metric: MoodMetric,
  correlation: number,
  pValue: number,
  options?: {
    lagHours?: number;
    sampleSize?: number;
    method?: 'pearson' | 'spearman';
  }
): string {
  const strength = Math.abs(correlation);
  const strengthLabel = strength > 0.7 ? 'forte' : strength > 0.4 ? 'moderada' : 'fraca';
  const direction = correlation > 0 ? 'positiva' : 'negativa';
  const confidence = pValue < 0.01 ? 'alta confiança' : pValue < 0.05 ? 'confiança moderada' : 'baixa confiança';

  const parts: string[] = [
    `Correlação ${strengthLabel} ${direction} (r=${correlation.toFixed(2)})`,
    `${confidence} (p=${pValue.toFixed(3)})`,
  ];

  if (options?.sampleSize) {
    parts.push(`n=${options.sampleSize}`);
  }
  if (options?.lagHours !== undefined && options.lagHours !== 0) {
    parts.push(`lag +${options.lagHours}h`);
  }
  if (options?.method) {
    parts.push(options.method);
  }

  return parts.join(' · ');
}

function calculateImpactScore(correlation: number, pValue: number): number {
  // Higher absolute correlation + lower p-value = higher impact score
  // Using -log10(pValue) to amplify significance
  const significanceFactor = pValue > 0 ? -Math.log10(Math.max(pValue, 0.0001)) : 4;
  return Math.abs(correlation) * significanceFactor;
}

// ============================================
// Main Generator Functions
// ============================================

export function generateMedicationInsights(
  medications: Medication[],
  doses: MedicationDose[],
  moodEntries: MoodEntry[],
  timeframeStart: number,
  timeframeEnd: number
): ActionableInsight[] {
  const insights: ActionableInsight[] = [];
  const hourMs = 60 * 60 * 1000;

  // Filter data to timeframe
  const filteredMoods = moodEntries.filter(e => e.timestamp >= timeframeStart && e.timestamp <= timeframeEnd);

  if (filteredMoods.length < 5) return insights;

  // Build hourly data for each medication
  medications.forEach(medication => {
    // Include a lookback so concentrations at the start of the window aren't artificially low
    // (important for chronic meds and long half-lives).
    const lookbackMs = Math.max(7 * 24 * hourMs, medication.halfLife * 5 * hourMs);
    const medDoses = doses.filter(d =>
      d.medicationId === medication.id &&
      d.timestamp <= timeframeEnd &&
      d.timestamp >= (timeframeStart - lookbackMs)
    );
    if (medDoses.length < 2) return;

    const startHour = Math.floor(timeframeStart / hourMs) * hourMs;
    const endHour = Math.ceil(timeframeEnd / hourMs) * hourMs;
    const concentrationTimestamps: number[] = [];
    for (let t = startHour; t <= endHour; t += hourMs) concentrationTimestamps.push(t);

    const mode = getDefaultConcentrationMode(medication);
    const concentrationSeries = mode === 'trend'
      ? sampleTrendConcentrationAtTimes(medication, medDoses, concentrationTimestamps, 70)
      : sampleConcentrationAtTimes(medication, medDoses, concentrationTimestamps, 70);

    const concentrationAligned: number[] = concentrationSeries.map((v) =>
      typeof v === 'number' && Number.isFinite(v) && v > 0.01 ? v : Number.NaN
    );

    // Calculate correlation for each mood metric
    const metrics: MoodMetric[] = ['humor', 'ansiedade', 'energia', 'foco', 'cognicao', 'attShift'];

    metrics.forEach(metric => {
      // Build hourly metric series aligned to the concentration timestamps.
      const metricByHour = new Map<number, number[]>();
      for (const entry of filteredMoods) {
        const metricValue = getMetricFromMoodEntry(entry, metric);
        if (metricValue === undefined || !Number.isFinite(metricValue)) continue;
        const hourKey = Math.floor(entry.timestamp / hourMs) * hourMs;
        if (!metricByHour.has(hourKey)) metricByHour.set(hourKey, []);
        metricByHour.get(hourKey)!.push(metricValue);
      }

      const metricAligned: number[] = concentrationTimestamps.map((t) => {
        const values = metricByHour.get(t);
        if (!values || values.length === 0) return Number.NaN;
        return values.reduce((a, b) => a + b, 0) / values.length;
      });

      const minPairs = 5;

      const isChronic = isChronicMedication(medication);
      const candidateLagsHours = isChronic ? [24, 48] : [0, 1, 2, 4, 6];
      const maxLag = Math.max(...candidateLagsHours);

      const cross = StatisticsEngine.crossCorrelation(
        concentrationAligned,
        metricAligned,
        maxLag,
        minPairs,
        {
          method: 'spearman',
          transform: 'levels',
        }
      );

      const pickBest = (lags: number[]) => {
        const points = lags
          .map((lag) => cross.find((p) => p.lag === lag))
          .filter((p): p is NonNullable<typeof p> => Boolean(p));
        if (points.length === 0) return null;
        return points.reduce((best, curr) => (Math.abs(curr.correlation) > Math.abs(best.correlation) ? curr : best));
      };

      const best = pickBest(candidateLagsHours) ?? (isChronic ? pickBest([0]) : null);
      if (!best || best.n < minPairs) return;

      const result = {
        value: best.correlation,
        pValue: best.pValue,
        significance: best.significance,
        sampleSize: best.n,
        lagHours: best.lag,
        method: 'spearman' as const,
      };

      // Determine if this correlation is desirable
      const isNegativeGood = NEGATIVE_IS_GOOD.includes(metric);
      const isDesirable = isNegativeGood
        ? result.value < 0 // For anxiety, negative correlation is good
        : result.value > 0; // For others, positive is good

      const insight: ActionableInsight = {
        id: `${medication.id}-${metric}`,
        medication: medication.name,
        medicationId: medication.id,
        metric,
        metricLabel: METRIC_LABELS[metric],
        correlation: result.value,
        pValue: result.pValue ?? 1,
        sampleSize: result.sampleSize,
        lagHours: result.lagHours,
        method: result.method,
        significance: result.significance === 'high' ? 'high'
          : result.significance === 'medium' ? 'medium'
          : result.significance === 'low' ? 'low' : 'none',
        direction: result.value > 0 ? 'positive' : 'negative',
        impactScore: calculateImpactScore(result.value, result.pValue ?? 1),
        recommendation: generateRecommendation(medication.name, metric, result.value, isDesirable),
        interpretation: generateInterpretation(medication.name, metric, result.value, result.pValue ?? 1, {
          lagHours: result.lagHours,
          sampleSize: result.sampleSize,
          method: result.method,
        }),
        isDesirable
      };

      insights.push(insight);
    });
  });

  // Sort by impact score
  return insights.sort((a, b) => b.impactScore - a.impactScore);
}

export function detectRedFlags(
  moodEntries: MoodEntry[],
  doses: MedicationDose[],
  medications: Medication[],
  timeframeEnd: number = Date.now()
): RedFlag[] {
  const flags: RedFlag[] = [];
  const last7Days = timeframeEnd - 7 * 24 * 60 * 60 * 1000;
  const recentEntries = moodEntries.filter(e => e.timestamp >= last7Days && e.timestamp <= timeframeEnd);

  if (recentEntries.length < 3) return flags;

  // Sort by timestamp
  const sortedEntries = [...recentEntries].sort((a, b) => b.timestamp - a.timestamp);

  // Check for persistent low mood
  const lowMoodDays = sortedEntries.filter(e => e.moodScore <= RED_FLAG_THRESHOLDS.mood_low.value);
  if (lowMoodDays.length >= RED_FLAG_THRESHOLDS.mood_low.days) {
    flags.push({
      id: 'mood-low-persistent',
      type: 'mood_low',
      severity: lowMoodDays.length >= 5 ? 'alert' : 'warning',
      title: 'Humor Baixo Persistente',
      description: `Seu humor está abaixo de ${RED_FLAG_THRESHOLDS.mood_low.value}/10 há ${lowMoodDays.length} registros recentes.`,
      metric: 'humor',
      value: lowMoodDays.reduce((sum, e) => sum + e.moodScore, 0) / lowMoodDays.length,
      threshold: RED_FLAG_THRESHOLDS.mood_low.value,
      daysAffected: lowMoodDays.length,
      suggestion: 'Considere conversar com seu médico sobre seu humor. Tente identificar fatores contribuintes.'
    });
  }

  // Check for high anxiety
  const highAnxietyEntries = sortedEntries.filter(e =>
    e.anxietyLevel !== undefined && e.anxietyLevel >= RED_FLAG_THRESHOLDS.anxiety_high.value
  );
  if (highAnxietyEntries.length >= RED_FLAG_THRESHOLDS.anxiety_high.days) {
    flags.push({
      id: 'anxiety-high-persistent',
      type: 'anxiety_high',
      severity: highAnxietyEntries.length >= 4 ? 'alert' : 'warning',
      title: 'Ansiedade Elevada',
      description: `Sua ansiedade está acima de ${RED_FLAG_THRESHOLDS.anxiety_high.value}/10 há ${highAnxietyEntries.length} registros.`,
      metric: 'ansiedade',
      value: highAnxietyEntries.reduce((sum, e) => sum + (e.anxietyLevel ?? 0), 0) / highAnxietyEntries.length,
      threshold: RED_FLAG_THRESHOLDS.anxiety_high.value,
      daysAffected: highAnxietyEntries.length,
      suggestion: 'Pratique técnicas de relaxamento. Se persistir, converse com seu médico sobre ajuste de medicação.'
    });
  }

  // Check for low energy
  const lowEnergyEntries = sortedEntries.filter(e =>
    e.energyLevel !== undefined && e.energyLevel <= RED_FLAG_THRESHOLDS.energy_low.value
  );
  if (lowEnergyEntries.length >= RED_FLAG_THRESHOLDS.energy_low.days) {
    flags.push({
      id: 'energy-low-persistent',
      type: 'energy_low',
      severity: 'warning',
      title: 'Energia Baixa Persistente',
      description: `Sua energia está abaixo de ${RED_FLAG_THRESHOLDS.energy_low.value}/10 há ${lowEnergyEntries.length} registros.`,
      metric: 'energia',
      value: lowEnergyEntries.reduce((sum, e) => sum + (e.energyLevel ?? 0), 0) / lowEnergyEntries.length,
      threshold: RED_FLAG_THRESHOLDS.energy_low.value,
      daysAffected: lowEnergyEntries.length,
      suggestion: 'Verifique qualidade do sono e alimentação. Pode indicar necessidade de ajuste em medicação estimulante.'
    });
  }

  // Check for mood volatility (high coefficient of variation)
  const moodValues = sortedEntries.map(e => e.moodScore);
  if (moodValues.length >= 5) {
    const stats = StatisticsEngine.descriptiveStats(moodValues);
    const cv = stats.stdDev / stats.mean;
    if (cv > RED_FLAG_THRESHOLDS.volatility.cv) {
      flags.push({
        id: 'mood-volatile',
        type: 'volatility',
        severity: cv > 0.5 ? 'alert' : 'warning',
        title: 'Variabilidade de Humor Alta',
        description: `Seu humor está muito variável (CV=${(cv * 100).toFixed(0)}%). Oscilações frequentes podem indicar instabilidade.`,
        metric: 'humor',
        value: cv,
        threshold: RED_FLAG_THRESHOLDS.volatility.cv,
        daysAffected: moodValues.length,
        suggestion: 'Tente identificar gatilhos para as oscilações. Estabilizadores de humor podem ajudar se o padrão persistir.'
      });
    }
  }

  // Check for cognitive decline (if we have enough data)
  const cognitionValues = sortedEntries
    .filter(e => e.cognitiveScore !== undefined)
    .map(e => e.cognitiveScore!);

  if (cognitionValues.length >= 5) {
    const recentMean = cognitionValues.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const olderMean = cognitionValues.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const stats = StatisticsEngine.descriptiveStats(cognitionValues);

    if (recentMean < olderMean - RED_FLAG_THRESHOLDS.cognitive_decline.stdDevs * stats.stdDev) {
      flags.push({
        id: 'cognitive-decline',
        type: 'cognitive_decline',
        severity: 'warning',
        title: 'Possível Declínio Cognitivo',
        description: `Sua cognição recente (${recentMean.toFixed(1)}) está abaixo da média anterior (${olderMean.toFixed(1)}).`,
        metric: 'cognicao',
        value: recentMean,
        threshold: olderMean,
        daysAffected: 3,
        suggestion: 'Avalie qualidade do sono e estresse. Se persistir, pode indicar efeito de medicação.'
      });
    }
  }

  // Check medication adherence (simplified - just looking at dose frequency)
  medications.forEach(med => {
    const medDoses = doses.filter(d =>
      d.medicationId === med.id &&
      d.timestamp >= last7Days &&
      d.timestamp <= timeframeEnd
    );

    // Assume daily dosing - if less than 5 doses in 7 days, flag it
    if (medDoses.length < 5 && medDoses.length > 0) {
      flags.push({
        id: `adherence-${med.id}`,
        type: 'adherence',
        severity: medDoses.length < 3 ? 'alert' : 'warning',
        title: `Adesão Baixa: ${med.name}`,
        description: `Apenas ${medDoses.length} doses de ${med.name} registradas nos últimos 7 dias.`,
        daysAffected: 7 - medDoses.length,
        suggestion: 'Manter regularidade na medicação é importante para efeito terapêutico consistente.'
      });
    }
  });

  return flags;
}

export function calculateStabilityMetrics(
  moodEntries: MoodEntry[],
  timeframeStart: number,
  timeframeEnd: number
): StabilityMetrics[] {
  const metrics: StabilityMetrics[] = [];
  const filteredEntries = moodEntries.filter(e => e.timestamp >= timeframeStart && e.timestamp <= timeframeEnd);

  if (filteredEntries.length < 3) return metrics;

  const moodMetrics: MoodMetric[] = ['humor', 'ansiedade', 'energia', 'foco', 'cognicao', 'attShift'];
  const now = timeframeEnd;
  const day7 = now - 7 * 24 * 60 * 60 * 1000;
  const day30 = now - 30 * 24 * 60 * 60 * 1000;

  moodMetrics.forEach(metric => {
    const values = filteredEntries
      .map(e => getMetricFromMoodEntry(e, metric))
      .filter((v): v is number => v !== undefined);

    if (values.length < 3) return;

    const stats = StatisticsEngine.descriptiveStats(values);
    const cv = stats.mean > 0 ? stats.stdDev / stats.mean : 0;

    // Calculate 7-day trend
    const recent7d = filteredEntries
      .filter(e => e.timestamp >= day7)
      .map(e => getMetricFromMoodEntry(e, metric))
      .filter((v): v is number => v !== undefined);

    const older7d = filteredEntries
      .filter(e => e.timestamp < day7)
      .map(e => getMetricFromMoodEntry(e, metric))
      .filter((v): v is number => v !== undefined);

    const trend7d = recent7d.length > 0 && older7d.length > 0
      ? (recent7d.reduce((a, b) => a + b, 0) / recent7d.length) -
        (older7d.reduce((a, b) => a + b, 0) / older7d.length)
      : 0;

    // Calculate 30-day trend
    const recent30d = filteredEntries
      .filter(e => e.timestamp >= day30)
      .map(e => getMetricFromMoodEntry(e, metric))
      .filter((v): v is number => v !== undefined);

    const trend30d = recent30d.length > 0
      ? (recent30d.slice(0, Math.ceil(recent30d.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(recent30d.length / 2)) -
        (recent30d.slice(-Math.ceil(recent30d.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(recent30d.length / 2))
      : 0;

    metrics.push({
      metric,
      metricLabel: METRIC_LABELS[metric],
      mean: stats.mean,
      standardDeviation: stats.stdDev,
      coefficientOfVariation: cv,
      stability: cv < 0.2 ? 'stable' : cv < 0.4 ? 'variable' : 'volatile',
      trend7d,
      trend30d,
      dataPoints: values.length
    });
  });

  return metrics;
}

// ============================================
// Main Report Generator
// ============================================

export function generateInsightsReport(
  medications: Medication[],
  doses: MedicationDose[],
  moodEntries: MoodEntry[],
  timeframeDays?: number
): InsightsReport {
  const now = Date.now();
  
  const allTimestamps = [
    ...moodEntries.map(m => m.timestamp),
    ...doses.map(d => d.timestamp)
  ].filter(t => t > 0);
  
  const timeframeEnd = now;
  const timeframeStart = timeframeDays 
    ? now - timeframeDays * 24 * 60 * 60 * 1000
    : allTimestamps.length > 0 ? Math.min(...allTimestamps) : now;
  
  const effectiveDays = Math.ceil((timeframeEnd - timeframeStart) / (24 * 60 * 60 * 1000));

  // Calculate data quality
  const filteredMoods = moodEntries.filter(e => e.timestamp >= timeframeStart && e.timestamp <= timeframeEnd);
  const filteredDoses = doses.filter(d => d.timestamp >= timeframeStart && d.timestamp <= timeframeEnd);
  const uniqueDays = new Set(filteredMoods.map(e => Math.floor(e.timestamp / (24 * 60 * 60 * 1000)))).size;

  // Generate all insights
  const allInsights = generateMedicationInsights(
    medications,
    doses,
    moodEntries,
    timeframeStart,
    timeframeEnd
  );

  // Filter to significant insights only (p < 0.1 for exploratory)
  const significantInsights = allInsights.filter(i => i.pValue < 0.1);

  // Split into positive and negative impacts
  const topPositiveImpacts = significantInsights
    .filter(i => i.isDesirable)
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 5);

  const topNegativeImpacts = significantInsights
    .filter(i => !i.isDesirable)
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 5);

  // Detect red flags
  const redFlags = detectRedFlags(moodEntries, doses, medications, timeframeEnd);

  // Calculate stability metrics
  const stabilityMetrics = calculateStabilityMetrics(moodEntries, timeframeStart, timeframeEnd);

  return {
    generatedAt: now,
    timeframeStart,
    timeframeEnd,
    dataQuality: {
      moodEntries: filteredMoods.length,
      doses: filteredDoses.length,
      medications: medications.length,
      coverage: effectiveDays > 0 ? (uniqueDays / effectiveDays) * 100 : 0
    },
    topPositiveImpacts,
    topNegativeImpacts,
    allInsights: significantInsights,
    redFlags,
    stabilityMetrics,
    temporalPatterns: [] // Will be implemented in chronic-analysis.ts
  };
}

// ============================================
// Temporal Adherence Analysis
// ============================================

export interface TemporalAdherenceMetrics {
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  totalDoses: number;
  onTimeDoses: number; // Within 30 min tolerance
  lateDoses: number;
  earlyDoses: number;
  averageDeviationMinutes: number;
  adherenceScore: number; // 0-100
  pattern: 'consistent' | 'variable' | 'irregular';
  recentTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  deviations: {
    timestamp: number;
    deviationMinutes: number;
    moodAfter?: number;
  }[];
  correlation?: {
    deviationVsMood: number;
    significance: string;
  };
}

function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function getTimeFromTimestamp(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}

function calculateDeviationMinutes(doseTime: number, scheduledMinutes: number): number {
  let diff = doseTime - scheduledMinutes;
  if (diff > 720) diff -= 1440;
  if (diff < -720) diff += 1440;
  return diff;
}

export function calculateTemporalAdherence(
  medications: Medication[],
  doses: MedicationDose[],
  moodEntries: MoodEntry[]
): TemporalAdherenceMetrics[] {
  const results: TemporalAdherenceMetrics[] = [];
  const TOLERANCE_MINUTES = 30;

  for (const med of medications) {
    if (!med.scheduledTime) continue;

    const scheduledMinutes = parseTimeToMinutes(med.scheduledTime);
    const medDoses = doses
      .filter(d => d.medicationId === med.id)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (medDoses.length < 3) continue;

    const deviations: TemporalAdherenceMetrics['deviations'] = [];
    let onTime = 0;
    let late = 0;
    let early = 0;
    let totalDeviation = 0;

    for (const dose of medDoses) {
      const doseTimeMinutes = getTimeFromTimestamp(dose.timestamp);
      const deviation = calculateDeviationMinutes(doseTimeMinutes, scheduledMinutes);

      totalDeviation += Math.abs(deviation);

      if (Math.abs(deviation) <= TOLERANCE_MINUTES) {
        onTime++;
      } else if (deviation > 0) {
        late++;
      } else {
        early++;
      }

      const moodAfterDose = moodEntries.find(m => {
        const hoursDiff = (m.timestamp - dose.timestamp) / (1000 * 60 * 60);
        return hoursDiff > 0.5 && hoursDiff < 8;
      });

      deviations.push({
        timestamp: dose.timestamp,
        deviationMinutes: deviation,
        moodAfter: moodAfterDose?.moodScore
      });
    }

    const averageDeviation = medDoses.length > 0 ? totalDeviation / medDoses.length : 0;
    const adherenceScore = Math.max(0, 100 - (averageDeviation / 60) * 20);

    let pattern: TemporalAdherenceMetrics['pattern'] = 'consistent';
    if (averageDeviation > 60) pattern = 'irregular';
    else if (averageDeviation > 30) pattern = 'variable';

    let recentTrend: TemporalAdherenceMetrics['recentTrend'] = 'insufficient_data';
    if (deviations.length >= 6) {
      const recentAvg = deviations.slice(-3).reduce((sum, d) => sum + Math.abs(d.deviationMinutes), 0) / 3;
      const olderAvg = deviations.slice(-6, -3).reduce((sum, d) => sum + Math.abs(d.deviationMinutes), 0) / 3;

      if (recentAvg < olderAvg - 10) recentTrend = 'improving';
      else if (recentAvg > olderAvg + 10) recentTrend = 'declining';
      else recentTrend = 'stable';
    }

    let correlation: TemporalAdherenceMetrics['correlation'] | undefined;
    const validPairs = deviations.filter(d => d.moodAfter !== undefined);
    if (validPairs.length >= 5) {
      const deviationValues = validPairs.map(d => Math.abs(d.deviationMinutes));
      const moodValues = validPairs.map(d => d.moodAfter!);
      const corrResult = StatisticsEngine.pearsonCorrelation(deviationValues, moodValues);
      correlation = {
        deviationVsMood: corrResult.value,
        significance: corrResult.significance
      };
    }

    results.push({
      medicationId: med.id,
      medicationName: med.name,
      scheduledTime: med.scheduledTime,
      totalDoses: medDoses.length,
      onTimeDoses: onTime,
      lateDoses: late,
      earlyDoses: early,
      averageDeviationMinutes: averageDeviation,
      adherenceScore,
      pattern,
      recentTrend,
      deviations,
      correlation
    });
  }

  return results;
}

// ============================================
// Concentration Variability Analysis
// ============================================

export interface ConcentrationVariabilityResult {
  medicationId: string;
  medicationName: string;
  windowDays: number;
  totalWindows: number;
  stableWindows: number;
  varyingWindows: number;
  medianCV: number;
  stablePeriodMoodMean: number;
  varyingPeriodMoodMean: number;
  moodDifference: number;
  correlationCVvsMood: number;
  pValueCVvsMood: number;
  tTestResult: {
    tStatistic: number;
    pValue: number;
    effectSize: number;
    significant: boolean;
  };
  interpretation: string;
  recommendation: string;
  windows: Array<{
    start: number;
    end: number;
    concentrationMean: number;
    concentrationCV: number;
    moodMean: number;
    isStable: boolean;
  }>;
}

export function analyzeConcentrationVariability(
  medication: Medication,
  doses: MedicationDose[],
  moodEntries: MoodEntry[],
  windowDays: number = 7,
  bodyWeight: number = 70
): ConcentrationVariabilityResult | null {
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;
  const windowMs = windowDays * dayMs;

  const medDoses = doses.filter(d => d.medicationId === medication.id);
  if (medDoses.length < 3) return null;
  if (moodEntries.length < 5) return null;

  const sortedDoses = [...medDoses].sort((a, b) => a.timestamp - b.timestamp);
  const sortedMoods = [...moodEntries].sort((a, b) => a.timestamp - b.timestamp);

  const startTime = Math.max(sortedDoses[0].timestamp, sortedMoods[0].timestamp);
  const endTime = Math.min(
    sortedDoses[sortedDoses.length - 1].timestamp + 7 * dayMs,
    sortedMoods[sortedMoods.length - 1].timestamp
  );

  if (endTime - startTime < windowMs * 2) return null;

  const hourlyTimestamps: number[] = [];
  for (let t = startTime; t <= endTime; t += hourMs) {
    hourlyTimestamps.push(t);
  }

  const concentrations = hourlyTimestamps.map(t =>
    calculateConcentration(medication, medDoses, t, bodyWeight)
  );

  const windows: ConcentrationVariabilityResult['windows'] = [];
  const stepMs = dayMs;

  for (let windowStart = startTime; windowStart + windowMs <= endTime; windowStart += stepMs) {
    const windowEnd = windowStart + windowMs;

    const startIdx = Math.floor((windowStart - startTime) / hourMs);
    const endIdx = Math.floor((windowEnd - startTime) / hourMs);
    const windowConcs = concentrations.slice(startIdx, endIdx).filter(c => c > 0.01);

    if (windowConcs.length < 24) continue;

    const mean = windowConcs.reduce((a, b) => a + b, 0) / windowConcs.length;
    const variance = windowConcs.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / windowConcs.length;
    const sd = Math.sqrt(variance);
    const cv = mean > 0 ? sd / mean : 0;

    const windowMoods = sortedMoods
      .filter(m => m.timestamp >= windowStart && m.timestamp < windowEnd)
      .map(m => m.moodScore);

    if (windowMoods.length === 0) continue;

    const moodMean = windowMoods.reduce((a, b) => a + b, 0) / windowMoods.length;

    windows.push({
      start: windowStart,
      end: windowEnd,
      concentrationMean: mean,
      concentrationCV: cv,
      moodMean,
      isStable: false
    });
  }

  if (windows.length < 4) return null;

  const cvValues = windows.map(w => w.concentrationCV);
  const sortedCVs = [...cvValues].sort((a, b) => a - b);
  const medianCV = sortedCVs[Math.floor(sortedCVs.length / 2)];

  windows.forEach(w => {
    w.isStable = w.concentrationCV < medianCV;
  });

  const stableWindows = windows.filter(w => w.isStable);
  const varyingWindows = windows.filter(w => !w.isStable);

  if (stableWindows.length < 2 || varyingWindows.length < 2) return null;

  const stableMoods = stableWindows.map(w => w.moodMean);
  const varyingMoods = varyingWindows.map(w => w.moodMean);

  const stablePeriodMoodMean = stableMoods.reduce((a, b) => a + b, 0) / stableMoods.length;
  const varyingPeriodMoodMean = varyingMoods.reduce((a, b) => a + b, 0) / varyingMoods.length;
  const moodDifference = stablePeriodMoodMean - varyingPeriodMoodMean;

  const moodValues = windows.map(w => w.moodMean);
  const corrResult = StatisticsEngine.pearsonCorrelation(cvValues, moodValues);

  const tTestResult = StatisticsEngine.twoSampleTTest(stableMoods, varyingMoods);

  let interpretation: string;
  let recommendation: string;

  if (tTestResult.significant) {
    if (moodDifference > 0) {
      interpretation = `Humor é ${moodDifference.toFixed(1)} pontos MELHOR quando níveis de ${medication.name} estão estáveis (p=${tTestResult.pValue.toFixed(3)}, d=${tTestResult.effectSize.toFixed(2)})`;
      recommendation = `Priorize adesão rigorosa ao ${medication.name}. Níveis estáveis correlacionam com melhor humor.`;
    } else {
      interpretation = `Humor é ${Math.abs(moodDifference).toFixed(1)} pontos MELHOR quando níveis de ${medication.name} estão variando (p=${tTestResult.pValue.toFixed(3)})`;
      recommendation = `Padrão incomum detectado. As flutuações naturais pico→vale podem ter efeito terapêutico. Discuta com seu médico.`;
    }
  } else {
    interpretation = `Não há diferença significativa no humor entre períodos estáveis e variáveis de ${medication.name} (p=${tTestResult.pValue.toFixed(3)})`;
    recommendation = `Continue monitorando. Mais dados podem revelar padrões.`;
  }

  return {
    medicationId: medication.id,
    medicationName: medication.name,
    windowDays,
    totalWindows: windows.length,
    stableWindows: stableWindows.length,
    varyingWindows: varyingWindows.length,
    medianCV,
    stablePeriodMoodMean,
    varyingPeriodMoodMean,
    moodDifference,
    correlationCVvsMood: corrResult.value,
    pValueCVvsMood: corrResult.pValue,
    tTestResult,
    interpretation,
    recommendation,
    windows
  };
}

// ============================================
// Optimal Dose Interval Analysis
// ============================================

export interface DoseIntervalResult {
  medicationId: string;
  medicationName: string;
  totalIntervals: number;
  correlationIntervalVsMood: number;
  pValue: number;
  optimalIntervalHours: number;
  optimalIntervalLabel: string;
  binStats: Array<{
    label: string;
    minHours: number;
    maxHours: number;
    count: number;
    moodMean: number;
    moodSD: number;
  }>;
  recommendation: string;
  interpretation: string;
}

export function analyzeOptimalDoseInterval(
  medication: Medication,
  doses: MedicationDose[],
  moodEntries: MoodEntry[]
): DoseIntervalResult | null {
  const medDoses = doses
    .filter(d => d.medicationId === medication.id)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (medDoses.length < 5) return null;

  const hourMs = 60 * 60 * 1000;
  const intervals: Array<{ intervalHours: number; nextDoseTimestamp: number }> = [];

  for (let i = 1; i < medDoses.length; i++) {
    const intervalMs = medDoses[i].timestamp - medDoses[i - 1].timestamp;
    const intervalHours = intervalMs / hourMs;
    if (intervalHours > 4 && intervalHours < 72) {
      intervals.push({
        intervalHours,
        nextDoseTimestamp: medDoses[i].timestamp
      });
    }
  }

  if (intervals.length < 5) return null;

  const intervalMoodPairs: Array<{ interval: number; mood: number }> = [];

  for (const { intervalHours, nextDoseTimestamp } of intervals) {
    const windowStart = nextDoseTimestamp + 4 * hourMs;
    const windowEnd = nextDoseTimestamp + 12 * hourMs;
    const moodsInWindow = moodEntries.filter(
      m => m.timestamp >= windowStart && m.timestamp < windowEnd
    );

    if (moodsInWindow.length > 0) {
      const avgMood = moodsInWindow.reduce((sum, m) => sum + m.moodScore, 0) / moodsInWindow.length;
      intervalMoodPairs.push({ interval: intervalHours, mood: avgMood });
    }
  }

  if (intervalMoodPairs.length < 5) return null;

  const bins = [
    { min: 8, max: 16, label: "8-16h (2x/dia)" },
    { min: 16, max: 20, label: "16-20h" },
    { min: 20, max: 26, label: "20-26h (diário)" },
    { min: 26, max: 36, label: "26-36h (diário+)" },
    { min: 36, max: 60, label: "36-60h (irregular)" }
  ];

  const binStats = bins.map(bin => {
    const pairsInBin = intervalMoodPairs.filter(
      p => p.interval >= bin.min && p.interval < bin.max
    );
    if (pairsInBin.length < 2) return null;

    const moods = pairsInBin.map(p => p.mood);
    const mean = moods.reduce((a, b) => a + b, 0) / moods.length;
    const variance = moods.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / moods.length;
    const stdDev = Math.sqrt(variance);

    return {
      label: bin.label,
      minHours: bin.min,
      maxHours: bin.max,
      count: pairsInBin.length,
      moodMean: mean,
      moodSD: stdDev
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  if (binStats.length < 2) return null;

  const optimal = binStats.reduce((best, curr) =>
    curr.moodMean > best.moodMean ? curr : best
  );

  const intervalValues = intervalMoodPairs.map(p => p.interval);
  const moodValues = intervalMoodPairs.map(p => p.mood);
  const correlation = StatisticsEngine.pearsonCorrelation(intervalValues, moodValues);

  let recommendation: string;
  let interpretation: string;

  if (correlation.significance !== 'none') {
    if (correlation.value < -0.2) {
      interpretation = `Intervalos MENORES correlacionam com melhor humor (r=${correlation.value.toFixed(2)}, p=${correlation.pValue.toFixed(3)})`;
      recommendation = `Considere doses mais frequentes de ${medication.name}. Intervalos ${optimal.label} mostram melhor humor médio (${optimal.moodMean.toFixed(1)}/10).`;
    } else if (correlation.value > 0.2) {
      interpretation = `Intervalos MAIORES correlacionam com melhor humor (r=${correlation.value.toFixed(2)}, p=${correlation.pValue.toFixed(3)})`;
      recommendation = `Espaçamento atual pode ser adequado ou até aumentado. Melhor humor em intervalos ${optimal.label}.`;
    } else {
      interpretation = `Correlação fraca entre intervalo e humor (r=${correlation.value.toFixed(2)})`;
      recommendation = `Intervalos ${optimal.label} mostram melhor humor (${optimal.moodMean.toFixed(1)}/10). Continue monitorando.`;
    }
  } else {
    interpretation = `Sem correlação significativa entre intervalo de doses e humor`;
    recommendation = `Mantenha regularidade. Melhor humor médio em intervalos ${optimal.label} (${optimal.moodMean.toFixed(1)}/10).`;
  }

  return {
    medicationId: medication.id,
    medicationName: medication.name,
    totalIntervals: intervalMoodPairs.length,
    correlationIntervalVsMood: correlation.value,
    pValue: correlation.pValue,
    optimalIntervalHours: (optimal.minHours + optimal.maxHours) / 2,
    optimalIntervalLabel: optimal.label,
    binStats,
    recommendation,
    interpretation
  };
}

export default {
  generateMedicationInsights,
  detectRedFlags,
  calculateStabilityMetrics,
  generateInsightsReport,
  calculateTemporalAdherence,
  analyzeConcentrationVariability,
  analyzeOptimalDoseInterval,
  METRIC_LABELS
};
