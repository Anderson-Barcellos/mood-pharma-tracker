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
import { calculateConcentration } from '@/features/analytics/utils/pharmacokinetics';
import CorrelationMatrix from './CorrelationMatrix';
import LagCorrelationChart from './LagCorrelationChart';
import OptimalDosingRecommendation from './OptimalDosingRecommendation';
import { TimeframeSelector, type TimeframePeriod, getTimeframeDays } from '@/shared/components/TimeframeSelector';

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
  const [timeframe, setTimeframe] = useState<TimeframePeriod>('7d');
  const [activeTab, setActiveTab] = useState('overview');

  const dayRange = getTimeframeDays(timeframe) ?? 7;
  const endTime = Date.now();
  const startTime = endTime - (dayRange * 24 * 60 * 60 * 1000);

  const filteredMoodEntries = useMemo(() => 
    moodEntries.filter(entry => entry.timestamp >= startTime && entry.timestamp <= endTime),
    [moodEntries, startTime, endTime]
  );

  const filteredDoses = useMemo(() => 
    doses.filter(dose => dose.timestamp >= startTime && dose.timestamp <= endTime),
    [doses, startTime, endTime]
  );

  const correlationData = useMemo(() => {
    const hourlyData = new Map<number, Record<string, number>>();
    
    filteredMoodEntries.forEach(entry => {
      const hourKey = Math.floor(entry.timestamp / 3600000) * 3600000;
      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, {});
      }
      const hour = hourlyData.get(hourKey)!;
      hour.humor = entry.moodScore;
      if (entry.anxietyLevel !== undefined) hour.ansiedade = entry.anxietyLevel;
      if (entry.energyLevel !== undefined) hour.energia = entry.energyLevel;
      if (entry.focusLevel !== undefined) hour.foco = entry.focusLevel;
      if (entry.cognitiveScore !== undefined) hour.cognicao = entry.cognitiveScore;
      if (entry.attentionShift !== undefined) hour.attShift = entry.attentionShift;
    });
    
    const selectedMeds = selectedMedications.length > 0 
      ? medications.filter(m => selectedMedications.includes(m.id))
      : medications;
    
    selectedMeds.forEach(medication => {
      const medDoses = filteredDoses.filter(d => d.medicationId === medication.id);
      
      hourlyData.forEach((hourData, timestamp) => {
        const concentration = calculateConcentration(medication, medDoses, timestamp);
        if (concentration > 0.01) {
          hourData[medication.name] = concentration;
        }
      });
    });
    
    const validHours = Array.from(hourlyData.entries())
      .filter(([_, data]) => Object.keys(data).length > 1)
      .sort((a, b) => a[0] - b[0]);
    
    const series: Record<string, number[]> = {};
    
    if (validHours.length > 0) {
      const allKeys = new Set<string>();
      validHours.forEach(([_, data]) => {
        Object.keys(data).forEach(key => allKeys.add(key));
      });
      
      allKeys.forEach(key => {
        series[key] = validHours.map(([_, data]) => data[key] || 0);
      });
      
      Object.keys(series).forEach(key => {
        const nonZeroCount = series[key].filter(v => v !== 0).length;
        if (nonZeroCount < series[key].length * 0.3) {
          delete series[key];
        }
      });
    }
    
    return series;
  }, [filteredMoodEntries, filteredDoses, medications, selectedMedications]);

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

    const moodStats = StatisticsEngine.descriptiveStats(correlationData.humor);
    
    const metricStats: Partial<Record<MoodMetric, { mean: number; stdDev: number; count: number }>> = {};
    moodMetrics.forEach(metric => {
      if (correlationData[metric] && correlationData[metric].length > 0) {
        const nonZeroValues = correlationData[metric].filter(v => v > 0);
        if (nonZeroValues.length > 3) {
          const stats = StatisticsEngine.descriptiveStats(nonZeroValues);
          metricStats[metric] = { mean: stats.mean, stdDev: stats.stdDev, count: nonZeroValues.length };
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
          
          <TimeframeSelector
            value={timeframe}
            onChange={setTimeframe}
          />
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

      {insights.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightning className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Insights</h3>
          </div>
          <div className="space-y-2">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-sm">{insight}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visao Geral</TabsTrigger>
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

        <TabsContent value="overview" className="space-y-6">
          {Object.keys(statistics?.medicationCorrelations || {}).length > 0 ? (
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4">Correlações Medicamento → Métricas</h3>
              <div className="space-y-6">
                {Object.entries(statistics?.medicationCorrelations || {}).map(([medName, correlations]) => (
                  <div key={medName} className="p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <Pill className="w-5 h-5 text-teal-500" />
                      <span className="font-semibold text-lg">{medName}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {correlations.humor && (
                        <div className="flex items-center justify-between p-2 rounded bg-purple-500/10">
                          <span className="text-xs flex items-center gap-1">
                            <Brain className="w-3 h-3 text-purple-500" />
                            Humor
                          </span>
                          <span className={cn("text-xs font-bold", correlations.humor.value > 0 ? "text-green-500" : "text-red-500")}>
                            {correlations.humor.value.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {correlations.ansiedade && (
                        <div className="flex items-center justify-between p-2 rounded bg-rose-500/10">
                          <span className="text-xs flex items-center gap-1">
                            <Drop className="w-3 h-3 text-rose-500" />
                            Ansiedade
                          </span>
                          <span className={cn("text-xs font-bold", correlations.ansiedade.value < 0 ? "text-green-500" : "text-red-500")}>
                            {correlations.ansiedade.value.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {correlations.energia && (
                        <div className="flex items-center justify-between p-2 rounded bg-amber-500/10">
                          <span className="text-xs flex items-center gap-1">
                            <Lightning className="w-3 h-3 text-amber-500" />
                            Energia
                          </span>
                          <span className={cn("text-xs font-bold", correlations.energia.value > 0 ? "text-green-500" : "text-red-500")}>
                            {correlations.energia.value.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {correlations.foco && (
                        <div className="flex items-center justify-between p-2 rounded bg-blue-500/10">
                          <span className="text-xs flex items-center gap-1">
                            <Target className="w-3 h-3 text-blue-500" />
                            Foco
                          </span>
                          <span className={cn("text-xs font-bold", correlations.foco.value > 0 ? "text-green-500" : "text-red-500")}>
                            {correlations.foco.value.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {correlations.cognicao && (
                        <div className="flex items-center justify-between p-2 rounded bg-violet-500/10">
                          <span className="text-xs flex items-center gap-1">
                            <Brain className="w-3 h-3 text-violet-500" />
                            Cognição
                          </span>
                          <span className={cn("text-xs font-bold", correlations.cognicao.value > 0 ? "text-green-500" : "text-red-500")}>
                            {correlations.cognicao.value.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {correlations.attShift && (
                        <div className="flex items-center justify-between p-2 rounded bg-cyan-500/10">
                          <span className="text-xs flex items-center gap-1">
                            <ArrowsLeftRight className="w-3 h-3 text-cyan-500" />
                            Att.Shift
                          </span>
                          <span className={cn("text-xs font-bold", correlations.attShift.value > 0 ? "text-green-500" : "text-red-500")}>
                            {correlations.attShift.value.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-4">
                Valores positivos = correlação direta. Para ansiedade, valor negativo é desejável (medicamento reduz ansiedade).
              </p>
            </GlassCard>
          ) : (
            <GlassCard className="p-12 text-center">
              <Info className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Dados Insuficientes</h3>
              <p className="text-muted-foreground">
                Registre mais dados de humor e doses para visualizar correlações.
              </p>
            </GlassCard>
          )}
        </TabsContent>

        <TabsContent value="timing" className="space-y-6 mt-6">
          <OptimalDosingRecommendation
            medications={medications}
            doses={doses}
            moodEntries={moodEntries}
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
                    const medDoses = doses.filter(d => d.medicationId === med.id);
                    const hasEnoughDoses = medDoses.length >= 3;
                    const hasEnoughMoods = moodEntries.length >= 5;
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
                  Total mood entries: {moodEntries.length}/5 {moodEntries.length >= 5 ? '✓' : '(precisa de mais)'}
                </p>
              </GlassCard>

              {medications.map(medication => (
                <LagCorrelationChart
                  key={medication.id}
                  medication={medication}
                  doses={doses}
                  moodEntries={moodEntries}
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
            <CorrelationMatrix
              data={correlationData}
              title="Matriz de Correlacoes"
              showSignificance={true}
            />
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
