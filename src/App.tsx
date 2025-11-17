import { useEffect, useMemo, useState } from 'react';
import { Toaster } from '@/shared/ui/sonner';
import { AppLayout, NavigationTab } from '@/shared/layouts';
import { migrateLegacyData } from '@/core/database/db';
import { loadServerData } from '@/core/services/server-data-loader';
import { isAuthenticated, isLockEnabled } from '@/features/auth/services/simple-auth';
import { LockScreen } from '@/features/auth/components/LockScreen';
import { useMedications } from '@/hooks/use-medications';
import { useDoses } from '@/hooks/use-doses';
import { useMoodEntries } from '@/hooks/use-mood-entries';
import { useCognitiveTests } from '@/hooks/use-cognitive-tests';
import { useInitialSetup } from '@/hooks/use-initial-setup';
import DashboardPage from '@/features/analytics/pages/DashboardPage';
import MedicationsPage from '@/features/medications/pages/MedicationsPage';
import MoodPage from '@/features/mood/pages/MoodPage';
import CognitivePage from '@/features/cognitive/pages/CognitivePage';
import AnalyticsPage from '@/features/analytics/pages/AnalyticsPage';
import { PWAInstallPrompt } from '@/shared/components/PWAInstallPrompt';

function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [migrationPending, setMigrationPending] = useState(true);
  const [serverSyncPending, setServerSyncPending] = useState(true);
  const [authenticated, setAuthenticated] = useState(() => isAuthenticated());

  const { medications = [], isLoading: medicationsLoading } = useMedications();
  const { doses = [], isLoading: dosesLoading } = useDoses();
  const { moodEntries = [], isLoading: moodLoading } = useMoodEntries();
  const { cognitiveTests = [], isLoading: cognitiveLoading } = useCognitiveTests();
  const { isSeeding } = useInitialSetup();

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
    return migrationPending || serverSyncPending || medicationsLoading || dosesLoading || moodLoading || cognitiveLoading || isSeeding;
  }, [migrationPending, serverSyncPending, medicationsLoading, dosesLoading, moodLoading, cognitiveLoading, isSeeding]);

  const initializingMessage = useMemo(() => {
    if (isSeeding) return '💊 Configurando medicações pessoais...';
    if (serverSyncPending) return '🔄 Sincronizando com servidor...';
    return 'Carregando dados locais...';
  }, [isSeeding, serverSyncPending]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardPage
            medications={medications}
            doses={doses}
            moodEntries={moodEntries}
            cognitiveTests={cognitiveTests}
            onNavigate={setActiveTab}
          />
        );
      case 'medications':
        return <MedicationsPage />;
      case 'mood':
        return <MoodPage />;
      case 'cognitive':
        return <CognitivePage />;
      case 'analytics':
        return (
          <AnalyticsPage
            medications={medications}
            doses={doses}
            moodEntries={moodEntries}
            cognitiveTests={cognitiveTests}
          />
        );
      default:
        return (
          <DashboardPage
            medications={medications}
            doses={doses}
            moodEntries={moodEntries}
            cognitiveTests={cognitiveTests}
          />
        );
    }
  };

  // Check if lock screen should be shown
  // TEMPORARILY DISABLED FOR TESTING
  // if (isLockEnabled() && !authenticated) {
  //   return <LockScreen onSuccess={() => setAuthenticated(true)} />;
  // }

  return (
    <>
      <Toaster />
      <PWAInstallPrompt />
      <AppLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isInitializing={isInitializing}
        initializingMessage={initializingMessage}
      >
        {renderContent()}
      </AppLayout>
    </>
  );
}

export default App;
