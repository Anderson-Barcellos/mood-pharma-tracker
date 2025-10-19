import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pill, Smiley, Brain, TrendUp } from '@phosphor-icons/react';
import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '../lib/types';
import { format, subDays } from 'date-fns';
import DoseLogger from './DoseLogger';
import QuickMoodLog from './QuickMoodLog';
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { generateConcentrationCurve } from '@/lib/pharmacokinetics';
import { useTimeFormat } from '@/hooks/use-time-format';

interface DashboardProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  cognitiveTests: CognitiveTest[];
}

export default function Dashboard({ medications, doses, moodEntries, cognitiveTests }: DashboardProps) {
  const { formatXAxis, formatTooltip, getXAxisInterval, isMobile } = useTimeFormat();
  
  const latestTest = cognitiveTests.length > 0 
    ? [...cognitiveTests].sort((a, b) => b.timestamp - a.timestamp)[0]
    : null;

  const chartData = useMemo(() => {
    const now = Date.now();
    const startTime = subDays(now, 7).getTime();
    const endTime = now;

    const timePoints: number[] = [];
    for (let i = 0; i <= 168; i++) {
      timePoints.push(startTime + (i * 3600 * 1000));
    }

    const data = timePoints.map(time => {
      const dataPoint: any = {
        time,
        timestamp: time
      };

      medications.forEach(med => {
        const medDoses = doses.filter(d => d.medicationId === med.id);
        const curve = generateConcentrationCurve(med, medDoses, time, time, 1);
        if (curve.length > 0) {
          dataPoint[`${med.name}_concentration`] = curve[0].concentration;
        }
      });

      const closestMood = moodEntries
        .filter(m => Math.abs(m.timestamp - time) < 3600 * 1000)
        .sort((a, b) => Math.abs(a.timestamp - time) - Math.abs(b.timestamp - time))[0];
      
      if (closestMood) {
        dataPoint.mood = closestMood.moodScore;
      }

      return dataPoint;
    });

    return data;
  }, [medications, doses, moodEntries]);

  const colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
  
  const maxConcentration = useMemo(() => {
    let max = 0;
    chartData.forEach(point => {
      medications.forEach(med => {
        const val = point[`${med.name}_concentration`];
        if (val && val > max) max = val;
      });
    });
    return max || 100;
  }, [chartData, medications]);

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

      {medications.length > 0 && medications.map((medication, idx) => {
        const medDoses = doses.filter(d => d.medicationId === medication.id);
        
        const medChartData = chartData.map(point => ({
          ...point,
          concentration: point[`${medication.name}_concentration`] || 0,
          mood: point.mood
        }));

        const concentrationValues = medChartData
          .map(d => d.concentration)
          .filter(c => c > 0);
        
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
              <CardTitle>{medication.name} - Concentration & Mood</CardTitle>
              <CardDescription>
                Last 7 days - Mood (left axis) and serum concentration (right axis)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={medChartData}>
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
                      connectNulls
                    />
                    
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="concentration"
                      stroke={colors[idx % colors.length]}
                      strokeWidth={2}
                      name={`${medication.name} (ng/mL)`}
                      dot={false}
                      connectNulls
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
