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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { GlassCard } from '@/shared/ui/glass-card';
import { TrendUp, TrendDown, Clock, Lightning, Info, Pill, Brain, ArrowsClockwise } from '@phosphor-icons/react';
import { useState } from 'react';
import { StatisticsEngine } from '@/features/analytics/utils/statistics-engine';
import { calculateConcentration } from '@/features/analytics/utils/pharmacokinetics';
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

    const chartData: LagDataPoint[] = crossCorr.map(point => ({
      lag: point.lag,
      correlation: point.correlation,
      isOptimal: point.lag === optimalLag,
      label: point.lag === 0 ? 'Agora' : 
             point.lag > 0 ? `+${point.lag}h` : `${point.lag}h`,
    }));

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

    return {
      chartData,
      optimalLag,
      maxCorrelation,
      sampleSize: validConc.length,
      interpretation,
      scenarioHints,
      halfLife: medication.halfLife,
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

  const { chartData, optimalLag, maxCorrelation, sampleSize, interpretation, scenarioHints, halfLife } = analysis;
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
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>r = {maxCorrelation.toFixed(3)}</span>
                <span>Lag ótimo: {optimalLag}h</span>
                <span>n = {sampleSize}</span>
              </div>
            </div>
          </div>
        </GlassCard>

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
