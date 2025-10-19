import type { CognitiveTest, Medication, MedicationDose, MoodEntry } from '@/shared/types';
import Dashboard from '@/features/analytics/components/Dashboard';

interface DashboardPageProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  cognitiveTests: CognitiveTest[];
}

export default function DashboardPage(props: DashboardPageProps) {
  return <Dashboard {...props} />;
}
