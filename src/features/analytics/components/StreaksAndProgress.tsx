import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import { Fire, TrendUp, TrendDown, Equals, Calendar, Medal, Star, Trophy } from '@phosphor-icons/react';
import type { MedicationDose, MoodEntry } from '@/shared/types';

interface StreaksAndProgressProps {
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
}

interface DayData {
  date: string;
  hasDose: boolean;
  hasMood: boolean;
  avgMood?: number;
}

function getDayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

function getWeekRange(weeksAgo: number): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() - weeksAgo * 7);
  end.setHours(23, 59, 59, 999);
  
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  
  return { start, end };
}

export default function StreaksAndProgress({ doses, moodEntries }: StreaksAndProgressProps) {
  const streakData = useMemo(() => {
    const dayMap = new Map<string, DayData>();
    
    for (const dose of doses) {
      const key = getDayKey(dose.timestamp);
      if (!dayMap.has(key)) {
        dayMap.set(key, { date: key, hasDose: false, hasMood: false });
      }
      dayMap.get(key)!.hasDose = true;
    }
    
    for (const mood of moodEntries) {
      const key = getDayKey(mood.timestamp);
      if (!dayMap.has(key)) {
        dayMap.set(key, { date: key, hasDose: false, hasMood: false });
      }
      const day = dayMap.get(key)!;
      day.hasMood = true;
      if (!day.avgMood) {
        const dayMoods = moodEntries.filter(m => getDayKey(m.timestamp) === key);
        day.avgMood = dayMoods.reduce((a, b) => a + b.moodScore, 0) / dayMoods.length;
      }
    }
    
    const sortedDays = Array.from(dayMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    let currentDoseStreak = 0;
    let currentMoodStreak = 0;
    let maxDoseStreak = 0;
    let maxMoodStreak = 0;
    
    const today = getDayKey(Date.now());
    let checkDate = new Date(today);
    
    for (let i = 0; i < 365; i++) {
      const key = getDayKey(checkDate.getTime());
      const day = dayMap.get(key);
      
      if (day?.hasDose) {
        currentDoseStreak++;
        maxDoseStreak = Math.max(maxDoseStreak, currentDoseStreak);
      } else if (i > 0) {
        break;
      }
      
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    checkDate = new Date(today);
    for (let i = 0; i < 365; i++) {
      const key = getDayKey(checkDate.getTime());
      const day = dayMap.get(key);
      
      if (day?.hasMood) {
        currentMoodStreak++;
        maxMoodStreak = Math.max(maxMoodStreak, currentMoodStreak);
      } else if (i > 0) {
        break;
      }
      
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    let tempStreak = 0;
    for (const day of sortedDays) {
      if (day.hasDose) {
        tempStreak++;
        maxDoseStreak = Math.max(maxDoseStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    tempStreak = 0;
    for (const day of sortedDays) {
      if (day.hasMood) {
        tempStreak++;
        maxMoodStreak = Math.max(maxMoodStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    return {
      currentDoseStreak,
      currentMoodStreak,
      maxDoseStreak,
      maxMoodStreak,
      totalDays: dayMap.size,
      daysWithDose: Array.from(dayMap.values()).filter(d => d.hasDose).length,
      daysWithMood: Array.from(dayMap.values()).filter(d => d.hasMood).length
    };
  }, [doses, moodEntries]);

  const weekComparison = useMemo(() => {
    const thisWeek = getWeekRange(0);
    const lastWeek = getWeekRange(1);
    
    const thisWeekMoods = moodEntries.filter(m => {
      const date = new Date(m.timestamp);
      return date >= thisWeek.start && date <= thisWeek.end;
    });
    
    const lastWeekMoods = moodEntries.filter(m => {
      const date = new Date(m.timestamp);
      return date >= lastWeek.start && date <= lastWeek.end;
    });
    
    const thisWeekAvg = thisWeekMoods.length > 0
      ? thisWeekMoods.reduce((a, b) => a + b.moodScore, 0) / thisWeekMoods.length
      : null;
    
    const lastWeekAvg = lastWeekMoods.length > 0
      ? lastWeekMoods.reduce((a, b) => a + b.moodScore, 0) / lastWeekMoods.length
      : null;
    
    const thisWeekDoses = doses.filter(d => {
      const date = new Date(d.timestamp);
      return date >= thisWeek.start && date <= thisWeek.end;
    }).length;
    
    const lastWeekDoses = doses.filter(d => {
      const date = new Date(d.timestamp);
      return date >= lastWeek.start && date <= lastWeek.end;
    }).length;
    
    let moodTrend: 'up' | 'down' | 'stable' = 'stable';
    let moodDiff = 0;
    if (thisWeekAvg !== null && lastWeekAvg !== null) {
      moodDiff = thisWeekAvg - lastWeekAvg;
      if (moodDiff > 0.3) moodTrend = 'up';
      else if (moodDiff < -0.3) moodTrend = 'down';
    }
    
    return {
      thisWeekAvg,
      lastWeekAvg,
      thisWeekEntries: thisWeekMoods.length,
      lastWeekEntries: lastWeekMoods.length,
      thisWeekDoses,
      lastWeekDoses,
      moodTrend,
      moodDiff
    };
  }, [doses, moodEntries]);

  const last7Days = useMemo(() => {
    const days: { date: string; mood: number | null; hasDose: boolean }[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = getDayKey(date.getTime());
      
      const dayMoods = moodEntries.filter(m => getDayKey(m.timestamp) === key);
      const hasDose = doses.some(d => getDayKey(d.timestamp) === key);
      
      days.push({
        date: key,
        mood: dayMoods.length > 0 
          ? dayMoods.reduce((a, b) => a + b.moodScore, 0) / dayMoods.length 
          : null,
        hasDose
      });
    }
    
    return days;
  }, [doses, moodEntries]);

  const getStreakBadge = (streak: number) => {
    if (streak >= 30) return { icon: <Trophy className="w-4 h-4" />, color: 'text-yellow-500', label: 'Lendário!' };
    if (streak >= 14) return { icon: <Medal className="w-4 h-4" />, color: 'text-purple-500', label: 'Incrível!' };
    if (streak >= 7) return { icon: <Star className="w-4 h-4" />, color: 'text-blue-500', label: 'Ótimo!' };
    if (streak >= 3) return { icon: <Fire className="w-4 h-4" />, color: 'text-orange-500', label: 'Bom!' };
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Fire className="w-4 h-4 text-orange-500" />
              Streak Medicação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{streakData.currentDoseStreak}</span>
              <span className="text-muted-foreground text-sm">dias</span>
            </div>
            {getStreakBadge(streakData.currentDoseStreak) && (
              <Badge variant="outline" className={`mt-2 ${getStreakBadge(streakData.currentDoseStreak)!.color}`}>
                {getStreakBadge(streakData.currentDoseStreak)!.icon}
                <span className="ml-1">{getStreakBadge(streakData.currentDoseStreak)!.label}</span>
              </Badge>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Recorde: {streakData.maxDoseStreak} dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Streak Humor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{streakData.currentMoodStreak}</span>
              <span className="text-muted-foreground text-sm">dias</span>
            </div>
            {getStreakBadge(streakData.currentMoodStreak) && (
              <Badge variant="outline" className={`mt-2 ${getStreakBadge(streakData.currentMoodStreak)!.color}`}>
                {getStreakBadge(streakData.currentMoodStreak)!.icon}
                <span className="ml-1">{getStreakBadge(streakData.currentMoodStreak)!.label}</span>
              </Badge>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Recorde: {streakData.maxMoodStreak} dias
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Esta Semana vs Semana Passada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Humor Médio</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {weekComparison.thisWeekAvg?.toFixed(1) ?? '-'}
                </span>
                {weekComparison.moodTrend === 'up' && (
                  <TrendUp className="w-5 h-5 text-green-500" />
                )}
                {weekComparison.moodTrend === 'down' && (
                  <TrendDown className="w-5 h-5 text-red-500" />
                )}
                {weekComparison.moodTrend === 'stable' && (
                  <Equals className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Semana passada</p>
              <span className="text-lg text-muted-foreground">
                {weekComparison.lastWeekAvg?.toFixed(1) ?? '-'}
              </span>
            </div>
          </div>

          {weekComparison.moodDiff !== 0 && (
            <div className={`text-sm p-2 rounded ${
              weekComparison.moodTrend === 'up' ? 'bg-green-500/10 text-green-700' :
              weekComparison.moodTrend === 'down' ? 'bg-red-500/10 text-red-700' :
              'bg-muted'
            }`}>
              {weekComparison.moodTrend === 'up' && `+${weekComparison.moodDiff.toFixed(1)} pontos de melhora!`}
              {weekComparison.moodTrend === 'down' && `${weekComparison.moodDiff.toFixed(1)} pontos de queda`}
              {weekComparison.moodTrend === 'stable' && 'Humor estável'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Registros esta semana</p>
              <p className="font-medium">{weekComparison.thisWeekEntries} humor / {weekComparison.thisWeekDoses} doses</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Semana passada</p>
              <p className="font-medium text-muted-foreground">{weekComparison.lastWeekEntries} humor / {weekComparison.lastWeekDoses} doses</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Últimos 7 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between gap-1">
            {last7Days.map((day, i) => {
              const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
              const date = new Date(day.date);
              const dayName = dayNames[date.getDay()];
              const isToday = i === 6;
              
              return (
                <div 
                  key={day.date} 
                  className={`flex-1 flex flex-col items-center gap-1 p-2 rounded ${
                    isToday ? 'bg-primary/10' : ''
                  }`}
                >
                  <span className="text-xs text-muted-foreground">{dayName}</span>
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      day.mood === null ? 'bg-muted text-muted-foreground' :
                      day.mood >= 7 ? 'bg-green-500 text-white' :
                      day.mood >= 4 ? 'bg-yellow-500 text-white' :
                      'bg-red-500 text-white'
                    }`}
                  >
                    {day.mood?.toFixed(0) ?? '-'}
                  </div>
                  {day.hasDose && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" title="Medicação tomada" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
