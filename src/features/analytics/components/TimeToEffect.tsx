import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import { Clock, TrendUp } from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TimeToEffectProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  improvementThreshold?: number; // Minimum mood increase to consider as "improvement"
  maxTimeWindow?: number; // Maximum hours to look for improvement after dose
}

interface MedicationEffectData {
  medication: Medication;
  averageTimeToEffect: number; // hours
  sampleCount: number;
  minTimeToEffect: number;
  maxTimeToEffect: number;
  effectRate: number; // percentage of doses that showed improvement
}

export default function TimeToEffect({
  medications,
  doses,
  moodEntries,
  improvementThreshold = 1.0, // 1 point mood improvement
  maxTimeWindow = 24 // 24 hours
}: TimeToEffectProps) {
  const effectData = useMemo(() => {
    return medications
      .map((medication): MedicationEffectData | null => {
        const medicationDoses = doses
          .filter((d) => d.medicationId === medication.id)
          .sort((a, b) => a.timestamp - b.timestamp);

        if (medicationDoses.length === 0) return null;

        const timesToEffect: number[] = [];
        let dosesWithEffect = 0;

        medicationDoses.forEach((dose) => {
          // Find mood before dose (within 2 hours before)
          const moodBefore = moodEntries
            .filter(
              (m) =>
                m.timestamp < dose.timestamp &&
                m.timestamp >= dose.timestamp - 2 * 3600 * 1000
            )
            .sort((a, b) => b.timestamp - a.timestamp)[0]; // Most recent before dose

          if (!moodBefore) return;

          // Find mood improvements after dose (within maxTimeWindow)
          const moodsAfter = moodEntries
            .filter(
              (m) =>
                m.timestamp > dose.timestamp &&
                m.timestamp <= dose.timestamp + maxTimeWindow * 3600 * 1000
            )
            .sort((a, b) => a.timestamp - b.timestamp);

          // Find first mood entry that shows improvement
          const improvedMood = moodsAfter.find(
            (m) => m.moodScore >= moodBefore.moodScore + improvementThreshold
          );

          if (improvedMood) {
            const timeToEffect = (improvedMood.timestamp - dose.timestamp) / 3600000; // hours
            timesToEffect.push(timeToEffect);
            dosesWithEffect++;
          }
        });

        if (timesToEffect.length === 0) return null;

        const averageTimeToEffect =
          timesToEffect.reduce((sum, t) => sum + t, 0) / timesToEffect.length;
        const effectRate = (dosesWithEffect / medicationDoses.length) * 100;

        return {
          medication,
          averageTimeToEffect,
          sampleCount: timesToEffect.length,
          minTimeToEffect: Math.min(...timesToEffect),
          maxTimeToEffect: Math.max(...timesToEffect),
          effectRate
        };
      })
      .filter((d): d is MedicationEffectData => d !== null);
  }, [medications, doses, moodEntries, improvementThreshold, maxTimeWindow]);

  const chartData = useMemo(() => {
    return effectData
      .sort((a, b) => a.averageTimeToEffect - b.averageTimeToEffect)
      .map((data) => ({
        name: data.medication.name,
        avgTime: parseFloat(data.averageTimeToEffect.toFixed(1)),
        minTime: parseFloat(data.minTimeToEffect.toFixed(1)),
        maxTime: parseFloat(data.maxTimeToEffect.toFixed(1)),
        color: data.medication.color || '#3b82f6'
      }));
  }, [effectData]);

  const overallStats = useMemo(() => {
    if (effectData.length === 0) {
      return {
        fastestMedication: null,
        averageTimeToEffect: 0,
        totalSamples: 0
      };
    }

    const totalSamples = effectData.reduce((sum, d) => sum + d.sampleCount, 0);
    const weightedAverage =
      effectData.reduce((sum, d) => sum + d.averageTimeToEffect * d.sampleCount, 0) /
      totalSamples;
    const fastestMedication = effectData.reduce((fastest, current) =>
      current.averageTimeToEffect < fastest.averageTimeToEffect ? current : fastest
    );

    return {
      fastestMedication,
      averageTimeToEffect: weightedAverage,
      totalSamples
    };
  }, [effectData]);

  if (effectData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Time-to-Effect Analysis</CardTitle>
          <CardDescription>
            Average time from dose to mood improvement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Not enough data to calculate time-to-effect.</p>
            <p className="text-xs mt-2">
              Requires mood entries before and after medication doses to analyze patterns.
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
          <Clock className="h-5 w-5" />
          Time-to-Effect Analysis
        </CardTitle>
        <CardDescription>
          Average time from dose to {improvementThreshold.toFixed(1)}+ point mood improvement
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="p-3 rounded-lg border bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">Overall Average</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {overallStats.averageTimeToEffect.toFixed(1)}h
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">Fastest</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {overallStats.fastestMedication?.averageTimeToEffect.toFixed(1)}h
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {overallStats.fastestMedication?.medication.name}
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">Data Points</div>
            <div className="text-2xl font-bold text-muted-foreground">
              {overallStats.totalSamples}
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="h-[300px] w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                label={{
                  value: 'Hours',
                  position: 'insideBottom',
                  offset: -5,
                  style: { fontSize: 12 }
                }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    avgTime: 'Average',
                    minTime: 'Minimum',
                    maxTime: 'Maximum'
                  };
                  return [`${value.toFixed(1)} hours`, labels[name] || name];
                }}
              />
              <Legend />
              <Bar dataKey="avgTime" name="Average Time" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed breakdown */}
        <div className="space-y-3">
          <div className="text-sm font-medium mb-2">Detailed Breakdown</div>
          {effectData
            .sort((a, b) => a.averageTimeToEffect - b.averageTimeToEffect)
            .map((data) => (
              <div
                key={data.medication.id}
                className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: data.medication.color || '#3b82f6' }}
                    />
                    <h4 className="font-medium">{data.medication.name}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {data.averageTimeToEffect.toFixed(1)}h
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Min:</span>{' '}
                    <span className="font-medium">{data.minTimeToEffect.toFixed(1)}h</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max:</span>{' '}
                    <span className="font-medium">{data.maxTimeToEffect.toFixed(1)}h</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Samples:</span>{' '}
                    <span className="font-medium">{data.sampleCount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Effect Rate:</span>{' '}
                    <span className="font-medium">{data.effectRate.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Optimal dosing suggestion */}
                <div className="mt-2 pt-2 border-t text-xs">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <TrendUp className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>
                      For optimal effect, consider timing doses {data.averageTimeToEffect.toFixed(0)}{' '}
                      hours before desired mood improvement
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Analysis notes */}
        <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
          <p className="leading-relaxed mb-2">
            <strong>Methodology:</strong> Time-to-effect is calculated by comparing mood scores
            before and after doses. Only instances where mood improved by at least{' '}
            {improvementThreshold.toFixed(1)} points within {maxTimeWindow} hours are included.
          </p>
          <p className="leading-relaxed">
            <strong>Note:</strong> Individual responses may vary. These are population averages
            based on your recorded data and should not replace medical advice.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
