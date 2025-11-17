import type { CognitiveTest, Medication, MedicationDose, MoodEntry } from '@/shared/types';
import type { NavigationTab } from '@/shared/layouts/AppLayout';
import Dashboard from '@/features/analytics/components/Dashboard';

interface DashboardPageProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  cognitiveTests: CognitiveTest[];
  onNavigate?: (tab: NavigationTab) => void;
}

export default function DashboardPage(props: DashboardPageProps) {
  return <Dashboard {...props} />;
}
