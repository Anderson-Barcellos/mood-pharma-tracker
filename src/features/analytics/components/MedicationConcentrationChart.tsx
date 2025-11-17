import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  ComposedChart,
  Area,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Download, ArrowsOut } from '@phosphor-icons/react';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import { useConcentrationCurve } from '@/features/analytics/hooks/use-concentration-data';
import { useTimeFormat } from '@/features/analytics/hooks/use-time-format';

interface MedicationConcentrationChartProps {
  medication: Medication;
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  timeRangeHours: number;
  bodyWeight?: number;
  zoomDomain?: { left: number; right: number } | null;
  onZoom?: (domain: { left: number; right: number } | null) => void;
}

const MOOD_COLOR = '#22c55e'; // green

type ChartMouseEvent = {
  activeLabel?: number | string;
};

export default function MedicationConcentrationChart({
  medication,
  doses,
  moodEntries,
  timeRangeHours,
  bodyWeight = 70,
  zoomDomain,
  onZoom,
}: MedicationConcentrationChartProps) {
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);

  const dayRange = timeRangeHours / 24;
  const { formatXAxis, formatTooltip, getXAxisInterval, getXAxisLabel } = useTimeFormat('days', dayRange);

  // Filter doses for this specific medication
  const medicationDoses = useMemo(() => {
    return doses.filter(d => d.medicationId === medication.id);
  }, [doses, medication.id]);

  const latestDoseTimestamp = useMemo(
    () => medicationDoses.reduce((max, dose) => Math.max(max, dose.timestamp), 0),
    [medicationDoses]
  );

  const latestMoodTimestamp = useMemo(
    () => moodEntries.reduce((max, entry) => Math.max(max, entry.timestamp), 0),
    [moodEntries]
  );

  const [chartEndTime, setChartEndTime] = useState(() => Date.now());

  useEffect(() => {
    setChartEndTime(() => {
      const base = Date.now();
      return Math.max(base, latestDoseTimestamp, latestMoodTimestamp);
    });
  }, [latestDoseTimestamp, latestMoodTimestamp, timeRangeHours]);

  const endTime = chartEndTime;

  const startTime = useMemo(
    () => endTime - (timeRangeHours * 3600 * 1000),
    [endTime, timeRangeHours]
  );

  const pointsPerDay = timeRangeHours <= 48 ? 24 : 12;
  const totalPoints = Math.ceil((timeRangeHours / 24) * pointsPerDay);

  // Validate PK parameters to avoid NaNs or division-by-zero in calculations
  const hasPkParams =
    Number.isFinite(medication.halfLife) && medication.halfLife > 0 &&
    Number.isFinite(medication.volumeOfDistribution) && medication.volumeOfDistribution > 0 &&
    Number.isFinite(medication.bioavailability) && medication.bioavailability > 0 &&
    Number.isFinite(medication.absorptionRate) && medication.absorptionRate > 0;

  const { data: chartData, isLoading: _isLoadingConcentration } = useConcentrationCurve(hasPkParams ? {
    medication,
    doses: medicationDoses,
    startTime,
    endTime,
    points: totalPoints,
    bodyWeight
  } : {
    medication,
    doses: [],
    startTime,
    endTime,
    points: totalPoints,
    bodyWeight
  });

  // Show ALL mood entries (don't filter by medication)
  const moodData = useMemo(() => {
    const withinRange = [...moodEntries]
      .filter(entry => entry.timestamp >= startTime && entry.timestamp <= endTime)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(entry => ({
        timestamp: entry.timestamp,
        mood: entry.moodScore,
        anxiety: entry.anxietyLevel,
        energy: entry.energyLevel,
        focus: entry.focusLevel,
      }));

    // Agregar por dia quando o range for maior que 48h
    const aggregateByDay = timeRangeHours > 48;
    if (!aggregateByDay) return withinRange;

    const buckets: Record<number, { ts: number; count: number; mood: number; anxiety?: number; energy?: number; focus?: number }>
      = {};

    const startOfDay = (ts: number) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

    for (const p of withinRange) {
      const day = startOfDay(p.timestamp);
      const bucket = buckets[day] || (buckets[day] = { ts: day + 12 * 3600 * 1000, count: 0, mood: 0 });
      bucket.count += 1;
      bucket.mood += p.mood ?? 0;
      if (p.anxiety !== undefined) bucket.anxiety = (bucket.anxiety ?? 0) + p.anxiety;
      if (p.energy !== undefined) bucket.energy = (bucket.energy ?? 0) + p.energy;
      if (p.focus !== undefined) bucket.focus = (bucket.focus ?? 0) + p.focus;
    }

    return Object.values(buckets)
      .sort((a, b) => a.ts - b.ts)
      .map(b => ({
        timestamp: b.ts,
        mood: +(b.mood / b.count).toFixed(2),
        anxiety: b.anxiety !== undefined ? +(b.anxiety / b.count).toFixed(2) : undefined,
        energy: b.energy !== undefined ? +(b.energy / b.count).toFixed(2) : undefined,
        focus: b.focus !== undefined ? +(b.focus / b.count).toFixed(2) : undefined,
        count: b.count,
      }));
  }, [moodEntries, startTime, endTime, timeRangeHours]);

  // Calculate Y-axis domain for concentration
  const concentrationDomain = useMemo(() => {
    const allValues: number[] = [];

    chartData.forEach(point => {
      if (point.concentration !== null && point.concentration !== undefined && point.concentration > 0) {
        allValues.push(point.concentration);
      }
    });

    if (allValues.length === 0) return [0, 10];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min;
    const padding = range * 0.15 || Math.max(max * 0.15, 5);

    return [Math.max(0, min - padding), max + padding];
  }, [chartData]);

  const therapeuticRangeNgMl = useMemo(() => {
    if (!medication.therapeuticRange) return null;
    const unit = medication.therapeuticRange.unit?.toLowerCase() ?? 'ng/ml';
    const toNg = (v: number) => {
      if (unit.includes('mcg') || unit.includes('µg')) return v * 1000;
      if (unit.includes('ng')) return v;
      if (unit.includes('mg/l')) return v * 1000;
      return v;
    };
    return {
      min: toNg(medication.therapeuticRange.min),
      max: toNg(medication.therapeuticRange.max)
    };
  }, [medication.therapeuticRange]);

  const exportChart = useCallback(() => {
    if (!chartRef.current) return;

    const svgElement = chartRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = svgElement.clientWidth * 2;
      canvas.height = svgElement.clientHeight * 2;

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.download = `${medication.name}-concentration-chart-${new Date().toISOString().split('T')[0]}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      }, 'image/png');

      URL.revokeObjectURL(url);
    };

    img.src = url;
  }, [medication.name]);

  const zoom = useCallback(() => {
    if (refAreaLeft === null || refAreaRight === null || refAreaLeft === refAreaRight) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    const rawLeft = Math.min(refAreaLeft, refAreaRight);
    const rawRight = Math.max(refAreaLeft, refAreaRight);
    const left = Math.max(startTime, rawLeft);
    const right = Math.min(endTime, rawRight);

    if (left === right) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    if (onZoom) {
      onZoom({ left, right });
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [refAreaLeft, refAreaRight, onZoom, startTime, endTime]);

  const resetZoom = useCallback(() => {
    if (onZoom) {
      onZoom(null);
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [onZoom]);

  const color = medication.color ?? '#3b82f6';

  const hasConcentration = useMemo(
    () => chartData.some(p => p.concentration !== null && p.concentration !== undefined && p.concentration > 0),
    [chartData]
  );

  const hasAnyDose = medicationDoses.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              {medication.name}
            </CardTitle>
            <CardDescription>
              Serum concentration with therapeutic range and mood overlay
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {zoomDomain && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetZoom}
                className="gap-2"
              >
                <ArrowsOut className="h-4 w-4" />
                Reset
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={exportChart}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[400px] w-full" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              onMouseDown={(e: ChartMouseEvent) => {
                if (e && typeof e.activeLabel === 'number') {
                  setRefAreaLeft(e.activeLabel);
                }
              }}
              onMouseMove={(e: ChartMouseEvent) => {
                if (refAreaLeft !== null && e && typeof e.activeLabel === 'number') {
                  setRefAreaRight(e.activeLabel);
                }
              }}
              onMouseUp={zoom}
            >
              <defs>
                <linearGradient id={`gradient-${medication.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />

              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                tick={{ fontSize: 11 }}
                interval={getXAxisInterval(chartData.length)}
                type="number"
                domain={
                  zoomDomain
                    ? [zoomDomain.left, zoomDomain.right]
                    : [startTime, endTime]
                }
                allowDataOverflow={!!zoomDomain}
                label={{
                  value: getXAxisLabel(
                    zoomDomain?.left ?? startTime,
                    zoomDomain?.right ?? endTime,
                    !!zoomDomain
                  ),
                  position: 'insideBottom',
                  offset: -5,
                  style: { fontSize: 12 }
                }}
              />

              {/* Left Y-axis: Mood (0-10) */}
              <YAxis
                yAxisId="mood"
                domain={[0, 10]}
                tick={{ fontSize: 11 }}
                label={{
                  value: 'Mood Score',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 12, textAnchor: 'middle' }
                }}
              />

              {/* Right Y-axis: Concentration (ng/mL) */}
              <YAxis
                yAxisId="concentration"
                orientation="right"
                domain={concentrationDomain}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => value.toFixed(1)}
                label={{
                  value: 'Concentration (ng/mL)',
                  angle: 90,
                  position: 'insideRight',
                  style: { fontSize: 12, textAnchor: 'middle' }
                }}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                labelFormatter={(label) => {
                  const point = chartData.find(d => d.timestamp === label);
                  return point ? formatTooltip(point.time) : label;
                }}
                formatter={(rawValue: unknown, rawName: unknown, entry?: any) => {
                  const name = typeof rawName === 'string' ? rawName : String(rawName);
                  const value = typeof rawValue === 'number' ? rawValue : null;

                  if (value === null) {
                    return ['—', name];
                  }

                  if (name === 'Mood') {
                    const count = entry?.payload?.count;
                    return [`${value.toFixed(1)}/10`, count ? `${name} (avg ${count})` : name];
                  }

                  if (name === medication.name) {
                    const displayUnit = medication.therapeuticRange?.unit ?? 'ng/mL';
                    const unitLower = displayUnit.toLowerCase();
                    let displayValue = value;
                    if (unitLower.includes('mcg') || unitLower.includes('µg')) displayValue = value / 1000; // show in mcg/mL
                    else if (unitLower.includes('mg/l')) displayValue = value / 1000; // ng/mL -> mg/L
                    const decimals = unitLower.includes('mcg') || unitLower.includes('µg') ? 3 : 2;
                    return [`${displayValue.toFixed(decimals)} ${displayUnit}`, medication.name];
                  }

                  return [String(rawValue ?? '—'), name];
                }}
              />

              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />

              {/* Therapeutic range reference area */}
              {therapeuticRangeNgMl && (
                <ReferenceArea
                  yAxisId="concentration"
                  y1={therapeuticRangeNgMl.min}
                  y2={therapeuticRangeNgMl.max}
                  fill={color}
                  fillOpacity={0.1}
                  stroke={color}
                  strokeOpacity={0.3}
                  strokeDasharray="3 3"
                />
              )}

              {/* Concentration curve */}
              <Area
                yAxisId="concentration"
                type="monotone"
                dataKey="concentration"
                name={medication.name}
                stroke={color}
                fill={`url(#gradient-${medication.id})`}
                strokeWidth={2.5}
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-in-out"
              />

              {/* Mood scatter plot overlay */}
              <Scatter
                yAxisId="mood"
                data={moodData}
                name="Mood points"
                dataKey="mood"
                fill={MOOD_COLOR}
                stroke={MOOD_COLOR}
                strokeWidth={2}
                shape="circle"
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
              />

              {/* Mood interpolated line with smooth curve */}
              <Line
                yAxisId="mood"
                data={moodData}
                type="natural"
                dataKey="mood"
                name="Mood curve"
                stroke={MOOD_COLOR}
                strokeOpacity={0.95}
                strokeWidth={3}
                strokeDasharray="0"
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-in-out"
                connectNulls={true}
              />

              {/* Zoom selection area */}
              {refAreaLeft !== null && refAreaRight !== null && (
                <ReferenceArea
                  yAxisId="concentration"
                  x1={refAreaLeft}
                  x2={refAreaRight}
                  strokeOpacity={0.3}
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {!hasPkParams && (
          <div className="mt-3 text-center text-xs text-destructive">
            Parâmetros farmacocinéticos faltando (half-life, Vd ou F). Edite a medicação para preencher.
          </div>
        )}

        {!hasConcentration && hasPkParams && (
          <div className="mt-3 text-center text-xs text-muted-foreground">
            {hasAnyDose
              ? 'Sem concentração no período selecionado. Ajuste o intervalo de tempo ou o zoom.'
              : 'Nenhuma dose registrada ainda. Registre uma dose para ver a curva de concentração.'}
          </div>
        )}

        {/* Therapeutic range legend */}
        {medication.therapeuticRange && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Therapeutic Range:</p>
            <div className="flex items-center gap-2 text-xs">
              <div
                className="w-8 h-3 rounded border"
                style={{
                  backgroundColor: `${medication.color}20`,
                  borderColor: `${medication.color}50`,
                  borderStyle: 'dashed'
                }}
              />
              <span className="font-medium">{medication.name}:</span>
              <span className="text-muted-foreground">
                {medication.therapeuticRange.min}-{medication.therapeuticRange.max} {medication.therapeuticRange.unit}
              </span>
            </div>
          </div>
        )}

        {/* Zoom instructions */}
        {!zoomDomain && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground text-center">
              💡 Tip: Click and drag on the chart to zoom into a specific time range
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
