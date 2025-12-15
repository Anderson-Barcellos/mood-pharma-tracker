import { useMemo } from 'react';
import { GlassCard } from '@/shared/ui/glass-card';
import {
  Waves,
  TrendUp,
  TrendDown,
  Minus,
  ChartLine,
  Timer,
  Pill,
  Lightbulb
} from '@phosphor-icons/react';
import { cn } from '@/shared/utils';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import {
  analyzeConcentrationVariability,
  analyzeOptimalDoseInterval,
  type ConcentrationVariabilityResult,
  type DoseIntervalResult
} from '@/features/analytics/utils/insights-generator';

interface ConcentrationStabilityCardProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  className?: string;
}

const SignificanceBadge = ({ pValue }: { pValue: number }) => {
  if (pValue < 0.01) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
        Alta confiança
      </span>
    );
  }
  if (pValue < 0.05) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
        Significativo
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs bg-muted/50 text-muted-foreground border border-muted">
      Tendência
    </span>
  );
};

const MoodDifferenceIndicator = ({ diff, significant }: { diff: number; significant: boolean }) => {
  const isPositive = diff > 0;
  const Icon = isPositive ? TrendUp : diff < 0 ? TrendDown : Minus;
  const color = significant 
    ? (isPositive ? 'text-green-500' : 'text-amber-500')
    : 'text-muted-foreground';

  return (
    <div className={cn('flex items-center gap-1', color)}>
      <Icon className="w-5 h-5" />
      <span className="font-bold text-lg">
        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
      </span>
      <span className="text-xs">pontos</span>
    </div>
  );
};

function VariabilitySection({ result }: { result: ConcentrationVariabilityResult }) {
  const betterWhenStable = result.moodDifference > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="w-4 h-4 text-teal-500" />
          <span className="font-medium">{result.medicationName}</span>
        </div>
        <SignificanceBadge pValue={result.tTestResult.pValue} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={cn(
          'p-3 rounded-lg text-center',
          betterWhenStable ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted/30'
        )}>
          <p className="text-2xl font-bold text-green-500">
            {result.stablePeriodMoodMean.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">
            Humor (estável)
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {result.stableWindows} períodos
          </p>
        </div>

        <div className={cn(
          'p-3 rounded-lg text-center',
          !betterWhenStable ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted/30'
        )}>
          <p className="text-2xl font-bold text-amber-500">
            {result.varyingPeriodMoodMean.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">
            Humor (variável)
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {result.varyingWindows} períodos
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
        <span className="text-sm">
          {betterWhenStable ? 'Estabilidade favorece humor' : 'Variação favorece humor'}
        </span>
        <MoodDifferenceIndicator 
          diff={result.moodDifference} 
          significant={result.tTestResult.significant} 
        />
      </div>

      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-primary">{result.interpretation}</p>
            <p className="text-muted-foreground mt-1">{result.recommendation}</p>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-4">
        <span>CV vs Humor: r={result.correlationCVvsMood.toFixed(2)}</span>
        <span>Effect size: d={result.tTestResult.effectSize.toFixed(2)}</span>
        <span>Janela: {result.windowDays} dias</span>
      </div>
    </div>
  );
}

function IntervalSection({ result }: { result: DoseIntervalResult }) {
  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex items-center gap-2">
        <Timer className="w-4 h-4 text-violet-500" />
        <span className="font-medium">Intervalo Ótimo: {result.medicationName}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {result.binStats.map(bin => (
          <div 
            key={bin.label}
            className={cn(
              'p-2 rounded-lg text-center text-sm',
              bin.label === result.optimalIntervalLabel 
                ? 'bg-violet-500/20 border border-violet-500/30' 
                : 'bg-muted/30'
            )}
          >
            <p className="font-bold">{bin.moodMean.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">{bin.label}</p>
            <p className="text-xs text-muted-foreground">n={bin.count}</p>
          </div>
        ))}
      </div>

      <div className="p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg">
        <div className="flex items-start gap-2">
          <ChartLine className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-violet-400">{result.interpretation}</p>
            <p className="text-muted-foreground mt-1">{result.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConcentrationStabilityCard({
  medications,
  doses,
  moodEntries,
  className
}: ConcentrationStabilityCardProps) {
  const analysisResults = useMemo(() => {
    const results: Array<{
      variability: ConcentrationVariabilityResult | null;
      interval: DoseIntervalResult | null;
      medication: Medication;
    }> = [];

    for (const med of medications) {
      const variability = analyzeConcentrationVariability(med, doses, moodEntries);
      const interval = analyzeOptimalDoseInterval(med, doses, moodEntries);
      
      if (variability || interval) {
        results.push({ variability, interval, medication: med });
      }
    }

    return results;
  }, [medications, doses, moodEntries]);

  if (analysisResults.length === 0) {
    return (
      <GlassCard className={cn('p-6', className)}>
        <div className="flex items-center gap-3 mb-4">
          <Waves className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Estabilidade vs Variabilidade</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <Waves className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Dados insuficientes para análise de variabilidade.</p>
          <p className="text-sm mt-2">
            Registre pelo menos 14 dias de doses e humor para ver esta análise.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={cn('p-6', className)}>
      <div className="flex items-center gap-3 mb-6">
        <Waves className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Estabilidade vs Variabilidade</h3>
      </div>

      <div className="space-y-8">
        {analysisResults.map(({ variability, interval, medication }) => (
          <div key={medication.id} className="space-y-4">
            {variability && <VariabilitySection result={variability} />}
            {interval && <IntervalSection result={interval} />}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
        <p>
          <strong>Metodologia:</strong> Comparamos humor médio em períodos de 7 dias com 
          baixa variabilidade (CV &lt; mediana) vs alta variabilidade usando t-test.
        </p>
        <p className="mt-1">
          <strong>CV:</strong> Coeficiente de Variação = desvio padrão / média da concentração.
        </p>
      </div>
    </GlassCard>
  );
}
