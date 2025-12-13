import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Plus, Pill, Smiley, Brain, ChartLineUp, ChartLine, Fire, Heart, ArrowSquareOut } from '@phosphor-icons/react';
import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '@/shared/types';
import type { NavigationTab } from '@/shared/layouts/AppLayout';
import DoseLogger from '@/features/doses/components/DoseLogger';
import QuickMoodLog from '@/features/mood/components/QuickMoodLog';
import ConcentrationChart from './ConcentrationChart';
import CorrelationInsights from './CorrelationInsights';
import StreaksAndProgress from './StreaksAndProgress';
import SimpleTestDataGenerator from './SimpleTestDataGenerator';
import AdvancedCorrelationsView from './AdvancedCorrelationsView';

interface DashboardProps {
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  cognitiveTests: CognitiveTest[];
  onNavigate?: (tab: NavigationTab) => void;
}

export default function Dashboard({ medications, doses, moodEntries, cognitiveTests, onNavigate }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const latestTest = cognitiveTests.length > 0
    ? [...cognitiveTests].sort((a, b) => b.timestamp - a.timestamp)[0]
    : null;

  const recentMoods = [...moodEntries].sort((a, b) => b.timestamp - a.timestamp).slice(0, 7);
  const avgMood = recentMoods.length > 0 
    ? recentMoods.reduce((a, b) => a + b.moodScore, 0) / recentMoods.length 
    : null;

  const recentMetrics = {
    anxiety: recentMoods.filter(m => m.anxietyLevel !== undefined),
    energy: recentMoods.filter(m => m.energyLevel !== undefined),
    focus: recentMoods.filter(m => m.focusLevel !== undefined),
  };
  const avgAnxiety = recentMetrics.anxiety.length > 0 
    ? recentMetrics.anxiety.reduce((a, b) => a + (b.anxietyLevel ?? 0), 0) / recentMetrics.anxiety.length 
    : null;
  const avgEnergy = recentMetrics.energy.length > 0 
    ? recentMetrics.energy.reduce((a, b) => a + (b.energyLevel ?? 0), 0) / recentMetrics.energy.length 
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Visão geral do seu tratamento</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <Card className="p-2 sm:p-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Medicações</CardTitle>
            <Pill className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-2 pt-0 pb-2">
            <div className="text-lg sm:text-xl font-bold">{medications.length}</div>
            <p className="text-xs text-muted-foreground">Em acompanhamento</p>
          </CardContent>
        </Card>

        <Card className="p-2 sm:p-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Doses</CardTitle>
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-2 pt-0 pb-2">
            <div className="text-lg sm:text-xl font-bold">{doses.length}</div>
            <p className="text-xs text-muted-foreground">Registros totais</p>
          </CardContent>
        </Card>

        <Card className="p-2 sm:p-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Humor</CardTitle>
            <Smiley className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-2 pt-0 pb-2">
            <div className="text-lg sm:text-xl font-bold">
              {avgMood !== null ? avgMood.toFixed(1) : '-'}/10
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <span>{moodEntries.length} registros</span>
              {(avgAnxiety !== null || avgEnergy !== null) && (
                <div className="flex gap-2">
                  {avgAnxiety !== null && <span className="text-rose-500">A:{avgAnxiety.toFixed(0)}</span>}
                  {avgEnergy !== null && <span className="text-amber-500">E:{avgEnergy.toFixed(0)}</span>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card
          className="p-2 sm:p-3 cursor-pointer hover:bg-accent/50 transition-colors group"
          onClick={() => window.open('https://ultrassom.ai/raven', '_blank', 'noopener,noreferrer')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1">
              Raven Test
              <ArrowSquareOut className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardTitle>
            <Brain className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="px-2 pt-0 pb-2">
            <div className="text-lg sm:text-xl font-bold">{cognitiveTests.length}</div>
            <p className="text-xs text-muted-foreground">
              {latestTest ? `Último: ${latestTest.totalScore.toFixed(1)}` : 'Abrir teste'}
            </p>
          </CardContent>
        </Card>
      </div>

      {(medications.length === 0 || doses.length === 0 || moodEntries.length === 0) && (
        <SimpleTestDataGenerator />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <ChartLine className="w-4 h-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <ChartLineUp className="w-4 h-4" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
          <TabsTrigger value="correlations" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Correlações</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <Fire className="w-4 h-4" />
            <span className="hidden sm:inline">Progresso</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {medications.length > 0 && (
            <ConcentrationChart
              medications={medications}
              doses={doses}
              moodEntries={moodEntries}
            />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <DoseLogger />
            <QuickMoodLog />
          </div>
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <CorrelationInsights
            medications={medications}
            doses={doses}
            moodEntries={moodEntries}
          />
        </TabsContent>

        <TabsContent value="correlations" className="mt-6">
          <AdvancedCorrelationsView
            medications={medications}
            doses={doses}
            moodEntries={moodEntries}
          />
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          <StreaksAndProgress
            doses={doses}
            moodEntries={moodEntries}
          />
        </TabsContent>
      </Tabs>

      {medications.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Comece Agora</CardTitle>
            <CardDescription>Configure suas medicações e comece a registrar</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione suas medicações para começar a rastrear doses, humor e descobrir padrões.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onNavigate?.('medications')}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Medicação
              </Button>
              <Button variant="outline" size="sm">
                <Smiley className="w-4 h-4 mr-2" />
                Registrar Humor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
