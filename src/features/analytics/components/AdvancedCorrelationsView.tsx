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
  Target
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

  const statistics = useMemo(() => {
    if (!correlationData.humor) {
      return null;
    }

    const moodStats = StatisticsEngine.descriptiveStats(correlationData.humor);
    
    const medicationCorrelations: Record<string, { vsHumor: { value: number; significance: string } }> = {};
    
    medications.forEach(med => {
      if (correlationData[med.name] && correlationData.humor) {
        medicationCorrelations[med.name] = {
          vsHumor: StatisticsEngine.pearsonCorrelation(
            correlationData[med.name],
            correlationData.humor
          )
        };
      }
    });

    return {
      mood: moodStats,
      medicationCorrelations,
      dataPoints: correlationData.humor?.length || 0
    };
  }, [correlationData, medications]);

  const insights = useMemo(() => {
    const result: string[] = [];
    
    if (statistics) {
      Object.entries(statistics.medicationCorrelations).forEach(([medName, corr]) => {
        if (corr.vsHumor.significance !== 'none') {
          const effect = corr.vsHumor.value > 0 ? 'melhora' : 'piora';
          result.push(
            `${medName} ${effect} seu humor (r=${corr.vsHumor.value.toFixed(2)})`
          );
        }
      });
      
      if (statistics.mood.mean < 5) {
        result.push('Humor medio abaixo do ideal - acompanhe com seu medico');
      } else if (statistics.mood.mean > 7) {
        result.push('Excelente humor medio no periodo!');
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
              <h3 className="text-lg font-semibold mb-4">Correlacoes Medicamento → Humor</h3>
              <div className="space-y-4">
                {Object.entries(statistics?.medicationCorrelations || {}).map(([medName, corr]) => (
                  <div key={medName} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Pill className="w-5 h-5 text-teal-500" />
                      <span className="font-medium">{medName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-bold",
                        corr.vsHumor.value > 0 ? "text-green-500" : "text-red-500"
                      )}>
                        r = {corr.vsHumor.value.toFixed(2)}
                      </span>
                      {corr.vsHumor.value > 0 ? (
                        <TrendUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendDown className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-12 text-center">
              <Info className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Dados Insuficientes</h3>
              <p className="text-muted-foreground">
                Registre mais dados de humor e doses para visualizar correlacoes.
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
