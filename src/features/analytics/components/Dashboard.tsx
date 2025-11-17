import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Plus, Pill, Smiley, Brain } from '@phosphor-icons/react';
import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '@/shared/types';
import type { NavigationTab } from '@/shared/layouts/AppLayout';
import DoseLogger from '@/features/doses/components/DoseLogger';
import QuickMoodLog from '@/features/mood/components/QuickMoodLog';
import ConcentrationChart from './ConcentrationChart';
import CorrelationInsights from './CorrelationInsights';
import HealthScoreTrend from './HealthScoreTrend';
import AdherenceMetrics from './AdherenceMetrics';
import TherapeuticCompliance from './TherapeuticCompliance';
import TimeToEffect from './TimeToEffect';

interface DashboardProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  cognitiveTests: CognitiveTest[];
  onNavigate?: (tab: NavigationTab) => void;
}

export default function Dashboard({ medications, doses, moodEntries, cognitiveTests, onNavigate }: DashboardProps) {
  const latestTest = cognitiveTests.length > 0
    ? [...cognitiveTests].sort((a, b) => b.timestamp - a.timestamp)[0]
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your recent activity</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2 sm:p-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Medications</CardTitle>
            <Pill className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-2 pt-0 pb-2">
            <div className="text-lg sm:text-xl font-bold">{medications.length}</div>
            <p className="text-xs text-muted-foreground">Active medications</p>
          </CardContent>
        </Card>

        <Card className="p-2 sm:p-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Doses Logged</CardTitle>
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-2 pt-0 pb-2">
            <div className="text-lg sm:text-xl font-bold">{doses.length}</div>
            <p className="text-xs text-muted-foreground">Total dose records</p>
          </CardContent>
        </Card>

        <Card className="p-2 sm:p-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Mood Entries</CardTitle>
            <Smiley className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-2 pt-0 pb-2">
            <div className="text-lg sm:text-xl font-bold">{moodEntries.length}</div>
            <p className="text-xs text-muted-foreground">
              {moodEntries.length > 0
                ? `Latest: ${moodEntries[moodEntries.length - 1].moodScore}/10`
                : 'No entries yet'}
            </p>
          </CardContent>
        </Card>

        <Card
          className="p-2 sm:p-3 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => onNavigate?.('cognitive')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Cognitive Tests</CardTitle>
            <Brain className="h-3 w-3 sm:h-4 sm:w-4 text-cognitive" />
          </CardHeader>
          <CardContent className="px-2 pt-0 pb-2">
            <div className="text-lg sm:text-xl font-bold">{cognitiveTests.length}</div>
            <p className="text-xs text-muted-foreground">
              {latestTest ? `Latest score: ${latestTest.totalScore.toFixed(1)}` : 'No tests yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integrated Concentration Chart */}
      {medications.length > 0 && (
        <ConcentrationChart
          medications={medications}
          doses={doses}
          moodEntries={moodEntries}
        />
      )}

      {/* Analytics Components */}
      {medications.length > 0 && (
        <>
          {/* Row 1: Correlation Insights and Health Score Trend */}
          <div className="grid gap-4 md:grid-cols-2">
            <CorrelationInsights limit={3} />
            <HealthScoreTrend />
          </div>

          {/* Row 2: Adherence Metrics */}
          <AdherenceMetrics
            medications={medications}
            doses={doses}
          />

          {/* Row 3: Therapeutic Compliance and Time to Effect */}
          <div className="grid gap-4 md:grid-cols-2">
            <TherapeuticCompliance
              medications={medications}
              doses={doses}
            />
            <TimeToEffect
              medications={medications}
              doses={doses}
              moodEntries={moodEntries}
            />
          </div>
        </>
      )}

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
