import { useState } from 'react';
import { useMoodEntries } from '@/hooks/use-mood-entries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog';
import { Smiley, SmileyMeh, SmileySad, Brain, ArrowsLeftRight, Lightning, Drop, Target } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { safeFormat } from '@/shared/utils';
import MoodLogForm, { type MoodLogData } from './MoodLogForm';

export default function QuickMoodLog() {
  const { moodEntries, createMoodEntry } = useMoodEntries();
  const [dialogOpen, setDialogOpen] = useState(false);

  const getMoodIcon = (score: number) => {
    if (score >= 7) return <Smiley className="w-5 h-5 text-green-500" weight="fill" />;
    if (score >= 4) return <SmileyMeh className="w-5 h-5 text-yellow-500" weight="fill" />;
    return <SmileySad className="w-5 h-5 text-red-500" weight="fill" />;
  };

  const handleSubmit = async (data: MoodLogData) => {
    try {
      await createMoodEntry(data);
      toast.success(`Registrado: Humor ${data.moodScore}/10`, {
        description: safeFormat(data.timestamp, 'dd MMM, HH:mm')
      });
      setDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar', {
        description: error instanceof Error ? error.message : 'Tente novamente'
      });
    }
  };

  const recentMoods = [...(moodEntries || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smiley className="w-5 h-5" />
          Registro de Humor
        </CardTitle>
        <CardDescription>Como você está se sentindo?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Smiley className="w-4 h-4 mr-2" />
              Registrar Agora
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registro de Humor</DialogTitle>
              <DialogDescription>Como você está neste momento?</DialogDescription>
            </DialogHeader>
            <MoodLogForm
              onSubmit={handleSubmit}
              onClose={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {recentMoods.length > 0 && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-medium">Registros recentes</p>
            {recentMoods.map(mood => (
              <div key={mood.id} className="flex justify-between items-center text-xs text-muted-foreground py-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getMoodIcon(mood.moodScore)}
                  <span className="font-medium">{mood.moodScore}/10</span>
                  {mood.cognitiveScore !== undefined && (
                    <span className="flex items-center gap-1 text-purple-500">
                      <Brain className="w-3 h-3" />
                      {mood.cognitiveScore}
                    </span>
                  )}
                  {mood.attentionShift !== undefined && (
                    <span className="flex items-center gap-1 text-cyan-500">
                      <ArrowsLeftRight className="w-3 h-3" />
                      {mood.attentionShift}
                    </span>
                  )}
                  {mood.anxietyLevel !== undefined && (
                    <span className="flex items-center gap-1 text-rose-500">
                      <Drop className="w-3 h-3" />
                      {mood.anxietyLevel}
                    </span>
                  )}
                  {mood.energyLevel !== undefined && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <Lightning className="w-3 h-3" />
                      {mood.energyLevel}
                    </span>
                  )}
                  {mood.focusLevel !== undefined && (
                    <span className="flex items-center gap-1 text-blue-500">
                      <Target className="w-3 h-3" />
                      {mood.focusLevel}
                    </span>
                  )}
                </div>
                <span>{safeFormat(mood.timestamp, 'dd/MM HH:mm')}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
