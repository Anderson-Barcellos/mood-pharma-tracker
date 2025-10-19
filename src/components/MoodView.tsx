import { useState, useMemo } from 'react';
import { useKV } from '@github/spark/hooks';
import { format } from 'date-fns';
import { Smiley, SmileyMeh, SmileySad, Plus, List, Pencil, Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import type { MoodEntry } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { safeFormat } from '@/lib/utils';

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
  const [quickDate, setQuickDate] = useState('');
  const [quickTime, setQuickTime] = useState('');

  const [entriesDialogOpen, setEntriesDialogOpen] = useState(false);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MoodEntry | null>(null);
  const [editMood, setEditMood] = useState(5);
  const [editAnxiety, setEditAnxiety] = useState<number | undefined>(undefined);
  const [editEnergy, setEditEnergy] = useState<number | undefined>(undefined);
  const [editFocus, setEditFocus] = useState<number | undefined>(undefined);
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  const getMoodIcon = (score: number) => {
    if (score >= 7) return <Smiley className="w-8 h-8 text-primary" weight="fill" />;
    if (score >= 4) return <SmileyMeh className="w-8 h-8 text-muted-foreground" weight="fill" />;
    return <SmileySad className="w-8 h-8 text-destructive" weight="fill" />;
  };

  const handleSave = () => {
    const entry: MoodEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      moodScore,
      anxietyLevel,
      energyLevel,
      focusLevel,
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
    if (!quickDate || !quickTime) {
      toast.error('Please select date and time');
      return;
    }

    const dateTime = new Date(`${quickDate}T${quickTime}`);
    const timestamp = dateTime.getTime();

    const entry: MoodEntry = {
      id: uuidv4(),
      timestamp,
      moodScore: quickMoodScore,
      createdAt: Date.now()
    };

    setMoodEntries((current) => [...(current || []), entry]);
    toast.success('Quick mood logged');
    setQuickDialogOpen(false);

    const now = new Date();
    setQuickDate(format(now, 'yyyy-MM-dd'));
    setQuickTime(format(now, 'HH:mm'));
    setQuickMoodScore(5);
  };

  const handleEdit = (entry: MoodEntry) => {
    setEditingEntry(entry);
    setEditMood(entry.moodScore);
    setEditAnxiety(entry.anxietyLevel);
    setEditEnergy(entry.energyLevel);
    setEditFocus(entry.focusLevel);
    setEditNotes(entry.notes || '');
    setEditDate(safeFormat(entry.timestamp, 'yyyy-MM-dd', ''));
    setEditTime(safeFormat(entry.timestamp, 'HH:mm', ''));
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingEntry || !editDate || !editTime) return;

    const dateTime = new Date(`${editDate}T${editTime}`);
    const timestamp = dateTime.getTime();

    const updatedEntry: MoodEntry = {
      ...editingEntry,
      timestamp,
      moodScore: editMood,
      anxietyLevel: editAnxiety,
      energyLevel: editEnergy,
      focusLevel: editFocus,
      notes: editNotes || undefined
    };

    setMoodEntries((current) => 
      (current || []).map(e => e.id === editingEntry.id ? updatedEntry : e)
    );
    toast.success('Mood entry updated');
    setEditDialogOpen(false);
  };

  const handleDelete = (entryId: string) => {
    if (window.confirm('Delete this mood entry?')) {
      setMoodEntries((current) => (current || []).filter(e => e.id !== entryId));
      toast.success('Mood entry deleted');
    }
  };

  const recentEntries = useMemo(() => {
    return [...(moodEntries || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [moodEntries]);

  const chartData = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return [...(moodEntries || [])]
      .filter(e => e.timestamp >= thirtyDaysAgo)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(e => ({
        timestamp: safeFormat(e.timestamp, 'MMM d', 'N/A'),
        time: e.timestamp,
        mood: e.moodScore,
        anxiety: e.anxietyLevel,
        energy: e.energyLevel,
        focus: e.focusLevel
      }));
  }, [moodEntries]);

  const initializeQuickLog = () => {
    const now = new Date();
    setQuickDate(format(now, 'yyyy-MM-dd'));
    setQuickTime(format(now, 'HH:mm'));
    setQuickMoodScore(5);
    setQuickDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mood Tracking</h2>
          <p className="text-sm text-muted-foreground">Monitor your emotional state over time</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={quickDialogOpen} onOpenChange={setQuickDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={initializeQuickLog}>
                <Plus className="w-4 h-4 mr-2" />
                Quick Log
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Quick Mood Log</DialogTitle>
                <DialogDescription>Log your mood with timestamp</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Mood Score</Label>
                    <span className="text-lg font-medium">{quickMoodScore}/10</span>
                  </div>
                  <Slider
                    value={[quickMoodScore]}
                    onValueChange={(value) => setQuickMoodScore(value[0])}
                    min={0}
                    max={10}
                    step={1}
                  />
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
                <Button onClick={handleQuickLog}>Log Mood</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => setEntriesDialogOpen(true)}>
            <List className="w-4 h-4 mr-2" />
            All Entries
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Mood Entry</CardTitle>
          <CardDescription>Record your current emotional state</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Mood Score</Label>
              <span className="text-lg font-medium">{moodScore}/10</span>
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
              <span>Terrible</span>
              <span>Neutral</span>
              <span>Excellent</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowExtended(!showExtended)}
            className="w-full"
          >
            {showExtended ? 'Hide' : 'Show'} Extended Metrics
          </Button>

          {showExtended && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Anxiety Level</Label>
                  <span className="text-lg font-medium">{anxietyLevel ?? '-'}</span>
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
                  <span className="text-lg font-medium">{energyLevel ?? '-'}</span>
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
                  <span className="text-lg font-medium">{focusLevel ?? '-'}</span>
                </div>
                <Slider
                  value={[focusLevel ?? 5]}
                  onValueChange={(value) => setFocusLevel(value[0])}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant notes..."
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
            <CardTitle>Mood Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="mood" stroke="#10b981" name="Mood" />
                {chartData.some(d => d.anxiety !== undefined) && (
                  <Line type="monotone" dataKey="anxiety" stroke="#f59e0b" name="Anxiety" />
                )}
                {chartData.some(d => d.energy !== undefined) && (
                  <Line type="monotone" dataKey="energy" stroke="#3b82f6" name="Energy" />
                )}
                {chartData.some(d => d.focus !== undefined) && (
                  <Line type="monotone" dataKey="focus" stroke="#8b5cf6" name="Focus" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {recentEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEntries.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getMoodIcon(entry.moodScore)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Mood: {entry.moodScore}/10</span>
                      {entry.anxietyLevel !== undefined && (
                        <span className="text-sm text-muted-foreground">Anxiety: {entry.anxietyLevel}</span>
                      )}
                      {entry.energyLevel !== undefined && (
                        <span className="text-sm text-muted-foreground">Energy: {entry.energyLevel}</span>
                      )}
                      {entry.focusLevel !== undefined && (
                        <span className="text-sm text-muted-foreground">Focus: {entry.focusLevel}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {safeFormat(entry.timestamp, 'MMM d, yyyy h:mm a')}
                    </p>
                    {entry.notes && (
                      <p className="text-sm mt-1">{entry.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(entry)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={entriesDialogOpen} onOpenChange={setEntriesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Mood Entries</DialogTitle>
            <DialogDescription>
              {moodEntries?.length || 0} total entries
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {[...(moodEntries || [])].sort((a, b) => b.timestamp - a.timestamp).map(entry => (
              <Card key={entry.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    {getMoodIcon(entry.moodScore)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Mood: {entry.moodScore}/10</span>
                        {entry.anxietyLevel !== undefined && (
                          <span className="text-sm text-muted-foreground">Anxiety: {entry.anxietyLevel}</span>
                        )}
                        {entry.energyLevel !== undefined && (
                          <span className="text-sm text-muted-foreground">Energy: {entry.energyLevel}</span>
                        )}
                        {entry.focusLevel !== undefined && (
                          <span className="text-sm text-muted-foreground">Focus: {entry.focusLevel}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {safeFormat(entry.timestamp, 'MMM d, yyyy h:mm a')}
                      </p>
                      {entry.notes && (
                        <p className="text-sm mt-1">{entry.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
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
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Mood Entry</DialogTitle>
            <DialogDescription>Update your mood entry details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Mood Score</Label>
                <span className="text-lg font-medium">{editMood}/10</span>
              </div>
              <Slider
                value={[editMood]}
                onValueChange={(value) => setEditMood(value[0])}
                min={0}
                max={10}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Anxiety Level (optional)</Label>
                <span className="text-lg font-medium">{editAnxiety ?? '-'}</span>
              </div>
              <Slider
                value={[editAnxiety ?? 5]}
                onValueChange={(value) => setEditAnxiety(value[0])}
                min={0}
                max={10}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Energy Level (optional)</Label>
                <span className="text-lg font-medium">{editEnergy ?? '-'}</span>
              </div>
              <Slider
                value={[editEnergy ?? 5]}
                onValueChange={(value) => setEditEnergy(value[0])}
                min={0}
                max={10}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Focus Level (optional)</Label>
                <span className="text-lg font-medium">{editFocus ?? '-'}</span>
              </div>
              <Slider
                value={[editFocus ?? 5]}
                onValueChange={(value) => setEditFocus(value[0])}
                min={0}
                max={10}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
