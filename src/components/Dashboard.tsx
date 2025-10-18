import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pill, Smiley, Brain, TrendUp } from '@phosphor-icons/react';
import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '../lib/types';
import { format } from 'date-fns';
import DoseLogger from './DoseLogger';

interface DashboardProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  cognitiveTests: CognitiveTest[];
}

export default function Dashboard({ medications, doses, moodEntries, cognitiveTests }: DashboardProps) {
  const recentDoses = [...doses].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  const recentMoods = [...moodEntries].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  const latestTest = cognitiveTests.length > 0 
    ? [...cognitiveTests].sort((a, b) => b.timestamp - a.timestamp)[0]
    : null;

  const getMedicationName = (medicationId: string) => {
    const med = medications.find(m => m.id === medicationId);
    return med?.name || 'Unknown';
  };

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

      <div className="grid gap-4 md:grid-cols-2">
        <DoseLogger />

        <Card>
          <CardHeader>
            <CardTitle>Recent Mood</CardTitle>
            <CardDescription>Your latest mood entries</CardDescription>
          </CardHeader>
          <CardContent>
            {recentMoods.length === 0 ? (
              <p className="text-sm text-muted-foreground">No mood entries yet</p>
            ) : (
              <div className="space-y-3">
                {recentMoods.map(mood => (
                  <div key={mood.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">Mood Score: {mood.moodScore}/10</p>
                      <p className="text-xs text-muted-foreground">
                        {format(mood.timestamp, 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {mood.anxietyLevel !== undefined && (
                        <span className="text-xs text-muted-foreground">A:{mood.anxietyLevel}</span>
                      )}
                      {mood.energyLevel !== undefined && (
                        <span className="text-xs text-muted-foreground">E:{mood.energyLevel}</span>
                      )}
                      {mood.focusLevel !== undefined && (
                        <span className="text-xs text-muted-foreground">F:{mood.focusLevel}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
