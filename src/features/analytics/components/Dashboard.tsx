import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { Plus, Pill, Smiley, Brain } from '@phosphor-icons/react';
import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '@/shared/types';
import DoseLogger from '@/features/doses/components/DoseLogger';
import QuickMoodLog from '@/features/mood/components/QuickMoodLog';
import { useMemo, useState } from 'react';
import { LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { generateConcentrationCurve } from '@/features/analytics/utils/pharmacokinetics';
import { useTimeFormat } from '@/features/analytics/hooks/use-time-format';

interface DashboardProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  cognitiveTests: CognitiveTest[];
}

export default function Dashboard({ medications, doses, moodEntries, cognitiveTests }: DashboardProps) {
  const [timeframeHours, setTimeframeHours] = useState<number>(168);
  
  const dayRange = timeframeHours / 24;
  const { formatXAxis, formatTooltip, getXAxisInterval } = useTimeFormat('days', dayRange);
  
  const latestTest = cognitiveTests.length > 0 
    ? [...cognitiveTests].sort((a, b) => b.timestamp - a.timestamp)[0]
    : null;

  const chartData = useMemo(() => {
    const now = Date.now();
    const startTime = now - (timeframeHours * 3600 * 1000);
    const endTime = now;

    const pointsPerDay = timeframeHours <= 48 ? 24 : 12;
    const totalPoints = Math.ceil((timeframeHours / 24) * pointsPerDay);
    const interval = (endTime - startTime) / totalPoints;

    const timePoints: number[] = [];
    for (let i = 0; i <= totalPoints; i++) {
      timePoints.push(startTime + (i * interval));
    }

    const data = timePoints.map(time => {
      const dataPoint: any = {
        time,
        timestamp: time
      };

      medications.forEach(med => {
        const medDoses = doses.filter(d => d.medicationId === med.id);
        const curve = generateConcentrationCurve(med, medDoses, time, time, 1);
        if (curve.length > 0 && curve[0].concentration > 0.01) {
          dataPoint[`${med.name}_concentration`] = curve[0].concentration;
        } else {
          dataPoint[`${med.name}_concentration`] = null;
        }
      });

      const closestMood = moodEntries
        .filter(m => Math.abs(m.timestamp - time) < interval)
        .sort((a, b) => Math.abs(a.timestamp - time) - Math.abs(b.timestamp - time))[0];
      
      if (closestMood) {
        dataPoint.mood = closestMood.moodScore;
      } else {
        dataPoint.mood = null;
      }

      return dataPoint;
    });

    return data;
  }, [medications, doses, moodEntries, timeframeHours]);

  const colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your recent activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Medications</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medications.length}</div>
            <p className="text-xs text-muted-foreground">Active medications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doses Logged</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{doses.length}</div>
            <p className="text-xs text-muted-foreground">Total dose records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mood Entries</CardTitle>
            <Smiley className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{moodEntries.length}</div>
            <p className="text-xs text-muted-foreground">
              {moodEntries.length > 0 
                ? `Latest: ${moodEntries[moodEntries.length - 1].moodScore}/10`
                : 'No entries yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cognitive Tests</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cognitiveTests.length}</div>
            <p className="text-xs text-muted-foreground">
              {latestTest ? `Latest score: ${latestTest.totalScore.toFixed(1)}` : 'No tests yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {medications.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Medication Levels & Mood</CardTitle>
                <CardDescription>
                  Serum concentration and mood tracking over time
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="timeframe" className="text-sm whitespace-nowrap">Timeframe:</Label>
                <Select value={timeframeHours.toString()} onValueChange={(v) => setTimeframeHours(parseInt(v))}>
                  <SelectTrigger id="timeframe" className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">Last 24 hours</SelectItem>
                    <SelectItem value="48">Last 2 days</SelectItem>
                    <SelectItem value="72">Last 3 days</SelectItem>
                    <SelectItem value="168">Last 7 days</SelectItem>
                    <SelectItem value="336">Last 14 days</SelectItem>
                    <SelectItem value="720">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {medications.length > 0 && medications.map((medication, idx) => {
        const medChartData = chartData.map(point => ({
          ...point,
          concentration: point[`${medication.name}_concentration`],
          mood: point.mood
        }));

        const concentrationValues = medChartData
          .map(d => d.concentration)
          .filter(c => c !== null && c > 0);
        
        const medMaxConcentration = concentrationValues.length > 0 
          ? Math.max(...concentrationValues)
          : 100;
        
        const medMinConcentration = concentrationValues.length > 0
          ? Math.min(...concentrationValues)
          : 0;

        const concentrationRange = medMaxConcentration - medMinConcentration;
        const scalePadding = concentrationRange * 0.1;
        
        const yAxisMin = Math.max(0, medMinConcentration - scalePadding);
        const yAxisMax = medMaxConcentration + scalePadding;

        return (
          <Card key={medication.id}>
            <CardHeader>
              <CardTitle>{medication.name}</CardTitle>
              <CardDescription>
                Concentration curve with mood overlay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={medChartData}>
                    <defs>
                      <linearGradient id={`gradient-${medication.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatXAxis}
                      tick={{ fontSize: 11 }}
                      interval={getXAxisInterval(medChartData.length)}
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: 'Mood Score', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                      domain={[0, 10]}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      label={{ value: 'Concentration (ng/mL)', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
                      domain={[yAxisMin, yAxisMax]}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => value.toFixed(1)}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      labelFormatter={(label) => {
                        const point = medChartData.find(d => d.timestamp === label);
                        return point ? formatTooltip(point.time) : label;
                      }}
                      formatter={(value: any, name: string) => {
                        if (value === null || value === undefined) return ['No data', name];
                        if (name === 'Mood') return [value?.toFixed(1) + '/10', name];
                        if (name.includes('ng/mL')) return [value?.toFixed(2) + ' ng/mL', medication.name];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="mood" 
                      stroke="#22c55e"
                      strokeWidth={3}
                      name="Mood"
                      dot={{ r: 4 }}
                      connectNulls={false}
                    />
                    
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="concentration"
                      stroke={colors[idx % colors.length]}
                      fill={`url(#gradient-${medication.id})`}
                      strokeWidth={2}
                      name={`${medication.name} (ng/mL)`}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="grid gap-4 md:grid-cols-2">
        <DoseLogger />
        <QuickMoodLog />
      </div>

      {medications.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>Begin tracking your medications and mood</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Start by adding your medications, then log doses and track your mood over time.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Medication
              </Button>
              <Button variant="outline" size="sm">
                <Smiley className="w-4 h-4 mr-2" />
                Log Mood
              </Button>
              <Button variant="outline" size="sm">
                <Brain className="w-4 h-4 mr-2" />
                Take Cognitive Test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
