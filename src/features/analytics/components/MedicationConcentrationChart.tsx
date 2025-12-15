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
  activeCoordinate?: { x: number; y: number };
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
    fallback = [0, 10],
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

// Helper to extract numeric timestamp from chart event
const getActiveTimestamp = (e: ChartMouseEvent): number | null => {
  if (!e || e.activeLabel === undefined || e.activeLabel === null) return null;
  if (typeof e.activeLabel === 'number') return e.activeLabel;
  const parsed = Number(e.activeLabel);
  return Number.isFinite(parsed) ? parsed : null;
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

  // Series visibility state for legend toggle
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const chartRef = useRef<HTMLDivElement>(null);

  // Toggle series visibility when clicking legend
  const handleLegendClick = useCallback((dataKey: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  }, []);

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

  const latestDataTimestamp = useMemo(
    () => Math.max(latestDoseTimestamp, latestMoodTimestamp),
    [latestDoseTimestamp, latestMoodTimestamp]
  );

  const [chartEndTime, setChartEndTime] = useState(() => (latestDataTimestamp || Date.now()));

  useEffect(() => {
    // Se houver dados, ancoramos o gráfico no timestamp mais recente.
    // Isso evita que dados "antigos" fiquem sempre fora da janela baseada em Date.now().
    if (latestDataTimestamp) {
      setChartEndTime(latestDataTimestamp);
    } else {
      setChartEndTime(Date.now());
    }
  }, [latestDataTimestamp, timeRangeHours]);

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

  // Show ALL mood entries with real timestamps (no aggregation)
  const moodData = useMemo(() => {
    return [...moodEntries]
      .filter(entry => entry.timestamp >= startTime && entry.timestamp <= endTime)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(entry => {
        const date = new Date(entry.timestamp);
        return {
          timestamp: entry.timestamp,
          mood: entry.moodScore,
          anxiety: entry.anxietyLevel,
          energy: entry.energyLevel,
          focus: entry.focusLevel,
          exactTime: `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        };
      });
  }, [moodEntries, startTime, endTime]);

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

  // Calculate Y-axis domain for concentration (include therapeutic range so it doesn't get clipped)
  const concentrationDomain = useMemo(() => {
    const values: Array<number | null | undefined> = [];

    for (const point of chartData) {
      if (point.concentration !== null && point.concentration !== undefined && point.concentration > 0) {
        values.push(point.concentration);
      }
    }

    if (therapeuticRangeNgMl) {
      values.push(therapeuticRangeNgMl.min, therapeuticRangeNgMl.max);
    }

    return computePaddedDomain(values, {
      clampMin: 0,
      paddingRatio: 0.12,
      minPaddingAbs: 0.1,
      fallback: [0, 10],
    });
  }, [chartData, therapeuticRangeNgMl]);

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
            {(zoomDomain || hiddenSeries.size > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetZoom();
                  setHiddenSeries(new Set());
                }}
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
              margin={{ top: 10, right: 60, left: 20, bottom: 30 }}
              onMouseDown={(e: ChartMouseEvent) => {
                const timestamp = getActiveTimestamp(e);
                if (timestamp !== null) {
                  setRefAreaLeft(timestamp);
                }
              }}
              onMouseMove={(e: ChartMouseEvent) => {
                if (refAreaLeft !== null) {
                  const timestamp = getActiveTimestamp(e);
                  if (timestamp !== null) {
                    setRefAreaRight(timestamp);
                  }
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

              {/* Left Y-axis: Concentration (ng/mL) - primary clinical metric */}
              <YAxis
                yAxisId="concentration"
                domain={concentrationDomain}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => value.toFixed(1)}
                label={{
                  value: 'Concentração (ng/mL)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 12, textAnchor: 'middle' }
                }}
              />

              {/* Right Y-axis: Mood (0-10) */}
              <YAxis
                yAxisId="mood"
                orientation="right"
                domain={[0, 10]}
                tick={{ fontSize: 11 }}
                label={{
                  value: 'Humor (0-10)',
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
                  if (typeof label === 'number' && label > 0) {
                    return formatTooltip(label);
                  }
                  return String(label);
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;

                  const point = payload[0]?.payload;
                  const timestamp = typeof label === 'number' ? label : point?.timestamp;
                  let concentration = point?.concentration;
                  const mood = point?.mood;
                  const exactTime = point?.exactTime;
                  const displayUnit = medication.therapeuticRange?.unit ?? 'ng/mL';

                  if ((concentration === undefined || concentration === null) && timestamp && chartData?.length) {
                    const closest = chartData.reduce((prev, curr) => {
                      const prevDiff = Math.abs((prev.timestamp || 0) - timestamp);
                      const currDiff = Math.abs((curr.timestamp || 0) - timestamp);
                      return currDiff < prevDiff ? curr : prev;
                    });
                    if (closest && Math.abs((closest.timestamp || 0) - timestamp) < 3600000) {
                      concentration = closest.concentration;
                    }
                  }

                  const getTherapeuticStatus = () => {
                    if (!therapeuticRangeNgMl || concentration === undefined || concentration === null) return null;
                    if (concentration < therapeuticRangeNgMl.min) return { text: 'Subterapêutico', color: '#f59e0b' };
                    if (concentration > therapeuticRangeNgMl.max) return { text: 'Acima da faixa', color: '#ef4444' };
                    return { text: 'Na faixa terapêutica', color: '#22c55e' };
                  };

                  const therapeuticStatus = getTherapeuticStatus();

                  return (
                    <div style={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '6px', color: 'hsl(var(--foreground))' }}>
                        {exactTime || formatTooltip(timestamp)}
                      </div>
                      {concentration !== undefined && concentration !== null && (
                        <div style={{ marginBottom: '4px' }}>
                          <span style={{ color: medication.color || '#8b5cf6' }}>
                            {medication.name}: <strong>{concentration.toFixed(2)} {displayUnit}</strong>
                          </span>
                          {therapeuticStatus && (
                            <div style={{ fontSize: '0.8em', color: therapeuticStatus.color, marginTop: '2px' }}>
                              {therapeuticStatus.text}
                            </div>
                          )}
                        </div>
                      )}
                      {mood !== undefined && mood !== null && (
                        <div style={{ color: '#22c55e' }}>
                          Humor: <strong>{mood.toFixed(1)}/10</strong>
                        </div>
                      )}
                    </div>
                  );
                }}
              />

              <Legend
                wrapperStyle={{ paddingTop: '20px', cursor: 'pointer' }}
                iconType="line"
                onClick={(e) => {
                  if (e && e.dataKey) {
                    handleLegendClick(e.dataKey as string);
                  }
                }}
                formatter={(value, entry) => {
                  const dataKey = entry.dataKey as string;
                  const isHidden = hiddenSeries.has(dataKey);
                  // Show medication name for concentration, otherwise show the value
                  const displayName = dataKey === 'concentration' ? medication.name : value;
                  return (
                    <span
                      style={{
                        color: isHidden ? '#999' : 'inherit',
                        textDecoration: isHidden ? 'line-through' : 'none'
                      }}
                    >
                      {displayName}
                    </span>
                  );
                }}
              />

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
                type="natural"
                dataKey="concentration"
                name={medication.name}
                stroke={color}
                fill={`url(#gradient-${medication.id})`}
                strokeWidth={2.5}
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-in-out"
                hide={hiddenSeries.has('concentration')}
                activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }}
              />

              {/* Mood scatter plot overlay */}
              {!hiddenSeries.has('mood') && (
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
                  legendType="none"
                />
              )}

              {/* Mood interpolated line with smooth curve */}
              <Line
                yAxisId="mood"
                data={moodData}
                type="natural"
                dataKey="mood"
                name="Mood"
                stroke={MOOD_COLOR}
                strokeOpacity={0.95}
                strokeWidth={3}
                dot={{ r: 5, fill: MOOD_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 7, fill: MOOD_COLOR, strokeWidth: 2, stroke: '#fff' }}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-in-out"
                connectNulls={true}
                hide={hiddenSeries.has('mood')}
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
