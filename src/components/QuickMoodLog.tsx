import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Smiley, SmileyMeh, SmileySad } from '@phosphor-icons/react';
import type { MoodEntry } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { safeFormat } from '@/lib/utils';
import { usePersistentState } from '../lib/usePersistentState';

export default function QuickMoodLog() {
  const [moodEntries, setMoodEntries] = usePersistentState<MoodEntry[]>('moodEntries', []);
  const [moodScore, setMoodScore] = useState(5);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(format(now, 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState(format(now, 'HH:mm'));

  const getMoodIcon = (score: number) => {
    if (score >= 7) return <Smiley className="w-6 h-6 text-primary" weight="fill" />;
    if (score >= 4) return <SmileyMeh className="w-6 h-6 text-secondary" weight="fill" />;
    return <SmileySad className="w-6 h-6 text-destructive" weight="fill" />;
  };

  const handleLogMood = () => {
    const dateTime = new Date(`${selectedDate}T${selectedTime}`);
    const timestamp = dateTime.getTime();

    const entry: MoodEntry = {
      id: uuidv4(),
      timestamp,
      moodScore,
      createdAt: Date.now()
    };

    setMoodEntries((current) => [...(current || []), entry]);
    
    toast.success(`Mood logged: ${moodScore}/10`, {
      description: safeFormat(timestamp, 'MMM d, h:mm a')
    });

    setMoodScore(5);
    setDialogOpen(false);
    
    const newNow = new Date();
    setSelectedDate(format(newNow, 'yyyy-MM-dd'));
    setSelectedTime(format(newNow, 'HH:mm'));
  };

  const recentMoods = [...(moodEntries || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Mood Log</CardTitle>
        <CardDescription>Record your current mood</CardDescription>
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
              Log Mood
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Mood</DialogTitle>
              <DialogDescription>How are you feeling right now?</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Mood Score</Label>
                  <div className="flex items-center gap-2">
                    {getMoodIcon(moodScore)}
                    <span className="text-2xl font-bold w-12 text-right">{moodScore}</span>
                  </div>
                </div>
                <Slider
                  value={[moodScore]}
                  onValueChange={(value) => setMoodScore(value[0])}
                  min={0}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Very Low</span>
                  <span>Neutral</span>
                  <span>Very High</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleLogMood}>Log Mood</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {recentMoods.length > 0 && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-medium">Recent moods</p>
            {recentMoods.map(mood => (
              <div key={mood.id} className="flex justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {getMoodIcon(mood.moodScore)}
                  <span>Mood: {mood.moodScore}/10</span>
                </div>
                <span>{safeFormat(mood.timestamp, 'h:mm a')}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
