import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { useHealthSessions } from '@/hooks/use-health-data';
import { TrendUp, TrendDown, Minus } from '@phosphor-icons/react';

interface HealthScoreTrendProps {
  startDate?: Date;
  endDate?: Date;
  showTrend?: boolean;
}

export default function HealthScoreTrend({
  startDate,
  endDate,
  showTrend = true
}: HealthScoreTrendProps) {
  const sessions = useHealthSessions(startDate, endDate) ?? [];

  const chartData = useMemo(() => {
    return sessions
      .filter((session) => session.period === 'daily' && session.overallScore > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((session) => ({
        date: session.date,
        dateObj: parseISO(session.date),
        score: session.overallScore,
        formattedDate: format(parseISO(session.date), 'MMM d')
      }));
  }, [sessions]);

  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        trend: 0,
        trendDirection: 'stable' as 'up' | 'down' | 'stable'
      };
    }

    const scores = chartData.map((d) => d.score);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    // Calculate trend (simple linear regression slope)
    let trend = 0;
    if (chartData.length > 1) {
      const n = chartData.length;
      const xMean = (n - 1) / 2;
      const yMean = average;

      let numerator = 0;
      let denominator = 0;

      chartData.forEach((d, i) => {
        numerator += (i - xMean) * (d.score - yMean);
        denominator += Math.pow(i - xMean, 2);
      });

      trend = denominator !== 0 ? numerator / denominator : 0;
    }

    const trendDirection =
      Math.abs(trend) < 0.5 ? 'stable' : trend > 0 ? 'up' : 'down';

    return {
      average: Math.round(average),
      min,
      max,
      trend,
      trendDirection
    };
  }, [chartData]);

  const getTrendIcon = () => {
    if (stats.trendDirection === 'up') {
      return <TrendUp className="h-5 w-5 text-green-500" weight="bold" />;
    } else if (stats.trendDirection === 'down') {
      return <TrendDown className="h-5 w-5 text-red-500" weight="bold" />;
    }
    return <Minus className="h-5 w-5 text-gray-500" weight="bold" />;
  };

  const getTrendColor = () => {
    if (stats.trendDirection === 'up') return 'text-green-600 dark:text-green-400';
    if (stats.trendDirection === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Score Trend</CardTitle>
          <CardDescription>Daily composite health score (0-100)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No health score data available.</p>
            <p className="text-xs mt-2">
              Import health data to see your daily health score trends.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Health Score Trend
          {showTrend && getTrendIcon()}
        </CardTitle>
        <CardDescription>
          Daily composite health score (0-100) based on heart rate, activity, and sleep
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-lg border bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">Average</div>
            <div className="text-2xl font-bold">{stats.average}</div>
          </div>
          <div className="p-3 rounded-lg border bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">Min</div>
            <div className="text-2xl font-bold text-red-500">{stats.min}</div>
          </div>
          <div className="p-3 rounded-lg border bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">Max</div>
            <div className="text-2xl font-bold text-green-500">{stats.max}</div>
          </div>
          <div className="p-3 rounded-lg border bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">Trend</div>
            <div className={`text-2xl font-bold ${getTrendColor()}`}>
              {stats.trendDirection === 'up'
                ? '↗'
                : stats.trendDirection === 'down'
                ? '↘'
                : '→'}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />

              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 11 }}
                interval={Math.floor(chartData.length / 7)}
              />

              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                label={{
                  value: 'Health Score',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 12 }
                }}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                formatter={(value: number) => [`${value}/100`, 'Health Score']}
              />

              {/* Reference lines for score ranges */}
              <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.3} />
              <ReferenceLine y={50} stroke="#eab308" strokeDasharray="3 3" strokeOpacity={0.3} />
              <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.3} />

              {/* Area chart */}
              <Area
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#scoreGradient)"
                isAnimationActive={true}
                animationDuration={800}
              />

              {/* Line overlay */}
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                isAnimationActive={true}
                animationDuration={800}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Score interpretation */}
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs font-medium text-muted-foreground mb-2">Score Interpretation:</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>70-100: Excellent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>50-69: Good</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>0-49: Needs Attention</span>
            </div>
          </div>
        </div>

        {/* Trend analysis */}
        {showTrend && stats.trendDirection !== 'stable' && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 text-xs">
            <span className={`font-semibold ${getTrendColor()}`}>
              {stats.trendDirection === 'up' ? '↗ Improving Trend:' : '↘ Declining Trend:'}
            </span>{' '}
            <span className="text-muted-foreground">
              Your health score has been {stats.trendDirection === 'up' ? 'increasing' : 'decreasing'} by approximately {Math.abs(stats.trend).toFixed(1)} points per day over this period.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
