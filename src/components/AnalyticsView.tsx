import { useState, useMemo, useEffect } from 'react';
import { ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateConcentration } from '@/lib/pharmacokinetics';
import { useMedications } from '@/hooks/use-medications';
import { useDoses } from '@/hooks/use-doses';
import { useMoodEntries } from '@/hooks/use-mood-entries';
import { useCognitiveTests } from '@/hooks/use-cognitive-tests';

export default function AnalyticsView() {
  const { medications } = useMedications();
  const { doses } = useDoses();
  const { moodEntries } = useMoodEntries();
  const { cognitiveTests } = useCognitiveTests();
  const [selectedMedicationId, setSelectedMedicationId] = useState<string>('');
  const [dayRange, setDayRange] = useState<number>(7);

  useEffect(() => {
    if (!selectedMedicationId && medications.length > 0) {
      setSelectedMedicationId(medications[0].id);
    }
  }, [medications, selectedMedicationId]);

  const selectedMedication = medications.find(m => m.id === selectedMedicationId);

  const chartData = useMemo(() => {
    if (!selectedMedication) return [];

    const now = Date.now();
    const startTime = now - (dayRange * 24 * 60 * 60 * 1000);
    const endTime = now;

    const pointsPerDay = 24;
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
        timestamp: time,
        formattedTime: format(time, 'MMM d HH:mm')
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
      .filter((c): c is number => c !== null && c !== undefined);

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
    if (moodEntries.length === 0 && cognitiveTests.length === 0) return null;

    const recentMoods = moodEntries.slice(-10);
    const avgMood = recentMoods.length > 0
      ? recentMoods.reduce((sum, m) => sum + m.moodScore, 0) / recentMoods.length
      : 0;

    const recentTests = cognitiveTests.slice(-5);
    const avgCognitive = recentTests.length > 0
      ? recentTests.reduce((sum, t) => sum + t.totalScore, 0) / recentTests.length
      : 0;

    return {
      avgMood: avgMood.toFixed(1),
      avgCognitive: avgCognitive.toFixed(1)
    };
  }, [moodEntries, cognitiveTests]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="medication-select">Medication</Label>
          <Select value={selectedMedicationId} onValueChange={setSelectedMedicationId}>
            <SelectTrigger id="medication-select">
              <SelectValue placeholder="Select a medication" />
            </SelectTrigger>
            <SelectContent>
              {medications.map(med => (
                <SelectItem key={med.id} value={med.id}>
                  {med.name} {med.brandName ? `(${med.brandName})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-48 space-y-2">
          <Label htmlFor="range-select">Time Range</Label>
          <Select value={dayRange.toString()} onValueChange={(v) => setDayRange(Number(v))}>
            <SelectTrigger id="range-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">24 hours</SelectItem>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Avg. Mood Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avgMood}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Avg. Cognitive Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avgCognitive}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedMedication && (
        <Card>
          <CardHeader>
            <CardTitle>Concentration vs. Outcomes</CardTitle>
            <CardDescription>
              Plasma concentration overlay with mood and cognitive performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(tick) => format(tick, 'MMM d')}
                  />
                  <YAxis 
                    yAxisId="concentration"
                    domain={[concentrationRange.min, concentrationRange.max]}
                    label={{ value: 'Concentration (ng/mL)', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="outcomes"
                    orientation="right"
                    domain={[0, 10]}
                    label={{ value: 'Score', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip 
                    labelFormatter={(label) => format(label, 'MMM d, HH:mm')}
                    formatter={(value: any) => {
                      if (typeof value === 'number') {
                        return value.toFixed(2);
                      }
                      return value;
                    }}
                  />
                  <Legend />
                  <Line 
                    yAxisId="concentration"
                    type="monotone"
                    dataKey="concentration"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Concentration"
                    dot={false}
                    connectNulls
                  />
                  <Scatter 
                    yAxisId="outcomes"
                    dataKey="mood"
                    fill="hsl(var(--chart-2))"
                    name="Mood Score"
                  />
                  <Scatter 
                    yAxisId="outcomes"
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
