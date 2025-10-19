import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { useTimeFormat } from '@/hooks/use-time-format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { calculateConcentration } from '@/lib/pharmacokinetics';
import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '@/lib/types';

interface AnalyticsViewProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  cognitiveTests: CognitiveTest[];
}

export default function AnalyticsView({ medications, doses, moodEntries, cognitiveTests }: AnalyticsViewProps) {
  const [selectedMedicationId, setSelectedMedicationId] = useState<string>(
    medications.length > 0 ? medications[0].id : ''
  );
  const [dayRange, setDayRange] = useState(7);
  const { formatXAxis, formatTooltip, getXAxisInterval } = useTimeFormat('days', dayRange);

  const selectedMedication = medications.find(m => m.id === selectedMedicationId);

  const chartData = useMemo(() => {
    if (!selectedMedication) return [];

    const now = Date.now();
    const startTime = subDays(now, dayRange).getTime();
    const endTime = now;

    const pointsPerDay = dayRange <= 3 ? 24 : dayRange <= 7 ? 12 : 8;
    const totalPoints = Math.ceil(dayRange * pointsPerDay);
    const interval = (endTime - startTime) / totalPoints;

    const timePoints: number[] = [];
    for (let i = 0; i <= totalPoints; i++) {
      timePoints.push(startTime + (i * interval));
    }

    const relevantDoses = doses.filter(
      d => d.medicationId === selectedMedication.id &&
           d.timestamp >= startTime &&
           d.timestamp <= endTime
    );

    const data = timePoints.map(time => {
      const dataPoint: any = {
        time,
        timestamp: time
      };

      const concentration = calculateConcentration(
        selectedMedication,
        relevantDoses,
        time
      );
      dataPoint.concentration = concentration > 0.01 ? concentration : null;

      const nearbyMoods = moodEntries.filter(
        m => Math.abs(m.timestamp - time) < interval
      );
      if (nearbyMoods.length > 0) {
        const closestMood = nearbyMoods.sort(
          (a, b) => Math.abs(a.timestamp - time) - Math.abs(b.timestamp - time)
        )[0];
        dataPoint.mood = closestMood.moodScore;
        dataPoint.anxiety = closestMood.anxietyLevel;
        dataPoint.energy = closestMood.energyLevel;
        dataPoint.focus = closestMood.focusLevel;
      }

      const nearbyTests = cognitiveTests.filter(
        t => Math.abs(t.timestamp - time) < interval
      );
      if (nearbyTests.length > 0) {
        const closestTest = nearbyTests.sort(
          (a, b) => Math.abs(a.timestamp - time) - Math.abs(b.timestamp - time)
        )[0];
        dataPoint.cognitiveScore = closestTest.totalScore;
        dataPoint.accuracy = closestTest.accuracy * 100;
      }

      return dataPoint;
    });

    return data;
  }, [selectedMedication, dayRange, doses, moodEntries, cognitiveTests]);

  const concentrationRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 100 };

    const concentrations = chartData
      .map(d => d.concentration)
      .filter(c => c !== null && c > 0);

    if (concentrations.length === 0) return { min: 0, max: 100 };

    const min = Math.min(...concentrations);
    const max = Math.max(...concentrations);
    const range = max - min;
    const padding = range * 0.15;

    return {
      min: Math.max(0, min - padding),
      max: max + padding
    };
  }, [chartData]);

  const stats = useMemo(() => {
    if (!moodEntries || !cognitiveTests) return null;

    const recentMoods = moodEntries.slice(-10);
    const avgMood = recentMoods.length > 0
      ? recentMoods.reduce((sum, m) => sum + m.moodScore, 0) / recentMoods.length
      : 0;

    const recentTests = cognitiveTests.slice(-5);
    const avgCognitive = recentTests.length > 0
      ? recentTests.reduce((sum, t) => sum + t.totalScore, 0) / recentTests.length
      : 0;

    return { avgMood, avgCognitive };
  }, [moodEntries, cognitiveTests]);

  const moodScatterData = useMemo(() => {
    return chartData
      .filter(d => d.mood !== undefined)
      .map(d => ({ time: d.time, value: d.mood }));
  }, [chartData]);

  const cognitiveScatterData = useMemo(() => {
    return chartData
      .filter(d => d.cognitiveScore !== undefined)
      .map(d => ({ time: d.time, value: d.cognitiveScore }));
  }, [chartData]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">Correlate medication levels with mood and cognition</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analysis Configuration</CardTitle>
          <CardDescription>Select medication and time range</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Medication</Label>
              <Select value={selectedMedicationId} onValueChange={setSelectedMedicationId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {medications?.map(med => (
                    <SelectItem key={med.id} value={med.id}>
                      {med.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Range</Label>
              <Select value={dayRange.toString()} onValueChange={(v) => setDayRange(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="3">Last 3 days</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Avg Mood (recent)</p>
                <p className="text-2xl font-bold">{stats.avgMood.toFixed(1)}/10</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Cognitive (recent)</p>
                <p className="text-2xl font-bold">{stats.avgCognitive.toFixed(1)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedMedication && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Correlation Analysis</CardTitle>
            <CardDescription>
              {selectedMedication.name} concentration vs. mood & cognitive performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id="concentrationGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatXAxis}
                    tick={{ fontSize: 11 }}
                    interval={getXAxisInterval(chartData.length)}
                  />
                  <YAxis
                    yAxisId="left"
                    label={{ value: 'Mood/Cognitive', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                    domain={[0, 10]}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    label={{ value: 'Concentration', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
                    domain={[concentrationRange.min, concentrationRange.max]}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    labelFormatter={formatTooltip}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="concentration"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="Concentration"
                    connectNulls
                  />
                  
                  <Scatter
                    yAxisId="left"
                    dataKey="mood"
                    fill="hsl(var(--chart-2))"
                    name="Mood Score"
                  />
                  
                  <Scatter
                    yAxisId="left"
                    dataKey="cognitiveScore"
                    fill="hsl(var(--chart-3))"
                    name="Cognitive Score"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      
      {!selectedMedication && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Please select a medication to view analytics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
