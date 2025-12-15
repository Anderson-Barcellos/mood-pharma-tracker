import { useMemo, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { GlassCard } from '@/shared/ui/glass-card';
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group';
import { TrendUp, TrendDown, Clock, Lightning, Info, Pill, Brain, ArrowsClockwise } from '@phosphor-icons/react';
import { StatisticsEngine } from '@/features/analytics/utils/statistics-engine';
import {
  getPKMetrics,
  calculateAdherenceEffectLag,
  isChronicMedication
} from '@/features/analytics/utils/pharmacokinetics';
import {
  getDefaultConcentrationMode,
  getTrendWindowMs,
  sampleConcentrationAtTimes,
  sampleTrendConcentrationAtTimes,
  type ConcentrationSeriesMode,
} from '@/features/analytics/utils/concentration-series';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';

interface LagCorrelationChartProps {
  medication: Medication;
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  maxLagHours?: number;
  bodyWeight?: number;
}

interface LagDataPoint {
  lag: number;
  correlation: number;
  isOptimal: boolean;
  label: string;
  n: number;
  pValue: number;
  significance: 'high' | 'medium' | 'low' | 'none';
}

export default function LagCorrelationChart({
  medication,
  doses,
  moodEntries,
  maxLagHours = 12,
  bodyWeight = 70,
}: LagCorrelationChartProps) {
  const [correlationMethod, setCorrelationMethod] = useState<'pearson' | 'spearman'>('pearson');
  const [seriesTransform, setSeriesTransform] = useState<'levels' | 'differences'>('levels');
  const [concentrationMode, setConcentrationMode] = useState<ConcentrationSeriesMode>(() =>
    getDefaultConcentrationMode(medication)
  );

  const adherenceMetrics = useMemo(() => calculateAdherenceEffectLag(medication), [medication]);
  const isChronic = useMemo(() => isChronicMedication(medication), [medication]);

  const analysis = useMemo(() => {
    const medDoses = doses.filter(d => d.medicationId === medication.id);

    if (medDoses.length < 3 || moodEntries.length < 5) {
      return {
        error: 'insufficient_raw' as const,
        doseCount: medDoses.length,
        moodCount: moodEntries.length
      };
    }

    const hourlyInterval = 60 * 60 * 1000;
    const pk = getPKMetrics(medication);
    const tmax = pk?.Tmax ?? 2;
    const lagFromPk = pk ? Math.max(pk.Tmax * 4, pk.halfLife * 2) : 0;
    const chronicLagHours = isChronic ? adherenceMetrics.adherenceLagHours : 0;
    const lagLimit = Math.max(1, Math.min(120, Math.round(Math.max(maxLagHours, lagFromPk, chronicLagHours))));
    const minPairs = 5;
    const allTimestamps = [...medDoses.map(d => d.timestamp), ...moodEntries.map(m => m.timestamp)];
    const rawStartTime = Math.floor(Math.min(...allTimestamps) / hourlyInterval) * hourlyInterval;
    const firstDoseTime = Math.min(...medDoses.map(d => d.timestamp));
    const firstDoseHour = Math.floor(firstDoseTime / hourlyInterval) * hourlyInterval;
    const startTime = Math.max(rawStartTime, firstDoseHour);
    const trimmedPreDose = startTime > rawStartTime;
    const endTime = Math.ceil(Math.max(...allTimestamps) / hourlyInterval) * hourlyInterval;
    const timestamps: number[] = [];

    for (let t = startTime; t <= endTime; t += hourlyInterval) {
      timestamps.push(t);
    }

    const concentrations = concentrationMode === 'trend'
      ? sampleTrendConcentrationAtTimes(medication, medDoses, timestamps, bodyWeight)
      : sampleConcentrationAtTimes(medication, medDoses, timestamps, bodyWeight);

    const moodByHour = new Map<number, number[]>();
    for (const mood of moodEntries) {
      const hourKey = Math.floor(mood.timestamp / hourlyInterval) * hourlyInterval;
      if (!moodByHour.has(hourKey)) moodByHour.set(hourKey, []);
      moodByHour.get(hourKey)!.push(mood.moodScore);
    }

    const moodValues: number[] = timestamps.map(t => {
      const moods = moodByHour.get(t);
      if (moods && moods.length > 0) {
        return moods.reduce((a, b) => a + b, 0) / moods.length;
      }
      return NaN;
    });
    const alignedConc = concentrations.map(c => (typeof c === 'number' && Number.isFinite(c) ? c : NaN));
    const alignedMood = moodValues.map(v => (Number.isFinite(v) ? v : NaN));
    const validPairs = alignedConc.reduce((count, c, idx) => {
      return count + (Number.isFinite(c) && Number.isFinite(alignedMood[idx]) ? 1 : 0);
    }, 0);

    if (validPairs < minPairs) {
      return {
        error: 'insufficient_aligned' as const,
        alignedCount: validPairs,
        doseCount: medDoses.length,
        moodCount: moodEntries.length
      };
    }

    const crossCorr = StatisticsEngine.crossCorrelation(alignedConc, alignedMood, lagLimit, minPairs, {
      method: correlationMethod,
      transform: seriesTransform
    });
    const candidates = crossCorr.filter(point => point.n >= minPairs);
    const points = candidates.length > 0 ? candidates : crossCorr;

    let optimalLag = 0;
    let maxCorrelation = 0;
    let maxAbsCorrelation = -Infinity;
    let sampleSize = 0;

    for (const point of points) {
      if (Math.abs(point.correlation) > maxAbsCorrelation) {
        maxAbsCorrelation = Math.abs(point.correlation);
        maxCorrelation = point.correlation;
        optimalLag = point.lag;
        sampleSize = point.n;
      }
    }

    const chartData: LagDataPoint[] = crossCorr.map(point => ({
      lag: point.lag,
      correlation: point.correlation,
      isOptimal: point.lag === optimalLag,
      label: point.lag === 0 ? 'Agora' :
             point.lag > 0 ? `+${point.lag}h` : `${point.lag}h`,
      n: point.n,
      pValue: point.pValue,
      significance: point.significance,
    }));

    const getInterpretation = () => {
      const absR = Math.abs(maxCorrelation);
      const direction = maxCorrelation > 0 ? 'positiva' : 'negativa';
      const strength = absR > 0.7 ? 'forte' : absR > 0.4 ? 'moderada' : 'fraca';
      const isDelta = seriesTransform === 'differences';

      if (absR < 0.2) {
        return {
          summary: 'Sem correlação significativa detectada',
          detail: 'Os dados não mostram relação clara entre concentração e humor.',
          icon: 'neutral' as const,
        };
      }

      if (optimalLag === 0) {
        return {
          summary: `Correlação ${direction} ${strength} (imediata)`,
          detail: isDelta
            ? `As mudanças de humor acompanham mudanças na concentração de ${medication.name}.`
            : `O humor responde imediatamente à concentração de ${medication.name}.`,
          icon: maxCorrelation > 0 ? 'up' as const : 'down' as const,
        };
      }

      if (optimalLag > 0) {
        return {
          summary: `Correlação ${direction} ${strength} com delay de ${optimalLag}h`,
          detail: isDelta
            ? `Mudanças de humor ${maxCorrelation > 0 ? 'seguem' : 'se opõem a'} mudanças de concentração ${optimalLag}h após o pico de ${medication.name}.`
            : `O humor ${maxCorrelation > 0 ? 'melhora' : 'piora'} ${optimalLag}h após o pico de ${medication.name}.`,
          icon: maxCorrelation > 0 ? 'up' as const : 'down' as const,
        };
      }

      return {
        summary: `Humor antecede concentração em ${Math.abs(optimalLag)}h`,
        detail: isDelta
          ? 'Mudanças de humor parecem anteceder mudanças na concentração.'
          : `O humor parece ${maxCorrelation > 0 ? 'prever' : 'antecipar inversamente'} a concentração.`,
        icon: 'clock' as const,
      };
    };

    const interpretation = getInterpretation();

    const getScenarioHints = () => {
      const hints: { scenario: string; likelihood: 'alta' | 'media' | 'baixa'; icon: 'pill' | 'brain' | 'clock' }[] = [];
      const tmax = getPKMetrics(medication)?.Tmax ?? 2;
      const absLag = Math.abs(optimalLag);

      if (optimalLag < 0) {
        if (absLag <= 2) {
          hints.push({ scenario: 'Dosagem reativa (PRN)', likelihood: 'alta', icon: 'pill' });
        } else if (absLag > 12) {
          hints.push({ scenario: 'Ciclo circadiano', likelihood: 'media', icon: 'clock' });
          hints.push({ scenario: 'Dosagem reativa (PRN)', likelihood: 'media', icon: 'pill' });
        } else {
          hints.push({ scenario: 'Dosagem reativa (PRN)', likelihood: 'media', icon: 'pill' });
        }
      } else if (optimalLag > 0) {
        if (absLag <= tmax * 2) {
          hints.push({ scenario: 'Efeito farmacologico direto', likelihood: 'alta', icon: 'brain' });
        } else if (absLag <= tmax * 4) {
          hints.push({ scenario: 'Efeito farmacologico direto', likelihood: 'media', icon: 'brain' });
        } else {
          hints.push({ scenario: 'Efeito farmacologico indireto', likelihood: 'media', icon: 'brain' });
          hints.push({ scenario: 'Ciclo circadiano', likelihood: 'baixa', icon: 'clock' });
        }
      } else {
        hints.push({ scenario: 'Efeito imediato ou coincidencia', likelihood: 'media', icon: 'brain' });
      }

      return hints;
    };

    const scenarioHints = getScenarioHints();

    return {
      chartData,
      optimalLag,
      maxCorrelation,
      sampleSize,
      interpretation,
      scenarioHints,
      halfLife: medication.halfLife,
      tmax,
      trimmedPreDose,
    };
  }, [medication, doses, moodEntries, maxLagHours, bodyWeight, correlationMethod, seriesTransform, concentrationMode, isChronic, adherenceMetrics]);

  if ('error' in analysis) {
    const { error } = analysis;

    const getMessage = () => {
      if (error === 'insufficient_raw') {
        const needsDoses = analysis.doseCount < 3;
        const needsMoods = analysis.moodCount < 5;
        if (needsDoses && needsMoods) {
          return `Faltam ${3 - analysis.doseCount} doses e ${5 - analysis.moodCount} registros de humor`;
        }
        if (needsDoses) {
          return `Faltam ${3 - analysis.doseCount} doses (tem ${analysis.doseCount}/3)`;
        }
        return `Faltam ${5 - analysis.moodCount} registros de humor (tem ${analysis.moodCount}/5)`;
      }
      return `Dados nao coincidem temporalmente (${analysis.alignedCount}/5 horas com dose+humor)`;
    };

    return (
      <GlassCard className="p-4 border-dashed opacity-70">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Pill className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm">{medication.name}</h3>
            <p className="text-xs text-muted-foreground">
              {getMessage()}
            </p>
          </div>
          <div className="text-xs text-orange-500 font-medium">
            {error === 'insufficient_aligned' ? 'Sem sobreposicao' : 'Aguardando dados'}
          </div>
        </div>
      </GlassCard>
    );
  }

  const { chartData, optimalLag, maxCorrelation, sampleSize, interpretation, scenarioHints, halfLife, tmax, trimmedPreDose } = analysis;
  const color = medication.color ?? '#8b5cf6';
  const [showHelp, setShowHelp] = useState(false);
  // Keep trend/instant default sensible when this component is reused for different meds
  // (in practice it's one component per med, but this avoids sticky state in edge cases).
  const defaultMode = getDefaultConcentrationMode(medication);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="w-4 h-4" />
          Correlação Temporal: {medication.name} → Humor
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <GlassCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {interpretation.icon === 'up' && <TrendUp className="w-5 h-5 text-green-500" />}
              {interpretation.icon === 'down' && <TrendDown className="w-5 h-5 text-red-500" />}
              {interpretation.icon === 'clock' && <Clock className="w-5 h-5 text-blue-500" />}
              {interpretation.icon === 'neutral' && <Lightning className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div>
              <p className="font-medium">{interpretation.summary}</p>
              <p className="text-sm text-muted-foreground mt-1">{interpretation.detail}</p>
              {trimmedPreDose && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Análise inicia na 1ª dose para evitar viés pré-tratamento.
                </p>
              )}
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>r = {maxCorrelation.toFixed(3)}</span>
                <span>Lag ótimo: {optimalLag}h</span>
                <span>n = {sampleSize}</span>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Método</span>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={correlationMethod}
              onValueChange={(v) => v && setCorrelationMethod(v as 'pearson' | 'spearman')}
            >
              <ToggleGroupItem value="pearson">Pearson</ToggleGroupItem>
              <ToggleGroupItem value="spearman">Spearman</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Concentração</span>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={concentrationMode}
              onValueChange={(v) => v && setConcentrationMode(v as ConcentrationSeriesMode)}
            >
              <ToggleGroupItem value="instant">Cp</ToggleGroupItem>
              <ToggleGroupItem value="trend">Tendência</ToggleGroupItem>
            </ToggleGroup>
            <button
              type="button"
              onClick={() => setConcentrationMode(defaultMode)}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              title="Voltar ao padrão recomendado"
            >
              <ArrowsClockwise className="w-3 h-3" />
              Auto
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Série</span>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={seriesTransform}
              onValueChange={(v) => v && setSeriesTransform(v as 'levels' | 'differences')}
            >
              <ToggleGroupItem value="levels">Níveis</ToggleGroupItem>
              <ToggleGroupItem value="differences">Mudanças (Δ)</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {concentrationMode === 'trend' && (
          <p className="text-[11px] text-muted-foreground text-center -mt-1">
            Tendência = média móvel ~{Math.round(getTrendWindowMs(medication) / 3600000)}h (bom pra crônicos / atraso de adesão).
          </p>
        )}

        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />

              <XAxis
                dataKey="lag"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v === 0 ? '0' : v > 0 ? `+${v}` : `${v}`}
                label={{ value: 'Lag (horas)', position: 'bottom', fontSize: 10, offset: 0 }}
              />

              <YAxis
                domain={[-1, 1]}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v.toFixed(1)}
                label={{ value: 'Correlação (r)', angle: -90, position: 'insideLeft', fontSize: 10 }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as LagDataPoint;
                  return (
                    <div className="bg-card border rounded-lg p-2 shadow-lg text-sm">
                    <div className="font-medium">{point.label}</div>
                    <div>r = {point.correlation.toFixed(3)}</div>
                    <div className="text-xs text-muted-foreground">n = {point.n}</div>
                    {Number.isFinite(point.pValue) && (
                      <div className="text-[11px] text-muted-foreground">p = {point.pValue.toPrecision(2)}</div>
                    )}
                      {point.isOptimal && (
                        <div className="text-xs text-primary mt-1">Lag ótimo</div>
                      )}
                    </div>
                  );
                }}
              />

              <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
              <ReferenceLine x={0} stroke="#888" strokeDasharray="3 3" />

              <Bar
                dataKey="correlation"
                fill={color}
                fillOpacity={0.6}
                stroke={color}
                strokeWidth={1}
              />

              <Line
                type="monotone"
                dataKey="correlation"
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {scenarioHints.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {scenarioHints.map((hint, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 text-xs"
              >
                {hint.icon === 'pill' && <Pill className="w-3 h-3" />}
                {hint.icon === 'brain' && <Brain className="w-3 h-3" />}
                {hint.icon === 'clock' && <ArrowsClockwise className="w-3 h-3" />}
                <span>{hint.scenario}</span>
                <span className={`px-1 rounded text-[10px] ${
                  hint.likelihood === 'alta' ? 'bg-green-500/20 text-green-600' :
                  hint.likelihood === 'media' ? 'bg-yellow-500/20 text-yellow-600' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {hint.likelihood}
                </span>
              </div>
            ))}
          </div>
        )}

        {isChronic && (
          <GlassCard variant="subtle" className="p-3 text-xs bg-blue-500/5">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-400">Medicamento de uso crônico</p>
                <p className="text-muted-foreground mt-1">{adherenceMetrics.description}</p>
                <p className="text-muted-foreground/70 mt-1">
                  Para crônicos em steady-state, procure correlações em lags de ~{adherenceMetrics.adherenceLagDays} dias
                  ({adherenceMetrics.adherenceLagHours}h) - este é o tempo esperado entre variação na adesão e impacto no humor.
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        <Collapsible open={showHelp} onOpenChange={setShowHelp}>
          <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2">
            <Info className="w-3 h-3" />
            {showHelp ? 'Ocultar guia de interpretacao' : 'Como interpretar?'}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 rounded-lg border bg-muted/30 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Lag</th>
                    <th className="px-3 py-2 text-left font-medium">Significado</th>
                    <th className="px-3 py-2 text-left font-medium">Cenario Provavel</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="px-3 py-2 font-mono text-primary">+1h a +{Math.round(tmax * 2)}h</td>
                    <td className="px-3 py-2">Resposta proxima ao pico</td>
                    <td className="px-3 py-2 text-green-600">Efeito farmacologico direto</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-primary">+{Math.round(tmax * 2)}h a +{Math.round(tmax * 4)}h</td>
                    <td className="px-3 py-2">Resposta pos-pico</td>
                    <td className="px-3 py-2 text-yellow-600">Efeito direto (fase de eliminacao)</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-blue-500">0h</td>
                    <td className="px-3 py-2">Correlacao simultanea</td>
                    <td className="px-3 py-2 text-muted-foreground">Onset rapido ou coincidencia</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-orange-500">-1h a -3h</td>
                    <td className="px-3 py-2">Humor antecede concentracao</td>
                    <td className="px-3 py-2 text-orange-600">Dosagem reativa (PRN)</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-red-500">-4h ou mais</td>
                    <td className="px-3 py-2">Humor antecede muito</td>
                    <td className="px-3 py-2 text-red-600">Ciclo circadiano ou PRN</td>
                  </tr>
                </tbody>
              </table>
              <div className="px-3 py-2 text-[10px] text-muted-foreground border-t bg-muted/20">
                <strong>PK deste fármaco:</strong> Tmax = {tmax.toFixed(1)}h (pico), t½ = {halfLife}h (eliminação).
                <div className="mt-1">
                  <strong>Método:</strong> Pearson = relação linear; Spearman = monotônica (robusta a outliers).
                  {' '}
                  <strong>Série:</strong> Níveis = valores absolutos; Δ = mudanças hora-a-hora.
                </div>
              </div>
              <div className="px-3 py-2 text-[10px] text-muted-foreground border-t bg-blue-500/5">
                <strong>Lags esperados por classe:</strong>
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  <li><span className="text-orange-500">Estimulantes (Vyvanse, Ritalina):</span> 3-6h após dose (efeito agudo)</li>
                  <li><span className="text-purple-500">SSRIs/SNRIs (Lexapro, Venlafaxina):</span> 24-72h (efeito crônico, variação de aderência)</li>
                  <li><span className="text-green-500">Estabilizadores (Lamictal, Lítio):</span> 48-96h (variação de aderência)</li>
                  <li><span className="text-blue-500">Benzodiazepínicos:</span> 1-4h (efeito agudo ansiolítico)</li>
                  <li><span className="text-pink-500">Antipsicóticos:</span> 24-48h (efeito crônico)</li>
                </ul>
                <p className="mt-1 text-muted-foreground/70">
                  Para crônicos em steady-state, o lag reflete tempo entre falha de aderência e impacto no humor.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
