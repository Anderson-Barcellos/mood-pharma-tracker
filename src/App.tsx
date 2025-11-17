import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Toaster } from '@/shared/ui/sonner';
import { ChartLine, Pill, Smiley, Brain } from '@phosphor-icons/react';
import DashboardPage from '@/features/analytics/pages/DashboardPage';
import MedicationsPage from '@/features/medications/pages/MedicationsPage';
import MoodPage from '@/features/mood/pages/MoodPage';
import CognitivePage from '@/features/cognitive/pages/CognitivePage';
import AnalyticsPage from '@/features/analytics/pages/AnalyticsPage';
import { migrateLegacyData } from '@/core/database/db';
import { loadServerData } from '@/core/services/server-data-loader';
import { useMedications } from '@/hooks/use-medications';
import { useDoses } from '@/hooks/use-doses';
import { useMoodEntries } from '@/hooks/use-mood-entries';
import { useCognitiveTests } from '@/hooks/use-cognitive-tests';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [migrationPending, setMigrationPending] = useState(true);
  const [serverSyncPending, setServerSyncPending] = useState(true);

  const { medications, isLoading: medicationsLoading } = useMedications();
  const { doses, isLoading: dosesLoading } = useDoses();
  const { moodEntries, isLoading: moodLoading } = useMoodEntries();
  const { cognitiveTests, isLoading: cognitiveLoading } = useCognitiveTests();

  useEffect(() => {
    let cancelled = false;

    // Initialize app data: migrate legacy data, then load from server
    const initializeData = async () => {
      try {
        // Step 1: Migrate any legacy localStorage data
        await migrateLegacyData();

        // Step 2: Load data from server (if available)
        console.log('[App] Loading data from server...');
        const result = await loadServerData();

        if (result.success) {
          console.log('[App] Server data loaded successfully:', result.stats);
        } else {
          console.log('[App] Using local data only');
        }
      } catch (error) {
        console.error('[App] Initialization error:', error);
      } finally {
        if (!cancelled) {
          setMigrationPending(false);
          setServerSyncPending(false);
        }
      }
    };

    initializeData();

    return () => {
      cancelled = true;
    };
  }, []);

  const isInitializing = useMemo(() => {
    return migrationPending || serverSyncPending || medicationsLoading || dosesLoading || moodLoading || cognitiveLoading;
  }, [migrationPending, serverSyncPending, medicationsLoading, dosesLoading, moodLoading, cognitiveLoading]);

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      {isInitializing && (
        <div className="w-full bg-muted text-muted-foreground text-sm py-2 text-center">
          Loading data...
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
            <DashboardPage
              medications={medications}
              doses={doses}
              moodEntries={moodEntries}
              cognitiveTests={cognitiveTests}
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
              medications={medications}
              doses={doses}
              moodEntries={moodEntries}
              cognitiveTests={cognitiveTests}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
