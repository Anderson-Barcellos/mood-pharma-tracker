import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { TimeframeSelector, type TimeframePeriod, getTimeframeDays, usePersistedTimeframe } from '@/shared/components/TimeframeSelector';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import PKChart from './PKChart';

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
  const initialTimeframe = usePersistedTimeframe('dashboard-concentration-timeframe', '7d');
  const [timeframe, setTimeframe] = useState<TimeframePeriod>(initialTimeframe);

  const daysRange = getTimeframeDays(timeframe) ?? 7;

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
          <PKChart
            key={medication.id}
            medication={medication}
            doses={doses}
            moodEntries={moodEntries}
            daysRange={daysRange}
            bodyWeight={bodyWeight}
          />
        ))}
      </div>

      {/* Instructions */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">📊 Funcionalidades:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Curva de concentração à esquerda (ng/mL)</li>
              <li>Humor registrado à direita (escala 1-10)</li>
              <li>Timestamps reais dos registros de humor</li>
              <li>Linhas tracejadas indicam faixa terapêutica</li>
              <li>Exporte como PNG clicando no ícone de download</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
