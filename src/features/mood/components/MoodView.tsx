import { useState, useMemo } from 'react';
import { useMoodEntries } from '@/hooks/use-mood-entries';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Check,
  Pencil,
  Trash,
  MagnifyingGlass,
  FunnelSimple,
  CalendarBlank,
  ChartLine,
  Smiley,
  SmileyMeh,
  SmileySad,
  SmileyWink,
  SmileyXEyes
} from '@phosphor-icons/react';
import { useMoodEntries } from '@/hooks/use-mood-entries';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/shared/ui/drawer';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Slider } from '@/shared/ui/slider';
import { Textarea } from '@/shared/ui/textarea';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/shared/utils';
import { parseLocalDateTime } from '@/shared/utils/date-helpers';
import type { MoodEntry } from '@/shared/types';

export default function MoodView() {
  const { moodEntries, createMoodEntry, updateMoodEntry, deleteMoodEntry } = useMoodEntries();

  const [moodScore, setMoodScore] = useState(5);
  const [anxietyLevel, setAnxietyLevel] = useState<number | undefined>(undefined);
  const [energyLevel, setEnergyLevel] = useState<number | undefined>(undefined);
  const [focusLevel, setFocusLevel] = useState<number | undefined>(undefined);
  const [sensitivityLevel, setSensitivityLevel] = useState<number | undefined>(undefined);
  const [motivationLevel, setMotivationLevel] = useState<number | undefined>(undefined);
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
  const [editSensitivity, setEditSensitivity] = useState<number | undefined>(undefined);
  const [editMotivation, setEditMotivation] = useState<number | undefined>(undefined);
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  const getMoodIcon = (score: number) => {
    if (score >= 7) return <Smiley className="w-8 h-8 text-primary" weight="fill" />;
    if (score >= 4) return <SmileyMeh className="w-8 h-8 text-muted-foreground" weight="fill" />;
    return <SmileySad className="w-8 h-8 text-destructive" weight="fill" />;
  };

  const handleSave = async () => {
    await createMoodEntry({
      timestamp: Date.now(),
      moodScore,
      anxietyLevel,
      energyLevel,
      focusLevel,
      sensitivityLevel,
      motivationLevel,
      notes: notes || undefined
    });

    toast.success('Mood entry saved');

    setMoodScore(5);
    setAnxietyLevel(undefined);
    setEnergyLevel(undefined);
    setFocusLevel(undefined);
    setSensitivityLevel(undefined);
    setMotivationLevel(undefined);
    setNotes('');
    setShowExtended(false);
  };

  const handleQuickLog = async () => {
    if (!quickDate || !quickTime) {
      toast.error('Please select date and time');
      return;
    }

    const dateTime = new Date(`${quickDate}T${quickTime}`);
    const timestamp = dateTime.getTime();

    await createMoodEntry({
      timestamp,
      moodScore: quickMoodScore
    });

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
    setEditSensitivity(entry.sensitivityLevel);
    setEditMotivation(entry.motivationLevel);
    setEditNotes(entry.notes || '');
    setEditDate(safeFormat(entry.timestamp, 'yyyy-MM-dd', ''));
    setEditTime(safeFormat(entry.timestamp, 'HH:mm', ''));
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry || !editDate || !editTime) return;

    const dateTime = new Date(`${editDate}T${editTime}`);
    const timestamp = dateTime.getTime();

    await updateMoodEntry(editingEntry.id, {
      timestamp,
      moodScore: editMood,
      anxietyLevel: editAnxiety,
      energyLevel: editEnergy,
      focusLevel: editFocus,
      sensitivityLevel: editSensitivity,
      motivationLevel: editMotivation,
      notes: editNotes || undefined
    });

    toast.success('Mood entry updated');
    setEditDialogOpen(false);
  };

  const handleDelete = async (entryId: string) => {
    if (window.confirm('Delete this mood entry?')) {
      await deleteMoodEntry(entryId);
      toast.success('Mood entry deleted');
    }
  };

  const recentEntries = useMemo(() => {
    return [...moodEntries].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [moodEntries]);

  const chartData = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return [...moodEntries]
      .filter(e => e.timestamp >= thirtyDaysAgo)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(e => ({
        timestamp: safeFormat(e.timestamp, 'MMM d', 'N/A'),
        time: e.timestamp,
        mood: e.moodScore,
        anxiety: e.anxietyLevel,
        energy: e.energyLevel,
        focus: e.focusLevel,
        sensitivity: e.sensitivityLevel,
        motivation: e.motivationLevel
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-4"
    >
      <MoodSlider value={moodScore} onChange={setMoodScore} label="Como você está se sentindo?" />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">Data</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Hora</Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowExtended(!showExtended)}
        className="w-full text-xs"
      >
        {showExtended ? 'Ocultar' : 'Mostrar'} métricas estendidas
      </Button>

      <AnimatePresence>
        {showExtended && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Ansiedade</Label>
                <span className="text-sm font-medium">{anxietyLevel}/10</span>
              </div>
              <Slider
                value={[anxietyLevel]}
                onValueChange={(vals) => setAnxietyLevel(vals[0])}
                min={0}
                max={10}
                step={1}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Energia</Label>
                <span className="text-sm font-medium">{energyLevel}/10</span>
              </div>
              <Slider
                value={[energyLevel]}
                onValueChange={(vals) => setEnergyLevel(vals[0])}
                min={0}
                max={10}
                step={1}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Foco</Label>
                <span className="text-sm font-medium">{focusLevel}/10</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Sensitivity Level</Label>
                  <span className="text-lg font-medium">{sensitivityLevel ?? '-'}</span>
                </div>
                <Slider
                  value={[sensitivityLevel ?? 5]}
                  onValueChange={(value) => setSensitivityLevel(value[0])}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Motivation Level</Label>
                  <span className="text-lg font-medium">{motivationLevel ?? '-'}</span>
                </div>
                <Slider
                  value={[motivationLevel ?? 5]}
                  onValueChange={(value) => setMotivationLevel(value[0])}
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

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={handleSubmit} className="flex-1">
          <Check className="w-4 h-4 mr-2" />
          Salvar
        </Button>
      </div>
    </motion.div>
  );
};

// Mood Entry Card with inline editing
const MoodEntryCard = ({
  entry,
  onEdit,
  onDelete
}: {
  entry: MoodEntry;
  onEdit: (entry: MoodEntry) => void;
  onDelete: (id: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMood, setEditedMood] = useState(entry.moodScore);
  const [editedNotes, setEditedNotes] = useState(entry.notes || '');
  const { icon: Icon, color } = getMoodEmoji(isEditing ? editedMood : entry.moodScore);

  const handleSave = async () => {
    onEdit({
      ...entry,
      moodScore: editedMood,
      notes: editedNotes.trim() || undefined
    });
    setIsEditing(false);
  };

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
                {chartData.some(d => d.sensitivity !== undefined) && (
                  <Line type="monotone" dataKey="sensitivity" stroke="#ec4899" name="Sensitivity" />
                )}
                {chartData.some(d => d.motivation !== undefined) && (
                  <Line type="monotone" dataKey="motivation" stroke="#14b8a6" name="Motivation" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.01 }}
      className="relative"
    >
      <Card className={cn(
        'overflow-hidden border-0 shadow-sm transition-all duration-300',
        'bg-gradient-to-br backdrop-blur-sm',
        getMoodGradient(isEditing ? editedMood : entry.moodScore)
      )}>
        <CardContent className="p-4">
          {isEditing ? (
            <div className="space-y-4">
              <MoodSlider value={editedMood} onChange={setEditedMood} label="Humor" />
              <div className="space-y-2">
                <Label className="text-xs">Notas</Label>
                <Textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel} className="flex-1">
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} className="flex-1">
                  <Check className="w-4 h-4 mr-1" />
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <Icon className={cn('w-10 h-10 transition-colors', color)} weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg">{entry.moodScore}/10</span>
                      {entry.anxietyLevel !== undefined && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          Ansiedade: {entry.anxietyLevel}
                        </span>
                      )}
                      {entry.energyLevel !== undefined && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300">
                          Energia: {entry.energyLevel}
                        </span>
                      )}
                      {entry.focusLevel !== undefined && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300">
                          Foco: {entry.focusLevel}
                        </span>
                      )}
                      {entry.sensitivityLevel !== undefined && (
                        <span className="text-sm text-muted-foreground">Sensitivity: {entry.sensitivityLevel}</span>
                      )}
                      {entry.motivationLevel !== undefined && (
                        <span className="text-sm text-muted-foreground">Motivation: {entry.motivationLevel}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(entry.timestamp), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                    {entry.notes && (
                      <p className="text-sm mt-2 text-foreground/80 line-clamp-2">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(entry.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Main MoodView Component
export default function MoodView() {
  const { moodEntries, createMoodEntry, updateMoodEntry, deleteMoodEntry, isLoading } = useMoodEntries();
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const isMobile = useIsMobile();

  // Filter entries
  const filteredEntries = useMemo(() => {
    let filtered = [...moodEntries];

    // Time filter
    const now = Date.now();
    if (timeFilter === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      filtered = filtered.filter(e => e.timestamp >= startOfDay.getTime());
    } else if (timeFilter === 'week') {
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(e => e.timestamp >= weekAgo);
    } else if (timeFilter === 'month') {
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(e => e.timestamp >= monthAgo);
    }

      <Dialog open={entriesDialogOpen} onOpenChange={setEntriesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Mood Entries</DialogTitle>
            <DialogDescription>
              {moodEntries.length} total entries
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {[...moodEntries].sort((a, b) => b.timestamp - a.timestamp).map(entry => (
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
                        {entry.sensitivityLevel !== undefined && (
                          <span className="text-sm text-muted-foreground">Sensitivity: {entry.sensitivityLevel}</span>
                        )}
                        {entry.motivationLevel !== undefined && (
                          <span className="text-sm text-muted-foreground">Motivation: {entry.motivationLevel}</span>
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
                </div>
              </Card>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <SmileyMeh className="w-16 h-16 text-muted-foreground/50" weight="duotone" />
                <div>
                  <h3 className="font-semibold text-lg">Nenhum registro encontrado</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery || timeFilter !== 'all'
                      ? 'Tente ajustar os filtros'
                      : 'Comece registrando seu humor agora'}
                  </p>
                </div>
                {!searchQuery && timeFilter === 'all' && (
                  <Button onClick={() => setQuickLogOpen(true)} className="mt-2">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar primeiro registro
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredEntries.map(entry => (
              <MoodEntryCard
                key={entry.id}
                entry={entry}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* FAB for mobile */}
      {isMobile && QuickLogTrigger}

      {/* Stats Footer */}
      {filteredEntries.length > 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">
                  {filteredEntries.length}
                </p>
                <p className="text-xs text-muted-foreground">Registros</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(filteredEntries.reduce((acc, e) => acc + e.moodScore, 0) / filteredEntries.length).toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Média</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.max(...filteredEntries.map(e => e.moodScore))}
                </p>
                <p className="text-xs text-muted-foreground">Melhor</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sensitivity Level (optional)</Label>
                <span className="text-lg font-medium">{editSensitivity ?? '-'}</span>
              </div>
              <Slider
                value={[editSensitivity ?? 5]}
                onValueChange={(value) => setEditSensitivity(value[0])}
                min={0}
                max={10}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Motivation Level (optional)</Label>
                <span className="text-lg font-medium">{editMotivation ?? '-'}</span>
              </div>
              <Slider
                value={[editMotivation ?? 5]}
                onValueChange={(value) => setEditMotivation(value[0])}
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
