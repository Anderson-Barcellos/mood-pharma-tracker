/**
 * TopInsightsCard - Compact card showing top insights for Dashboard
 *
 * Shows:
 * - Top 3 positive impacts (what's helping)
 * - Top 2 negative impacts (what to watch)
 * - Red flag count if any
 */

import React, { useMemo } from 'react';
import { GlassCard } from '@/shared/ui/glass-card';
import {
  TrendUp,
  TrendDown,
  Warning,
  Lightning,
  Brain,
  Drop,
  Target,
  ArrowsLeftRight,
  Pill,
  ArrowRight,
  Info
} from '@phosphor-icons/react';
import { cn } from '@/shared/utils';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import {
  generateInsightsReport,
  type ActionableInsight,
  type MoodMetric
} from '@/features/analytics/utils/insights-generator';

interface TopInsightsCardProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  timeframeDays?: number;
  onViewMore?: () => void;
  className?: string;
}

const getMetricIcon = (metric: MoodMetric): React.ReactNode => {
  const icons: Record<MoodMetric, React.ReactNode> = {
    humor: <Brain className="w-3 h-3 text-purple-500" />,
    ansiedade: <Drop className="w-3 h-3 text-rose-500" />,
    energia: <Lightning className="w-3 h-3 text-amber-500" />,
    foco: <Target className="w-3 h-3 text-blue-500" />,
    cognicao: <Brain className="w-3 h-3 text-violet-500" />,
    attShift: <ArrowsLeftRight className="w-3 h-3 text-cyan-500" />
  };
  return icons[metric];
};

const CompactInsight = ({ insight, isPositive }: { insight: ActionableInsight; isPositive: boolean }) => (
  <div className={cn(
    'flex items-center gap-2 p-2 rounded-lg text-sm',
    isPositive ? 'bg-green-500/10' : 'bg-red-500/10'
  )}>
    <Pill className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
    <span className="font-medium truncate flex-1">{insight.medication}</span>
    <span className="text-muted-foreground">→</span>
    {getMetricIcon(insight.metric)}
    <span className={cn(
      'font-bold text-xs tabular-nums',
      isPositive ? 'text-green-500' : 'text-red-500'
    )}>
      {insight.correlation > 0 ? '+' : ''}{insight.correlation.toFixed(2)}
    </span>
    {typeof insight.lagHours === 'number' && insight.lagHours !== 0 && (
      <span className="text-[10px] text-muted-foreground font-mono">
        +{insight.lagHours}h
      </span>
    )}
  </div>
);

export default function TopInsightsCard({
  medications,
  doses,
  moodEntries,
  timeframeDays = 30,
  onViewMore,
  className
}: TopInsightsCardProps) {
  const report = useMemo(() =>
    generateInsightsReport(medications, doses, moodEntries, timeframeDays),
    [medications, doses, moodEntries, timeframeDays]
  );

  const hasData = report.dataQuality.moodEntries >= 5 && medications.length > 0;
  const hasInsights = report.topPositiveImpacts.length > 0 || report.topNegativeImpacts.length > 0;
  const redFlagCount = report.redFlags.length;

  if (!hasData) {
    return (
      <GlassCard className={cn('p-4', className)}>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg">
            <Lightning className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h3 className="font-semibold">Insights</h3>
            <p className="text-xs text-muted-foreground">Impacto dos medicamentos</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
          <Info className="w-4 h-4" />
          <span>Registre mais dados para gerar insights</span>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg">
            <Lightning className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h3 className="font-semibold">Top Insights</h3>
            <p className="text-xs text-muted-foreground">
              {report.allInsights.length} correlações encontradas
            </p>
          </div>
        </div>
        {redFlagCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
            <Warning className="w-3 h-3" />
            <span>{redFlagCount}</span>
          </div>
        )}
      </div>

      {hasInsights ? (
        <div className="space-y-4">
          {/* Positive Impacts */}
          {report.topPositiveImpacts.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs text-green-500">
                <TrendUp className="w-3.5 h-3.5" />
                <span className="font-medium">O que melhora</span>
              </div>
              <div className="space-y-1.5">
                {report.topPositiveImpacts.slice(0, 3).map(insight => (
                  <CompactInsight key={insight.id} insight={insight} isPositive />
                ))}
              </div>
            </div>
          )}

          {/* Negative Impacts */}
          {report.topNegativeImpacts.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs text-red-500">
                <TrendDown className="w-3.5 h-3.5" />
                <span className="font-medium">Atenção</span>
              </div>
              <div className="space-y-1.5">
                {report.topNegativeImpacts.slice(0, 2).map(insight => (
                  <CompactInsight key={insight.id} insight={insight} isPositive={false} />
                ))}
              </div>
            </div>
          )}

          {/* View More Button */}
          {onViewMore && (
            <button
              onClick={onViewMore}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
            >
              <span>Ver análise completa</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <p>Nenhuma correlação significativa ainda</p>
          <p className="text-xs mt-1">Continue registrando para encontrar padrões</p>
        </div>
      )}
    </GlassCard>
  );
}
