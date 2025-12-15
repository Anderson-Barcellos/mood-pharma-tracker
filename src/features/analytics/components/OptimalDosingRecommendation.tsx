import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { GlassCard } from '@/shared/ui/glass-card';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import {
  Clock,
  Sun,
  Moon,
  SunHorizon,
  Target,
  TrendUp,
  TrendDown,
  Info,
  Star,
  Lightning,
  Warning
} from '@phosphor-icons/react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { useState } from 'react';
import { getPKMetrics, isChronicMedication } from '@/features/analytics/utils/pharmacokinetics';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';

interface OptimalDosingRecommendationProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
}

interface HourlyPattern {
  hour: number;
  avgMood: number;
  sampleSize: number;
  stdDev: number;
}

interface DosingRecommendation {
  medicationId: string;
  medicationName: string;
  medicationColor?: string;

  // PK-based analysis
  tmax: number;
  halfLife: number;

  // Empirical analysis
  bestEmpiricHour: number;
  bestEmpiricMood: number;
  bestEmpiricSampleSize: number;

  // Combined recommendation
  recommendedHour: number;
  targetPeakHour: number;
  confidence: 'alta' | 'media' | 'baixa';
  confidenceScore: number; // 0-100

  // Mood patterns
  hourlyPatterns: HourlyPattern[];

  // Context
  explanation: string;
  warnings: string[];
}

function calculateStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  return `${h.toString().padStart(2, '0')}:00`;
}

function getPeriodIcon(hour: number) {
  if (hour >= 5 && hour < 12) return <Sun className="w-4 h-4 text-yellow-500" weight="fill" />;
  if (hour >= 12 && hour < 18) return <SunHorizon className="w-4 h-4 text-orange-500" weight="fill" />;
  return <Moon className="w-4 h-4 text-indigo-500" weight="fill" />;
}

function getPeriodName(hour: number): string {
  if (hour >= 5 && hour < 12) return 'manhã';
  if (hour >= 12 && hour < 18) return 'tarde';
  if (hour >= 18 && hour < 22) return 'noite';
  return 'madrugada';
}

export default function OptimalDosingRecommendation({
  medications,
  doses,
  moodEntries,
}: OptimalDosingRecommendationProps) {
  const [expandedMed, setExpandedMed] = useState<string | null>(null);

  const recommendations = useMemo(() => {
    const results: DosingRecommendation[] = [];

    for (const medication of medications) {
      const medDoses = doses.filter(d => d.medicationId === medication.id);

      // Need minimum data
      if (medDoses.length < 5 || moodEntries.length < 10) continue;

      // Get PK metrics
      const pkMetrics = getPKMetrics(medication);
      if (!pkMetrics) continue;

      const { Tmax: tmax, halfLife } = pkMetrics;
      const isChronic = isChronicMedication(medication);

      // Analyze mood patterns by hour after dose
      const hourlyMoods = new Map<number, number[]>();

      for (const dose of medDoses) {
        const doseHour = new Date(dose.timestamp).getHours();

        // Find moods within therapeutic window (0 to 2x half-life after dose)
        const windowEnd = dose.timestamp + (halfLife * 2 * 60 * 60 * 1000);

        const windowMoods = moodEntries.filter(m =>
          m.timestamp > dose.timestamp &&
          m.timestamp <= windowEnd
        );

        for (const mood of windowMoods) {
          const hoursAfterDose = (mood.timestamp - dose.timestamp) / (1000 * 60 * 60);
          const hourBucket = Math.floor(hoursAfterDose);

          if (!hourlyMoods.has(hourBucket)) hourlyMoods.set(hourBucket, []);
          hourlyMoods.get(hourBucket)!.push(mood.moodScore);
        }
      }

      // Calculate patterns
      const hourlyPatterns: HourlyPattern[] = [];
      let bestHour = 0;
      let bestMood = 0;
      let bestSampleSize = 0;

      for (const [hour, moods] of hourlyMoods) {
        if (moods.length < 3) continue; // Minimum for reliability

        const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
        const stdDev = calculateStdDev(moods, avg);

        hourlyPatterns.push({ hour, avgMood: avg, sampleSize: moods.length, stdDev });

        if (avg > bestMood) {
          bestMood = avg;
          bestHour = hour;
          bestSampleSize = moods.length;
        }
      }

      if (hourlyPatterns.length === 0) continue;

      // Analyze dose timing patterns
      const doseHours = medDoses.map(d => new Date(d.timestamp).getHours());
      const mostCommonDoseHour = doseHours.reduce((acc, h) => {
        acc[h] = (acc[h] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const currentDoseHour = Object.entries(mostCommonDoseHour)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      const currentHour = currentDoseHour ? parseInt(currentDoseHour) : 8;

      // Analyze mood by time of day (independent of medication)
      const moodByHour = new Map<number, number[]>();
      for (const mood of moodEntries) {
        const hour = new Date(mood.timestamp).getHours();
        if (!moodByHour.has(hour)) moodByHour.set(hour, []);
        moodByHour.get(hour)!.push(mood.moodScore);
      }

      let bestNaturalMoodHour = 12;
      let bestNaturalMood = 0;
      for (const [hour, moods] of moodByHour) {
        if (moods.length < 3) continue;
        const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
        if (avg > bestNaturalMood) {
          bestNaturalMood = avg;
          bestNaturalMoodHour = hour;
        }
      }

      // Calculate optimal timing
      // If user wants peak effect at bestNaturalMoodHour, they should take it Tmax hours before
      const targetPeakHour = bestNaturalMoodHour;
      const recommendedHour = Math.round((targetPeakHour - tmax + 24) % 24);

      // Calculate confidence based on:
      // 1. Sample size
      // 2. Consistency (low stdDev)
      // 3. PK match (empirical best hour matches Tmax expectation)
      const tmaxMatchScore = Math.max(0, 100 - Math.abs(bestHour - Math.round(tmax)) * 15);
      const sampleScore = Math.min(100, bestSampleSize * 10);
      const avgStdDev = hourlyPatterns.reduce((a, b) => a + b.stdDev, 0) / hourlyPatterns.length;
      const consistencyScore = Math.max(0, 100 - avgStdDev * 30);

      const confidenceScore = Math.round((tmaxMatchScore * 0.3) + (sampleScore * 0.4) + (consistencyScore * 0.3));
      const confidence = confidenceScore >= 70 ? 'alta' : confidenceScore >= 40 ? 'media' : 'baixa';

      // Generate explanation
      const explanationParts: string[] = [];

      if (Math.abs(bestHour - Math.round(tmax)) <= 1) {
        explanationParts.push(
          `Seus dados confirmam o perfil farmacocinético: melhor humor ~${bestHour}h após dose (Tmax esperado: ${tmax.toFixed(1)}h).`
        );
      } else {
        explanationParts.push(
          `Observamos melhor humor ${bestHour}h após dose, diferente do Tmax teórico (${tmax.toFixed(1)}h). ` +
          `Isso pode indicar efeitos secundários ou adaptação individual.`
        );
      }

      explanationParts.push(
        `Para efeito máximo pela ${getPeriodName(targetPeakHour)} (~${formatHour(targetPeakHour)}), ` +
        `sugerimos tomar às ${formatHour(recommendedHour)}.`
      );

      // Warnings
      const warnings: string[] = [];

      if (isChronic) {
        warnings.push('Medicamento de uso crônico - o efeito terapêutico não depende do horário da dose. Priorize consistência no horário escolhido.');
      }

      if (bestSampleSize < 10) {
        warnings.push('Poucos dados ainda - continue registrando para maior precisão');
      }

      if (avgStdDev > 2) {
        warnings.push('Alta variabilidade no humor - outros fatores podem estar influenciando');
      }

      if (confidence === 'baixa') {
        warnings.push('Recomendação preliminar - precisa de mais dados para confirmar');
      }

      results.push({
        medicationId: medication.id,
        medicationName: medication.name,
        medicationColor: medication.color,
        tmax,
        halfLife,
        bestEmpiricHour: bestHour,
        bestEmpiricMood: bestMood,
        bestEmpiricSampleSize: bestSampleSize,
        recommendedHour,
        targetPeakHour,
        confidence,
        confidenceScore,
        hourlyPatterns: hourlyPatterns.sort((a, b) => a.hour - b.hour),
        explanation: explanationParts.join(' '),
        warnings,
      });
    }

    return results.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }, [medications, doses, moodEntries]);

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Horário Ideal de Medicação
          </CardTitle>
          <CardDescription>
            Análise baseada em farmacocinética e seus padrões de humor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Dados insuficientes para análise.</p>
            <p className="text-sm mt-2">
              Precisamos de pelo menos 5 doses e 10 registros de humor por medicamento.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Horário Ideal de Medicação
        </CardTitle>
        <CardDescription>
          Recomendações baseadas em farmacocinética + seus padrões reais de humor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map(rec => (
          <Collapsible
            key={rec.medicationId}
            open={expandedMed === rec.medicationId}
            onOpenChange={(open) => setExpandedMed(open ? rec.medicationId : null)}
          >
            <GlassCard className="overflow-hidden">
              <CollapsibleTrigger className="w-full">
                <div className="p-4 flex items-center gap-4">
                  {/* Medication indicator */}
                  <div
                    className="w-3 h-12 rounded-full"
                    style={{ backgroundColor: rec.medicationColor || '#8b5cf6' }}
                  />

                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{rec.medicationName}</span>
                      <Badge
                        variant={rec.confidence === 'alta' ? 'default' : 'secondary'}
                        className={`text-xs ${
                          rec.confidence === 'alta' ? 'bg-green-500/20 text-green-600 border-green-500/30' :
                          rec.confidence === 'media' ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' :
                          'bg-muted'
                        }`}
                      >
                        {rec.confidence === 'alta' && <Star className="w-3 h-3 mr-1" weight="fill" />}
                        Confiança {rec.confidence}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5 text-primary font-medium">
                        {getPeriodIcon(rec.recommendedHour)}
                        <span>Tomar às {formatHour(rec.recommendedHour)}</span>
                      </div>
                      <span className="text-muted-foreground">→</span>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Lightning className="w-3 h-3" />
                        <span>Pico ~{formatHour(rec.targetPeakHour)}</span>
                      </div>
                    </div>
                  </div>

                  <Info className={`w-5 h-5 text-muted-foreground transition-transform ${
                    expandedMed === rec.medicationId ? 'rotate-180' : ''
                  }`} />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-4 border-t pt-4">
                  {/* Explanation */}
                  <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                    <p>{rec.explanation}</p>
                  </div>

                  {/* PK Info */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-muted/30 p-2 rounded-lg">
                      <div className="text-xs text-muted-foreground">Tempo até pico</div>
                      <div className="font-mono font-medium">{rec.tmax.toFixed(1)}h</div>
                      <div className="text-[10px] text-muted-foreground">(Tmax)</div>
                    </div>
                    <div className="bg-muted/30 p-2 rounded-lg">
                      <div className="text-xs text-muted-foreground">Meia-vida</div>
                      <div className="font-mono font-medium">{rec.halfLife}h</div>
                      <div className="text-[10px] text-muted-foreground">(t½)</div>
                    </div>
                    <div className="bg-muted/30 p-2 rounded-lg">
                      <div className="text-xs text-muted-foreground">Melhor humor</div>
                      <div className="font-mono font-medium">{rec.bestEmpiricMood.toFixed(1)}/10</div>
                      <div className="text-[10px] text-muted-foreground">(+{rec.bestEmpiricHour}h após dose)</div>
                    </div>
                  </div>

                  {/* Hourly pattern visualization */}
                  {rec.hourlyPatterns.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Humor médio por hora após dose
                      </div>
                      <div className="flex gap-1 items-end h-16">
                        {rec.hourlyPatterns.slice(0, 12).map((pattern) => {
                          const height = (pattern.avgMood / 10) * 100;
                          const isOptimal = pattern.hour === rec.bestEmpiricHour;
                          return (
                            <div
                              key={pattern.hour}
                              className="flex-1 flex flex-col items-center gap-1"
                            >
                              <div
                                className={`w-full rounded-t transition-all ${
                                  isOptimal
                                    ? 'bg-primary'
                                    : pattern.avgMood >= 7
                                      ? 'bg-green-500/60'
                                      : pattern.avgMood >= 5
                                        ? 'bg-yellow-500/60'
                                        : 'bg-red-500/60'
                                }`}
                                style={{ height: `${height}%` }}
                                title={`+${pattern.hour}h: ${pattern.avgMood.toFixed(1)}/10 (n=${pattern.sampleSize})`}
                              />
                              <span className="text-[9px] text-muted-foreground">
                                {pattern.hour}h
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Confidence bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Confiança da recomendação</span>
                      <span className="font-medium">{rec.confidenceScore}%</span>
                    </div>
                    <Progress value={rec.confidenceScore} className="h-2" />
                  </div>

                  {/* Warnings */}
                  {rec.warnings.length > 0 && (
                    <div className="space-y-1.5">
                      {rec.warnings.map((warning, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-xs text-yellow-600 bg-yellow-500/10 p-2 rounded"
                        >
                          <Warning className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Data source */}
                  <div className="text-[10px] text-muted-foreground text-center pt-2 border-t">
                    Baseado em {rec.bestEmpiricSampleSize} observações de humor após dose
                  </div>
                </div>
              </CollapsibleContent>
            </GlassCard>
          </Collapsible>
        ))}

        {/* Methodology note */}
        <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium mb-1">Como calculamos?</p>
              <p>
                Combinamos dados farmacocinéticos (Tmax, t½) do medicamento com seus registros
                reais de humor para identificar quando você se sente melhor após cada dose.
                A recomendação considera: tempo até concentração máxima, seus melhores horários
                naturais de humor, e consistência dos seus dados.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
