import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Progress } from '@/shared/ui/progress';
import type { Medication, MedicationDose } from '@/shared/types';
import { CheckCircle, XCircle, Warning, Calendar } from '@phosphor-icons/react';
import { format, startOfDay, differenceInDays, eachDayOfInterval } from 'date-fns';

interface AdherenceMetricsProps {
  medications: Medication[];
  doses: MedicationDose[];
  startDate?: Date;
  endDate?: Date;
}

interface MedicationAdherence {
  medication: Medication;
  expectedDoses: number;
  actualDoses: number;
  adherenceRate: number;
  missedDoses: number;
  timingConsistency: number;
  lastDoseDate?: Date;
}

export default function AdherenceMetrics({
  medications,
  doses,
  startDate,
  endDate
}: AdherenceMetricsProps) {
  const dateRange = useMemo(() => {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    return { start, end };
  }, [startDate, endDate]);

  const adherenceData = useMemo(() => {
    const startTime = dateRange.start.getTime();
    const endTime = dateRange.end.getTime();
    const dayCount = Math.ceil((endTime - startTime) / (24 * 60 * 60 * 1000));

    return medications.map((medication): MedicationAdherence => {
      // Get doses for this medication in the time range
      const medicationDoses = doses
        .filter(
          (d) =>
            d.medicationId === medication.id &&
            d.timestamp >= startTime &&
            d.timestamp <= endTime
        )
        .sort((a, b) => a.timestamp - b.timestamp);

      // Assume one dose per day (this could be configurable per medication)
      const expectedDosesPerDay = 1;
      const expectedDoses = dayCount * expectedDosesPerDay;
      const actualDoses = medicationDoses.length;
      const missedDoses = Math.max(0, expectedDoses - actualDoses);
      const adherenceRate = expectedDoses > 0 ? (actualDoses / expectedDoses) * 100 : 0;

      // Calculate timing consistency (variance in dose times)
      let timingConsistency = 0;
      if (medicationDoses.length > 1) {
        const doseTimes = medicationDoses.map((d) => {
          const date = new Date(d.timestamp);
          return date.getHours() * 60 + date.getMinutes(); // minutes since midnight
        });

        const avgTime = doseTimes.reduce((a, b) => a + b, 0) / doseTimes.length;
        const variance =
          doseTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) /
          doseTimes.length;
        const stdDev = Math.sqrt(variance);

        // Convert to consistency score (lower variance = higher consistency)
        // Perfect consistency (0 variance) = 100%, high variance (>4 hours) = 0%
        timingConsistency = Math.max(0, 100 - (stdDev / 240) * 100);
      }

      const lastDoseDate =
        medicationDoses.length > 0
          ? new Date(medicationDoses[medicationDoses.length - 1].timestamp)
          : undefined;

      return {
        medication,
        expectedDoses,
        actualDoses,
        adherenceRate: Math.min(100, adherenceRate),
        missedDoses,
        timingConsistency,
        lastDoseDate
      };
    });
  }, [medications, doses, dateRange]);

  const overallStats = useMemo(() => {
    if (adherenceData.length === 0) {
      return {
        averageAdherence: 0,
        totalMissedDoses: 0,
        averageTimingConsistency: 0,
        medicationsOnTrack: 0
      };
    }

    const averageAdherence =
      adherenceData.reduce((sum, d) => sum + d.adherenceRate, 0) / adherenceData.length;
    const totalMissedDoses = adherenceData.reduce((sum, d) => sum + d.missedDoses, 0);
    const averageTimingConsistency =
      adherenceData.reduce((sum, d) => sum + d.timingConsistency, 0) / adherenceData.length;
    const medicationsOnTrack = adherenceData.filter((d) => d.adherenceRate >= 80).length;

    return {
      averageAdherence: Math.round(averageAdherence),
      totalMissedDoses,
      averageTimingConsistency: Math.round(averageTimingConsistency),
      medicationsOnTrack
    };
  }, [adherenceData]);

  const getAdherenceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 dark:text-green-400';
    if (rate >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAdherenceIcon = (rate: number) => {
    if (rate >= 80) return <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />;
    if (rate >= 60) return <Warning className="h-5 w-5 text-yellow-500" weight="fill" />;
    return <XCircle className="h-5 w-5 text-red-500" weight="fill" />;
  };

  if (medications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Medication Adherence</CardTitle>
          <CardDescription>
            Track your medication adherence over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No medications to track.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Medication Adherence
        </CardTitle>
        <CardDescription>
          Adherence tracking for {format(dateRange.start, 'MMM d')} -{' '}
          {format(dateRange.end, 'MMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-lg border bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">Avg Adherence</div>
            <div className={`text-2xl font-bold ${getAdherenceColor(overallStats.averageAdherence)}`}>
              {overallStats.averageAdherence}%
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">On Track</div>
            <div className="text-2xl font-bold text-green-500">
              {overallStats.medicationsOnTrack}/{adherenceData.length}
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">Missed Doses</div>
            <div className="text-2xl font-bold text-red-500">
              {overallStats.totalMissedDoses}
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">Timing</div>
            <div className="text-2xl font-bold text-blue-500">
              {overallStats.averageTimingConsistency}%
            </div>
          </div>
        </div>

        {/* Per-Medication Adherence */}
        <div className="space-y-4">
          <div className="text-sm font-medium mb-2">Medication Breakdown</div>
          {adherenceData.map((data) => (
            <div
              key={data.medication.id}
              className="p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  {getAdherenceIcon(data.adherenceRate)}
                  <div>
                    <h4 className="font-medium">{data.medication.name}</h4>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {data.medication.category.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getAdherenceColor(data.adherenceRate)}`}>
                    {Math.round(data.adherenceRate)}%
                  </div>
                  <div className="text-xs text-muted-foreground">adherence</div>
                </div>
              </div>

              <Progress value={data.adherenceRate} className="h-2 mb-3" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Expected:</span>{' '}
                  <span className="font-medium">{data.expectedDoses}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Actual:</span>{' '}
                  <span className="font-medium">{data.actualDoses}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Missed:</span>{' '}
                  <span className="font-medium text-red-500">{data.missedDoses}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Timing:</span>{' '}
                  <span className="font-medium">{Math.round(data.timingConsistency)}%</span>
                </div>
              </div>

              {data.lastDoseDate && (
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  Last dose: {format(data.lastDoseDate, 'MMM d, yyyy \'at\' h:mm a')}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Adherence interpretation */}
        <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
          <p className="leading-relaxed">
            <strong>Note:</strong> Adherence is calculated assuming one dose per day per medication.
            Rates ≥80% are considered on track. Timing consistency measures how regular your dose
            times are throughout the day.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
