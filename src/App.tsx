import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { ChartLine, Pill, Smiley, Brain } from '@phosphor-icons/react';
import Dashboard from './components/Dashboard';
import MedicationsView from './components/MedicationsView';
import MoodView from './components/MoodView';
import CognitiveView from './components/CognitiveView';
import AnalyticsView from './components/AnalyticsView';
import { migrateLegacyData } from '@/core/database/db';
import { useMedications } from '@/hooks/use-medications';
import { useDoses } from '@/hooks/use-doses';
import { useMoodEntries } from '@/hooks/use-mood-entries';
import { useCognitiveTests } from '@/hooks/use-cognitive-tests';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [migrationPending, setMigrationPending] = useState(true);

  const { isLoading: medicationsLoading } = useMedications();
  const { isLoading: dosesLoading } = useDoses();
  const { isLoading: moodLoading } = useMoodEntries();
  const { isLoading: cognitiveLoading } = useCognitiveTests();

  useEffect(() => {
    let cancelled = false;
    migrateLegacyData().finally(() => {
      if (!cancelled) {
        setMigrationPending(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const isInitializing = useMemo(() => {
    return migrationPending || medicationsLoading || dosesLoading || moodLoading || cognitiveLoading;
  }, [migrationPending, medicationsLoading, dosesLoading, moodLoading, cognitiveLoading]);

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      {isInitializing && (
        <div className="w-full bg-muted text-muted-foreground text-sm py-2 text-center">
          Sincronizando dados locais...
        </div>
      )}
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
            <Dashboard />
          </TabsContent>

          <TabsContent value="medications" className="space-y-6">
            <MedicationsView />
          </TabsContent>

          <TabsContent value="mood" className="space-y-6">
            <MoodView />
          </TabsContent>

          <TabsContent value="cognitive" className="space-y-6">
            <CognitiveView />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;