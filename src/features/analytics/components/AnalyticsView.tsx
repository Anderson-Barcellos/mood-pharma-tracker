import { useState, useMemo } from 'react';
import { ComposedChart, Line, Area, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GlassCard } from '@/shared/ui/glass-card';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { TimeframeSelector, type TimeframePeriod, getTimeframeDays, usePersistedTimeframe } from '@/shared/components/TimeframeSelector';
import { calculateConcentration } from '@/features/analytics/utils/pharmacokinetics';
import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '@/shared/types';
import { Brain, Pill, Smiley, ChartLine, TrendUp, TrendDown, Clock } from '@phosphor-icons/react';
import { cn } from '@/shared/utils';

interface AnalyticsViewProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  cognitiveTests: CognitiveTest[];
}

export default function AnalyticsView({ medications, doses, moodEntries, cognitiveTests }: AnalyticsViewProps) {
  const [selectedMedicationId, setSelectedMedicationId] = useState<string>('');
  const initialTimeframe = usePersistedTimeframe('analytics-timeframe', '7d');
  const [timeframe, setTimeframe] = useState<TimeframePeriod>(initialTimeframe);
  const dayRange = getTimeframeDays(timeframe) ?? 7;

  const selectedMedication = medications.find(m => m.id === selectedMedicationId);

  const chartData = useMemo(() => {
    if (!selectedMedication) return [];

    const allTimestamps: number[] = [];
    doses.forEach(d => allTimestamps.push(d.timestamp));
    moodEntries.forEach(m => allTimestamps.push(m.timestamp));

    const dataEndTime = allTimestamps.length > 0 ? Math.max(...allTimestamps) : Date.now();
    const endTime = dataEndTime;
    const startTime = endTime - (dayRange * 24 * 60 * 60 * 1000);

    const pointsPerDay = 24;
    const totalPoints = Math.ceil(dayRange * pointsPerDay);
    const interval = (endTime - startTime) / totalPoints;

    const timePoints: number[] = [];
    for (let i = 0; i <= totalPoints; i++) {
      timePoints.push(startTime + (i * interval));
    }

    const relevantDoses = doses.filter(
      d => d.medicationId === selectedMedication.id &&
           d.timestamp >= startTime &&
           d.timestamp <= endTime
    );

    return timePoints.map(time => {
      const dataPoint: any = {
        time,
        timestamp: time,
        formattedTime: time && Number.isFinite(time) ? format(time, 'dd MMM HH:mm', { locale: ptBR }) : ''
      };

      const concentration = calculateConcentration(selectedMedication, relevantDoses, time);
      dataPoint.concentration = concentration > 0.01 ? concentration : null;

      const nearbyMoods = moodEntries.filter(m => Math.abs(m.timestamp - time) < interval);
      if (nearbyMoods.length > 0) {
        const closestMood = nearbyMoods.sort(
          (a, b) => Math.abs(a.timestamp - time) - Math.abs(b.timestamp - time)
        )[0];
        dataPoint.mood = closestMood.moodScore;
      }

      return dataPoint;
    });
  }, [selectedMedication, dayRange, doses, moodEntries]);

  const concentrationRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 100 };
    const concentrations = chartData
      .map(d => d.concentration)
      .filter((c): c is number => c !== null && c !== undefined);
    if (concentrations.length === 0) return { min: 0, max: 100 };
    const min = Math.min(...concentrations);
    const max = Math.max(...concentrations);
    const padding = (max - min) * 0.15;
    return { min: Math.max(0, min - padding), max: max + padding };
  }, [chartData]);

  const stats = useMemo(() => {
    const endTime = Date.now();
    const startTime = endTime - (dayRange * 24 * 60 * 60 * 1000);
    
    const periodMoods = moodEntries.filter(m => m.timestamp >= startTime);
    const avgMood = periodMoods.length > 0
      ? periodMoods.reduce((sum, m) => sum + m.moodScore, 0) / periodMoods.length
      : null;

    const previousStart = startTime - (dayRange * 24 * 60 * 60 * 1000);
    const previousMoods = moodEntries.filter(m => m.timestamp >= previousStart && m.timestamp < startTime);
    const prevAvgMood = previousMoods.length > 0
      ? previousMoods.reduce((sum, m) => sum + m.moodScore, 0) / previousMoods.length
      : null;

    const moodTrend = avgMood !== null && prevAvgMood !== null ? avgMood - prevAvgMood : null;

    const periodDoses = selectedMedication 
      ? doses.filter(d => d.medicationId === selectedMedication.id && d.timestamp >= startTime)
      : [];
    
    const lastDose = selectedMedication
      ? doses.filter(d => d.medicationId === selectedMedication.id).sort((a, b) => b.timestamp - a.timestamp)[0]
      : null;

    const hoursSinceLastDose = lastDose 
      ? Math.round((Date.now() - lastDose.timestamp) / (1000 * 60 * 60))
      : null;

    return {
      avgMood,
      moodTrend,
      moodEntryCount: periodMoods.length,
      doseCount: periodDoses.length,
      hoursSinceLastDose
    };
  }, [moodEntries, doses, dayRange, selectedMedication]);

  const medColor = selectedMedication?.color ?? 'hsl(var(--primary))';

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="medication-select" className="flex items-center gap-2">
              <Pill className="w-4 h-4" />
              Medicamento
            </Label>
            <Select value={selectedMedicationId} onValueChange={setSelectedMedicationId}>
              <SelectTrigger id="medication-select">
                <SelectValue placeholder="Selecione um medicamento" />
              </SelectTrigger>
              <SelectContent>
                {medications.map(med => (
                  <SelectItem key={med.id} value={med.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: med.color ?? '#3b82f6' }} />
                      {med.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TimeframeSelector
            value={timeframe}
            onChange={setTimeframe}
            storageKey="analytics-timeframe"
          />
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Humor Medio</p>
              <p className="text-2xl font-bold">
                {stats.avgMood !== null ? stats.avgMood.toFixed(1) : '-'}
              </p>
              {stats.moodTrend !== null && (
                <div className={cn(
                  "flex items-center gap-1 text-xs mt-1",
                  stats.moodTrend > 0 ? "text-green-500" : stats.moodTrend < 0 ? "text-red-500" : "text-muted-foreground"
                )}>
                  {stats.moodTrend > 0 ? <TrendUp className="w-3 h-3" /> : stats.moodTrend < 0 ? <TrendDown className="w-3 h-3" /> : null}
                  {stats.moodTrend > 0 ? '+' : ''}{stats.moodTrend.toFixed(1)} vs anterior
                </div>
              )}
            </div>
            <Smiley className="w-8 h-8 text-yellow-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Registros de Humor</p>
              <p className="text-2xl font-bold">{stats.moodEntryCount}</p>
              <p className="text-xs text-muted-foreground mt-1">no periodo</p>
            </div>
            <Brain className="w-8 h-8 text-purple-500" />
          </div>
        </GlassCard>

        {selectedMedication && (
          <>
            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Doses Registradas</p>
                  <p className="text-2xl font-bold">{stats.doseCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">no periodo</p>
                </div>
                <Pill className="w-8 h-8" style={{ color: medColor }} />
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ultima Dose</p>
                  <p className="text-2xl font-bold">
                    {stats.hoursSinceLastDose !== null ? `${stats.hoursSinceLastDose}h` : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">atras</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </GlassCard>
          </>
        )}
      </div>

      {selectedMedication ? (
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${medColor}20` }}>
              <ChartLine className="w-5 h-5" style={{ color: medColor }} />
            </div>
            <div>
              <h3 className="font-semibold">{selectedMedication.name}</h3>
              <p className="text-sm text-muted-foreground">Concentracao plasmatica vs Humor</p>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="concentrationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={medColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={medColor} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis 
                  dataKey="time" 
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(tick) => format(tick, 'dd/MM', { locale: ptBR })}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  yAxisId="concentration"
                  domain={[concentrationRange.min, concentrationRange.max]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.toFixed(0)}
                  label={{ value: 'ng/mL', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                />
                <YAxis 
                  yAxisId="mood"
                  orientation="right"
                  domain={[0, 10]}
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Humor', angle: 90, position: 'insideRight', style: { fontSize: 11 } }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(label) => format(label, "dd MMM 'as' HH:mm", { locale: ptBR })}
                  formatter={(value: any, name: string) => {
                    if (name === 'Concentracao') return [`${Number(value).toFixed(1)} ng/mL`, name];
                    if (name === 'Humor') return [`${Number(value).toFixed(1)}/10`, name];
                    return [value, name];
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: 16 }} />
                <Area
                  yAxisId="concentration"
                  type="monotone"
                  dataKey="concentration"
                  stroke={medColor}
                  fill="url(#concentrationGradient)"
                  strokeWidth={2}
                  name="Concentracao"
                  connectNulls
                />
                <Scatter
                  yAxisId="mood"
                  dataKey="mood"
                  fill="#22c55e"
                  name="Humor"
                />
                <Line
                  yAxisId="mood"
                  type="natural"
                  dataKey="mood"
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeOpacity={0.8}
                  dot={false}
                  connectNulls
                  name="Humor"
                  legendType="none"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {selectedMedication.therapeuticRange && (
            <div className="mt-4 pt-4 border-t flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-4 h-2 rounded" style={{ backgroundColor: `${medColor}30`, border: `1px dashed ${medColor}` }} />
              <span>Faixa terapeutica: {selectedMedication.therapeuticRange.min}-{selectedMedication.therapeuticRange.max} {selectedMedication.therapeuticRange.unit}</span>
            </div>
          )}
        </GlassCard>
      ) : (
        <GlassCard className="p-12 text-center">
          <Pill className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">Selecione um Medicamento</h3>
          <p className="text-muted-foreground">
            Escolha um medicamento acima para visualizar a analise de concentracao e humor.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
