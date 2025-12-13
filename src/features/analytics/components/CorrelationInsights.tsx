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
  correlation: number;
  pValue: number;
  sampleSize: number;
  avgMoodWithDose: number;
  avgMoodWithoutDose: number;
  daysWithDose: number;
  daysWithoutDose: number;
  bestTimeOfDay?: string;
  peakEffectHours?: number;
  isSignificant: boolean;
}

function calculateCorrelationWithPValue(x: number[], y: number[]): { r: number; pValue: number } {
  if (x.length !== y.length || x.length < 3) return { r: 0, pValue: 1 };

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return { r: 0, pValue: 1 };

  const r = numerator / denominator;

  // Calculate t-statistic and p-value (two-tailed)
  if (Math.abs(r) >= 1) return { r, pValue: 0 };

  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const df = n - 2;

  // Approximate p-value using Student's t-distribution
  // Using a simple approximation for small samples
  const pValue = 2 * (1 - tCDF(Math.abs(t), df));

  return { r, pValue };
}

// Approximation of Student's t CDF
function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;

  // Beta function approximation for incomplete beta
  // Simple approximation good enough for p-value estimation
  if (t < 0) return 0.5 * incompleteBeta(x, a, b);
  return 1 - 0.5 * incompleteBeta(x, a, b);
}

function incompleteBeta(x: number, a: number, b: number): number {
  // Simple approximation using continued fraction
  const maxIterations = 100;
  const epsilon = 1e-10;

  if (x === 0) return 0;
  if (x === 1) return 1;

  let result = 1;
  let term = 1;

  for (let i = 1; i <= maxIterations; i++) {
    term *= (a + i - 1) * x / i;
    result += term;
    if (Math.abs(term) < epsilon) break;
  }

  const beta = Math.exp(
    lgamma(a) + lgamma(b) - lgamma(a + b)
  );

  return Math.pow(x, a) * Math.pow(1 - x, b) * result / (a * beta);
}

function lgamma(x: number): number {
  // Lanczos approximation for log-gamma
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  }

  x -= 1;
  let a = c[0];
  for (let i = 1; i < g + 2; i++) {
    a += c[i] / (x + i);
  }

  const t = x + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
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

export default function CorrelationInsights({ medications, doses, moodEntries }: CorrelationInsightsProps) {
  const [showMethodology, setShowMethodology] = useState(false);

  const correlations = useMemo(() => {
    const results: CorrelationResult[] = [];

    for (const medication of medications) {
      const medDoses = doses.filter(d => d.medicationId === medication.id);
      if (medDoses.length < 7) continue;

      const doseDays = new Set(medDoses.map(d => new Date(d.timestamp).toDateString()));

      const moodByDay = new Map<string, number[]>();
      for (const mood of moodEntries) {
        const day = new Date(mood.timestamp).toDateString();
        if (!moodByDay.has(day)) moodByDay.set(day, []);
        moodByDay.get(day)!.push(mood.moodScore);
      }

      const daysWithDose: number[] = [];
      const daysWithoutDose: number[] = [];
      const allDailyMoods: number[] = [];
      const dosePresence: number[] = [];

      for (const [day, moods] of moodByDay) {
        const avgMood = moods.reduce((a, b) => a + b, 0) / moods.length;
        allDailyMoods.push(avgMood);

        if (doseDays.has(day)) {
          daysWithDose.push(avgMood);
          dosePresence.push(1);
        } else {
          daysWithoutDose.push(avgMood);
          dosePresence.push(0);
        }
      }

      const { r: correlation, pValue } = calculateCorrelationWithPValue(dosePresence, allDailyMoods);

      const avgMoodWithDose = daysWithDose.length > 0
        ? daysWithDose.reduce((a, b) => a + b, 0) / daysWithDose.length
        : 0;
      const avgMoodWithoutDose = daysWithoutDose.length > 0
        ? daysWithoutDose.reduce((a, b) => a + b, 0) / daysWithoutDose.length
        : 0;

      const dosesByHour = new Map<number, number[]>();
      for (const dose of medDoses) {
        const doseDate = new Date(dose.timestamp);
        const hour = doseDate.getHours();
        const day = doseDate.toDateString();

        const dayMoods = moodEntries.filter(m => {
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
        correlation,
        pValue,
        sampleSize: moodByDay.size,
        avgMoodWithDose,
        avgMoodWithoutDose,
        daysWithDose: daysWithDose.length,
        daysWithoutDose: daysWithoutDose.length,
        bestTimeOfDay: bestHour >= 0 ? `${bestHour.toString().padStart(2, '0')}:00` : undefined,
        peakEffectHours: medication.halfLife ? Math.round(medication.halfLife * 0.7) : undefined,
        isSignificant: pValue < 0.05,
      });
    }

    return results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }, [medications, doses, moodEntries]);

  const insights = useMemo(() => {
    const result: Insight[] = [];

    for (const corr of correlations) {
      // Only generate insights for significant correlations or larger effects
      const hasSignificantCorrelation = corr.isSignificant && Math.abs(corr.correlation) >= 0.15;
      const hasLargeEffect = Math.abs(corr.avgMoodWithDose - corr.avgMoodWithoutDose) >= 0.5;

      if (hasSignificantCorrelation || hasLargeEffect) {
        const diff = corr.avgMoodWithDose - corr.avgMoodWithoutDose;
        const percentDiff = corr.avgMoodWithoutDose > 0
          ? Math.abs(diff / corr.avgMoodWithoutDose * 100).toFixed(0)
          : Math.abs(diff * 10).toFixed(0);

        // Determine confidence based on sample size and p-value
        const confidence: 'alta' | 'media' | 'baixa' =
          corr.pValue < 0.01 && corr.sampleSize >= 20 ? 'alta' :
          corr.pValue < 0.05 && corr.sampleSize >= 10 ? 'media' : 'baixa';

        if (diff > 0.3) {
          result.push({
            id: `positive-${corr.medicationId}`,
            type: 'positive',
            title: `${corr.medicationName} está associado a melhor humor`,
            description: `Humor médio ${diff.toFixed(1)} pontos maior nos dias com dose`,
            detail: `Baseado em ${corr.daysWithDose} dias com dose vs ${corr.daysWithoutDose} dias sem. ` +
                    `${corr.isSignificant ? 'Diferença estatisticamente significativa.' : 'Pode ser coincidência - mais dados necessários.'}`,
            value: corr.correlation,
            confidence,
            icon: <TrendUp className="w-5 h-5 text-green-500" weight="bold" />
          });
        } else if (diff < -0.3) {
          result.push({
            id: `negative-${corr.medicationId}`,
            type: 'negative',
            title: `Atenção: ${corr.medicationName} e humor`,
            description: `Humor médio ${Math.abs(diff).toFixed(1)} pontos menor nos dias com dose`,
            detail: `Isso não significa que o medicamento causa o efeito. ` +
                    `Pode ser que você toma o medicamento quando já está se sentindo pior (dosagem reativa). ` +
                    `${corr.daysWithDose} dias analisados.`,
            value: corr.correlation,
            confidence,
            icon: <TrendDown className="w-5 h-5 text-red-500" weight="bold" />
          });
        }
      }
    }

    // Weekend/weekday patterns
    const weekdayMoods = moodEntries.filter(m => {
      const day = new Date(m.timestamp).getDay();
      return day !== 0 && day !== 6;
    });
    const weekendMoods = moodEntries.filter(m => {
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
    const morningMoods = moodEntries.filter(m => new Date(m.timestamp).getHours() < 12);
    const afternoonMoods = moodEntries.filter(m => {
      const h = new Date(m.timestamp).getHours();
      return h >= 12 && h < 18;
    });
    const eveningMoods = moodEntries.filter(m => new Date(m.timestamp).getHours() >= 18);

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
  }, [correlations, moodEntries]);

  if (medications.length === 0 || doses.length < 10 || moodEntries.length < 10) {
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
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ChartLineUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Precisamos de mais dados para gerar insights.</p>
            <p className="text-sm mt-2">
              Mínimo: 10 doses e 10 registros de humor
            </p>
            <div className="mt-4 text-xs">
              <p>Atualmente: {doses.length} doses, {moodEntries.length} registros de humor</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
                  <span><strong>r positivo:</strong> Humor tende a ser melhor nos dias com medicamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  <span><strong>r negativo:</strong> Humor tende a ser menor (pode ser dosagem reativa)</span>
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
              <p className="text-muted-foreground mt-2">
                Correlação não implica causalidade. Converse com seu médico sobre qualquer padrão observado.
              </p>
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
                        {significance.stars && (
                          <span className="ml-2 text-primary font-mono text-sm" title={significance.label}>
                            {significance.stars}
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
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="bg-green-500/10 rounded-lg p-2">
                      <div className="text-muted-foreground">Com dose</div>
                      <div className="font-semibold text-green-600">
                        {corr.avgMoodWithDose.toFixed(1)}/10
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {corr.daysWithDose} dias
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
                      <div className="text-muted-foreground">Sem dose</div>
                      <div className="font-semibold text-gray-600">
                        {corr.avgMoodWithoutDose.toFixed(1)}/10
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {corr.daysWithoutDose} dias
                      </div>
                    </div>
                  </div>

                  {/* P-value info */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                    <span>
                      p-value: {corr.pValue < 0.001 ? '<0.001' : corr.pValue.toFixed(3)}
                      {' '}({significance.label})
                    </span>
                    <span>n = {corr.sampleSize} dias analisados</span>
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
