import { useState } from 'react';
import { useKV } from '@github/spark/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Toaster } from '@/shared/ui/sonner';
import { ChartLine, Pill, Smiley, Brain } from '@phosphor-icons/react';
import DashboardPage from '@/features/analytics/pages/DashboardPage';
import MedicationsPage from '@/features/medications/pages/MedicationsPage';
import MoodPage from '@/features/mood/pages/MoodPage';
import CognitivePage from '@/features/cognitive/pages/CognitivePage';
import AnalyticsPage from '@/features/analytics/pages/AnalyticsPage';
import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '@/shared/types';

function App() {
  const [medications] = useKV<Medication[]>('medications', []);
  const [doses] = useKV<MedicationDose[]>('doses', []);
  const [moodEntries] = useKV<MoodEntry[]>('moodEntries', []);
  const [cognitiveTests] = useKV<CognitiveTest[]>('cognitiveTests', []);
  const [activeTab, setActiveTab] = useState('dashboard');

  const safeMedications = medications || [];
  const safeDoses = doses || [];
  const safeMoodEntries = moodEntries || [];
  const safeCognitiveTests = cognitiveTests || [];

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Mood & Pharma Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personal therapeutic monitoring with pharmacokinetic modeling
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <ChartLine className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="medications" className="gap-2">
              <Pill className="w-4 h-4" />
              <span className="hidden sm:inline">Medications</span>
            </TabsTrigger>
            <TabsTrigger value="mood" className="gap-2">
              <Smiley className="w-4 h-4" />
              <span className="hidden sm:inline">Mood</span>
            </TabsTrigger>
            <TabsTrigger value="cognitive" className="gap-2">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Cognitive</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <ChartLine className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardPage
              medications={safeMedications}
              doses={safeDoses}
              moodEntries={safeMoodEntries}
              cognitiveTests={safeCognitiveTests}
            />
          </TabsContent>

          <TabsContent value="medications" className="space-y-6">
            <MedicationsPage />
          </TabsContent>

          <TabsContent value="mood" className="space-y-6">
            <MoodPage />
          </TabsContent>

          <TabsContent value="cognitive" className="space-y-6">
            <CognitivePage />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsPage
              medications={safeMedications}
              doses={safeDoses}
              moodEntries={safeMoodEntries}
              cognitiveTests={safeCognitiveTests}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;