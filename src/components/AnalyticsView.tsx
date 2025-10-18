import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '../lib/types';
import { generateConcentrationCurve } from '../lib/pharmacokinetics';
import { ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';
import { format, subDays } from 'date-fns';

interface AnalyticsViewProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  cognitiveTests: CognitiveTest[];
}

export default function AnalyticsView({ medications, doses, moodEntries, cognitiveTests }: AnalyticsViewProps) {
  const [selectedMedicationId, setSelectedMedicationId] = useState<string>('');
  const [dayRange, setDayRange] = useState(14);

  const selectedMedication = medications?.find(m => m.id === selectedMedicationId);

  const chartData = useMemo(() => {
    if (!selectedMedication || !doses) return [];

    const endTime = Date.now();
    const startTime = endTime - (dayRange * 24 * 60 * 60 * 1000);

    const medicationDoses = doses.filter(d => 
      d.medicationId === selectedMedicationId && 
      d.timestamp >= startTime
    );

    if (medicationDoses.length === 0) return [];

    const curve = generateConcentrationCurve(
      selectedMedication,
      medicationDoses,
      startTime,
      endTime,
      100
    );

    const moodData = moodEntries?.filter(m => 
      m.timestamp >= startTime && m.timestamp <= endTime
    ) || [];

    const cognitiveData = cognitiveTests?.filter(t => 
      t.timestamp >= startTime && t.timestamp <= endTime
    ) || [];

    return curve.map(point => {
      const nearbyMood = moodData.find(m => 
        Math.abs(m.timestamp - point.time) < 3600000
      );
      
      const nearbyCognitive = cognitiveData.find(t => 
        Math.abs(t.timestamp - point.time) < 3600000
      );

      return {
        time: point.time,
        concentration: point.concentration,
        mood: nearbyMood?.moodScore,
        cognitiveScore: nearbyCognitive?.totalScore
      };
    });
  }, [selectedMedication, doses, moodEntries, cognitiveTests, selectedMedicationId, dayRange]);

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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Medication</Label>
              <Select value={selectedMedicationId} onValueChange={setSelectedMedicationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select medication" />
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
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Mood</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgMood.toFixed(1)}/10</div>
              <p className="text-xs text-muted-foreground">Last 10 entries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Cognitive Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgCognitive.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Last 5 tests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Data Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(moodEntries?.length || 0) + (cognitiveTests?.length || 0)}</div>
              <p className="text-xs text-muted-foreground">Mood + cognitive entries</p>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedMedicationId ? (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">Select a medication to view correlation analysis</p>
            </div>
          </CardContent>
        </Card>
      ) : chartData.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">No dose data available for this medication in the selected time range</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Concentration vs. Mood & Cognition</CardTitle>
            <CardDescription>
              {selectedMedication?.name} levels correlated with your well-being
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={(time) => format(time, 'MMM d')}
                  className="text-xs"
                />
                <YAxis yAxisId="left" label={{ value: 'Concentration (ng/mL)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Mood / Score', angle: 90, position: 'insideRight' }} />
                <Tooltip 
                  labelFormatter={(time) => format(time, 'MMM d, yyyy h:mm a')}
                  formatter={(value: any, name: string) => {
                    if (name === 'concentration') return [value.toFixed(2), 'Concentration'];
                    if (name === 'mood') return [value.toFixed(1), 'Mood'];
                    if (name === 'cognitiveScore') return [value.toFixed(1), 'Cognitive Score'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="concentration" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  name="Concentration"
                />
                <Scatter 
                  yAxisId="right"
                  dataKey="mood" 
                  fill="hsl(var(--secondary))" 
                  name="Mood Score"
                />
                <Scatter 
                  yAxisId="right"
                  dataKey="cognitiveScore" 
                  fill="hsl(var(--cognitive))" 
                  name="Cognitive Score"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
