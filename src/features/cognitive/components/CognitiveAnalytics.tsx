/**
 * CognitiveAnalytics - Advanced temporal analytics for cognitive performance
 *
 * Features:
 * - Separate charts for accuracy and response time
 * - Moving averages (7d, 30d)
 * - Trend indicators with linear regression
 * - Timeframe selector (7d, 30d, 90d, all)
 */

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { TrendUp, TrendDown } from '@phosphor-icons/react';
import { safeFormat } from '@/shared/utils';
import type { CognitiveTest } from '@/shared/types';
import { subDays, isAfter } from 'date-fns';

interface CognitiveAnalyticsProps {
  tests: CognitiveTest[];
}

type Timeframe = '7d' | '30d' | '90d' | 'all';

interface ChartDataPoint {
  timestamp: number;
  date: string;
  accuracy: number;
  responseTime: number;
  ma7_accuracy?: number;
  ma30_accuracy?: number;
  ma7_responseTime?: number;
  ma30_responseTime?: number;
}

interface TrendAnalysis {
  slope: number;
  direction: 'up' | 'down' | 'stable';
  strength: 'weak' | 'moderate' | 'strong';
  percentageChange: number;
}

/**
 * Calculate linear regression slope for trend analysis
 */
function calculateTrend(data: number[]): TrendAnalysis {
  if (data.length < 2) {
    return { slope: 0, direction: 'stable', strength: 'weak', percentageChange: 0 };
  }

  const n = data.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  const yValues = data;

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const meanY = sumY / n;

  // Calculate percentage change based on slope relative to mean
  const percentageChange = meanY !== 0 ? (slope * n / meanY) * 100 : 0;

  // Determine direction and strength
  let direction: 'up' | 'down' | 'stable' = 'stable';
  let strength: 'weak' | 'moderate' | 'strong' = 'weak';

  if (Math.abs(percentageChange) < 2) {
    direction = 'stable';
    strength = 'weak';
  } else if (percentageChange > 0) {
    direction = 'up';
    if (percentageChange > 10) strength = 'strong';
    else if (percentageChange > 5) strength = 'moderate';
    else strength = 'weak';
  } else {
    direction = 'down';
    if (percentageChange < -10) strength = 'strong';
    else if (percentageChange < -5) strength = 'moderate';
    else strength = 'weak';
  }

  return { slope, direction, strength, percentageChange };
}

/**
 * Calculate moving average for a series of values
 */
function calculateMovingAverage(data: ChartDataPoint[], key: 'accuracy' | 'responseTime', window: number): number[] {
  return data.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const slice = data.slice(start, index + 1);
    const sum = slice.reduce((acc, point) => acc + point[key], 0);
    return sum / slice.length;
  });
}

/**
 * Filter tests by timeframe
 */
function filterByTimeframe(tests: CognitiveTest[], timeframe: Timeframe): CognitiveTest[] {
  if (timeframe === 'all') return tests;

  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  const cutoffDate = subDays(new Date(), days);

  return tests.filter(test => isAfter(new Date(test.timestamp), cutoffDate));
}

export default function CognitiveAnalytics({ tests }: CognitiveAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');

  const analyticsData = useMemo(() => {
    const filteredTests = filterByTimeframe(tests, timeframe);
    const sortedTests = [...filteredTests].sort((a, b) => a.timestamp - b.timestamp);

    if (sortedTests.length === 0) {
      return {
        chartData: [],
        accuracyTrend: { slope: 0, direction: 'stable' as const, strength: 'weak' as const, percentageChange: 0 },
        responseTimeTrend: { slope: 0, direction: 'stable' as const, strength: 'weak' as const, percentageChange: 0 },
        stats: {
          avgAccuracy: 0,
          avgResponseTime: 0,
          bestAccuracy: 0,
          bestResponseTime: 0
        }
      };
    }

    // Prepare chart data
    const chartData: ChartDataPoint[] = sortedTests.map(test => ({
      timestamp: test.timestamp,
      date: safeFormat(test.timestamp, 'MMM d', 'N/A'),
      accuracy: test.accuracy * 100,
      responseTime: test.averageResponseTime
    }));

    // Calculate moving averages
    const ma7_accuracy = calculateMovingAverage(chartData, 'accuracy', 7);
    const ma30_accuracy = calculateMovingAverage(chartData, 'accuracy', 30);
    const ma7_responseTime = calculateMovingAverage(chartData, 'responseTime', 7);
    const ma30_responseTime = calculateMovingAverage(chartData, 'responseTime', 30);

    // Add moving averages to chart data
    chartData.forEach((point, index) => {
      point.ma7_accuracy = ma7_accuracy[index];
      point.ma30_accuracy = ma30_accuracy[index];
      point.ma7_responseTime = ma7_responseTime[index];
      point.ma30_responseTime = ma30_responseTime[index];
    });

    // Calculate trends
    const accuracyValues = chartData.map(d => d.accuracy);
    const responseTimeValues = chartData.map(d => d.responseTime);

    const accuracyTrend = calculateTrend(accuracyValues);
    const responseTimeTrend = calculateTrend(responseTimeValues);

    // Calculate statistics
    const avgAccuracy = accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length;
    const avgResponseTime = responseTimeValues.reduce((a, b) => a + b, 0) / responseTimeValues.length;
    const bestAccuracy = Math.max(...accuracyValues);
    const bestResponseTime = Math.min(...responseTimeValues);

    return {
      chartData,
      accuracyTrend,
      responseTimeTrend,
      stats: {
        avgAccuracy,
        avgResponseTime,
        bestAccuracy,
        bestResponseTime
      }
    };
  }, [tests, timeframe]);

  const { chartData, accuracyTrend, responseTimeTrend, stats } = analyticsData;

  const renderTrendIndicator = (trend: TrendAnalysis, metricType: 'accuracy' | 'responseTime') => {
    // For response time, lower is better (inverted logic)
    const isPositive = metricType === 'accuracy'
      ? trend.direction === 'up'
      : trend.direction === 'down';

    const isNegative = metricType === 'accuracy'
      ? trend.direction === 'down'
      : trend.direction === 'up';

    if (trend.direction === 'stable') {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-1 h-4 bg-muted-foreground rounded-full" />
          <span className="text-sm font-medium">Estável</span>
        </div>
      );
    }

    const Icon = isPositive ? TrendUp : TrendDown;
    const colorClass = isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground';

    return (
      <div className={`flex items-center gap-2 ${colorClass}`}>
        <Icon className="w-5 h-5" weight="bold" />
        <span className="text-sm font-medium">
          {isPositive ? 'Melhorando' : 'Piorando'}
        </span>
        <span className="text-xs opacity-75">
          ({Math.abs(trend.percentageChange).toFixed(1)}%)
        </span>
      </div>
    );
  };

  if (tests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução Cognitiva</CardTitle>
          <CardDescription>Nenhum teste realizado ainda</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete alguns testes cognitivos para visualizar sua evolução ao longo do tempo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Evolução Cognitiva</CardTitle>
              <CardDescription>Análise temporal de performance</CardDescription>
            </div>
            <div className="flex gap-2">
              {(['7d', '30d', '90d', 'all'] as Timeframe[]).map(tf => (
                <Button
                  key={tf}
                  variant={timeframe === tf ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeframe(tf)}
                >
                  {tf === 'all' ? 'Tudo' : tf}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        {chartData.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Nenhum teste no período selecionado.
            </p>
          </CardContent>
        ) : (
          <CardContent className="space-y-8">
            {/* Statistics Summary */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Accuracy Média</p>
                <p className="text-2xl font-bold">{stats.avgAccuracy.toFixed(0)}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Melhor Accuracy</p>
                <p className="text-2xl font-bold text-green-500">{stats.bestAccuracy.toFixed(0)}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Tempo Médio</p>
                <p className="text-2xl font-bold">{stats.avgResponseTime.toFixed(1)}s</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Melhor Tempo</p>
                <p className="text-2xl font-bold text-green-500">{stats.bestResponseTime.toFixed(1)}s</p>
              </div>
            </div>

            {/* Accuracy Chart */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Precisão (Accuracy)</h3>
                  <p className="text-sm text-muted-foreground">Percentual de acertos ao longo do tempo</p>
                </div>
                {renderTrendIndicator(accuracyTrend, 'accuracy')}
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                    />
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        const formatted = typeof value === 'number' ? value.toFixed(1) : value;
                        return [`${formatted}%`, name];
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <ReferenceLine y={70} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" opacity={0.5} />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="hsl(var(--cognitive))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Accuracy"
                    />
                    {chartData.length >= 7 && (
                      <Line
                        type="monotone"
                        dataKey="ma7_accuracy"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                        name="Média 7d"
                        strokeDasharray="5 5"
                      />
                    )}
                    {chartData.length >= 30 && (
                      <Line
                        type="monotone"
                        dataKey="ma30_accuracy"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        name="Média 30d"
                        strokeDasharray="3 3"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Response Time Chart */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Tempo de Resposta</h3>
                  <p className="text-sm text-muted-foreground">Tempo médio por matriz (segundos)</p>
                </div>
                {renderTrendIndicator(responseTimeTrend, 'responseTime')}
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Tempo (s)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                    />
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        const formatted = typeof value === 'number' ? value.toFixed(1) : value;
                        return [`${formatted}s`, name];
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Tempo"
                    />
                    {chartData.length >= 7 && (
                      <Line
                        type="monotone"
                        dataKey="ma7_responseTime"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                        name="Média 7d"
                        strokeDasharray="5 5"
                      />
                    )}
                    {chartData.length >= 30 && (
                      <Line
                        type="monotone"
                        dataKey="ma30_responseTime"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        name="Média 30d"
                        strokeDasharray="3 3"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
