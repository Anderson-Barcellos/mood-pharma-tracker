import { useMemo } from 'react';
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
  ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { GlassCard } from '@/shared/ui/glass-card';
import { Badge } from '@/shared/ui/badge';
import {
  TrendUp,
  TrendDown,
  Clock,
  Lightning,
  Info,
  Pill,
  Brain,
  ArrowsClockwise,
  Target,
  CheckCircle,
  WarningCircle,
  Lightbulb
} from '@phosphor-icons/react';
import { useState } from 'react';
import { StatisticsEngine } from '@/features/analytics/utils/statistics-engine';
import { calculateConcentration, getPKMetrics } from '@/features/analytics/utils/pharmacokinetics';
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
  isTmax: boolean;
  label: string;
}

export default function LagCorrelationChart({
  medication,
  doses,
  moodEntries,
  maxLagHours = 12,
  bodyWeight = 70,
}: LagCorrelationChartProps) {
  const analysis = useMemo(() => {
    const medDoses = doses.filter(d => d.medicationId === medication.id);
    
    if (medDoses.length < 3 || moodEntries.length < 5) {
      return null;
    }

    const allTimestamps = [...medDoses.map(d => d.timestamp), ...moodEntries.map(m => m.timestamp)];
    const startTime = Math.min(...allTimestamps);
    const endTime = Math.max(...allTimestamps);
    
    const hourlyInterval = 60 * 60 * 1000;
    const concentrations: number[] = [];
    const timestamps: number[] = [];
    
    for (let t = startTime; t <= endTime; t += hourlyInterval) {
      const conc = calculateConcentration(medication, medDoses, t, bodyWeight);
      concentrations.push(conc);
      timestamps.push(t);
    }

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

    const validConc: number[] = [];
    const validMood: number[] = [];
    for (let i = 0; i < concentrations.length; i++) {
      if (!isNaN(moodValues[i]) && concentrations[i] > 0) {
        validConc.push(concentrations[i]);
        validMood.push(moodValues[i]);
      }
    }

    if (validConc.length < 5) {
      return null;
    }

    const crossCorr = StatisticsEngine.crossCorrelation(validConc, validMood, maxLagHours);
    
    let optimalLag = 0;
    let maxCorrelation = -Infinity;
    let maxAbsCorrelation = 0;
    
    for (const point of crossCorr) {
      if (Math.abs(point.correlation) > maxAbsCorrelation) {
        maxAbsCorrelation = Math.abs(point.correlation);
        maxCorrelation = point.correlation;
        optimalLag = point.lag;
      }
    }

    // Get PK metrics for Tmax comparison
    const pkMetrics = getPKMetrics(medication);
    const expectedTmax = pkMetrics ? Math.round(pkMetrics.Tmax) : Math.round(medication.halfLife * 0.3);

    const chartData: LagDataPoint[] = crossCorr.map(point => ({
      lag: point.lag,
      correlation: point.correlation,
      isOptimal: point.lag === optimalLag,
      isTmax: point.lag === expectedTmax,
      label: point.lag === 0 ? 'Agora' :
             point.lag > 0 ? `+${point.lag}h` : `${point.lag}h`,
    }));

    // Calculate how well the observed lag matches the expected Tmax
    const tmaxMatch = Math.abs(optimalLag - expectedTmax) <= 2;
    const lagMatchQuality = optimalLag > 0 && tmaxMatch ? 'excelente' :
                            optimalLag > 0 && Math.abs(optimalLag - expectedTmax) <= 4 ? 'boa' :
                            optimalLag > 0 ? 'diferente' : 'atipica';

    const getInterpretation = () => {
      const absR = Math.abs(maxCorrelation);
      const direction = maxCorrelation > 0 ? 'positiva' : 'negativa';
      const strength = absR > 0.7 ? 'forte' : absR > 0.4 ? 'moderada' : 'fraca';
      
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
          detail: `O humor responde imediatamente à concentração de ${medication.name}.`,
          icon: maxCorrelation > 0 ? 'up' as const : 'down' as const,
        };
      }

      if (optimalLag > 0) {
        return {
          summary: `Correlação ${direction} ${strength} com delay de ${optimalLag}h`,
          detail: `O humor ${maxCorrelation > 0 ? 'melhora' : 'piora'} ${optimalLag}h após o pico de ${medication.name}.`,
          icon: maxCorrelation > 0 ? 'up' as const : 'down' as const,
        };
      }

      return {
        summary: `Humor antecede concentração em ${Math.abs(optimalLag)}h`,
        detail: `O humor parece ${maxCorrelation > 0 ? 'prever' : 'antecipar inversamente'} a concentração.`,
        icon: 'clock' as const,
      };
    };

    const interpretation = getInterpretation();

    const getScenarioHints = () => {
      const hints: { scenario: string; likelihood: 'alta' | 'media' | 'baixa'; icon: 'pill' | 'brain' | 'clock' }[] = [];
      const halfLife = medication.halfLife;
      const absLag = Math.abs(optimalLag);
      
      if (optimalLag < 0) {
        if (absLag <= 2) {
          hints.push({ scenario: 'Dosagem reativa (PRN)', likelihood: 'alta', icon: 'pill' });
        } else if (absLag > halfLife) {
          hints.push({ scenario: 'Ciclo circadiano', likelihood: 'media', icon: 'clock' });
          hints.push({ scenario: 'Dosagem reativa (PRN)', likelihood: 'media', icon: 'pill' });
        } else {
          hints.push({ scenario: 'Dosagem reativa (PRN)', likelihood: 'media', icon: 'pill' });
        }
      } else if (optimalLag > 0) {
        if (absLag <= halfLife * 1.5) {
          hints.push({ scenario: 'Efeito farmacologico direto', likelihood: 'alta', icon: 'brain' });
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

    // Generate actionable recommendation
    const getRecommendation = () => {
      if (Math.abs(maxCorrelation) < 0.2) {
        return {
          text: 'Continue registrando para obter padrões mais claros.',
          type: 'info' as const,
        };
      }

      if (optimalLag < 0) {
        return {
          text: 'Você parece tomar o medicamento em resposta ao humor. Considere um horário fixo diário para avaliar melhor o efeito.',
          type: 'warning' as const,
        };
      }

      if (maxCorrelation > 0 && tmaxMatch) {
        return {
          text: `Seus dados confirmam o efeito esperado! O pico de concentração (~${expectedTmax}h) coincide com melhora de humor.`,
          type: 'success' as const,
        };
      }

      if (maxCorrelation > 0 && optimalLag > expectedTmax) {
        return {
          text: `O efeito parece demorar mais que o esperado (${optimalLag}h vs ${expectedTmax}h teórico). Pode ser efeito secundário ou adaptação.`,
          type: 'info' as const,
        };
      }

      if (maxCorrelation < 0) {
        return {
          text: 'Correlação negativa observada. Isso pode indicar dosagem reativa (PRN) ou necessidade de revisão com médico.',
          type: 'warning' as const,
        };
      }

      return {
        text: 'Continue acompanhando para entender melhor o padrão.',
        type: 'info' as const,
      };
    };

    const recommendation = getRecommendation();

    return {
      chartData,
      optimalLag,
      maxCorrelation,
      sampleSize: validConc.length,
      interpretation,
      scenarioHints,
      halfLife: medication.halfLife,
      expectedTmax,
      tmaxMatch,
      lagMatchQuality,
      recommendation,
    };
  }, [medication, doses, moodEntries, maxLagHours, bodyWeight]);

  if (!analysis) {
    return (
      <GlassCard className="p-6 text-center">
        <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <h3 className="font-medium mb-1">Dados insuficientes</h3>
        <p className="text-sm text-muted-foreground">
          Precisamos de pelo menos 5 registros de humor e 3 doses para calcular correlação temporal.
        </p>
      </GlassCard>
    );
  }

  const {
    chartData,
    optimalLag,
    maxCorrelation,
    sampleSize,
    interpretation,
    scenarioHints,
    halfLife,
    expectedTmax,
    tmaxMatch,
    lagMatchQuality,
    recommendation
  } = analysis;
  const color = medication.color ?? '#8b5cf6';
  const [showHelp, setShowHelp] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="w-4 h-4" />
          Correlação Temporal: {medication.name} → Humor
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main interpretation card */}
        <GlassCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {interpretation.icon === 'up' && <TrendUp className="w-5 h-5 text-green-500" />}
              {interpretation.icon === 'down' && <TrendDown className="w-5 h-5 text-red-500" />}
              {interpretation.icon === 'clock' && <Clock className="w-5 h-5 text-blue-500" />}
              {interpretation.icon === 'neutral' && <Lightning className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div className="flex-1">
              <p className="font-medium">{interpretation.summary}</p>
              <p className="text-sm text-muted-foreground mt-1">{interpretation.detail}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                <span className="font-mono">r = {maxCorrelation.toFixed(3)}</span>
                <span>Lag ótimo: {optimalLag}h</span>
                <span>n = {sampleSize}</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Tmax comparison card */}
        <div className="grid grid-cols-2 gap-3">
          <GlassCard className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Lag Observado</div>
            <div className="flex items-center justify-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xl font-bold">{optimalLag}h</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Melhor correlação
            </div>
          </GlassCard>
          <GlassCard className={`p-3 text-center ${tmaxMatch ? 'border-green-500/30' : ''}`}>
            <div className="text-xs text-muted-foreground mb-1">Tmax Esperado</div>
            <div className="flex items-center justify-center gap-2">
              <Lightning className="w-4 h-4 text-yellow-500" />
              <span className="text-xl font-bold">{expectedTmax}h</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Pico teórico
            </div>
          </GlassCard>
        </div>

        {/* Match quality indicator */}
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          lagMatchQuality === 'excelente' ? 'bg-green-500/10 text-green-700' :
          lagMatchQuality === 'boa' ? 'bg-blue-500/10 text-blue-700' :
          lagMatchQuality === 'diferente' ? 'bg-yellow-500/10 text-yellow-700' :
          'bg-muted text-muted-foreground'
        }`}>
          {lagMatchQuality === 'excelente' && <CheckCircle className="w-4 h-4" weight="fill" />}
          {lagMatchQuality === 'boa' && <CheckCircle className="w-4 h-4" />}
          {lagMatchQuality === 'diferente' && <Info className="w-4 h-4" />}
          {lagMatchQuality === 'atipica' && <WarningCircle className="w-4 h-4" />}
          <span>
            {lagMatchQuality === 'excelente' && 'Concordância excelente com farmacocinética esperada'}
            {lagMatchQuality === 'boa' && 'Boa concordância com perfil farmacocinético'}
            {lagMatchQuality === 'diferente' && 'Lag diferente do esperado - pode indicar resposta individual'}
            {lagMatchQuality === 'atipica' && 'Padrão atípico - considere fatores externos'}
          </span>
        </div>

        {/* Recommendation */}
        <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
          recommendation.type === 'success' ? 'bg-green-500/10' :
          recommendation.type === 'warning' ? 'bg-yellow-500/10' :
          'bg-blue-500/10'
        }`}>
          <Lightbulb className={`w-4 h-4 mt-0.5 shrink-0 ${
            recommendation.type === 'success' ? 'text-green-600' :
            recommendation.type === 'warning' ? 'text-yellow-600' :
            'text-blue-600'
          }`} />
          <span>{recommendation.text}</span>
        </div>

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
                      <div className="font-mono">r = {point.correlation.toFixed(3)}</div>
                      {point.isOptimal && (
                        <div className="text-xs text-primary mt-1 font-medium">← Lag ótimo observado</div>
                      )}
                      {point.isTmax && (
                        <div className="text-xs text-yellow-600 mt-1">← Tmax teórico</div>
                      )}
                    </div>
                  );
                }}
              />

              <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
              <ReferenceLine x={0} stroke="#888" strokeDasharray="3 3" />

              {/* Tmax reference line */}
              <ReferenceLine
                x={expectedTmax}
                stroke="#eab308"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: 'Tmax',
                  position: 'top',
                  fontSize: 10,
                  fill: '#eab308'
                }}
              />
              
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
                    <td className="px-3 py-2 font-mono text-primary">+1h a +{Math.round(halfLife)}h</td>
                    <td className="px-3 py-2">Humor responde apos medicamento</td>
                    <td className="px-3 py-2 text-green-600">Efeito farmacologico direto</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-primary">+{Math.round(halfLife)}h+</td>
                    <td className="px-3 py-2">Resposta muito atrasada</td>
                    <td className="px-3 py-2 text-yellow-600">Efeito indireto ou ciclo</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-blue-500">0h</td>
                    <td className="px-3 py-2">Correlacao simultanea</td>
                    <td className="px-3 py-2 text-muted-foreground">Coincidencia ou onset rapido</td>
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
                <strong>Nota:</strong> t½ de {medication.name} = {halfLife}h. 
                Lags dentro de 1.5x a meia-vida sugerem efeito farmacologico real.
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
