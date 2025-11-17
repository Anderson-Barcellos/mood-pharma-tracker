import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import type { Medication, MedicationDose } from '@/shared/types';
import { useConcentrationCurve } from '@/features/analytics/hooks/use-concentration-data';
import { Target, TrendUp, TrendDown } from '@phosphor-icons/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface TherapeuticComplianceProps {
  medications: Medication[];
  doses: MedicationDose[];
  timeRangeHours?: number;
  bodyWeight?: number;
}

interface ComplianceData {
  medication: Medication;
  timeInRange: number; // percentage
  timeAboveRange: number; // percentage
  timeBelowRange: number; // percentage
  totalHours: number;
  hoursInRange: number;
  hasTherapeuticRange: boolean;
}

const RANGE_COLORS = {
  inRange: '#22c55e', // green
  aboveRange: '#ef4444', // red
  belowRange: '#eab308' // yellow
};

export default function TherapeuticCompliance({
  medications,
  doses,
  timeRangeHours = 168, // 7 days default
  bodyWeight = 70
}: TherapeuticComplianceProps) {
  const complianceData = useMemo(() => {
    return medications
      .filter((med) => med.therapeuticRange) // Only medications with therapeutic range
      .map((medication): ComplianceData => {
        const now = Date.now();
        const startTime = now - timeRangeHours * 3600 * 1000;
        const endTime = now;

        // Get medication doses
        const medicationDoses = doses.filter((d) => d.medicationId === medication.id);

        // Sample concentration at regular intervals (hourly)
        const samplesPerHour = 1;
        const totalSamples = timeRangeHours * samplesPerHour;
        let samplesInRange = 0;
        let samplesAboveRange = 0;
        let samplesBelowRange = 0;

        // Get therapeutic range in ng/mL
        const therapeuticRangeNgMl = medication.therapeuticRange
          ? (() => {
              const unit = medication.therapeuticRange.unit?.toLowerCase() ?? 'ng/ml';
              const toNg = (v: number) => {
                if (unit.includes('mcg') || unit.includes('µg')) return v * 1000;
                if (unit.includes('ng')) return v;
                if (unit.includes('mg/l')) return v * 1000;
                return v;
              };
              return {
                min: toNg(medication.therapeuticRange.min),
                max: toNg(medication.therapeuticRange.max)
              };
            })()
          : null;

        if (!therapeuticRangeNgMl) {
          return {
            medication,
            timeInRange: 0,
            timeAboveRange: 0,
            timeBelowRange: 0,
            totalHours: timeRangeHours,
            hoursInRange: 0,
            hasTherapeuticRange: false
          };
        }

        // Sample at each hour
        for (let i = 0; i < totalSamples; i++) {
          const sampleTime = startTime + (i / samplesPerHour) * 3600 * 1000;

          // Calculate concentration at this time using the pharmacokinetics engine
          // We need to use the real calculation here
          const relevantDoses = medicationDoses.filter((d) => d.timestamp <= sampleTime);

          if (relevantDoses.length === 0) {
            samplesBelowRange++;
            continue;
          }

          // Simple one-compartment calculation
          let concentration = 0;
          const halfLife = medication.halfLife;
          const volumeOfDistribution = medication.volumeOfDistribution;
          const bioavailability = medication.bioavailability || 1;

          relevantDoses.forEach((dose) => {
            const timeSinceDose = (sampleTime - dose.timestamp) / 3600000; // hours
            if (timeSinceDose < 0) return;

            const k = 0.693 / halfLife; // elimination rate constant
            const doseInMg = dose.doseAmount;
            const C0 = (doseInMg * 1000 * bioavailability) / (volumeOfDistribution * bodyWeight); // ng/mL

            concentration += C0 * Math.exp(-k * timeSinceDose);
          });

          // Check if in range
          if (concentration >= therapeuticRangeNgMl.min && concentration <= therapeuticRangeNgMl.max) {
            samplesInRange++;
          } else if (concentration > therapeuticRangeNgMl.max) {
            samplesAboveRange++;
          } else {
            samplesBelowRange++;
          }
        }

        const timeInRange = (samplesInRange / totalSamples) * 100;
        const timeAboveRange = (samplesAboveRange / totalSamples) * 100;
        const timeBelowRange = (samplesBelowRange / totalSamples) * 100;
        const hoursInRange = (samplesInRange / samplesPerHour);

        return {
          medication,
          timeInRange,
          timeAboveRange,
          timeBelowRange,
          totalHours: timeRangeHours,
          hoursInRange,
          hasTherapeuticRange: true
        };
      });
  }, [medications, doses, timeRangeHours, bodyWeight]);

  const overallCompliance = useMemo(() => {
    if (complianceData.length === 0) {
      return {
        averageTimeInRange: 0,
        medicationsInCompliance: 0,
        totalMedications: 0
      };
    }

    const averageTimeInRange =
      complianceData.reduce((sum, d) => sum + d.timeInRange, 0) / complianceData.length;
    const medicationsInCompliance = complianceData.filter((d) => d.timeInRange >= 70).length;

    return {
      averageTimeInRange: Math.round(averageTimeInRange),
      medicationsInCompliance,
      totalMedications: complianceData.length
    };
  }, [complianceData]);

  if (complianceData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Therapeutic Range Compliance</CardTitle>
          <CardDescription>
            Time spent in therapeutic range for medications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No medications with therapeutic range defined.</p>
            <p className="text-xs mt-2">
              Add therapeutic ranges to medications to track compliance.
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
          <Target className="h-5 w-5" />
          Therapeutic Range Compliance
        </CardTitle>
        <CardDescription>
          Time spent in therapeutic range over the last {timeRangeHours / 24} days
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="p-3 rounded-lg border bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">Avg Time in Range</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {overallCompliance.averageTimeInRange}%
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">In Compliance</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {overallCompliance.medicationsInCompliance}/{overallCompliance.totalMedications}
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">Target</div>
            <div className="text-2xl font-bold text-muted-foreground">≥70%</div>
          </div>
        </div>

        {/* Per-Medication Compliance */}
        <div className="space-y-6">
          {complianceData.map((data) => {
            const pieData = [
              { name: 'In Range', value: data.timeInRange, color: RANGE_COLORS.inRange },
              { name: 'Below Range', value: data.timeBelowRange, color: RANGE_COLORS.belowRange },
              { name: 'Above Range', value: data.timeAboveRange, color: RANGE_COLORS.aboveRange }
            ].filter((d) => d.value > 0);

            return (
              <div
                key={data.medication.id}
                className="p-4 rounded-lg border bg-card/50"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-lg">{data.medication.name}</h4>
                    <div className="text-xs text-muted-foreground mt-1">
                      Target: {data.medication.therapeuticRange?.min}-
                      {data.medication.therapeuticRange?.max}{' '}
                      {data.medication.therapeuticRange?.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {Math.round(data.timeInRange)}%
                    </div>
                    <div className="text-xs text-muted-foreground">in range</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Pie Chart */}
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => `${value.toFixed(1)}%`}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-col justify-center space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: RANGE_COLORS.inRange }}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">In Range</div>
                        <div className="text-xs text-muted-foreground">
                          {data.hoursInRange.toFixed(1)} hours
                        </div>
                      </div>
                      <div className="font-bold">{Math.round(data.timeInRange)}%</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: RANGE_COLORS.belowRange }}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Below Range</div>
                        <div className="text-xs text-muted-foreground">
                          {((data.timeBelowRange / 100) * data.totalHours).toFixed(1)} hours
                        </div>
                      </div>
                      <div className="font-bold">{Math.round(data.timeBelowRange)}%</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: RANGE_COLORS.aboveRange }}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Above Range</div>
                        <div className="text-xs text-muted-foreground">
                          {((data.timeAboveRange / 100) * data.totalHours).toFixed(1)} hours
                        </div>
                      </div>
                      <div className="font-bold">{Math.round(data.timeAboveRange)}%</div>
                    </div>
                  </div>
                </div>

                {/* Compliance status */}
                <div className="mt-4 pt-3 border-t">
                  {data.timeInRange >= 70 ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <Target className="h-4 w-4" weight="fill" />
                      <span className="font-medium">Excellent compliance</span>
                    </div>
                  ) : data.timeInRange >= 50 ? (
                    <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                      <Target className="h-4 w-4" weight="fill" />
                      <span className="font-medium">Moderate compliance - consider dose adjustment</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                      <Target className="h-4 w-4" weight="fill" />
                      <span className="font-medium">Low compliance - dose optimization recommended</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Compliance interpretation */}
        <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
          <p className="leading-relaxed">
            <strong>Note:</strong> Therapeutic compliance is calculated based on pharmacokinetic
            modeling. Target is ≥70% time in therapeutic range. Values outside range may indicate
            need for dose adjustment.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
