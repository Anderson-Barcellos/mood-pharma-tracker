import type { CognitiveTest, Medication, MedicationDose, MoodEntry } from '@/shared/types';
import AnalyticsView from '@/features/analytics/components/AnalyticsView';

interface AnalyticsPageProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  cognitiveTests: CognitiveTest[];
}

export default function AnalyticsPage(props: AnalyticsPageProps) {
  return <AnalyticsView {...props} />;
}
