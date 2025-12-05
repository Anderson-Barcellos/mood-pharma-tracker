import { useState } from 'react';
import { useMoodEntries } from '@/hooks/use-mood-entries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Slider } from '@/shared/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog';
import { Smiley, SmileyMeh, SmileySad, Brain } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { safeFormat } from '@/shared/utils';
import { parseLocalDateTime } from '@/shared/utils/date-helpers';

export default function QuickMoodLog() {
  const { moodEntries, createMoodEntry } = useMoodEntries();
  const [moodScore, setMoodScore] = useState(5);
  const [cognitiveScore, setCognitiveScore] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(format(now, 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState(format(now, 'HH:mm'));

  const getMoodIcon = (score: number) => {
    if (score >= 7) return <Smiley className="w-6 h-6 text-green-500" weight="fill" />;
    if (score >= 4) return <SmileyMeh className="w-6 h-6 text-yellow-500" weight="fill" />;
    return <SmileySad className="w-6 h-6 text-red-500" weight="fill" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-500';
    if (score >= 4) return 'text-yellow-500';
    return 'text-red-500';
  };

  const handleLogMood = () => {
    (async () => {
      try {
        const timestamp = parseLocalDateTime(selectedDate, selectedTime);

        await createMoodEntry({
          timestamp,
          moodScore,
          ...(cognitiveScore !== null && { cognitiveScore })
        });

        toast.success(`Registrado: Humor ${moodScore}/10`, {
          description: safeFormat(timestamp, 'dd MMM, HH:mm')
        });

        setMoodScore(5);
        setCognitiveScore(null);
        setDialogOpen(false);

        const newNow = new Date();
        setSelectedDate(format(newNow, 'yyyy-MM-dd'));
        setSelectedTime(format(newNow, 'HH:mm'));
      } catch (error) {
        toast.error('Data/hora inválida', {
          description: error instanceof Error ? error.message : 'Verifique os campos'
        });
      }
    })();
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
            <Button
              className="w-full"
              onClick={() => {
                const newNow = new Date();
                setSelectedDate(format(newNow, 'yyyy-MM-dd'));
                setSelectedTime(format(newNow, 'HH:mm'));
              }}
            >
              <Smiley className="w-4 h-4 mr-2" />
              Registrar Agora
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registro de Humor</DialogTitle>
              <DialogDescription>Como você está neste momento?</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Smiley className="w-4 h-4" />
                    Humor
                  </Label>
                  <div className="flex items-center gap-2">
                    {getMoodIcon(moodScore)}
                    <span className={`text-2xl font-bold w-8 text-right ${getScoreColor(moodScore)}`}>{moodScore}</span>
                  </div>
                </div>
                <Slider
                  value={[moodScore]}
                  onValueChange={(value) => setMoodScore(value[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Péssimo</span>
                  <span>Neutro</span>
                  <span>Excelente</span>
                </div>
              </div>

              <div className="space-y-4 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Cognição (opcional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setCognitiveScore(cognitiveScore === null ? 5 : null)}
                    >
                      {cognitiveScore === null ? 'Ativar' : 'Limpar'}
                    </Button>
                    <span className={`text-2xl font-bold w-8 text-right ${cognitiveScore !== null ? 'text-purple-500' : 'text-muted-foreground'}`}>
                      {cognitiveScore ?? '-'}
                    </span>
                  </div>
                </div>
                {cognitiveScore !== null && (
                  <>
                    <Slider
                      value={[cognitiveScore]}
                      onValueChange={(value) => setCognitiveScore(value[0])}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Lento</span>
                      <span>Normal</span>
                      <span>Afiado</span>
                    </div>
                  </>
                )}
                {cognitiveScore === null && (
                  <p className="text-xs text-muted-foreground">Clique em "Ativar" para registrar percepção cognitiva</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleLogMood}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {recentMoods.length > 0 && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-medium">Registros recentes</p>
            {recentMoods.map(mood => (
              <div key={mood.id} className="flex justify-between items-center text-xs text-muted-foreground py-1">
                <div className="flex items-center gap-2">
                  {getMoodIcon(mood.moodScore)}
                  <span className="font-medium">{mood.moodScore}/10</span>
                  {mood.cognitiveScore !== undefined && (
                    <span className="flex items-center gap-1 text-purple-500">
                      <Brain className="w-3 h-3" />
                      {mood.cognitiveScore}
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
