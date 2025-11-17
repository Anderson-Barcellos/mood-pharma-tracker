import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { TimeframeSelector, type TimeframePeriod, getTimeframeDays, usePersistedTimeframe } from '@/shared/components/TimeframeSelector';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import MedicationConcentrationChart from './MedicationConcentrationChart';

interface ConcentrationChartProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  bodyWeight?: number;
}

export default function ConcentrationChart({
  medications,
  doses,
  moodEntries,
  bodyWeight = 70
}: ConcentrationChartProps) {
  // Dynamic timeframe with persistence
  const initialTimeframe = usePersistedTimeframe('dashboard-concentration-timeframe', '7d');
  const [timeframe, setTimeframe] = useState<TimeframePeriod>(initialTimeframe);
  const [zoomDomain, setZoomDomain] = useState<{ left: number; right: number } | null>(null);

  // Calculate hours from timeframe
  const days = getTimeframeDays(timeframe);
  const timeRangeHours = days ? days * 24 : 36; // Fallback to 36h for 'all'

  if (medications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pharmacokinetic Concentrations & Mood</CardTitle>
          <CardDescription>
            Serum concentrations with therapeutic ranges and mood overlay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            <p>No medications to display. Add medications to see concentration curves.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with timeframe selector */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <CardTitle>Pharmacokinetic Concentrations & Mood</CardTitle>
              <CardDescription>
                Individual medication concentration curves with therapeutic ranges and mood overlay
              </CardDescription>
            </div>
            <div className="w-full sm:w-48">
              <TimeframeSelector
                value={timeframe}
                onChange={setTimeframe}
                storageKey="dashboard-concentration-timeframe"
                showLabel={false}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Grid of individual medication charts */}
      <div className="grid gap-6 grid-cols-1">
        {medications.map((medication) => (
          <MedicationConcentrationChart
            key={medication.id}
            medication={medication}
            doses={doses}
            moodEntries={moodEntries}
            timeRangeHours={timeRangeHours}
            bodyWeight={bodyWeight}
            zoomDomain={zoomDomain}
            onZoom={setZoomDomain}
          />
        ))}
      </div>

      {/* Instructions */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">📊 Chart Features:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Fixed 36-hour window showing recent medication history</li>
              <li>Each medication has its own chart with concentration curve (right Y-axis)</li>
              <li>All charts show the same mood data (left Y-axis, green curve)</li>
              <li>Shaded areas indicate therapeutic ranges for each medication</li>
              <li>Click and drag on any chart to zoom - zoom applies to all charts</li>
              <li>Export individual charts as PNG images</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
