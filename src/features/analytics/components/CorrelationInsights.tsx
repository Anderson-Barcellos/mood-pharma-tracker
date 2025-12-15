import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { GlassCard } from '@/shared/ui/glass-card';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import {
  TrendUp,
  TrendDown,
  Minus,
  Lightbulb,
  Clock,
  Sun,
  Moon,
  Calendar,
  ChartLineUp,
  Info,
  CheckCircle,
  WarningCircle,
  Question
} from '@phosphor-icons/react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { useState } from 'react';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import { StatisticsEngine } from '@/features/analytics/utils/statistics-engine';
import { 
  isChronicMedication,
  calculateConcentration,
  getAdjustedHalfLife 
} from '@/features/analytics/utils/pharmacokinetics';

interface CorrelationInsightsProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
}

interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'neutral' | 'info';
  title: string;
  description: string;
  detail?: string;
  value?: number;
  confidence: 'alta' | 'media' | 'baixa';
  icon: React.ReactNode;
}

interface CorrelationResult {
  medicationId: string;
  medicationName: string;
  medicationColor?: string;
  lagHours: number;
  correlation: number;
  pValue: number;
  adjustedPValue?: number;
  sampleSize: number;
  avgMoodHighConc: number;
  avgMoodLowConc: number;
  highConcSamples: number;
  lowConcSamples: number;
  bestTimeOfDay?: string;
  peakEffectHours?: number;
  isSignificant: boolean;
  concentrationMethod: 'continuous' | 'binary';
}

function getCorrelationStrength(r: number): { label: string; color: string; description: string } {
  const absR = Math.abs(r);
  if (absR >= 0.7) return {
    label: 'Forte',
    color: r > 0 ? 'bg-green-500' : 'bg-red-500',
    description: r > 0 ? 'Relação positiva consistente' : 'Relação negativa consistente'
  };
  if (absR >= 0.4) return {
    label: 'Moderada',
    color: r > 0 ? 'bg-green-400' : 'bg-red-400',
    description: r > 0 ? 'Tendência positiva visível' : 'Tendência negativa visível'
  };
  if (absR >= 0.2) return {
    label: 'Fraca',
    color: r > 0 ? 'bg-green-300' : 'bg-red-300',
    description: 'Possível relação, mas com muita variação'
  };
  return {
    label: 'Negligível',
    color: 'bg-gray-400',
    description: 'Não há relação aparente'
  };
}

function getSignificanceLabel(pValue: number): { label: string; stars: string } {
  if (pValue < 0.001) return { label: 'Altamente significativo', stars: '***' };
  if (pValue < 0.01) return { label: 'Muito significativo', stars: '**' };
  if (pValue < 0.05) return { label: 'Significativo', stars: '*' };
  return { label: 'Não significativo', stars: '' };
}

function getEffectSizeInterpretation(moodDiff: number): {
  label: string;
  color: string;
  clinical: string;
} {
  const absDiff = Math.abs(moodDiff);
  if (absDiff >= 1.5) return {
    label: 'Grande',
    color: 'text-green-600',
    clinical: 'Efeito clínico substancial'
  };
  if (absDiff >= 0.8) return {
    label: 'Médio',
    color: 'text-blue-600',
    clinical: 'Efeito clínico moderado'
  };
  if (absDiff >= 0.4) return {
    label: 'Pequeno',
    color: 'text-amber-600',
    clinical: 'Efeito clínico leve'
  };
  return {
    label: 'Mínimo',
    color: 'text-gray-500',
    clinical: 'Sem efeito clínico relevante'
  };
}

export default function CorrelationInsights({ medications, doses, moodEntries }: CorrelationInsightsProps) {
  const [showMethodology, setShowMethodology] = useState(false);

  const windowed = useMemo(() => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const dayStart = (timestamp: number) => {
      const d = new Date(timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };

    const allTimestamps = [
      ...moodEntries.map(m => m.timestamp),
      ...doses.map(d => d.timestamp),
    ].filter(t => t > 0);

    if (allTimestamps.length === 0) {
      const now = dayStart(Date.now());
      return {
        startDay: now,
        endDay: now,
        endExclusive: now + DAY_MS,
        moodEntries: [] as MoodEntry[],
        doses: [] as MedicationDose[],
        days: 1,
      };
    }

    const endDay = dayStart(Math.max(...allTimestamps));
    const minDay = dayStart(Math.min(...allTimestamps));
    const startDay = minDay;
    const endExclusive = endDay + DAY_MS;

    return {
      startDay,
      endDay,
      endExclusive,
      moodEntries: moodEntries.filter(m => m.timestamp >= startDay && m.timestamp < endExclusive),
      doses: doses.filter(d => d.timestamp >= startDay && d.timestamp < endExclusive),
      days: Math.round((endDay - startDay) / DAY_MS) + 1,
    };
  }, [moodEntries, doses]);

  const correlations = useMemo(() => {
    const results: CorrelationResult[] = [];
    const HOUR_MS = 60 * 60 * 1000;
    const bodyWeight = 70;

    for (const medication of medications) {
      const medDoses = windowed.doses.filter(d => d.medicationId === medication.id);
      if (medDoses.length < 5) continue;

      if (windowed.moodEntries.length < 7) continue;

      const isChronic = isChronicMedication(medication);
      const candidateLagsHours = isChronic 
        ? [0, 6, 12, 24, 48, 72]
        : [0, 1, 3, 6];

      type LagCandidate = {
        lagHours: number;
        correlation: number;
        pValue: number;
        sampleSize: number;
        avgMoodHighConc: number;
        avgMoodLowConc: number;
        highConcSamples: number;
        lowConcSamples: number;
      };

      const candidates: LagCandidate[] = [];

      for (const lagHours of candidateLagsHours) {
        const lagMs = lagHours * HOUR_MS;
        const concentrations: number[] = [];
        const moods: number[] = [];

        for (const mood of windowed.moodEntries) {
          const targetTime = mood.timestamp - lagMs;
          const concentration = calculateConcentration(
            medication,
            medDoses,
            targetTime,
            bodyWeight
          );

          if (concentration > 0) {
            concentrations.push(concentration);
            moods.push(mood.moodScore);
          }
        }

        if (concentrations.length < 7) {
          continue;
        }

        const corr = StatisticsEngine.pearsonCorrelation(concentrations, moods);

        const medianConc = [...concentrations].sort((a, b) => a - b)[
          Math.floor(concentrations.length / 2)
        ];

        const highConc: number[] = [];
        const lowConc: number[] = [];

        for (let i = 0; i < concentrations.length; i++) {
          if (concentrations[i] >= medianConc) {
            highConc.push(moods[i]);
          } else {
            lowConc.push(moods[i]);
          }
        }

        const avgMoodHighConc = highConc.length > 0
          ? highConc.reduce((a, b) => a + b, 0) / highConc.length
          : 0;
        const avgMoodLowConc = lowConc.length > 0
          ? lowConc.reduce((a, b) => a + b, 0) / lowConc.length
          : 0;

        candidates.push({
          lagHours,
          correlation: corr.value,
          pValue: corr.pValue,
          sampleSize: corr.sampleSize,
          avgMoodHighConc,
          avgMoodLowConc,
          highConcSamples: highConc.length,
          lowConcSamples: lowConc.length,
        });
      }

      const viable = candidates.filter(c => c.sampleSize >= 7);
      const picked = (viable.length > 0 ? viable : candidates).reduce((best, curr) => {
        return Math.abs(curr.correlation) > Math.abs(best.correlation) ? curr : best;
      }, candidates[0]);

      if (!picked) continue;

      const dosesByHour = new Map<number, number[]>();
      for (const dose of medDoses) {
        const doseDate = new Date(dose.timestamp);
        const hour = doseDate.getHours();
        const day = doseDate.toDateString();

        const dayMoods = windowed.moodEntries.filter(m => {
          const moodDate = new Date(m.timestamp);
          return moodDate.toDateString() === day &&
            moodDate.getTime() > dose.timestamp &&
            moodDate.getTime() < dose.timestamp + 12 * 60 * 60 * 1000;
        });

        if (dayMoods.length > 0) {
          const avgMood = dayMoods.reduce((a, b) => a + b.moodScore, 0) / dayMoods.length;
          if (!dosesByHour.has(hour)) dosesByHour.set(hour, []);
          dosesByHour.get(hour)!.push(avgMood);
        }
      }

      let bestHour = -1;
      let bestAvg = 0;
      for (const [hour, moods] of dosesByHour) {
        const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
        if (avg > bestAvg) {
          bestAvg = avg;
          bestHour = hour;
        }
      }

      results.push({
        medicationId: medication.id,
        medicationName: medication.name,
        medicationColor: medication.color,
        lagHours: picked.lagHours,
        correlation: picked.correlation,
        pValue: picked.pValue,
        sampleSize: picked.sampleSize,
        avgMoodHighConc: picked.avgMoodHighConc,
        avgMoodLowConc: picked.avgMoodLowConc,
        highConcSamples: picked.highConcSamples,
        lowConcSamples: picked.lowConcSamples,
        bestTimeOfDay: bestHour >= 0 ? `${bestHour.toString().padStart(2, '0')}:00` : undefined,
        peakEffectHours: medication.halfLife ? Math.round(medication.halfLife * 0.7) : undefined,
        isSignificant: picked.pValue < 0.05,
        concentrationMethod: 'continuous',
      });
    }

    const allPValues = results.map(r => r.pValue);
    if (allPValues.length > 1) {
      const fdrResult = StatisticsEngine.benjaminiHochbergFDR(allPValues, 0.05);
      results.forEach((r, i) => {
        r.adjustedPValue = fdrResult.adjustedPValues[i];
        r.isSignificant = fdrResult.significantIndices.includes(i);
      });
    }

    return results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }, [medications, windowed.doses, windowed.moodEntries]);

  const insights = useMemo(() => {
    const result: Insight[] = [];

    for (const corr of correlations) {
      const hasSignificantCorrelation = corr.isSignificant && Math.abs(corr.correlation) >= 0.15;
      const diff = corr.avgMoodHighConc - corr.avgMoodLowConc;
      const hasLargeEffect = Math.abs(diff) >= 0.5;

      if (hasSignificantCorrelation || hasLargeEffect) {
        const lagLabel = corr.lagHours === 0
          ? 'simultaneamente'
          : corr.lagHours < 24
          ? `${corr.lagHours}h antes`
          : `${Math.round(corr.lagHours / 24)}d antes`;

        const confidence: 'alta' | 'media' | 'baixa' =
          (corr.adjustedPValue ?? corr.pValue) < 0.01 && corr.sampleSize >= 20 ? 'alta' :
          (corr.adjustedPValue ?? corr.pValue) < 0.05 && corr.sampleSize >= 10 ? 'media' : 'baixa';

        const fdrNote = corr.adjustedPValue && corr.adjustedPValue !== corr.pValue
          ? ` (FDR-corrigido: p=${corr.adjustedPValue.toFixed(3)})`
          : '';

        if (corr.correlation > 0.15) {
          result.push({
            id: `positive-${corr.medicationId}`,
            type: 'positive',
            title: `${corr.medicationName}: concentração correlaciona com melhor humor`,
            description: `Humor ${diff.toFixed(1)} pts maior em altas vs baixas concentrações (${lagLabel})`,
            detail: `Correlação de Pearson: r=${corr.correlation.toFixed(2)} (p=${corr.pValue.toFixed(3)}${fdrNote}). ` +
                    `Baseado em ${corr.sampleSize} registros de humor com concentração plasmática calculada. ` +
                    `Alta concentração (≥mediana): ${corr.avgMoodHighConc.toFixed(1)}/10 (n=${corr.highConcSamples}). ` +
                    `Baixa concentração (<mediana): ${corr.avgMoodLowConc.toFixed(1)}/10 (n=${corr.lowConcSamples}). ` +
                    `${corr.isSignificant ? 'Diferença estatisticamente significativa após correção FDR.' : 'Não significativo após correção para múltiplas comparações.'}`,
            value: corr.correlation,
            confidence,
            icon: <TrendUp className="w-5 h-5 text-green-500" weight="bold" />
          });
        } else if (corr.correlation < -0.15) {
          result.push({
            id: `negative-${corr.medicationId}`,
            type: 'negative',
            title: `Atenção: ${corr.medicationName} - concentração e humor`,
            description: `Humor ${Math.abs(diff).toFixed(1)} pts menor em altas concentrações (${lagLabel})`,
            detail: `Correlação negativa: r=${corr.correlation.toFixed(2)} (p=${corr.pValue.toFixed(3)}${fdrNote}). ` +
                    `Isso pode indicar: (1) efeito adverso em doses altas, (2) dosagem reativa (toma mais quando pior), ` +
                    `ou (3) fase de ajuste de dose. Analise com seu médico. ` +
                    `Baseado em ${corr.sampleSize} registros.`,
            value: corr.correlation,
            confidence,
            icon: <TrendDown className="w-5 h-5 text-red-500" weight="bold" />
          });
        }
      }
    }

    // Weekend/weekday patterns
    const weekdayMoods = windowed.moodEntries.filter(m => {
      const day = new Date(m.timestamp).getDay();
      return day !== 0 && day !== 6;
    });
    const weekendMoods = windowed.moodEntries.filter(m => {
      const day = new Date(m.timestamp).getDay();
      return day === 0 || day === 6;
    });

    if (weekdayMoods.length > 5 && weekendMoods.length > 5) {
      const avgWeekday = weekdayMoods.reduce((a, b) => a + b.moodScore, 0) / weekdayMoods.length;
      const avgWeekend = weekendMoods.reduce((a, b) => a + b.moodScore, 0) / weekendMoods.length;
      const diff = avgWeekend - avgWeekday;

      if (Math.abs(diff) > 0.5) {
        result.push({
          id: 'weekend-pattern',
          type: diff > 0 ? 'positive' : 'neutral',
          title: diff > 0 ? 'Fins de semana são melhores' : 'Dias úteis são melhores',
          description: `Diferença média de ${Math.abs(diff).toFixed(1)} pontos`,
          detail: `Pode indicar influência de rotina, estresse de trabalho ou padrões sociais.`,
          confidence: Math.abs(diff) > 1 ? 'alta' : 'media',
          icon: <Calendar className="w-5 h-5 text-blue-500" weight="bold" />
        });
      }
    }

    // Time of day patterns
    const morningMoods = windowed.moodEntries.filter(m => new Date(m.timestamp).getHours() < 12);
    const afternoonMoods = windowed.moodEntries.filter(m => {
      const h = new Date(m.timestamp).getHours();
      return h >= 12 && h < 18;
    });
    const eveningMoods = windowed.moodEntries.filter(m => new Date(m.timestamp).getHours() >= 18);

    const periods = [
      { name: 'manhã', moods: morningMoods },
      { name: 'tarde', moods: afternoonMoods },
      { name: 'noite', moods: eveningMoods }
    ].filter(p => p.moods.length > 5);

    if (periods.length >= 2) {
      const avgByPeriod = periods.map(p => ({
        name: p.name,
        avg: p.moods.reduce((a, b) => a + b.moodScore, 0) / p.moods.length,
        count: p.moods.length
      }));

      const best = avgByPeriod.reduce((a, b) => a.avg > b.avg ? a : b);
      const worst = avgByPeriod.reduce((a, b) => a.avg < b.avg ? a : b);
      const diff = best.avg - worst.avg;

      if (diff > 0.5) {
        result.push({
          id: 'time-pattern',
          type: 'info',
          title: `Melhor período: ${best.name}`,
          description: `Humor ${diff.toFixed(1)} pontos maior que pela ${worst.name}`,
          detail: `Isso pode ajudar a planejar atividades importantes para seu melhor período.`,
          confidence: diff > 1 ? 'alta' : 'media',
          icon: <Clock className="w-5 h-5 text-purple-500" weight="bold" />
        });
      }
    }

    return result;
  }, [correlations, windowed.moodEntries]);

  if (medications.length === 0 || windowed.doses.length < 10 || windowed.moodEntries.length < 10) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartLineUp className="w-5 h-5" />
            Insights & Correlações
          </CardTitle>
          <CardDescription>
            Continue registrando para descobrir padrões
          </CardDescription>
          <div className="pt-3">
            <div className="text-xs text-muted-foreground">
              Análise: <span className="font-medium">{windowed.days} dias de dados</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ChartLineUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Precisamos de mais dados para gerar insights.</p>
            <p className="text-sm mt-2">
              Mínimo: 10 doses e 10 registros de humor
            </p>
            <div className="mt-4 text-xs">
              <p>Atualmente: {windowed.doses.length} doses, {windowed.moodEntries.length} registros de humor</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-xs text-muted-foreground mb-2">
        Análise: <span className="font-medium">{windowed.days} dias de dados</span>
      </div>

      {/* Insights Section */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Insights Automáticos
            </CardTitle>
            <CardDescription>
              Padrões descobertos nos seus dados - clique para ver detalhes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map(insight => (
              <Collapsible key={insight.id}>
                <CollapsibleTrigger className="w-full text-left">
                  <GlassCard
                    className={`p-3 transition-all hover:scale-[1.01] ${
                      insight.type === 'positive' ? 'border-green-500/30 bg-green-500/5' :
                      insight.type === 'negative' ? 'border-red-500/30 bg-red-500/5' :
                      insight.type === 'info' ? 'border-blue-500/30 bg-blue-500/5' :
                      ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{insight.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{insight.title}</p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              insight.confidence === 'alta' ? 'bg-green-500/10 text-green-600 border-green-500/30' :
                              insight.confidence === 'media' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' :
                              'bg-muted text-muted-foreground'
                            }`}
                          >
                            {insight.confidence === 'alta' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {insight.confidence === 'media' && <Question className="w-3 h-3 mr-1" />}
                            {insight.confidence === 'baixa' && <WarningCircle className="w-3 h-3 mr-1" />}
                            Confiança {insight.confidence}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                      </div>
                      {insight.value !== undefined && (
                        <Badge variant="outline" className="shrink-0 font-mono">
                          r={insight.value.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  </GlassCard>
                </CollapsibleTrigger>
                {insight.detail && (
                  <CollapsibleContent>
                    <div className="mt-2 ml-8 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 mt-0.5 shrink-0" />
                        <p>{insight.detail}</p>
                      </div>
                    </div>
                  </CollapsibleContent>
                )}
              </Collapsible>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Correlations Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ChartLineUp className="w-5 h-5" />
                Correlações Medicamento ↔ Humor
              </CardTitle>
              <CardDescription>
                Análise estatística de {correlations.reduce((a, c) => a + c.sampleSize, 0)} dias de dados
              </CardDescription>
            </div>
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Info className="w-3 h-3" />
              {showMethodology ? 'Ocultar' : 'Como interpretar?'}
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Methodology explanation */}
          {showMethodology && (
            <div className="bg-muted/30 p-4 rounded-lg text-xs space-y-2 mb-4">
              <p className="font-medium">Guia de interpretação:</p>
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span><strong>r positivo:</strong> Humor tende a ser melhor no período analisado após a dose</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  <span><strong>r negativo:</strong> Humor tende a ser menor (pode ser dosagem reativa ou confundidores)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">***</span>
                  <span>p &lt; 0.001 (muito confiável)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">**</span>
                  <span>p &lt; 0.01 (confiável)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">*</span>
                  <span>p &lt; 0.05 (possivelmente significativo)</span>
                </div>
              </div>
              <div className="pt-2 space-y-1 text-muted-foreground">
                <p><strong>Novo método (concentração contínua vs binário):</strong></p>
                <p>Este componente agora usa concentração plasmática calculada via farmacocinética, não presença/ausência de dose.</p>
                <p>Para medicamentos crônicos (SSRI, estabilizadores), testa delays de 0–72h para encontrar lag ideal.</p>
                <p><strong>Correção FDR (Benjamini-Hochberg):</strong> Controla falsos positivos ao testar múltiplas correlações simultaneamente.</p>
                <p><strong>Expectativas por classe:</strong></p>
                <p>- Estimulantes: lag 0-6h, correlação rápida com foco/energia</p>
                <p>- SSRIs/SNRIs: lag 24-48h, efeito crônico em humor e ansiedade</p>
                <p>- Estabilizadores: lag 24-72h, variabilidade importa mais que nível absoluto</p>
                <p>Correlação não implica causalidade. Discuta achados com seu médico.</p>
              </div>
            </div>
          )}

          {correlations.map(corr => {
            const strength = getCorrelationStrength(corr.correlation);
            const significance = getSignificanceLabel(corr.pValue);
            const normalizedCorr = (corr.correlation + 1) / 2 * 100;

            return (
              <GlassCard
                key={corr.medicationId}
                className={`p-4 ${corr.isSignificant ? 'border-primary/30' : ''}`}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-8 rounded-full"
                        style={{ backgroundColor: corr.medicationColor || '#8b5cf6' }}
                      />
                      <div>
                        <span className="font-medium">{corr.medicationName}</span>
                        {corr.lagHours > 0 && (
                          <span className="ml-2 text-[10px] text-muted-foreground">
                            lag {corr.lagHours < 24 ? `${corr.lagHours}h` : `${Math.round(corr.lagHours / 24)}d`}
                          </span>
                        )}
                        {significance.stars && (
                          <span className="ml-2 text-primary font-mono text-sm" title={significance.label}>
                            {significance.stars}
                          </span>
                        )}
                        {corr.adjustedPValue && corr.adjustedPValue !== corr.pValue && (
                          <span className="ml-2 text-[10px] text-blue-500" title="FDR-corrected">
                            FDR
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {corr.correlation > 0.1 ? (
                        <TrendUp className="w-4 h-4 text-green-500" />
                      ) : corr.correlation < -0.1 ? (
                        <TrendDown className="w-4 h-4 text-red-500" />
                      ) : (
                        <Minus className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={`font-mono text-lg font-semibold ${
                        corr.correlation > 0 ? 'text-green-600' :
                        corr.correlation < 0 ? 'text-red-600' : ''
                      }`}>
                        {corr.correlation > 0 ? '+' : ''}{corr.correlation.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Correlation bar */}
                  <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`absolute h-full transition-all ${strength.color}`}
                      style={{
                        left: corr.correlation < 0 ? `${normalizedCorr}%` : '50%',
                        width: `${Math.abs(corr.correlation) * 50}%`
                      }}
                    />
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-400/50" />
                  </div>

                  {/* Stats grid */}
                  {corr.lagHours > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      Concentração medida {corr.lagHours < 24 ? `${corr.lagHours}h` : `${Math.round(corr.lagHours / 24)}d`} antes do humor
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="bg-green-500/10 rounded-lg p-2">
                      <div className="text-muted-foreground">Alta conc.</div>
                      <div className="font-semibold text-green-600">
                        {corr.avgMoodHighConc.toFixed(1)}/10
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {corr.highConcSamples} registros
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <div className="text-muted-foreground">Força</div>
                      <div className="font-semibold">{strength.label}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {strength.description}
                      </div>
                    </div>
                    <div className="bg-gray-500/10 rounded-lg p-2">
                      <div className="text-muted-foreground">Baixa conc.</div>
                      <div className="font-semibold text-gray-600">
                        {corr.avgMoodLowConc.toFixed(1)}/10
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {corr.lowConcSamples} registros
                      </div>
                    </div>
                  </div>

                  {/* Effect Size Clinical Interpretation */}
                  {(() => {
                    const diff = corr.avgMoodHighConc - corr.avgMoodLowConc;
                    const effectSize = getEffectSizeInterpretation(diff);
                    return (
                      <div className="flex items-center justify-between bg-muted/20 rounded-lg p-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Efeito Clínico:</span>
                          <span className={`font-semibold ${effectSize.color}`}>
                            {effectSize.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({effectSize.clinical})
                          </span>
                        </div>
                        <span className={`font-mono ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)} pts
                        </span>
                      </div>
                    );
                  })()}

                  {/* P-value info */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                    <span>
                      p-value: {corr.pValue < 0.001 ? '<0.001' : corr.pValue.toFixed(3)}
                      {corr.adjustedPValue && (
                        <> | FDR: {corr.adjustedPValue < 0.001 ? '<0.001' : corr.adjustedPValue.toFixed(3)}</>
                      )}
                      {' '}({significance.label})
                    </span>
                    <span>n = {corr.sampleSize} registros</span>
                  </div>
                </div>
              </GlassCard>
            );
          })}

          {correlations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ChartLineUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma correlação calculável ainda.</p>
              <p className="text-sm mt-2">
                Registre pelo menos 7 doses de um medicamento para ver análises.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
