import { useState, useMemo } from 'react';
import { GlassCard } from '@/shared/ui/glass-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { 
  Brain, 
  Pill, 
  ChartLine,
  Info,
  TrendUp,
  TrendDown,
  Lightning,
  Clock,
  Drop,
  Target,
  ArrowsLeftRight
} from '@phosphor-icons/react';
import { cn } from '@/shared/utils';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import { StatisticsEngine } from '@/features/analytics/utils/statistics-engine';
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group';
import {
  computeTrendFromSamples,
  getTrendWindowMs,
  sampleConcentrationAtTimes,
  type ConcentrationSeriesMode,
} from '@/features/analytics/utils/concentration-series';
import CorrelationMatrix from './CorrelationMatrix';
import LagCorrelationChart from './LagCorrelationChart';
import OptimalDosingRecommendation from './OptimalDosingRecommendation';
import ImpactAnalysisTab from './ImpactAnalysisTab';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdvancedCorrelationsViewProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  className?: string;
}

export default function AdvancedCorrelationsView({
  medications,
  doses,
  moodEntries,
  className
}: AdvancedCorrelationsViewProps) {
  const [selectedMedications, setSelectedMedications] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('impact');
  const [concentrationMode, setConcentrationMode] = useState<ConcentrationSeriesMode>('trend');
  const [matrixLagHours, setMatrixLagHours] = useState<0 | 24 | 48>(0);

  const { dataRange, dayRange } = useMemo(() => {
    const allTimestamps = [
      ...moodEntries.map(m => m.timestamp),
      ...doses.map(d => d.timestamp)
    ].filter(t => t > 0);
    
    if (allTimestamps.length === 0) {
      return { dataRange: { start: Date.now(), end: Date.now() }, dayRange: 0 };
    }
    
    const start = Math.min(...allTimestamps);
    const end = Math.max(...allTimestamps);
    const days = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
    
    return {
      dataRange: { start, end },
      dayRange: Math.max(days, 1)
    };
  }, [moodEntries, doses]);

  const windowRange = useMemo(() => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const end = dataRange.end;
    const start = dataRange.start;
    const windowStart = start;
    const days = Math.ceil((end - windowStart) / DAY_MS);
    return {
      start: windowStart,
      end,
      days: Math.max(days, 1),
    };
  }, [dataRange.end, dataRange.start]);

  const filteredMoodEntries = useMemo(() => {
    return moodEntries.filter(e => e.timestamp >= windowRange.start && e.timestamp <= windowRange.end);
  }, [moodEntries, windowRange.end, windowRange.start]);

  const filteredDoses = useMemo(() => {
    const HOUR_MS = 60 * 60 * 1000;
    const maxLookbackMs = medications.reduce((max, med) => {
      const lookbackMs = Math.max(7 * 24 * HOUR_MS, med.halfLife * 5 * HOUR_MS);
      return Math.max(max, lookbackMs);
    }, 0);

    return doses.filter(d =>
      d.timestamp <= windowRange.end &&
      d.timestamp >= (windowRange.start - maxLookbackMs)
    );
  }, [doses, medications, windowRange.end, windowRange.start]);

  const correlationData = useMemo(() => {
    const series: Record<string, number[]> = {};
    const HOUR_MS = 60 * 60 * 1000;
    const startHour = Math.floor(windowRange.start / HOUR_MS) * HOUR_MS;
    const endHour = Math.ceil(windowRange.end / HOUR_MS) * HOUR_MS;

    if (!Number.isFinite(startHour) || !Number.isFinite(endHour) || endHour < startHour) {
      return series;
    }

    const timestamps: number[] = [];
    for (let t = startHour; t <= endHour; t += HOUR_MS) timestamps.push(t);

    // Bucket mood metrics per hour (so we can average if multiple entries happen within the same hour).
    const moodBuckets = new Map<number, Record<string, number[]>>();
    const pushBucketValue = (hourKey: number, key: string, value: number | undefined) => {
      if (value === undefined || !Number.isFinite(value)) return;
      if (!moodBuckets.has(hourKey)) moodBuckets.set(hourKey, {});
      const bucket = moodBuckets.get(hourKey)!;
      if (!bucket[key]) bucket[key] = [];
      bucket[key].push(value);
    };

    for (const entry of filteredMoodEntries) {
      const hourKey = Math.floor(entry.timestamp / HOUR_MS) * HOUR_MS;
      pushBucketValue(hourKey, 'humor', entry.moodScore);
      pushBucketValue(hourKey, 'ansiedade', entry.anxietyLevel);
      pushBucketValue(hourKey, 'energia', entry.energyLevel);
      pushBucketValue(hourKey, 'foco', entry.focusLevel);
      pushBucketValue(hourKey, 'cognicao', entry.cognitiveScore);
      pushBucketValue(hourKey, 'attShift', entry.attentionShift);
    }

    const moodKeys = ['humor', 'ansiedade', 'energia', 'foco', 'cognicao', 'attShift'] as const;

    for (const key of moodKeys) {
      series[key] = timestamps.map((t) => {
        const values = moodBuckets.get(t)?.[key];
        if (!values || values.length === 0) return Number.NaN;
        return values.reduce((a, b) => a + b, 0) / values.length;
      });
    }

    const selectedMeds = selectedMedications.length > 0
      ? medications.filter(m => selectedMedications.includes(m.id))
      : medications;

    for (const medication of selectedMeds) {
      const medDoses = filteredDoses.filter(d => d.medicationId === medication.id);
      if (medDoses.length < 2) continue;

      const raw = sampleConcentrationAtTimes(medication, medDoses, timestamps, 70);
      const values = concentrationMode === 'trend'
        ? computeTrendFromSamples(timestamps, raw, getTrendWindowMs(medication), 3)
        : raw;

      series[medication.name] = values.map((v) => {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        // "instant": null means "very low/near zero concentration".
        // "trend": null means "not enough points in the window" (keep as NaN).
        return concentrationMode === 'trend' ? Number.NaN : 0;
      });
    }

    // Drop mood metrics with too few samples (but keep "humor" as the anchor).
    Object.keys(series).forEach(key => {
      if (key === 'humor') return;
      if (series[key].every(v => !Number.isFinite(v))) {
        delete series[key];
        return;
      }
      if (moodKeys.includes(key as any)) {
        const finiteCount = series[key].filter(Number.isFinite).length;
        if (finiteCount < 5) {
          delete series[key];
        }
      }
    });

    return series;
  }, [filteredMoodEntries, filteredDoses, medications, selectedMedications, concentrationMode, windowRange.end, windowRange.start]);

  const moodMetrics = ['humor', 'ansiedade', 'energia', 'foco', 'cognicao', 'attShift'] as const;
  type MoodMetric = typeof moodMetrics[number];
  
  const metricLabels: Record<MoodMetric, string> = {
    humor: 'Humor',
    ansiedade: 'Ansiedade',
    energia: 'Energia',
    foco: 'Foco',
    cognicao: 'Cognição',
    attShift: 'Att. Shift'
  };

  const statistics = useMemo(() => {
    if (!correlationData.humor) {
      return null;
    }

    const moodStats = StatisticsEngine.descriptiveStats(correlationData.humor.filter(Number.isFinite));
    
    const metricStats: Partial<Record<MoodMetric, { mean: number; stdDev: number; count: number }>> = {};
    moodMetrics.forEach(metric => {
      if (correlationData[metric] && correlationData[metric].length > 0) {
        const values = correlationData[metric].filter(Number.isFinite);
        if (values.length > 3) {
          const stats = StatisticsEngine.descriptiveStats(values);
          metricStats[metric] = { mean: stats.mean, stdDev: stats.stdDev, count: values.length };
        }
      }
    });
    
    const medicationCorrelations: Record<string, Record<MoodMetric, { value: number; significance: string }>> = {};
    
    medications.forEach(med => {
      if (correlationData[med.name]) {
        const correlations: Record<string, { value: number; significance: string }> = {};
        moodMetrics.forEach(metric => {
          if (correlationData[metric] && correlationData[metric].length > 3) {
            correlations[metric] = StatisticsEngine.pearsonCorrelation(
              correlationData[med.name],
              correlationData[metric]
            );
          }
        });
        if (Object.keys(correlations).length > 0) {
          medicationCorrelations[med.name] = correlations as Record<MoodMetric, { value: number; significance: string }>;
        }
      }
    });

    return {
      mood: moodStats,
      metricStats,
      medicationCorrelations,
      dataPoints: correlationData.humor?.length || 0
    };
  }, [correlationData, medications]);

  const matrixData = useMemo(() => {
    if (matrixLagHours === 0) return correlationData;

    const shift = matrixLagHours;
    const shiftSeries = (arr: number[], lag: number): number[] => {
      const out = new Array(arr.length).fill(Number.NaN);
      for (let i = 0; i + lag < arr.length; i++) {
        out[i] = arr[i + lag];
      }
      return out;
    };

    const shifted: Record<string, number[]> = {};
    for (const [key, values] of Object.entries(correlationData)) {
      shifted[key] = moodMetrics.includes(key as any) ? shiftSeries(values, shift) : values;
    }
    return shifted;
  }, [correlationData, matrixLagHours, moodMetrics]);

  const insights = useMemo(() => {
    const result: string[] = [];
    
    if (statistics) {
      Object.entries(statistics.medicationCorrelations).forEach(([medName, correlations]) => {
        if (correlations.humor && correlations.humor.significance !== 'none') {
          const effect = correlations.humor.value > 0 ? 'melhora' : 'piora';
          result.push(`${medName} ${effect} seu humor (r=${correlations.humor.value.toFixed(2)})`);
        }
        if (correlations.ansiedade && correlations.ansiedade.significance !== 'none') {
          const effect = correlations.ansiedade.value > 0 ? 'aumenta' : 'reduz';
          result.push(`${medName} ${effect} ansiedade (r=${correlations.ansiedade.value.toFixed(2)})`);
        }
        if (correlations.energia && correlations.energia.significance !== 'none') {
          const effect = correlations.energia.value > 0 ? 'aumenta' : 'reduz';
          result.push(`${medName} ${effect} energia (r=${correlations.energia.value.toFixed(2)})`);
        }
        if (correlations.foco && correlations.foco.significance !== 'none') {
          const effect = correlations.foco.value > 0 ? 'melhora' : 'piora';
          result.push(`${medName} ${effect} foco (r=${correlations.foco.value.toFixed(2)})`);
        }
        if (correlations.cognicao && correlations.cognicao.significance !== 'none') {
          const effect = correlations.cognicao.value > 0 ? 'melhora' : 'piora';
          result.push(`${medName} ${effect} cognição (r=${correlations.cognicao.value.toFixed(2)})`);
        }
      });
      
      if (statistics.mood.mean < 5) {
        result.push('Humor médio abaixo do ideal - acompanhe com seu médico');
      } else if (statistics.mood.mean > 7) {
        result.push('Excelente humor médio no período!');
      }
    }
    
    return result;
  }, [statistics]);

  return (
    <div className={cn("space-y-6", className)}>
      <GlassCard className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg">
              <ChartLine className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Analise de Correlacoes</h2>
              <p className="text-muted-foreground">
                Correlacoes entre humor e medicamentos
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="text-sm text-muted-foreground text-right">
              <span className="font-medium">{windowRange.days} dias</span> de dados
              <br />
              <span className="text-xs">
                {format(windowRange.start, 'dd MMM', { locale: ptBR })} - {format(windowRange.end, 'dd MMM', { locale: ptBR })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Concentração</span>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={concentrationMode}
                onValueChange={(v) => v && setConcentrationMode(v as ConcentrationSeriesMode)}
              >
                <ToggleGroupItem value="instant">Cp</ToggleGroupItem>
                <ToggleGroupItem value="trend">Tendência</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </GlassCard>

      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Humor Medio</p>
                <p className="text-2xl font-bold">{statistics.mood.mean.toFixed(1)}/10</p>
                <p className="text-sm text-muted-foreground">σ = {statistics.mood.stdDev.toFixed(1)}</p>
              </div>
              <Brain className="w-8 h-8 text-purple-500" />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Medicamentos Ativos</p>
                <p className="text-2xl font-bold">{Object.keys(statistics.medicationCorrelations).length}</p>
                <p className="text-sm text-muted-foreground">com dados suficientes</p>
              </div>
              <Pill className="w-8 h-8 text-teal-500" />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Pontos de Dados</p>
                <p className="text-2xl font-bold">{statistics.dataPoints}</p>
                <p className="text-sm text-muted-foreground">horas analisadas</p>
              </div>
              <ChartLine className="w-8 h-8 text-blue-500" />
            </div>
          </GlassCard>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="impact" className="flex items-center gap-1">
            <TrendUp className="w-3 h-3" />
            <span className="hidden sm:inline">Impacto</span>
          </TabsTrigger>
          <TabsTrigger value="timing" className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            <span className="hidden sm:inline">Horarios</span>
          </TabsTrigger>
          <TabsTrigger value="temporal" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">Temporal</span>
          </TabsTrigger>
          <TabsTrigger value="matrix">Matriz</TabsTrigger>
        </TabsList>

        <TabsContent value="impact" className="space-y-6 mt-6">
          <ImpactAnalysisTab
            medications={medications}
            doses={filteredDoses}
            moodEntries={filteredMoodEntries}
          />
        </TabsContent>

        <TabsContent value="timing" className="space-y-6 mt-6">
          <OptimalDosingRecommendation
            medications={medications}
            doses={filteredDoses}
            moodEntries={filteredMoodEntries}
          />
        </TabsContent>

        <TabsContent value="temporal" className="space-y-6 mt-6">
          {medications.length > 0 ? (
            <div className="space-y-6">
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="w-4 h-4" />
                  <span>
                    Analise temporal mostra como o humor responde a concentracao do medicamento ao longo do tempo.
                    Lag positivo = humor responde apos o pico. Lag negativo = humor antecede.
                  </span>
                </div>
              </GlassCard>

              {/* Diagnostic Panel */}
              <GlassCard className="p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <ChartLine className="w-4 h-4" />
                  Status dos Dados (min: 3 doses + 5 moods)
                </h4>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {medications.map(med => {
                    const medDoses = filteredDoses.filter(d => d.medicationId === med.id);
                    const hasEnoughDoses = medDoses.length >= 3;
                    const hasEnoughMoods = filteredMoodEntries.length >= 5;
                    const isReady = hasEnoughDoses && hasEnoughMoods;

                    return (
                      <div
                        key={med.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg text-xs",
                          isReady ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"
                        )}
                      >
                        <Pill className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-medium truncate">{med.name}</span>
                        <span className="ml-auto flex-shrink-0">
                          {medDoses.length}/3 doses
                        </span>
                        {isReady ? (
                          <span className="text-green-500">✓</span>
                        ) : (
                          <span className="text-orange-500">!</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Total mood entries: {filteredMoodEntries.length}/5 {filteredMoodEntries.length >= 5 ? '✓' : '(precisa de mais)'}
                </p>
              </GlassCard>

              {medications.map(medication => (
                <LagCorrelationChart
                  key={medication.id}
                  medication={medication}
                  doses={filteredDoses}
                  moodEntries={filteredMoodEntries}
                  maxLagHours={Math.min(12, Math.ceil(medication.halfLife * 2))}
                />
              ))}
            </div>
          ) : (
            <GlassCard className="p-12 text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Sem Medicamentos</h3>
              <p className="text-muted-foreground">
                Adicione medicamentos para visualizar analise temporal.
              </p>
            </GlassCard>
          )}
        </TabsContent>

        <TabsContent value="matrix" className="space-y-6">
          {Object.keys(correlationData).length > 1 ? (
            <>
              <GlassCard className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        Lag: <span className="font-medium">{matrixLagHours === 0 ? '0h' : `+${matrixLagHours}h`}</span>
                      </span>
                    </div>
                    <p className="text-xs mt-1">
                      Lag positivo = métrica de humor avaliada depois da exposição/concentração.
                      (Ex: +24h = “humor amanhã”)
                    </p>
                  </div>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={String(matrixLagHours)}
                    onValueChange={(v) => v && setMatrixLagHours(Number(v) as 0 | 24 | 48)}
                  >
                    <ToggleGroupItem value="0">0h</ToggleGroupItem>
                    <ToggleGroupItem value="24">24h</ToggleGroupItem>
                    <ToggleGroupItem value="48">48h</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </GlassCard>

              <CorrelationMatrix
                data={matrixData}
                title="Correlações Medicamento ↔ Métricas"
                showSignificance={true}
                medicationNames={medications.map(m => m.name)}
                filterMode="medication-only"
              />
            </>
          ) : (
            <GlassCard className="p-12 text-center">
              <Info className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Dados Insuficientes</h3>
              <p className="text-muted-foreground">
                Registre mais dados de humor e doses para visualizar a matriz.
              </p>
            </GlassCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
