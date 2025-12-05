import { useState, useMemo } from 'react';
import { GlassCard } from '@/shared/ui/glass-card';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { TimeframeSelector, type TimeframePeriod, getTimeframeDays, usePersistedTimeframe } from '@/shared/components/TimeframeSelector';
import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '@/shared/types';
import { Brain, Pill, Smiley, TrendUp, TrendDown, Clock } from '@phosphor-icons/react';
import { cn } from '@/shared/utils';
import PKChart from './PKChart';

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

  const medColor = selectedMedication?.color ?? '#8b5cf6';

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
        <PKChart
          medication={selectedMedication}
          doses={doses}
          moodEntries={moodEntries}
          daysRange={dayRange}
        />
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
