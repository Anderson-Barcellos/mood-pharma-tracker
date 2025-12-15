/**
 * ImpactAnalysisTab - Main tab showing medication impacts on mood metrics
 *
 * Features:
 * - "What improves your scores" section (positive impacts)
 * - "What may be hurting" section (negative impacts)
 * - Red flags alerts
 * - Stability metrics overview
 */

import { useMemo } from 'react';
import { GlassCard } from '@/shared/ui/glass-card';
import {
  TrendUp,
  TrendDown,
  Warning,
  CheckCircle,
  Lightning,
  Brain,
  Drop,
  Target,
  ArrowsLeftRight,
  Pill,
  Info,
  ShieldCheck,
  Heartbeat
} from '@phosphor-icons/react';
import { cn } from '@/shared/utils';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import {
  generateInsightsReport,
  type ActionableInsight,
  type RedFlag,
  type StabilityMetrics,
  type MoodMetric,
  METRIC_LABELS
} from '@/features/analytics/utils/insights-generator';

interface ImpactAnalysisTabProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  timeframeDays?: number;
  className?: string;
}

// Icon mapping for metrics
const getMetricIcon = (metric: MoodMetric) => {
  switch (metric) {
    case 'humor': return <Brain className="w-4 h-4 text-purple-500" />;
    case 'ansiedade': return <Drop className="w-4 h-4 text-rose-500" />;
    case 'energia': return <Lightning className="w-4 h-4 text-amber-500" />;
    case 'foco': return <Target className="w-4 h-4 text-blue-500" />;
    case 'cognicao': return <Brain className="w-4 h-4 text-violet-500" />;
    case 'attShift': return <ArrowsLeftRight className="w-4 h-4 text-cyan-500" />;
  }
};

// Significance badge
const SignificanceBadge = ({ significance }: { significance: string }) => {
  const colors = {
    high: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    none: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  };

  const labels = {
    high: '★★★',
    medium: '★★',
    low: '★',
    none: '-'
  };

  return (
    <span className={cn(
      'px-1.5 py-0.5 rounded text-xs font-mono border',
      colors[significance as keyof typeof colors] || colors.none
    )}>
      {labels[significance as keyof typeof labels] || '-'}
    </span>
  );
};

// Insight Card Component
const InsightCard = ({ insight, variant }: { insight: ActionableInsight; variant: 'positive' | 'negative' }) => {
  const isPositive = variant === 'positive';

  return (
    <GlassCard className={cn(
      'p-4 border-l-4',
      isPositive ? 'border-l-green-500' : 'border-l-red-500'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Pill className="w-4 h-4 text-teal-500 flex-shrink-0" />
            <span className="font-semibold truncate">{insight.medication}</span>
            <span className="text-muted-foreground">→</span>
            {getMetricIcon(insight.metric)}
            <span className="text-sm text-muted-foreground">{insight.metricLabel}</span>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <span className={cn(
              'text-2xl font-bold',
              isPositive ? 'text-green-500' : 'text-red-500'
            )}>
              {insight.correlation > 0 ? '+' : ''}{insight.correlation.toFixed(2)}
            </span>
            {typeof insight.lagHours === 'number' && insight.lagHours !== 0 && (
              <span className="text-xs text-muted-foreground font-mono">
                +{insight.lagHours}h
              </span>
            )}
            <SignificanceBadge significance={insight.significance} />
            <span className="text-xs text-muted-foreground">
              p={insight.pValue.toFixed(3)}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            {insight.interpretation}
          </p>

          <div className={cn(
            'p-2 rounded-md text-sm',
            isPositive ? 'bg-green-500/10' : 'bg-orange-500/10'
          )}>
            {isPositive ? (
              <CheckCircle className="w-4 h-4 inline mr-2 text-green-500" />
            ) : (
              <Warning className="w-4 h-4 inline mr-2 text-orange-500" />
            )}
            {insight.recommendation}
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

// Red Flag Alert Component
const RedFlagAlert = ({ flag }: { flag: RedFlag }) => {
  const isAlert = flag.severity === 'alert';

  return (
    <GlassCard className={cn(
      'p-4 border',
      isAlert ? 'border-red-500/50 bg-red-500/5' : 'border-yellow-500/50 bg-yellow-500/5'
    )}>
      <div className="flex items-start gap-3">
        <Warning className={cn(
          'w-5 h-5 flex-shrink-0 mt-0.5',
          isAlert ? 'text-red-500' : 'text-yellow-500'
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{flag.title}</span>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs',
              isAlert ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
            )}>
              {isAlert ? 'Alerta' : 'Atenção'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{flag.description}</p>
          <p className="text-sm">{flag.suggestion}</p>
        </div>
      </div>
    </GlassCard>
  );
};

// Stability Metric Badge
const StabilityBadge = ({ stability }: { stability: StabilityMetrics }) => {
  const colors = {
    stable: 'bg-green-500/20 text-green-400',
    variable: 'bg-yellow-500/20 text-yellow-400',
    volatile: 'bg-red-500/20 text-red-400'
  };

  const labels = {
    stable: 'Estável',
    variable: 'Variável',
    volatile: 'Volátil'
  };

  const trendIcon = stability.trend7d > 0.5 ? (
    <TrendUp className="w-3 h-3 text-green-500" />
  ) : stability.trend7d < -0.5 ? (
    <TrendDown className="w-3 h-3 text-red-500" />
  ) : null;

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
      {getMetricIcon(stability.metric)}
      <span className="text-sm font-medium">{stability.metricLabel}</span>
      <span className={cn('px-2 py-0.5 rounded text-xs', colors[stability.stability])}>
        {labels[stability.stability]}
      </span>
      <span className="text-sm text-muted-foreground ml-auto">
        μ={stability.mean.toFixed(1)}
      </span>
      {trendIcon}
    </div>
  );
};

export default function ImpactAnalysisTab({
  medications,
  doses,
  moodEntries,
  timeframeDays,
  className
}: ImpactAnalysisTabProps) {
  // Generate the full insights report
  const report = useMemo(() =>
    generateInsightsReport(medications, doses, moodEntries, timeframeDays),
    [medications, doses, moodEntries, timeframeDays]
  );

  const hasData = report.dataQuality.moodEntries >= 5;
  const hasMedications = medications.length > 0;
  const hasInsights = report.topPositiveImpacts.length > 0 || report.topNegativeImpacts.length > 0;

  if (!hasMedications) {
    return (
      <GlassCard className={cn('p-12 text-center', className)}>
        <Pill className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">Sem Medicamentos</h3>
        <p className="text-muted-foreground">
          Adicione medicamentos para analisar seu impacto nos seus escores.
        </p>
      </GlassCard>
    );
  }

  if (!hasData) {
    return (
      <GlassCard className={cn('p-12 text-center', className)}>
        <Info className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">Dados Insuficientes</h3>
        <p className="text-muted-foreground">
          Registre pelo menos 5 entradas de humor para gerar análise de impacto.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Atualmente: {report.dataQuality.moodEntries} entradas
        </p>
      </GlassCard>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Red Flags Section - Show first if any */}
      {report.redFlags.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Warning className="w-5 h-5 text-yellow-500" />
            Pontos de Atenção
          </h3>
          <div className="space-y-3">
            {report.redFlags.map(flag => (
              <RedFlagAlert key={flag.id} flag={flag} />
            ))}
          </div>
        </div>
      )}

      {/* Data Quality Summary */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Heartbeat className="w-5 h-5 text-primary" />
          <span className="font-medium">Qualidade dos Dados</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{report.dataQuality.moodEntries}</p>
            <p className="text-xs text-muted-foreground">Registros de Humor</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{report.dataQuality.doses}</p>
            <p className="text-xs text-muted-foreground">Doses Registradas</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{report.dataQuality.medications}</p>
            <p className="text-xs text-muted-foreground">Medicamentos</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{report.dataQuality.coverage.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Cobertura do Período</p>
          </div>
        </div>
      </GlassCard>

      {/* Positive Impacts Section */}
      {report.topPositiveImpacts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendUp className="w-5 h-5 text-green-500" />
            O Que Melhora Seus Escores
          </h3>
          <div className="space-y-3">
            {report.topPositiveImpacts.map(insight => (
              <InsightCard key={insight.id} insight={insight} variant="positive" />
            ))}
          </div>
        </div>
      )}

      {/* Negative Impacts Section */}
      {report.topNegativeImpacts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendDown className="w-5 h-5 text-red-500" />
            O Que Pode Estar Prejudicando
          </h3>
          <div className="space-y-3">
            {report.topNegativeImpacts.map(insight => (
              <InsightCard key={insight.id} insight={insight} variant="negative" />
            ))}
          </div>
        </div>
      )}

      {/* No Significant Insights */}
      {!hasInsights && (
        <GlassCard className="p-8 text-center">
          <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-70" />
          <h3 className="text-lg font-medium mb-2">Sem Correlações Significativas</h3>
          <p className="text-muted-foreground">
            Nenhuma correlação estatisticamente significativa foi encontrada entre seus medicamentos e métricas de humor.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Isso pode indicar que os efeitos estão estáveis ou que mais dados são necessários.
          </p>
        </GlassCard>
      )}

      {/* Stability Metrics */}
      {report.stabilityMetrics.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Estabilidade das Métricas
          </h3>
          <GlassCard className="p-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {report.stabilityMetrics.map(stability => (
                <StabilityBadge key={stability.metric} stability={stability} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              μ = média • Tendência de 7 dias: ↑ melhorando, ↓ piorando
            </p>
          </GlassCard>
        </div>
      )}

      {/* Legend */}
      <GlassCard variant="subtle" className="p-4">
        <h4 className="text-sm font-medium mb-2">Legenda de Significância</h4>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>★★★ Alta (p {'<'} 0.01)</span>
          <span>★★ Média (p {'<'} 0.05)</span>
          <span>★ Baixa (p {'<'} 0.1)</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Correlações positivas (r {'>'} 0) indicam que quando a concentração do medicamento aumenta, a métrica tende a aumentar.
          Para ansiedade, correlação negativa é desejável (medicamento reduz ansiedade).
        </p>
      </GlassCard>
    </div>
  );
}
