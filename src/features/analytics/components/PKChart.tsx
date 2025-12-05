import { useMemo, useRef, useCallback } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Download } from '@phosphor-icons/react';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import { calculateConcentration } from '@/features/analytics/utils/pharmacokinetics';

interface PKChartProps {
  medication: Medication;
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  daysRange?: number;
  bodyWeight?: number;
}

interface ChartDataPoint {
  timestamp: number;
  concentration: number | null;
  mood: number | null;
  moodTimestamp: number | null;
  formattedTime: string;
}

const MOOD_COLOR = '#22c55e';
const POINTS_PER_DAY = 48;

export default function PKChart({
  medication,
  doses,
  moodEntries,
  daysRange = 7,
  bodyWeight = 70,
}: PKChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const color = medication.color ?? '#8b5cf6';

  const { chartData, concentrationDomain, therapeuticRange } = useMemo(() => {
    const medDoses = doses.filter(d => d.medicationId === medication.id);
    
    const allTimestamps = [
      ...medDoses.map(d => d.timestamp),
      ...moodEntries.map(m => m.timestamp),
    ];
    
    const endTime = allTimestamps.length > 0 ? Math.max(...allTimestamps) : Date.now();
    const startTime = endTime - (daysRange * 24 * 60 * 60 * 1000);
    
    const totalPoints = daysRange * POINTS_PER_DAY;
    const interval = (endTime - startTime) / totalPoints;
    
    const relevantDoses = medDoses.filter(
      d => d.timestamp >= startTime - (medication.halfLife * 5 * 3600 * 1000) && 
           d.timestamp <= endTime
    );
    
    const relevantMoods = moodEntries
      .filter(m => m.timestamp >= startTime && m.timestamp <= endTime)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const moodMap = new Map<number, MoodEntry>();
    for (const mood of relevantMoods) {
      const bucketIndex = Math.round((mood.timestamp - startTime) / interval);
      const bucketTime = startTime + (bucketIndex * interval);
      if (!moodMap.has(bucketTime) || 
          Math.abs(mood.timestamp - bucketTime) < Math.abs(moodMap.get(bucketTime)!.timestamp - bucketTime)) {
        moodMap.set(bucketTime, mood);
      }
    }
    
    const data: ChartDataPoint[] = [];
    let minConc = Infinity;
    let maxConc = -Infinity;
    
    for (let i = 0; i <= totalPoints; i++) {
      const timestamp = startTime + (i * interval);
      
      const conc = calculateConcentration(medication, relevantDoses, timestamp, bodyWeight);
      const concentration = conc > 0.01 ? conc : null;
      
      if (concentration !== null) {
        minConc = Math.min(minConc, concentration);
        maxConc = Math.max(maxConc, concentration);
      }
      
      const moodEntry = moodMap.get(timestamp);
      
      data.push({
        timestamp,
        concentration,
        mood: moodEntry?.moodScore ?? null,
        moodTimestamp: moodEntry?.timestamp ?? null,
        formattedTime: format(timestamp, 'dd/MM HH:mm', { locale: ptBR }),
      });
    }
    
    for (const mood of relevantMoods) {
      const existingPoint = data.find(d => 
        d.moodTimestamp === mood.timestamp || 
        Math.abs(d.timestamp - mood.timestamp) < interval * 0.5
      );
      
      if (!existingPoint) {
        const conc = calculateConcentration(medication, relevantDoses, mood.timestamp, bodyWeight);
        data.push({
          timestamp: mood.timestamp,
          concentration: conc > 0.01 ? conc : null,
          mood: mood.moodScore,
          moodTimestamp: mood.timestamp,
          formattedTime: format(mood.timestamp, 'dd/MM HH:mm', { locale: ptBR }),
        });
      }
    }
    
    data.sort((a, b) => a.timestamp - b.timestamp);
    
    const padding = (maxConc - minConc) * 0.15 || 5;
    const concDomain: [number, number] = [
      Math.max(0, minConc - padding),
      maxConc + padding
    ];
    
    let therRange: { min: number; max: number } | null = null;
    if (medication.therapeuticRange) {
      const unit = medication.therapeuticRange.unit?.toLowerCase() ?? 'ng/ml';
      const toNg = (v: number) => {
        if (unit.includes('mcg') || unit.includes('µg')) return v * 1000;
        if (unit.includes('mg/l')) return v * 1000;
        return v;
      };
      therRange = {
        min: toNg(medication.therapeuticRange.min),
        max: toNg(medication.therapeuticRange.max),
      };
    }
    
    return {
      chartData: data,
      concentrationDomain: concDomain,
      therapeuticRange: therRange,
    };
  }, [medication, doses, moodEntries, daysRange, bodyWeight]);

  const formatXAxis = useCallback((timestamp: number) => {
    if (!timestamp || !Number.isFinite(timestamp)) return '';
    const hours = daysRange * 24;
    if (hours <= 48) return format(timestamp, 'HH:mm');
    if (hours <= 168) return format(timestamp, 'dd/MM HH\'h\'');
    return format(timestamp, 'dd/MM');
  }, [daysRange]);

  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    
    const point = payload[0]?.payload as ChartDataPoint;
    if (!point) return null;
    
    const displayTime = point.moodTimestamp 
      ? format(point.moodTimestamp, "dd MMM 'às' HH:mm", { locale: ptBR })
      : format(point.timestamp, "dd MMM 'às' HH:mm", { locale: ptBR });
    
    const getStatus = () => {
      if (!therapeuticRange || point.concentration === null) return null;
      if (point.concentration < therapeuticRange.min) 
        return { text: 'Subterapêutico', color: '#f59e0b' };
      if (point.concentration > therapeuticRange.max) 
        return { text: 'Acima da faixa', color: '#ef4444' };
      return { text: 'Na faixa terapêutica', color: '#22c55e' };
    };
    
    const status = getStatus();
    
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg">
        <div className="font-semibold mb-2">{displayTime}</div>
        {point.concentration !== null && (
          <div className="mb-1">
            <span style={{ color }}>
              {medication.name}: <strong>{point.concentration.toFixed(1)} ng/mL</strong>
            </span>
            {status && (
              <div className="text-xs mt-0.5" style={{ color: status.color }}>
                {status.text}
              </div>
            )}
          </div>
        )}
        {point.mood !== null && (
          <div style={{ color: MOOD_COLOR }}>
            Humor: <strong>{point.mood}/10</strong>
            {point.moodTimestamp && (
              <span className="text-xs opacity-70 ml-1">
                ({format(point.moodTimestamp, 'HH:mm')})
              </span>
            )}
          </div>
        )}
      </div>
    );
  }, [medication.name, color, therapeuticRange]);

  const exportChart = useCallback(() => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      canvas.width = svg.clientWidth * 2;
      canvas.height = svg.clientHeight * 2;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.download = `${medication.name}-pk-chart.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
      });
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, [medication.name]);

  const hasDoses = doses.some(d => d.medicationId === medication.id);
  const hasConcentration = chartData.some(d => d.concentration !== null && d.concentration > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          {medication.name}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={exportChart}>
          <Download className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent>
        <div className="h-[350px]" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 50, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id={`gradient-${medication.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatXAxis}
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              
              <YAxis
                yAxisId="conc"
                domain={concentrationDomain}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v.toFixed(0)}
                label={{ value: 'ng/mL', angle: -90, position: 'insideLeft', fontSize: 10 }}
              />
              
              <YAxis
                yAxisId="mood"
                orientation="right"
                domain={[0, 10]}
                tick={{ fontSize: 10 }}
                label={{ value: 'Humor', angle: 90, position: 'insideRight', fontSize: 10 }}
              />
              
              <Tooltip content={CustomTooltip} />
              
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => <span className="text-xs">{value}</span>}
              />
              
              {therapeuticRange && (
                <>
                  <ReferenceLine
                    yAxisId="conc"
                    y={therapeuticRange.min}
                    stroke={color}
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                  <ReferenceLine
                    yAxisId="conc"
                    y={therapeuticRange.max}
                    stroke={color}
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                </>
              )}
              
              <Area
                yAxisId="conc"
                type="monotoneX"
                dataKey="concentration"
                name={medication.name}
                stroke={color}
                fill={`url(#gradient-${medication.id})`}
                strokeWidth={2}
                connectNulls
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }}
              />
              
              <Line
                yAxisId="mood"
                type="monotoneX"
                dataKey="mood"
                name="Humor"
                stroke={MOOD_COLOR}
                strokeWidth={2}
                connectNulls
                dot={{ r: 4, fill: MOOD_COLOR }}
                activeDot={{ r: 6, fill: MOOD_COLOR, stroke: '#fff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {!hasDoses && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Nenhuma dose registrada. Registre uma dose para ver a curva.
          </p>
        )}
        
        {hasDoses && !hasConcentration && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Sem concentração no período. Ajuste o intervalo de tempo.
          </p>
        )}
        
        {therapeuticRange && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t text-xs text-muted-foreground">
            <div className="w-6 h-0.5" style={{ backgroundColor: color, opacity: 0.5 }} />
            <span>Faixa terapêutica: {therapeuticRange.min}-{therapeuticRange.max} ng/mL</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
