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
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Slider } from '@/shared/ui/slider';
import { Textarea } from '@/shared/ui/textarea';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { toast } from 'sonner';
import { cn, safeFormat } from '@/shared/utils';
import { parseLocalDateTime } from '@/shared/utils/date-helpers';
import type { MoodEntry } from '@/shared/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHaptic } from '@/hooks/use-haptic';

// Helper functions
function getMoodEmoji(score: number) {
  if (score >= 9) return { icon: Smiley, color: 'text-green-600', label: 'Excelente' };
  if (score >= 7) return { icon: SmileyWink, color: 'text-green-500', label: 'Muito Bom' };
  if (score >= 5) return { icon: SmileyMeh, color: 'text-yellow-500', label: 'OK' };
  if (score >= 3) return { icon: SmileySad, color: 'text-orange-500', label: 'Ruim' };
  return { icon: SmileyXEyes, color: 'text-red-500', label: 'Péssimo' };
}

function getMoodGradient(score: number) {
  if (score >= 7) return 'from-green-100 to-emerald-100';
  if (score >= 4) return 'from-yellow-100 to-amber-100';
  return 'from-red-100 to-orange-100';
}

// Mood Slider Component
const MoodSlider = ({
  value,
  onChange,
  label
}: {
  value: number;
  onChange: (val: number) => void;
  label: string;
}) => {
  const { icon: Icon, color, label: moodLabel } = getMoodEmoji(value);
  const haptic = useHaptic();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          <Icon className={cn('w-6 h-6 transition-all duration-300', color)} weight="fill" />
          <span className="text-lg font-bold min-w-[3rem] text-right">{value}/10</span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={(vals) => {
          onChange(vals[0]);
          haptic.impact('light');
        }}
        min={0}
        max={10}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Terrível</span>
        <span className={cn('font-medium transition-all', color)}>{moodLabel}</span>
        <span>Excelente</span>
      </div>
    </div>
  );
};

// Main MoodView Component
export default function MoodView() {
  const { moodEntries, createMoodEntry, updateMoodEntry, deleteMoodEntry, isLoading } = useMoodEntries();
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [moodScore, setMoodScore] = useState(5);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [notes, setNotes] = useState('');

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

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => e.notes?.toLowerCase().includes(query));
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [moodEntries, timeFilter, searchQuery]);

  const handleQuickLog = async () => {
    try {
      const timestamp = parseLocalDateTime(date, time);
      await createMoodEntry({
        timestamp,
        moodScore,
        notes: notes || undefined
      });
      toast.success('Mood logged successfully!');
      setQuickLogOpen(false);
      setMoodScore(5);
      setNotes('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setTime(format(new Date(), 'HH:mm'));
    } catch (error) {
      console.error('Error logging mood:', error);
      toast.error('Failed to log mood');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this mood entry?')) {
      await deleteMoodEntry(id);
      toast.success('Mood entry deleted');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Mood Tracker</h2>
        <Button onClick={() => setQuickLogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Log Mood
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as typeof timeFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Entries List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <SmileyMeh className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No mood entries found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map(entry => {
            const { icon: Icon, color } = getMoodEmoji(entry.moodScore);
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Icon className={cn('w-8 h-8', color)} weight="fill" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-lg">{entry.moodScore}/10</span>
                          <span className="text-sm text-muted-foreground">
                            {safeFormat(entry.timestamp, 'MMM d, yyyy h:mm a', 'Invalid date')}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{entry.notes}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Quick Log Dialog */}
      <Dialog open={quickLogOpen} onOpenChange={setQuickLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Mood</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <MoodSlider
              value={moodScore}
              onChange={setMoodScore}
              label="How are you feeling?"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Add any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setQuickLogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleQuickLog} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
