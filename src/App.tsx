import { useMemo, useState } from 'react';
import { Toaster } from '@/shared/ui/sonner';
import { AppLayout, NavigationTab } from '@/shared/layouts';
import { isAuthenticated } from '@/features/auth/services/simple-auth';
import { useMedications } from '@/hooks/use-medications';
import { useDoses } from '@/hooks/use-doses';
import { useMoodEntries } from '@/hooks/use-mood-entries';
import { useCognitiveTests } from '@/hooks/use-cognitive-tests';
import { useInitialSetup } from '@/hooks/use-initial-setup';
import DashboardPage from '@/features/analytics/pages/DashboardPage';
import MedicationsPage from '@/features/medications/pages/MedicationsPage';
import MoodPage from '@/features/mood/pages/MoodPage';
import CognitivePage from '@/features/cognitive/pages/CognitivePage';
import { PWAInstallPrompt } from '@/shared/components/PWAInstallPrompt';

function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [authenticated, setAuthenticated] = useState(() => isAuthenticated());

  const { medications = [], isLoading: medicationsLoading } = useMedications();
  const { doses = [], isLoading: dosesLoading } = useDoses();
  const { moodEntries = [], isLoading: moodLoading } = useMoodEntries();
  const { cognitiveTests = [], isLoading: cognitiveLoading } = useCognitiveTests();
  const { isSeeding } = useInitialSetup();

  const isInitializing = useMemo(() => {
    return medicationsLoading || dosesLoading || moodLoading || cognitiveLoading || isSeeding;
  }, [medicationsLoading, dosesLoading, moodLoading, cognitiveLoading, isSeeding]);

  const initializingMessage = useMemo(() => {
    if (isSeeding) return '💊 Configurando medicações pessoais...';
    if (medicationsLoading || dosesLoading || moodLoading || cognitiveLoading) return '🔄 Carregando dados do servidor...';
    return 'Carregando dados...';
  }, [cognitiveLoading, dosesLoading, isSeeding, medicationsLoading, moodLoading]);

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
