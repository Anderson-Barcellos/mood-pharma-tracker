import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import { TrendUp, TrendDown, Minus, Lightbulb, Clock, Sun, Moon, Calendar } from '@phosphor-icons/react';
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
  value?: number;
  icon: React.ReactNode;
}

interface CorrelationResult {
  medicationId: string;
  medicationName: string;
  correlation: number;
  sampleSize: number;
  avgMoodWithDose: number;
  avgMoodWithoutDose: number;
  bestTimeOfDay?: string;
  peakEffectHours?: number;
}

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) return 0;
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function getCorrelationStrength(r: number): { label: string; color: string } {
  const absR = Math.abs(r);
  if (absR >= 0.7) return { label: 'Forte', color: r > 0 ? 'bg-green-500' : 'bg-red-500' };
  if (absR >= 0.4) return { label: 'Moderada', color: r > 0 ? 'bg-green-400' : 'bg-red-400' };
  if (absR >= 0.2) return { label: 'Fraca', color: r > 0 ? 'bg-green-300' : 'bg-red-300' };
  return { label: 'Negligível', color: 'bg-gray-400' };
}

export default function CorrelationInsights({ medications, doses, moodEntries }: CorrelationInsightsProps) {
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
      
      const correlation = calculateCorrelation(dosePresence, allDailyMoods);
      
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
        correlation,
        sampleSize: moodByDay.size,
        avgMoodWithDose,
        avgMoodWithoutDose,
        bestTimeOfDay: bestHour >= 0 ? `${bestHour}:00` : undefined,
        peakEffectHours: medication.halfLife ? Math.round(medication.halfLife * 0.7) : undefined
      });
    }
    
    return results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }, [medications, doses, moodEntries]);

  const insights = useMemo(() => {
    const result: Insight[] = [];
    
    for (const corr of correlations) {
      if (Math.abs(corr.correlation) >= 0.2) {
        const diff = corr.avgMoodWithDose - corr.avgMoodWithoutDose;
        const percentDiff = Math.abs(diff / corr.avgMoodWithoutDose * 100).toFixed(0);
        
        if (diff > 0.3) {
          result.push({
            id: `positive-${corr.medicationId}`,
            type: 'positive',
            title: `${corr.medicationName} melhora seu humor`,
            description: `Seu humor é ~${percentDiff}% melhor nos dias que você toma ${corr.medicationName}`,
            value: corr.correlation,
            icon: <TrendUp className="w-5 h-5 text-green-500" weight="bold" />
          });
        } else if (diff < -0.3) {
          result.push({
            id: `negative-${corr.medicationId}`,
            type: 'negative',
            title: `Atenção com ${corr.medicationName}`,
            description: `Seu humor tende a ser ~${percentDiff}% menor nos dias com ${corr.medicationName}`,
            value: corr.correlation,
            icon: <TrendDown className="w-5 h-5 text-red-500" weight="bold" />
          });
        }
        
        if (corr.bestTimeOfDay) {
          const hour = parseInt(corr.bestTimeOfDay);
          const isMorning = hour < 12;
          result.push({
            id: `time-${corr.medicationId}`,
            type: 'info',
            title: `Melhor horário para ${corr.medicationName}`,
            description: `Melhores resultados quando tomado às ${corr.bestTimeOfDay}`,
            icon: isMorning 
              ? <Sun className="w-5 h-5 text-yellow-500" weight="bold" />
              : <Moon className="w-5 h-5 text-indigo-500" weight="bold" />
          });
        }
      }
    }
    
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
          description: `Seu humor médio é ${Math.abs(diff).toFixed(1)} pontos ${diff > 0 ? 'maior' : 'menor'} nos fins de semana`,
          icon: <Calendar className="w-5 h-5 text-blue-500" weight="bold" />
        });
      }
    }
    
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
        avg: p.moods.reduce((a, b) => a + b.moodScore, 0) / p.moods.length
      }));
      
      const best = avgByPeriod.reduce((a, b) => a.avg > b.avg ? a : b);
      const worst = avgByPeriod.reduce((a, b) => a.avg < b.avg ? a : b);
      
      if (best.avg - worst.avg > 0.5) {
        result.push({
          id: 'time-pattern',
          type: 'info',
          title: `Melhor período: ${best.name}`,
          description: `Seu humor é ~${((best.avg - worst.avg) / worst.avg * 100).toFixed(0)}% melhor pela ${best.name}`,
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
            <Lightbulb className="w-5 h-5" />
            Insights & Correlações
          </CardTitle>
          <CardDescription>
            Continue registrando para descobrir padrões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Precisamos de mais dados para gerar insights.</p>
            <p className="text-sm mt-2">
              Mínimo: 10 doses e 10 registros de humor
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Insights Automáticos
            </CardTitle>
            <CardDescription>
              Padrões descobertos nos seus dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map(insight => (
              <div
                key={insight.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  insight.type === 'positive' ? 'bg-green-500/10' :
                  insight.type === 'negative' ? 'bg-red-500/10' :
                  insight.type === 'info' ? 'bg-blue-500/10' :
                  'bg-muted/50'
                }`}
              >
                <div className="mt-0.5">{insight.icon}</div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                </div>
                {insight.value !== undefined && (
                  <Badge variant="outline" className="shrink-0">
                    r = {insight.value.toFixed(2)}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Correlações Medicamento ↔ Humor</CardTitle>
          <CardDescription>
            Análise estatística baseada em {moodEntries.length} registros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {correlations.map(corr => {
            const strength = getCorrelationStrength(corr.correlation);
            const normalizedCorr = (corr.correlation + 1) / 2 * 100;
            
            return (
              <div key={corr.medicationId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{corr.medicationName}</span>
                    <Badge variant="outline" className="text-xs">
                      n={corr.sampleSize}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {corr.correlation > 0.1 ? (
                      <TrendUp className="w-4 h-4 text-green-500" />
                    ) : corr.correlation < -0.1 ? (
                      <TrendDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <Minus className="w-4 h-4 text-gray-400" />
                    )}
                    <span className={`font-mono text-sm ${
                      corr.correlation > 0 ? 'text-green-600' : 
                      corr.correlation < 0 ? 'text-red-600' : ''
                    }`}>
                      {corr.correlation > 0 ? '+' : ''}{corr.correlation.toFixed(3)}
                    </span>
                  </div>
                </div>
                
                <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`absolute h-full transition-all ${strength.color}`}
                    style={{ 
                      left: corr.correlation < 0 ? `${normalizedCorr}%` : '50%',
                      width: `${Math.abs(corr.correlation) * 50}%`
                    }}
                  />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-400" />
                </div>
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    Com dose: <span className="font-medium">{corr.avgMoodWithDose.toFixed(1)}</span>/10
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {strength.label}
                  </Badge>
                  <span>
                    Sem dose: <span className="font-medium">{corr.avgMoodWithoutDose.toFixed(1)}</span>/10
                  </span>
                </div>
              </div>
            );
          })}
          
          {correlations.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              Nenhuma correlação calculável ainda.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
