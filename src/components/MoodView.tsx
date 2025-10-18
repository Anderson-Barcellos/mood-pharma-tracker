import { useState, useMemo } from 'react';
import { useKV } from '@github/spark/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Smiley, SmileyMeh, SmileySad, Plus, Pencil, Trash, List } from '@phosphor-icons/react';
import type { MoodEntry } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export default function MoodView() {
  const [moodEntries, setMoodEntries] = useKV<MoodEntry[]>('moodEntries', []);
  const [moodScore, setMoodScore] = useState(5);
  const [anxietyLevel, setAnxietyLevel] = useState<number | undefined>(undefined);
  const [energyLevel, setEnergyLevel] = useState<number | undefined>(undefined);
  const [focusLevel, setFocusLevel] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [showExtended, setShowExtended] = useState(false);
  
  const [quickDialogOpen, setQuickDialogOpen] = useState(false);
  const [quickMoodScore, setQuickMoodScore] = useState(5);
  const now = new Date();
  const [quickDate, setQuickDate] = useState(format(now, 'yyyy-MM-dd'));
  const [quickTime, setQuickTime] = useState(format(now, 'HH:mm'));

  const [entriesDialogOpen, setEntriesDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MoodEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editMood, setEditMood] = useState(5);
  const [editAnxiety, setEditAnxiety] = useState<number | undefined>(undefined);
  const [editEnergy, setEditEnergy] = useState<number | undefined>(undefined);
  const [editFocus, setEditFocus] = useState<number | undefined>(undefined);
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

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
    toast.success('Mood entry saved');
    
    setMoodScore(5);
    setAnxietyLevel(undefined);
    setEnergyLevel(undefined);
    setFocusLevel(undefined);
    setNotes('');
    setShowExtended(false);
  };

  const handleQuickLog = () => {
    const dateTime = new Date(`${quickDate}T${quickTime}`);
    const timestamp = dateTime.getTime();

    const entry: MoodEntry = {
      id: uuidv4(),
      timestamp,
      moodScore: quickMoodScore,
      createdAt: Date.now()
    };

    setMoodEntries((current) => [...(current || []), entry]);
    toast.success('Quick mood logged', {
      description: format(timestamp, 'MMM d, h:mm a')
    });

    setQuickMoodScore(5);
    const newNow = new Date();
    setQuickDate(format(newNow, 'yyyy-MM-dd'));
    setQuickTime(format(newNow, 'HH:mm'));
    setQuickDialogOpen(false);
  };

  const handleEdit = (entry: MoodEntry) => {
    setEditingEntry(entry);
    setEditMood(entry.moodScore);
    setEditAnxiety(entry.anxietyLevel);
    setEditEnergy(entry.energyLevel);
    setEditFocus(entry.focusLevel);
    setEditNotes(entry.notes || '');
    const date = new Date(entry.timestamp);
    setEditDate(format(date, 'yyyy-MM-dd'));
    setEditTime(format(date, 'HH:mm'));
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;

    const dateTime = new Date(`${editDate}T${editTime}`);
    const timestamp = dateTime.getTime();

    setMoodEntries((current) =>
      (current || []).map(e =>
        e.id === editingEntry.id
          ? {
              ...e,
              timestamp,
              moodScore: editMood,
              anxietyLevel: editAnxiety,
              energyLevel: editEnergy,
              focusLevel: editFocus,
              notes: editNotes || undefined
            }
          : e
      )
    );

    toast.success('Mood entry updated');
    setEditDialogOpen(false);
    setEditingEntry(null);
  };

  const handleDelete = (entryId: string) => {
    if (confirm('Are you sure you want to delete this mood entry?')) {
      setMoodEntries((current) => (current || []).filter(e => e.id !== entryId));
      toast.success('Mood entry deleted');
    }
  };

  const getMoodIcon = (score: number) => {
    if (score >= 7) return <Smiley className="w-6 h-6 text-primary" weight="fill" />;
    if (score >= 4) return <SmileyMeh className="w-6 h-6 text-secondary" weight="fill" />;
    return <SmileySad className="w-6 h-6 text-destructive" weight="fill" />;
  };

  const recentEntries = [...(moodEntries || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

  const chartData = useMemo(() => {
    const last30Days = subDays(Date.now(), 30).getTime();
    const filteredEntries = (moodEntries || [])
      .filter(entry => entry.timestamp >= last30Days)
      .sort((a, b) => a.timestamp - b.timestamp);

    return filteredEntries.map(entry => ({
      timestamp: format(entry.timestamp, 'HH:mm'),
      time: entry.timestamp,
      mood: entry.moodScore,
      anxiety: entry.anxietyLevel,
      energy: entry.energyLevel,
      focus: entry.focusLevel
    }));
  }, [moodEntries]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Mood Tracking</h2>
          <p className="text-muted-foreground">Record your emotional state over time</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={quickDialogOpen} onOpenChange={setQuickDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  const newNow = new Date();
                  setQuickDate(format(newNow, 'yyyy-MM-dd'));
                  setQuickTime(format(newNow, 'HH:mm'));
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Quick Mood Log
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Quick Mood Log</DialogTitle>
                <DialogDescription>Quickly record your current mood</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Mood Score</Label>
                    <div className="flex items-center gap-2">
                      {getMoodIcon(quickMoodScore)}
                      <span className="text-2xl font-bold w-12 text-right">{quickMoodScore}</span>
                    </div>
                  </div>
                  <Slider
                    value={[quickMoodScore]}
                    onValueChange={(value) => setQuickMoodScore(value[0])}
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
                      value={quickDate}
                      onChange={(e) => setQuickDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={quickTime}
                      onChange={(e) => setQuickTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setQuickDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleQuickLog}>Log Mood</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={() => setEntriesDialogOpen(true)}>
            <List className="w-4 h-4 mr-2" />
            View All Entries
          </Button>
        </div>
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

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mood Trends</CardTitle>
            <CardDescription>Last 30 days mood tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="timestamp"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    domain={[0, 10]}
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                  />
                  <Tooltip 
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        return format(payload[0].payload.time, 'MMM d, HH:mm');
                      }
                      return label;
                    }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="#22c55e"
                    strokeWidth={3}
                    name="Mood"
                    dot={{ r: 4 }}
                  />
                  {chartData.some(d => d.anxiety !== undefined) && (
                    <Line 
                      type="monotone" 
                      dataKey="anxiety" 
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Anxiety"
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  )}
                  {chartData.some(d => d.energy !== undefined) && (
                    <Line 
                      type="monotone" 
                      dataKey="energy" 
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name="Energy"
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  )}
                  {chartData.some(d => d.focus !== undefined) && (
                    <Line 
                      type="monotone" 
                      dataKey="focus" 
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      name="Focus"
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

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

      <Dialog open={entriesDialogOpen} onOpenChange={setEntriesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>All Mood Entries</DialogTitle>
            <DialogDescription>View, edit, or delete your mood history</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {(moodEntries || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No mood entries yet
              </div>
            ) : (
              <div className="space-y-3">
                {[...(moodEntries || [])].sort((a, b) => b.timestamp - a.timestamp).map(entry => (
                  <Card key={entry.id} className="shadow-sm">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
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
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Mood Entry</DialogTitle>
            <DialogDescription>Update mood information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Mood Score</Label>
                <div className="flex items-center gap-2">
                  {getMoodIcon(editMood)}
                  <span className="text-2xl font-bold w-12 text-right">{editMood}</span>
                </div>
              </div>
              <Slider
                value={[editMood]}
                onValueChange={(value) => setEditMood(value[0])}
                min={0}
                max={10}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Anxiety Level (optional)</Label>
                <span className="text-lg font-medium">{editAnxiety ?? 'Not set'}</span>
              </div>
              {editAnxiety !== undefined && (
                <Slider
                  value={[editAnxiety]}
                  onValueChange={(value) => setEditAnxiety(value[0])}
                  min={0}
                  max={10}
                  step={1}
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditAnxiety(editAnxiety === undefined ? 5 : undefined)}
              >
                {editAnxiety === undefined ? 'Add Anxiety Level' : 'Remove Anxiety Level'}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Energy Level (optional)</Label>
                <span className="text-lg font-medium">{editEnergy ?? 'Not set'}</span>
              </div>
              {editEnergy !== undefined && (
                <Slider
                  value={[editEnergy]}
                  onValueChange={(value) => setEditEnergy(value[0])}
                  min={0}
                  max={10}
                  step={1}
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditEnergy(editEnergy === undefined ? 5 : undefined)}
              >
                {editEnergy === undefined ? 'Add Energy Level' : 'Remove Energy Level'}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Focus Level (optional)</Label>
                <span className="text-lg font-medium">{editFocus ?? 'Not set'}</span>
              </div>
              {editFocus !== undefined && (
                <Slider
                  value={[editFocus]}
                  onValueChange={(value) => setEditFocus(value[0])}
                  min={0}
                  max={10}
                  step={1}
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditFocus(editFocus === undefined ? 5 : undefined)}
              >
                {editFocus === undefined ? 'Add Focus Level' : 'Remove Focus Level'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Any additional information..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
