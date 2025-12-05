import { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Brush,
  ReferenceArea,
  ReferenceLine,
  Dot
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Heart, Brain, Pill, TrendUp, TrendDown, Pulse } from '@phosphor-icons/react';
import { GlassCard } from '@/shared/ui/glass-card';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils';
import type { MoodEntry, MedicationDose, Medication } from '@/shared/types';

interface HeartRateData {
  timestamp: number;
  heartRate: number;
  context?: 'sleep' | 'resting' | 'stress' | 'exercise';
}

interface CorrelationData {
  timestamp: number;
  date: string;
  heartRate?: number;
  moodScore?: number;
  anxietyLevel?: number;
  energyLevel?: number;
  medicationLevel?: number;
  context?: string;
}

interface HeartRateCorrelationChartProps {
  heartRateData?: HeartRateData[];
  moodEntries?: MoodEntry[];
  doses?: MedicationDose[];
  medications?: Medication[];
  className?: string;
}

export default function HeartRateCorrelationChart({
  heartRateData = [],
  moodEntries = [],
  doses = [],
  medications = [],
  className
}: HeartRateCorrelationChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<'mood' | 'anxiety' | 'energy'>('mood');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [showContextColors, setShowContextColors] = useState(true);
  const [correlationStats, setCorrelationStats] = useState<any>(null);

  // Load heart rate data from localStorage or API
  useEffect(() => {
    loadHeartRateData();
    loadCorrelationStats();
  }, []);

  const loadHeartRateData = async () => {
    try {
      // Try to load summary data first
      const summaryResponse = await fetch('/data/health/heart-rate-summary.json');
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        if (summaryData.statistics) {
          setCorrelationStats({
            metadata: {
              totalRecords: summaryData.metadata.totalRecords,
              avgHeartRate: summaryData.metadata.avgHeartRate,
              dateRange: `${summaryData.metadata.dateRange.start} - ${summaryData.metadata.dateRange.end}`
            },
            contextAnalysis: summaryData.statistics.contextDistribution
          });
        }
      }
      
      // Also try correlation analysis
      const response = await fetch('/data/health/heart-rate-correlations-analysis.json');
      if (response.ok) {
        const data = await response.json();
        setCorrelationStats(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.warn('Could not load heart rate stats:', error);
    }
  };

  const loadCorrelationStats = async () => {
    try {
      const stored = localStorage.getItem('heartRateCorrelationStats');
      if (stored) {
        setCorrelationStats(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Error loading stats:', error);
    }
  };

  // Process and align data
  const chartData = useMemo(() => {
    const now = Date.now();
    const cutoffTime = timeRange === 'week' 
      ? now - 7 * 24 * 60 * 60 * 1000
      : timeRange === 'month'
      ? now - 30 * 24 * 60 * 60 * 1000
      : 0;

    // Create time-aligned dataset
    const alignedData: Map<number, CorrelationData> = new Map();

    // Add heart rate data
    heartRateData
      .filter(hr => hr.timestamp >= cutoffTime)
      .forEach(hr => {
        const hourKey = Math.floor(hr.timestamp / (60 * 60 * 1000)) * 60 * 60 * 1000;
        
        if (!alignedData.has(hourKey)) {
          alignedData.set(hourKey, {
            timestamp: hourKey,
            date: format(hourKey, 'dd/MM HH:mm', { locale: ptBR }),
            heartRate: hr.heartRate,
            context: hr.context
          });
        } else {
          const existing = alignedData.get(hourKey)!;
          existing.heartRate = (existing.heartRate || 0) + hr.heartRate / 2;
          existing.context = hr.context;
        }
      });

    // Add mood data
    moodEntries
      .filter(mood => mood.timestamp >= cutoffTime)
      .forEach(mood => {
        const hourKey = Math.floor(mood.timestamp / (60 * 60 * 1000)) * 60 * 60 * 1000;
        
        if (alignedData.has(hourKey)) {
          const existing = alignedData.get(hourKey)!;
          existing.moodScore = mood.moodScore;
          existing.anxietyLevel = mood.anxietyLevel;
          existing.energyLevel = mood.energyLevel;
        } else {
          alignedData.set(hourKey, {
            timestamp: hourKey,
            date: format(hourKey, 'dd/MM HH:mm', { locale: ptBR }),
            moodScore: mood.moodScore,
            anxietyLevel: mood.anxietyLevel,
            energyLevel: mood.energyLevel
          });
        }
      });

    return Array.from(alignedData.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [heartRateData, moodEntries, timeRange]);

  // Calculate real-time correlation
  const currentCorrelation = useMemo(() => {
    if (chartData.length < 3) return null;

    const validData = chartData.filter(d => 
      d.heartRate !== undefined && 
      d[selectedMetric === 'mood' ? 'moodScore' : 
        selectedMetric === 'anxiety' ? 'anxietyLevel' : 
        'energyLevel'] !== undefined
    );

    if (validData.length < 3) return null;

    const hrValues = validData.map(d => d.heartRate!);
    const metricValues = validData.map(d => 
      d[selectedMetric === 'mood' ? 'moodScore' : 
        selectedMetric === 'anxiety' ? 'anxietyLevel' : 
        'energyLevel']!
    );

    // Calculate Pearson correlation
    const n = hrValues.length;
    const meanHR = hrValues.reduce((a, b) => a + b, 0) / n;
    const meanMetric = metricValues.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomHR = 0;
    let denomMetric = 0;

    for (let i = 0; i < n; i++) {
      const diffHR = hrValues[i] - meanHR;
      const diffMetric = metricValues[i] - meanMetric;
      numerator += diffHR * diffMetric;
      denomHR += diffHR * diffHR;
      denomMetric += diffMetric * diffMetric;
    }

    const correlation = numerator / Math.sqrt(denomHR * denomMetric);
    
    return {
      value: correlation,
      strength: Math.abs(correlation) > 0.7 ? 'forte' : 
                Math.abs(correlation) > 0.4 ? 'moderada' : 'fraca',
      direction: correlation > 0 ? 'positiva' : 'negativa'
    };
  }, [chartData, selectedMetric]);

  // Custom dot to show context colors
  const renderDot = (props: any) => {
    if (!showContextColors || !props.payload.context) return <></>;
    
    const contextColors = {
      sleep: '#8b73bd',
      resting: '#00adad',
      stress: '#ef4444',
      exercise: '#f59e0b'
    };

    return (
      <Dot 
        {...props} 
        fill={contextColors[props.payload.context as keyof typeof contextColors] || '#666'}
        r={3}
      />
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    
    return (
      <GlassCard className="p-3 border-primary/20">
        <p className="text-xs font-medium mb-2">{label}</p>
        {data.heartRate && (
          <div className="flex items-center gap-2 text-sm">
            <Heart className="w-3 h-3 text-red-500" />
            <span>FC: {Math.round(data.heartRate)} bpm</span>
            {data.context && (
              <span className="text-xs text-muted-foreground">({data.context})</span>
            )}
          </div>
        )}
        {data.moodScore && (
          <div className="flex items-center gap-2 text-sm">
            <Brain className="w-3 h-3 text-purple-500" />
            <span>Humor: {data.moodScore}/10</span>
          </div>
        )}
        {data.anxietyLevel && (
          <div className="text-sm text-muted-foreground">
            Ansiedade: {data.anxietyLevel}/10
          </div>
        )}
        {data.energyLevel && (
          <div className="text-sm text-muted-foreground">
            Energia: {data.energyLevel}/10
          </div>
        )}
      </GlassCard>
    );
  };

  return (
    <GlassCard className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-lg">
            <Heart className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Correlações de Frequência Cardíaca</h3>
            <p className="text-sm text-muted-foreground">
              Análise integrada de FC, humor e medicamentos
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={timeRange === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('week')}
          >
            7 dias
          </Button>
          <Button
            variant={timeRange === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('month')}
          >
            30 dias
          </Button>
          <Button
            variant={timeRange === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('all')}
          >
            Tudo
          </Button>
        </div>
      </div>

      {/* Correlation Statistics */}
      {currentCorrelation && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <GlassCard variant="default" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Correlação FC ↔ {
                  selectedMetric === 'mood' ? 'Humor' :
                  selectedMetric === 'anxiety' ? 'Ansiedade' : 'Energia'
                }</p>
                <p className="text-2xl font-bold">
                  {currentCorrelation.value.toFixed(3)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentCorrelation.direction} {currentCorrelation.strength}
                </p>
              </div>
              {currentCorrelation.value > 0 ? (
                <TrendUp className="w-8 h-8 text-green-500" />
              ) : (
                <TrendDown className="w-8 h-8 text-red-500" />
              )}
            </div>
          </GlassCard>

          {correlationStats && (
            <>
              <GlassCard variant="default" className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">FC Média</p>
                    <p className="text-2xl font-bold">
                      {correlationStats.metadata?.avgHeartRate || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">bpm</p>
                  </div>
                  <Pulse className="w-8 h-8 text-primary" />
                </div>
              </GlassCard>

              <GlassCard variant="default" className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total de Registros</p>
                    <p className="text-2xl font-bold">
                      {correlationStats.metadata?.totalRecords || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">pontos de dados</p>
                  </div>
                  <Brain className="w-8 h-8 text-secondary" />
                </div>
              </GlassCard>
            </>
          )}
        </div>
      )}

      {/* Metric Selector */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={selectedMetric === 'mood' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedMetric('mood')}
        >
          <Brain className="w-4 h-4 mr-2" />
          Humor
        </Button>
        <Button
          variant={selectedMetric === 'anxiety' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedMetric('anxiety')}
        >
          Ansiedade
        </Button>
        <Button
          variant={selectedMetric === 'energy' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedMetric('energy')}
        >
          Energia
        </Button>
        <Button
          variant={showContextColors ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowContextColors(!showContextColors)}
        >
          Contextos
        </Button>
      </div>

      {/* Main Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
          
          <XAxis 
            dataKey="date"
            stroke="#666"
            fontSize={12}
            tickFormatter={(value) => value.split(' ')[1]} // Show only time
          />
          
          <YAxis 
            yAxisId="left"
            stroke="#ef4444"
            domain={[40, 160]}
            label={{ value: 'FC (bpm)', angle: -90, position: 'insideLeft' }}
          />
          
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#8b73bd"
            domain={[0, 10]}
            label={{ value: selectedMetric === 'mood' ? 'Humor' : 
                     selectedMetric === 'anxiety' ? 'Ansiedade' : 'Energia', 
                     angle: 90, position: 'insideRight' }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          
          {/* Reference lines for normal ranges */}
          <ReferenceLine 
            yAxisId="left" 
            y={60} 
            stroke="#00adad" 
            strokeDasharray="5 5" 
            opacity={0.3}
            label="FC Repouso"
          />
          
          <ReferenceLine 
            yAxisId="left" 
            y={100} 
            stroke="#f59e0b" 
            strokeDasharray="5 5" 
            opacity={0.3}
            label="FC Elevada"
          />
          
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="heartRate"
            stroke="#ef4444"
            strokeWidth={2}
            dot={showContextColors ? renderDot : false}
            name="Frequência Cardíaca"
            connectNulls
            animationDuration={500}
          />
          
          <Line
            yAxisId="right"
            type="monotone"
            dataKey={selectedMetric === 'mood' ? 'moodScore' : 
                    selectedMetric === 'anxiety' ? 'anxietyLevel' : 'energyLevel'}
            stroke="#8b73bd"
            strokeWidth={2}
            dot={false}
            name={selectedMetric === 'mood' ? 'Humor' : 
                  selectedMetric === 'anxiety' ? 'Ansiedade' : 'Energia'}
            connectNulls
            strokeDasharray="5 5"
            animationDuration={500}
          />
          
          <Brush 
            dataKey="date"
            height={30}
            stroke="#00adad"
            fill="#00adad20"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Context Legend */}
      {showContextColors && (
        <div className="flex gap-4 mt-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#8b73bd]" />
            <span className="text-xs text-muted-foreground">Sono</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#00adad]" />
            <span className="text-xs text-muted-foreground">Repouso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
            <span className="text-xs text-muted-foreground">Estresse</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
            <span className="text-xs text-muted-foreground">Exercício</span>
          </div>
        </div>
      )}
    </GlassCard>
  );
}