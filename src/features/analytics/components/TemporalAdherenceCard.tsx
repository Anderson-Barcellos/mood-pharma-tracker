import { useMemo } from 'react';
import { GlassCard } from '@/shared/ui/glass-card';
import { Progress } from '@/shared/ui/progress';
import {
  Clock,
  TrendUp,
  TrendDown,
  Minus,
  CheckCircle,
  Warning,
  Pill,
  ChartLine
} from '@phosphor-icons/react';
import { cn } from '@/shared/utils';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import {
  calculateTemporalAdherence,
  type TemporalAdherenceMetrics
} from '@/features/analytics/utils/insights-generator';

interface TemporalAdherenceCardProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  className?: string;
}

const TrendIcon = ({ trend }: { trend: TemporalAdherenceMetrics['recentTrend'] }) => {
  switch (trend) {
    case 'improving':
      return <TrendUp className="w-4 h-4 text-green-500" />;
    case 'declining':
      return <TrendDown className="w-4 h-4 text-red-500" />;
    case 'stable':
      return <Minus className="w-4 h-4 text-blue-500" />;
    default:
      return null;
  }
};

const formatDeviation = (minutes: number): string => {
  const absMinutes = Math.abs(minutes);
  if (absMinutes < 60) return `${Math.round(absMinutes)}min`;
  const hours = Math.floor(absMinutes / 60);
  const mins = Math.round(absMinutes % 60);
  return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
};

const PatternBadge = ({ pattern }: { pattern: TemporalAdherenceMetrics['pattern'] }) => {
  const styles = {
    consistent: 'bg-green-500/20 text-green-400 border-green-500/30',
    variable: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    irregular: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const labels = {
    consistent: 'Consistente',
    variable: 'Variável',
    irregular: 'Irregular'
  };

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs border', styles[pattern])}>
      {labels[pattern]}
    </span>
  );
};

export default function TemporalAdherenceCard({
  medications,
  doses,
  moodEntries,
  className
}: TemporalAdherenceCardProps) {
  const adherenceData = useMemo(
    () => calculateTemporalAdherence(medications, doses, moodEntries),
    [medications, doses, moodEntries]
  );

  const medsWithSchedule = medications.filter(m => m.scheduledTime);

  if (medsWithSchedule.length === 0) {
    return (
      <GlassCard className={cn('p-6', className)}>
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Aderência Temporal</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum medicamento com horário padrão configurado.</p>
          <p className="text-sm mt-2">
            Edite seus medicamentos para adicionar o horário de tomada.
          </p>
        </div>
      </GlassCard>
    );
  }

  if (adherenceData.length === 0) {
    return (
      <GlassCard className={cn('p-6', className)}>
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Aderência Temporal</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <p>Registre pelo menos 3 doses para ver a análise de aderência.</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={cn('p-6', className)}>
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Aderência Temporal</h3>
      </div>

      <div className="space-y-6">
        {adherenceData.map(med => (
          <div key={med.medicationId} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-500" />
                <span className="font-medium">{med.medicationName}</span>
                <span className="text-xs text-muted-foreground">
                  (agendado: {med.scheduledTime})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PatternBadge pattern={med.pattern} />
                <TrendIcon trend={med.recentTrend} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Progress value={med.adherenceScore} className="flex-1 h-2" />
              <span className={cn(
                'text-sm font-bold min-w-[48px] text-right',
                med.adherenceScore >= 80 ? 'text-green-500' :
                med.adherenceScore >= 60 ? 'text-yellow-500' : 'text-red-500'
              )}>
                {med.adherenceScore.toFixed(0)}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-muted/30 rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-green-500">{med.onTimeDoses}</p>
                <p className="text-xs text-muted-foreground">No horário</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-yellow-500">{med.lateDoses}</p>
                <p className="text-xs text-muted-foreground">Atrasadas</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-blue-500">{med.earlyDoses}</p>
                <p className="text-xs text-muted-foreground">Adiantadas</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2 text-center">
                <p className="text-2xl font-bold">{formatDeviation(med.averageDeviationMinutes)}</p>
                <p className="text-xs text-muted-foreground">Desvio médio</p>
              </div>
            </div>

            {med.correlation && med.correlation.significance !== 'none' && (
              <div className={cn(
                'flex items-center gap-2 p-3 rounded-lg text-sm',
                med.correlation.deviationVsMood < 0
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-blue-500/10 border border-blue-500/20'
              )}>
                <ChartLine className="w-4 h-4 flex-shrink-0" />
                <span>
                  {med.correlation.deviationVsMood < 0 ? (
                    <>
                      <Warning className="w-3 h-3 inline mr-1 text-amber-500" />
                      Atrasos correlacionados com <strong>pior humor</strong>
                      {' '}(r={med.correlation.deviationVsMood.toFixed(2)})
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 inline mr-1 text-blue-500" />
                      Horário flexível sem impacto significativo no humor
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
        <p>
          <strong>Tolerância:</strong> ±30min do horário configurado é considerado "no horário".
        </p>
        <p className="mt-1">
          <strong>Dica:</strong> Medicamentos estimulantes como Venvanse são mais sensíveis ao horário que SSRIs.
        </p>
      </div>
    </GlassCard>
  );
}
