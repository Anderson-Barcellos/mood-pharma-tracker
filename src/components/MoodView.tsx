import { useState } from 'react';
import { useKV } from '@github/spark/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Smiley, SmileyMeh, SmileySad } from '@phosphor-icons/react';
import type { MoodEntry } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

export default function MoodView() {
  const [moodEntries, setMoodEntries] = useKV<MoodEntry[]>('moodEntries', []);
  const [moodScore, setMoodScore] = useState(5);
  const [anxietyLevel, setAnxietyLevel] = useState<number | undefined>(undefined);
  const [energyLevel, setEnergyLevel] = useState<number | undefined>(undefined);
  const [focusLevel, setFocusLevel] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [showExtended, setShowExtended] = useState(false);

  const handleSave = () => {
    const entry: MoodEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      moodScore,
      anxietyLevel: showExtended ? anxietyLevel : undefined,
      energyLevel: showExtended ? energyLevel : undefined,
      focusLevel: showExtended ? focusLevel : undefined,
      notes: notes || undefined,
      createdAt: Date.now()
    };

    setMoodEntries((current) => [...(current || []), entry]);
    
    setMoodScore(5);
    setAnxietyLevel(undefined);
    setEnergyLevel(undefined);
    setFocusLevel(undefined);
    setNotes('');
    setShowExtended(false);
  };

  const getMoodIcon = (score: number) => {
    if (score >= 7) return <Smiley className="w-6 h-6 text-primary" weight="fill" />;
    if (score >= 4) return <SmileyMeh className="w-6 h-6 text-secondary" weight="fill" />;
    return <SmileySad className="w-6 h-6 text-destructive" weight="fill" />;
  };

  const recentEntries = [...(moodEntries || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Mood Tracking</h2>
        <p className="text-muted-foreground">Record your emotional state over time</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Current Mood</CardTitle>
          <CardDescription>Rate your mood and optional dimensions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {!showExtended ? (
            <Button variant="outline" onClick={() => setShowExtended(true)} className="w-full">
              Add More Dimensions
            </Button>
          ) : (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Anxiety Level</Label>
                  <span className="text-lg font-medium">{anxietyLevel ?? 5}</span>
                </div>
                <Slider
                  value={[anxietyLevel ?? 5]}
                  onValueChange={(value) => setAnxietyLevel(value[0])}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Energy Level</Label>
                  <span className="text-lg font-medium">{energyLevel ?? 5}</span>
                </div>
                <Slider
                  value={[energyLevel ?? 5]}
                  onValueChange={(value) => setEnergyLevel(value[0])}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Focus Level</Label>
                  <span className="text-lg font-medium">{focusLevel ?? 5}</span>
                </div>
                <Slider
                  value={[focusLevel ?? 5]}
                  onValueChange={(value) => setFocusLevel(value[0])}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How are you feeling? Any context..."
              rows={3}
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            Save Mood Entry
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
          <CardDescription>Your mood history</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mood entries yet</p>
          ) : (
            <div className="space-y-4">
              {recentEntries.map(entry => (
                <div key={entry.id} className="flex items-start gap-4 p-4 rounded-lg border">
                  <div className="flex-shrink-0 pt-1">
                    {getMoodIcon(entry.moodScore)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium">Mood: {entry.moodScore}/10</span>
                      <span className="text-xs text-muted-foreground">
                        {format(entry.timestamp, 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    {(entry.anxietyLevel !== undefined || entry.energyLevel !== undefined || entry.focusLevel !== undefined) && (
                      <div className="flex gap-4 text-sm">
                        {entry.anxietyLevel !== undefined && (
                          <span className="text-muted-foreground">Anxiety: {entry.anxietyLevel}/10</span>
                        )}
                        {entry.energyLevel !== undefined && (
                          <span className="text-muted-foreground">Energy: {entry.energyLevel}/10</span>
                        )}
                        {entry.focusLevel !== undefined && (
                          <span className="text-muted-foreground">Focus: {entry.focusLevel}/10</span>
                        )}
                      </div>
                    )}
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground italic">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
