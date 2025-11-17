'use client';

import { useMemo } from 'react';
import { format, subDays, startOfDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  Smiley,
  SmileyMeh,
  SmileySad,
  SmileyWink,
  SmileyXEyes,
  TrendUp,
  TrendDown,
  Minus
} from '@phosphor-icons/react';
import { useMoodEntries } from '@/hooks/use-mood-entries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/utils';

// Emoji mapping for mood scores
const getMoodEmoji = (score: number) => {
  if (score >= 9) return { icon: Smiley, color: 'text-green-500', bg: 'bg-green-500' };
  if (score >= 7) return { icon: SmileyWink, color: 'text-emerald-500', bg: 'bg-emerald-500' };
  if (score >= 5) return { icon: SmileyMeh, color: 'text-amber-500', bg: 'bg-amber-500' };
  if (score >= 3) return { icon: SmileySad, color: 'text-orange-500', bg: 'bg-orange-500' };
  return { icon: SmileyXEyes, color: 'text-red-500', bg: 'bg-red-500' };
};

// Mood range labels
const getMoodRange = (score: number): string => {
  if (score >= 8) return 'Excelente';
  if (score >= 6) return 'Bom';
  if (score >= 4) return 'Neutro';
  if (score >= 2) return 'Ruim';
  return 'Crítico';
};

interface DayData {
  date: Date;
  avgMood: number | null;
  count: number;
  isToday: boolean;
}

/**
 * MoodTrends - 7-day mood trend visualization widget
 *
 * Features:
 * - Mini bar chart showing last 7 days
 * - Average mood score with emoji indicator
 * - Trend direction (up/down/stable)
 * - Mood range categories
 * - Touch-friendly bars with hover states
 */
export default function MoodTrends() {
  const { moodEntries, isLoading } = useMoodEntries();

  // Calculate 7-day trend data
  const trendData = useMemo<{
    days: DayData[];
    weekAvg: number;
    trend: 'up' | 'down' | 'stable';
    trendValue: number;
  }>(() => {
    const now = new Date();
    const days: DayData[] = [];

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = startOfDay(subDays(now, i));
      const dayStart = date.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

      // Find entries for this day
      const dayEntries = moodEntries.filter(
        e => e.timestamp >= dayStart && e.timestamp <= dayEnd
      );

      const avgMood = dayEntries.length > 0
        ? dayEntries.reduce((sum, e) => sum + e.moodScore, 0) / dayEntries.length
        : null;

      days.push({
        date,
        avgMood,
        count: dayEntries.length,
        isToday: isToday(date)
      });
    }

    // Calculate week average (only days with data)
    const daysWithData = days.filter(d => d.avgMood !== null);
    const weekAvg = daysWithData.length > 0
      ? daysWithData.reduce((sum, d) => sum + (d.avgMood || 0), 0) / daysWithData.length
      : 0;

    // Calculate trend (compare first half vs second half)
    const midpoint = Math.floor(daysWithData.length / 2);
    const firstHalf = daysWithData.slice(0, midpoint);
    const secondHalf = daysWithData.slice(midpoint);

    const firstAvg = firstHalf.length > 0
      ? firstHalf.reduce((sum, d) => sum + (d.avgMood || 0), 0) / firstHalf.length
      : 0;
    const secondAvg = secondHalf.length > 0
      ? secondHalf.reduce((sum, d) => sum + (d.avgMood || 0), 0) / secondHalf.length
      : 0;

    const trendValue = secondAvg - firstAvg;
    const trend = Math.abs(trendValue) < 0.5 ? 'stable' : trendValue > 0 ? 'up' : 'down';

    return { days, weekAvg, trend, trendValue };
  }, [moodEntries]);

  const { icon: AvgIcon, color: avgColor } = getMoodEmoji(trendData.weekAvg);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-end h-32 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <Skeleton key={i} className="flex-1 h-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Tendência Semanal</CardTitle>
            <CardDescription className="text-xs mt-1">
              Últimos 7 dias de humor
            </CardDescription>
          </div>

          {/* Trend indicator */}
          {trendData.days.some(d => d.avgMood !== null) && (
            <div className="flex items-center gap-2">
              {trendData.trend === 'up' && (
                <>
                  <TrendUp className="w-5 h-5 text-green-500" weight="bold" />
                  <span className="text-sm font-semibold text-green-500">
                    +{trendData.trendValue.toFixed(1)}
                  </span>
                </>
              )}
              {trendData.trend === 'down' && (
                <>
                  <TrendDown className="w-5 h-5 text-red-500" weight="bold" />
                  <span className="text-sm font-semibold text-red-500">
                    {trendData.trendValue.toFixed(1)}
                  </span>
                </>
              )}
              {trendData.trend === 'stable' && (
                <>
                  <Minus className="w-5 h-5 text-amber-500" weight="bold" />
                  <span className="text-sm font-semibold text-muted-foreground">
                    Estável
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Bar Chart */}
        <div className="flex justify-between items-end h-32 gap-2">
          {trendData.days.map((day, idx) => {
            const height = day.avgMood ? (day.avgMood / 10) * 100 : 0;
            const { bg } = getMoodEmoji(day.avgMood || 0);

            return (
              <motion.div
                key={day.date.getTime()}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: '100%', opacity: 1 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                className="flex-1 flex flex-col items-center gap-2"
              >
                {/* Bar */}
                <div className="relative w-full h-full flex items-end">
                  {day.avgMood !== null ? (
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: idx * 0.05 + 0.2, duration: 0.3 }}
                      className={cn(
                        'w-full rounded-t-md transition-all duration-300',
                        'hover:opacity-80 cursor-pointer',
                        bg,
                        day.isToday && 'ring-2 ring-primary ring-offset-2'
                      )}
                      style={{ height: `${height}%` }}
                      title={`${format(day.date, 'dd/MM', { locale: ptBR })}: ${day.avgMood.toFixed(1)}/10 (${day.count} ${day.count === 1 ? 'registro' : 'registros'})`}
                    >
                      {day.avgMood >= 7 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-white drop-shadow">
                            {day.avgMood.toFixed(0)}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="w-full h-1 bg-muted/30 rounded" />
                  )}
                </div>

                {/* Day label */}
                <span className={cn(
                  'text-xs font-medium',
                  day.isToday ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {format(day.date, 'EEE', { locale: ptBR })[0].toUpperCase()}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Stats */}
        {trendData.days.some(d => d.avgMood !== null) ? (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            {/* Average */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AvgIcon className={cn('w-5 h-5', avgColor)} weight="fill" />
              </div>
              <p className="text-2xl font-bold">
                {trendData.weekAvg.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">Média</p>
            </div>

            {/* Range */}
            <div className="text-center">
              <p className="text-sm font-semibold mb-1">
                {getMoodRange(trendData.weekAvg)}
              </p>
              <p className="text-xs text-muted-foreground">
                Faixa de humor
              </p>
            </div>

            {/* Entries count */}
            <div className="text-center">
              <p className="text-2xl font-bold">
                {trendData.days.reduce((sum, d) => sum + d.count, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Registros</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <SmileyMeh className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" weight="duotone" />
            <p className="text-sm text-muted-foreground">
              Nenhum registro nos últimos 7 dias
            </p>
          </div>
        )}

        {/* Emoji Indicators */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-1">
            <SmileyXEyes className="w-4 h-4 text-red-500" weight="fill" />
            <span className="text-xs text-muted-foreground">0-2</span>
          </div>
          <div className="flex items-center gap-1">
            <SmileySad className="w-4 h-4 text-orange-500" weight="fill" />
            <span className="text-xs text-muted-foreground">3-5</span>
          </div>
          <div className="flex items-center gap-1">
            <SmileyMeh className="w-4 h-4 text-amber-500" weight="fill" />
            <span className="text-xs text-muted-foreground">6-7</span>
          </div>
          <div className="flex items-center gap-1">
            <SmileyWink className="w-4 h-4 text-emerald-500" weight="fill" />
            <span className="text-xs text-muted-foreground">8-9</span>
          </div>
          <div className="flex items-center gap-1">
            <Smiley className="w-4 h-4 text-green-500" weight="fill" />
            <span className="text-xs text-muted-foreground">10</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
