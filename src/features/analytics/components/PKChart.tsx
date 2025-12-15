import { useMemo, useRef, useCallback, useState } from 'react';
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
  ReferenceArea,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Download, Eye, EyeSlash, Waveform, ChartLine, Smiley } from '@phosphor-icons/react';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import {
  calculateConcentration,
  calculateEffectConcentration,
  getEffectMetrics,
  calculateSteadyStateMetrics,
  calculateAdherenceEffectLag,
  isChronicMedication
} from '@/features/analytics/utils/pharmacokinetics';

interface PKChartProps {
  medication: Medication;
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  daysRange?: number;
  bodyWeight?: number;
  futureHours?: number;
  showTherapeuticRange?: boolean;
}

interface ChartDataPoint {
  timestamp: number;
  concentration: number | null;
  effectConcentration: number | null;
  trendConcentration: number | null;
  concentrationProjected: number | null;
  mood: number | null;
  cognitive: number | null;
  moodTimestamp: number | null;
  moodCount?: number;
  formattedTime: string;
  isFuture: boolean;
}

const MOOD_COLOR = '#22c55e';
const COGNITIVE_COLOR = '#a855f7';
const EFFECT_COLOR = '#f97316';
const TREND_COLOR = '#f97316';
const CSS_COLOR = '#06b6d4';
const POINTS_PER_DAY = 48;

const ZONE_COLORS = {
  therapeutic: '#22c55e',
  subtherapeutic: '#f59e0b',
  supratherapeutic: '#ef4444',
};

function computePaddedDomain(
  values: Array<number | null | undefined>,
  options?: {
    clampMin?: number;
    paddingRatio?: number;
    minPaddingAbs?: number;
    fallback?: [number, number];
  }
): [number, number] {
  const {
    clampMin = 0,
    paddingRatio = 0.12,
    minPaddingAbs = 0.1,
    fallback = [0, 100],
  } = options ?? {};

  const finite = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (finite.length === 0) return fallback;

  const min = Math.min(...finite);
  const max = Math.max(...finite);

  const rawRange = max - min;
  const scale = rawRange > 0 ? rawRange : Math.abs(max) || 1;
  const padding = Math.max(scale * paddingRatio, minPaddingAbs);

  const low = Math.max(clampMin, min - padding);
  const high = max + padding;

  if (!Number.isFinite(low) || !Number.isFinite(high) || low === high) {
    return fallback;
  }

  return [low, high];
}

export default function PKChart({
  medication,
  doses,
  moodEntries,
  daysRange = 7,
  bodyWeight = 70,
  futureHours = 12,
  showTherapeuticRange = true,
}: PKChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const color = medication.color ?? '#8b5cf6';
  const [showTherapeutic, setShowTherapeutic] = useState(showTherapeuticRange);
  const [showCss, setShowCss] = useState(true);
  const [showOptimalZone, setShowOptimalZone] = useState(true);

  const isChronic = useMemo(() => isChronicMedication(medication), [medication]);
  const [showEffectCurve, setShowEffectCurve] = useState(!isChronic);
  const [showTrendCurve, setShowTrendCurve] = useState(isChronic);

  const effectMetrics = useMemo(() => getEffectMetrics(medication), [medication]);
  const adherenceMetrics = useMemo(() => calculateAdherenceEffectLag(medication), [medication]);
  const ssMetrics = useMemo(
    () => calculateSteadyStateMetrics(medication, doses),
    [medication, doses]
  );

  const isNewlyStarted = useMemo(() => {
    if (medication.isNewlyStarted) return true;
    const startDate = medication.startDate || medication.createdAt;
    const daysSinceStart = (Date.now() - startDate) / (1000 * 3600 * 24);
    return isChronic && daysSinceStart < 28;
  }, [medication, isChronic]);

  const onsetWeeksRemaining = useMemo(() => {
    if (!isNewlyStarted || !isChronic) return 0;
    const startDate = medication.startDate || medication.createdAt;
    const daysSinceStart = (Date.now() - startDate) / (1000 * 3600 * 24);
    return Math.max(0, Math.ceil((28 - daysSinceStart) / 7));
  }, [medication, isNewlyStarted, isChronic]);

  const { chartData, therapeuticRange, optimalConcentrationRange, nowTimestamp, doseMarkers } = useMemo(() => {
    const medDoses = doses.filter(d => d.medicationId === medication.id);
    
    const doseTimestamps = medDoses.map(d => d.timestamp);
    const moodTimestamps = moodEntries.map(m => m.timestamp);
    const lastDose = doseTimestamps.length > 0 ? Math.max(...doseTimestamps) : 0;
    const lastMood = moodTimestamps.length > 0 ? Math.max(...moodTimestamps) : 0;
    
    const futureExtension = futureHours * 60 * 60 * 1000;
    const endTime = Math.max(
      lastMood,
      lastDose + futureExtension,
      Date.now()
    );
    const startTime = endTime - (daysRange * 24 * 60 * 60 * 1000);
    const nowTimestamp = Date.now();
    
    const totalPoints = daysRange * POINTS_PER_DAY;
    const interval = (endTime - startTime) / totalPoints;
    
    const relevantDoses = medDoses.filter(
      d => d.timestamp >= startTime - (medication.halfLife * 5 * 3600 * 1000) && 
           d.timestamp <= endTime
    );
    
    const visibleDoseTimestamps = medDoses
      .filter(d => d.timestamp >= startTime && d.timestamp <= endTime)
      .map(d => ({ timestamp: d.timestamp, amount: d.doseAmount }));
    
    const relevantMoods = moodEntries
      .filter(m => m.timestamp >= startTime && m.timestamp <= endTime)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const shouldAggregate = daysRange > 3;
    
    interface AggregatedMood {
      moodScore: number;
      cognitiveScore: number | null;
      timestamp: number;
      count: number;
    }
    
    const moodMap = new Map<number, AggregatedMood>();
    
    if (shouldAggregate) {
      const dayMap = new Map<string, MoodEntry[]>();
      for (const mood of relevantMoods) {
        const dayKey = format(mood.timestamp, 'yyyy-MM-dd');
        if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
        dayMap.get(dayKey)!.push(mood);
      }
      
      for (const [_dayKey, moods] of dayMap) {
        const avgMood = moods.reduce((sum, m) => sum + m.moodScore, 0) / moods.length;
        const cogMoods = moods.filter(m => m.cognitiveScore != null);
        const avgCognitive = cogMoods.length > 0 
          ? cogMoods.reduce((sum, m) => sum + (m.cognitiveScore ?? 0), 0) / cogMoods.length 
          : null;
        const midTimestamp = moods[Math.floor(moods.length / 2)].timestamp;
        
        const bucketIndex = Math.round((midTimestamp - startTime) / interval);
        const bucketTime = startTime + (bucketIndex * interval);
        
        moodMap.set(bucketTime, {
          moodScore: avgMood,
          cognitiveScore: avgCognitive,
          timestamp: midTimestamp,
          count: moods.length,
        });
      }
    } else {
      for (const mood of relevantMoods) {
        const bucketIndex = Math.round((mood.timestamp - startTime) / interval);
        const bucketTime = startTime + (bucketIndex * interval);
        if (!moodMap.has(bucketTime) || 
            Math.abs(mood.timestamp - bucketTime) < Math.abs(moodMap.get(bucketTime)!.timestamp - bucketTime)) {
          moodMap.set(bucketTime, {
            moodScore: mood.moodScore,
            cognitiveScore: mood.cognitiveScore ?? null,
            timestamp: mood.timestamp,
            count: 1,
          });
        }
      }
    }
    
    const data: ChartDataPoint[] = [];
    
    const rawConcentrations: (number | null)[] = [];
    
    for (let i = 0; i <= totalPoints; i++) {
      const timestamp = startTime + (i * interval);
      
      const conc = calculateConcentration(medication, relevantDoses, timestamp, bodyWeight);
      const concentration = conc > 0.01 ? conc : null;
      rawConcentrations.push(concentration);

      const effectConc = calculateEffectConcentration(medication, relevantDoses, timestamp, bodyWeight);
      const effectConcentration = effectConc > 0.01 ? effectConc : null;
      
      const moodEntry = moodMap.get(timestamp);
      
      data.push({
        timestamp,
        concentration,
        effectConcentration,
        trendConcentration: null,
        concentrationProjected: null,
        mood: moodEntry?.moodScore ?? null,
        cognitive: moodEntry?.cognitiveScore ?? null,
        moodTimestamp: moodEntry?.timestamp ?? null,
        moodCount: moodEntry?.count,
        formattedTime: format(timestamp, 'dd/MM HH:mm', { locale: ptBR }),
        isFuture: timestamp > nowTimestamp,
      });
    }
    
    const trendWindowHours = isChronic ? 48 : 3.5 * medication.halfLife;
    const pointsPerHour = POINTS_PER_DAY / 24;
    const windowSize = Math.max(3, Math.round(trendWindowHours * pointsPerHour));
    
    for (let i = 0; i < data.length; i++) {
      const windowStart = Math.max(0, i - windowSize + 1);
      const windowValues = rawConcentrations
        .slice(windowStart, i + 1)
        .filter((v): v is number => v !== null);
      
      if (windowValues.length >= 3) {
        const avg = windowValues.reduce((sum, v) => sum + v, 0) / windowValues.length;
        data[i].trendConcentration = avg;
      }
    }
    
    if (!shouldAggregate) {
      for (const mood of relevantMoods) {
        const existingPoint = data.find(d => 
          d.moodTimestamp === mood.timestamp || 
          Math.abs(d.timestamp - mood.timestamp) < interval * 0.5
        );
        
        if (!existingPoint) {
          const conc = calculateConcentration(medication, relevantDoses, mood.timestamp, bodyWeight);
          const effectConc = calculateEffectConcentration(medication, relevantDoses, mood.timestamp, bodyWeight);
          data.push({
            timestamp: mood.timestamp,
            concentration: conc > 0.01 ? conc : null,
            effectConcentration: effectConc > 0.01 ? effectConc : null,
            trendConcentration: null,
            concentrationProjected: null,
            mood: mood.moodScore,
            cognitive: mood.cognitiveScore ?? null,
            moodTimestamp: mood.timestamp,
            moodCount: 1,
            formattedTime: format(mood.timestamp, 'dd/MM HH:mm', { locale: ptBR }),
            isFuture: mood.timestamp > nowTimestamp,
          });
        }
      }
    }
    
    data.sort((a, b) => a.timestamp - b.timestamp);
    
    const goodMoodConcentrations = data
      .filter(d => d.mood !== null && d.mood >= 8 && d.concentration !== null && d.concentration > 0)
      .map(d => d.concentration as number);
    
    let optimalConcRange: { min: number; max: number } | null = null;
    if (goodMoodConcentrations.length >= 3) {
      const sorted = [...goodMoodConcentrations].sort((a, b) => a - b);
      const p10 = sorted[Math.floor(sorted.length * 0.1)];
      const p90 = sorted[Math.floor(sorted.length * 0.9)];
      optimalConcRange = { min: p10, max: p90 };
    }
    
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
      therapeuticRange: therRange,
      optimalConcentrationRange: optimalConcRange,
      nowTimestamp,
      doseMarkers: visibleDoseTimestamps,
    };
  }, [medication, doses, moodEntries, daysRange, bodyWeight, futureHours]);

  const concentrationDomain = useMemo<[number, number]>(() => {
    const values: Array<number | null | undefined> = [];

    for (const point of chartData) {
      values.push(point.concentration);
      if (showEffectCurve) values.push(point.effectConcentration);
      if (showTrendCurve) values.push(point.trendConcentration);
    }

    if (showTherapeutic && therapeuticRange) {
      values.push(therapeuticRange.min, therapeuticRange.max);
    }

    return computePaddedDomain(values, {
      clampMin: 0,
      paddingRatio: 0.12,
      minPaddingAbs: 0.1,
      fallback: [0, 100],
    });
  }, [chartData, showEffectCurve, showTrendCurve, showTherapeutic, therapeuticRange]);

  const formatConcentrationTick = useCallback((value: number) => {
    const max = concentrationDomain[1];
    const decimals = max < 10 ? 2 : max < 100 ? 1 : 0;
    return Number.isFinite(value) ? value.toFixed(decimals) : '';
  }, [concentrationDomain]);

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
    
    const concValue = point.concentration ?? point.concentrationProjected;
    const isProjected = point.isFuture && point.concentrationProjected !== null;
    
    const getStatus = () => {
      if (!therapeuticRange || concValue === null) return null;
      if (concValue < therapeuticRange.min) 
        return { text: 'Subterapêutico', color: '#f59e0b' };
      if (concValue > therapeuticRange.max) 
        return { text: 'Acima da faixa', color: '#ef4444' };
      return { text: 'Na faixa terapêutica', color: '#22c55e' };
    };
    
    const status = getStatus();
    
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg">
        <div className="font-semibold mb-2">
          {displayTime}
          {isProjected && <span className="text-xs text-muted-foreground ml-2">(Projeção)</span>}
        </div>
        {concValue !== null && (
          <div className="mb-1">
            <span style={{ color, opacity: isProjected ? 0.7 : 1 }}>
              Plasma: <strong>{concValue.toFixed(1)} ng/mL</strong>
              {isProjected && <span className="text-xs ml-1">*</span>}
            </span>
            {status && (
              <div className="text-xs mt-0.5" style={{ color: status.color }}>
                {status.text}
              </div>
            )}
          </div>
        )}
        {point.effectConcentration !== null && showEffectCurve && (
          <div className="mb-1">
            <span style={{ color: EFFECT_COLOR }}>
              Efeito: <strong>{point.effectConcentration.toFixed(1)} ng/mL</strong>
            </span>
          </div>
        )}
        {point.trendConcentration !== null && showTrendCurve && (
          <div className="mb-1">
            <span style={{ color: TREND_COLOR }}>
              Tendência: <strong>{point.trendConcentration.toFixed(1)} ng/mL</strong>
            </span>
            <span className="text-xs opacity-70 ml-1">
              (média 48h)
            </span>
          </div>
        )}
        {point.mood !== null && (
          <div style={{ color: MOOD_COLOR }}>
            Humor: <strong>{point.mood.toFixed(1)}/10</strong>
            {point.moodCount && point.moodCount > 1 && (
              <span className="text-xs opacity-70 ml-1">
                (média de {point.moodCount} registros)
              </span>
            )}
            {point.moodCount === 1 && point.moodTimestamp && (
              <span className="text-xs opacity-70 ml-1">
                ({format(point.moodTimestamp, 'HH:mm')})
              </span>
            )}
          </div>
        )}
        {point.cognitive !== null && (
          <div style={{ color: COGNITIVE_COLOR }}>
            Cognição: <strong>{point.cognitive.toFixed(1)}/10</strong>
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
        <div className="flex items-center gap-1">
          {ssMetrics && (
            <Button 
              variant={showCss ? "default" : "ghost"}
              size="sm" 
              onClick={() => setShowCss(!showCss)}
              title={showCss ? 'Ocultar Css média' : 'Mostrar Css média'}
              className="gap-1"
            >
              <ChartLine className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Css</span>
            </Button>
          )}
          {!isChronic && (
            <Button 
              variant={showEffectCurve ? "default" : "ghost"}
              size="sm" 
              onClick={() => setShowEffectCurve(!showEffectCurve)}
              title={showEffectCurve ? 'Ocultar curva de efeito' : 'Mostrar curva de efeito'}
              className="gap-1"
            >
              <Waveform className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Efeito</span>
            </Button>
          )}
          {isChronic && (
            <Button 
              variant={showTrendCurve ? "default" : "ghost"}
              size="sm" 
              onClick={() => setShowTrendCurve(!showTrendCurve)}
              title={showTrendCurve ? 'Ocultar tendência' : 'Mostrar tendência'}
              className="gap-1"
            >
              <Waveform className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Tendência</span>
            </Button>
          )}
          {therapeuticRange && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowTherapeutic(!showTherapeutic)}
              title={showTherapeutic ? 'Ocultar faixa terapêutica' : 'Mostrar faixa terapêutica'}
            >
              {showTherapeutic ? <Eye className="h-4 w-4" /> : <EyeSlash className="h-4 w-4" />}
            </Button>
          )}
          {optimalConcentrationRange && (
            <Button 
              variant={showOptimalZone ? "default" : "ghost"}
              size="sm" 
              onClick={() => setShowOptimalZone(!showOptimalZone)}
              title={showOptimalZone ? 'Ocultar zona de humor ótimo' : 'Mostrar zona de humor ótimo'}
              className="gap-1"
            >
              <Smiley className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Ótimo</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={exportChart} title="Exportar gráfico">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-[350px]" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 50, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id={`gradient-${medication.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id={`gradient-projected-${medication.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.08} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.005} />
                </linearGradient>
                <linearGradient id={`gradient-effect-${medication.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={EFFECT_COLOR} stopOpacity={0.12} />
                  <stop offset="95%" stopColor={EFFECT_COLOR} stopOpacity={0.01} />
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
                allowDataOverflow={true}
                tick={{ fontSize: 10 }}
                tickFormatter={formatConcentrationTick}
                label={{ value: 'ng/mL', angle: -90, position: 'insideLeft', fontSize: 10 }}
              />
              
              <YAxis
                yAxisId="mood"
                orientation="right"
                domain={[0, 10]}
                allowDataOverflow={true}
                tick={{ fontSize: 10 }}
                label={{ value: 'Humor', angle: 90, position: 'insideRight', fontSize: 10 }}
              />
              
              <Tooltip content={CustomTooltip} />
              
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => <span className="text-xs">{value}</span>}
              />
              
              {showTherapeutic && therapeuticRange && (
                <>
                  <ReferenceArea
                    yAxisId="conc"
                    y1={0}
                    y2={therapeuticRange.min}
                    fill={ZONE_COLORS.subtherapeutic}
                    fillOpacity={0.08}
                    ifOverflow="hidden"
                    label={{
                      value: 'Subterapêutico',
                      position: 'insideTopLeft',
                      fontSize: 9,
                      fill: ZONE_COLORS.subtherapeutic,
                      opacity: 0.7
                    }}
                  />
                  <ReferenceArea
                    yAxisId="conc"
                    y1={therapeuticRange.min}
                    y2={therapeuticRange.max}
                    fill={ZONE_COLORS.therapeutic}
                    fillOpacity={0.08}
                    ifOverflow="hidden"
                    label={{
                      value: 'Faixa Terapêutica',
                      position: 'insideTopLeft',
                      fontSize: 9,
                      fill: ZONE_COLORS.therapeutic,
                      opacity: 0.7
                    }}
                  />
                  <ReferenceArea
                    yAxisId="conc"
                    y1={therapeuticRange.max}
                    y2={therapeuticRange.max * 1.5}
                    fill={ZONE_COLORS.supratherapeutic}
                    fillOpacity={0.08}
                    ifOverflow="hidden"
                    label={{
                      value: 'Supraterapêutico',
                      position: 'insideTopLeft',
                      fontSize: 9,
                      fill: ZONE_COLORS.supratherapeutic,
                      opacity: 0.7
                    }}
                  />
                  <ReferenceLine
                    yAxisId="conc"
                    y={therapeuticRange.min}
                    stroke={ZONE_COLORS.therapeutic}
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    ifOverflow="hidden"
                  />
                  <ReferenceLine
                    yAxisId="conc"
                    y={therapeuticRange.max}
                    stroke={ZONE_COLORS.therapeutic}
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    ifOverflow="hidden"
                  />
                </>
              )}
              
              {showCss && ssMetrics && (
                <>
                  <ReferenceArea
                    yAxisId="conc"
                    y1={ssMetrics.Cmin_ss}
                    y2={ssMetrics.Cmax_ss}
                    fill={CSS_COLOR}
                    fillOpacity={0.1}
                    ifOverflow="hidden"
                  />
                  <ReferenceLine
                    yAxisId="conc"
                    y={ssMetrics.Css_avg}
                    stroke={CSS_COLOR}
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    ifOverflow="hidden"
                    label={{
                      value: `Css ${ssMetrics.Css_avg.toFixed(0)}`,
                      position: 'right',
                      fontSize: 10,
                      fill: CSS_COLOR
                    }}
                  />
                </>
              )}
              
              {showOptimalZone && optimalConcentrationRange && (
                <>
                  <ReferenceArea
                    yAxisId="conc"
                    y1={optimalConcentrationRange.min}
                    y2={optimalConcentrationRange.max}
                    fill={MOOD_COLOR}
                    fillOpacity={0.12}
                    stroke={MOOD_COLOR}
                    strokeWidth={1}
                    strokeDasharray="4 2"
                    strokeOpacity={0.4}
                    ifOverflow="hidden"
                  />
                  <ReferenceLine
                    yAxisId="conc"
                    y={(optimalConcentrationRange.min + optimalConcentrationRange.max) / 2}
                    stroke={MOOD_COLOR}
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    strokeOpacity={0.5}
                    ifOverflow="hidden"
                    label={{
                      value: 'Zona Ótima (humor ≥8)',
                      position: 'insideTopRight',
                      fontSize: 9,
                      fill: MOOD_COLOR,
                      opacity: 0.8
                    }}
                  />
                </>
              )}
              
              <Area
                yAxisId="conc"
                type="monotoneX"
                dataKey="concentration"
                name="Plasma"
                stroke={color}
                fill={`url(#gradient-${medication.id})`}
                strokeWidth={2}
                connectNulls
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }}
              />

              {showEffectCurve && (
                <Area
                  yAxisId="conc"
                  type="monotoneX"
                  dataKey="effectConcentration"
                  name="Efeito Terapêutico"
                  stroke={EFFECT_COLOR}
                  fill={`url(#gradient-effect-${medication.id})`}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  connectNulls
                  dot={false}
                  activeDot={{ r: 4, fill: EFFECT_COLOR, stroke: '#fff', strokeWidth: 2 }}
                />
              )}

              {showTrendCurve && (
                <Line
                  yAxisId="conc"
                  type="monotoneX"
                  dataKey="trendConcentration"
                  name="Tendência (48h)"
                  stroke={TREND_COLOR}
                  strokeWidth={3}
                  strokeDasharray="8 4"
                  connectNulls
                  dot={false}
                  activeDot={{ r: 5, fill: TREND_COLOR, stroke: '#fff', strokeWidth: 2 }}
                />
              )}
              
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
              
              <Line
                yAxisId="mood"
                type="monotoneX"
                dataKey="cognitive"
                name="Cognição"
                stroke={COGNITIVE_COLOR}
                strokeWidth={2}
                strokeDasharray="5 5"
                connectNulls
                dot={{ r: 3, fill: COGNITIVE_COLOR }}
                activeDot={{ r: 5, fill: COGNITIVE_COLOR, stroke: '#fff', strokeWidth: 2 }}
              />
              
              {doseMarkers.map((dose, idx) => (
                <ReferenceLine
                  key={`dose-${idx}`}
                  yAxisId="conc"
                  x={dose.timestamp}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                  label={{
                    value: `▼ ${dose.amount}mg`,
                    position: 'top',
                    fontSize: 8,
                    fill: color,
                    opacity: 0.8
                  }}
                />
              ))}
              
              {/* Brush temporariamente desabilitado para debug */}
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
        
        {showTherapeutic && therapeuticRange && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t text-xs text-muted-foreground">
            <div className="w-6 h-0.5" style={{ backgroundColor: color, opacity: 0.5 }} />
            <span>Faixa terapêutica: {therapeuticRange.min}-{therapeuticRange.max} ng/mL</span>
          </div>
        )}

        {showOptimalZone && optimalConcentrationRange && (
          <div className="flex items-center gap-2 mt-2 text-xs">
            <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: MOOD_COLOR, opacity: 0.3 }} />
            <span style={{ color: MOOD_COLOR }}>
              Zona de humor ótimo (≥8): {optimalConcentrationRange.min.toFixed(0)}-{optimalConcentrationRange.max.toFixed(0)} ng/mL
            </span>
          </div>
        )}

        {showCss && ssMetrics && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-6 h-0.5 border-t-2 border-dashed" style={{ borderColor: CSS_COLOR }} />
              <span style={{ color: CSS_COLOR }}>Css média: {ssMetrics.Css_avg.toFixed(1)} ng/mL</span>
              <span className="text-muted-foreground/60">|</span>
              <span>Faixa: {ssMetrics.Cmin_ss.toFixed(0)}-{ssMetrics.Cmax_ss.toFixed(0)} ng/mL</span>
              <span className="text-muted-foreground/60">|</span>
              <span>Flutuação: {ssMetrics.fluctuation.toFixed(0)}%</span>
            </div>
            <p className="text-muted-foreground/80">
              Intervalo estimado: {ssMetrics.tau}h | Fator acumulação: {ssMetrics.accumulationFactor.toFixed(2)}x
              {!ssMetrics.atSteadyState && (
                <span className="text-amber-500 ml-2">
                  (ainda atingindo steady-state: ~{ssMetrics.timeToSteadyState.toFixed(0)}h total)
                </span>
              )}
            </p>
          </div>
        )}

        {isChronic && isNewlyStarted && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1 bg-amber-500/10 p-2 rounded border border-amber-500/20">
            <p className="font-medium text-amber-500">Medicamento recém-iniciado</p>
            <p>
              Antidepressivos levam 2-4 semanas para atingir efeito terapêutico completo.
              {onsetWeeksRemaining > 0 && (
                <span className="font-medium"> Faltam ~{onsetWeeksRemaining} semana{onsetWeeksRemaining > 1 ? 's' : ''}.</span>
              )}
            </p>
            <p className="text-muted-foreground/70">
              Correlações humor-medicamento podem não ser significativas até o steady-state ser atingido.
            </p>
          </div>
        )}

        {isChronic && !isNewlyStarted && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1 bg-blue-500/5 p-2 rounded">
            <p className="font-medium text-blue-400">Medicamento de uso crônico (em steady-state)</p>
            <p>{adherenceMetrics.description}</p>
            <p className="text-muted-foreground/70">
              Delay esperado na correlação humor: ~{adherenceMetrics.adherenceLagDays} dias após variação na adesão
            </p>
          </div>
        )}

        {showEffectCurve && !isChronic && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5" style={{ backgroundColor: color }} />
              <span>Plasma (Cp)</span>
              <div className="w-6 h-0.5 border-t-2 border-dashed" style={{ borderColor: EFFECT_COLOR }} />
              <span style={{ color: EFFECT_COLOR }}>Efeito (Ce)</span>
            </div>
            <p>
              Pico de efeito ~{effectMetrics.tMaxEffect.toFixed(1)}h após dose 
              (ke0={effectMetrics.ke0.toFixed(2)}/h, lag={effectMetrics.effectLag.toFixed(1)}h)
            </p>
          </div>
        )}

        {showTrendCurve && isChronic && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5" style={{ backgroundColor: color }} />
              <span>Plasma (Cp)</span>
              <div className="w-8 h-0.5 border-t-2 border-dashed" style={{ borderColor: TREND_COLOR }} />
              <span style={{ color: TREND_COLOR }}>Tendência</span>
            </div>
            <p>
              Média móvel de <strong>48h</strong> (~2 dias).
              Suaviza oscilações diárias e mostra tendência real.
            </p>
            <p className="text-muted-foreground/70">
              Útil para correlacionar com humor em tratamentos crônicos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
