'use client';

import { useState, useMemo, useCallback } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import {
  Pencil,
  Trash,
  Check,
  X,
  Smiley,
  SmileyMeh,
  SmileySad,
  SmileyWink,
  SmileyXEyes,
  MagnifyingGlass
} from '@phosphor-icons/react';
import { useMoodEntries } from '@/hooks/use-mood-entries';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Slider } from '@/shared/ui/slider';
import { Textarea } from '@/shared/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Skeleton } from '@/shared/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/shared/utils';
import type { MoodEntry } from '@/shared/types';
import { useHaptic } from '@/hooks/use-haptic';

// Emoji mapping for mood scores
const getMoodEmoji = (score: number) => {
  if (score >= 9) return { icon: Smiley, color: 'text-green-500', label: 'Excelente' };
  if (score >= 7) return { icon: SmileyWink, color: 'text-emerald-500', label: 'Muito Bom' };
  if (score >= 5) return { icon: SmileyMeh, color: 'text-amber-500', label: 'Neutro' };
  if (score >= 3) return { icon: SmileySad, color: 'text-orange-500', label: 'Ruim' };
  return { icon: SmileyXEyes, color: 'text-red-500', label: 'Terrível' };
};

// Gradient for mood cards based on score
const getMoodGradient = (score: number) => {
  if (score >= 7) return 'from-emerald-500/10 to-green-500/5';
  if (score >= 4) return 'from-amber-500/10 to-yellow-500/5';
  return 'from-red-500/10 to-orange-500/5';
};

// Format date header
const formatDateHeader = (date: Date): string => {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
};

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

// Delete Confirmation Overlay
const DeleteConfirmation = ({
  onConfirm,
  onCancel
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-destructive/10 backdrop-blur-sm rounded-lg flex items-center justify-center gap-2 z-10"
    >
      <Button
        size="sm"
        variant="destructive"
        onClick={onConfirm}
        className="min-h-[40px]"
      >
        <Check className="w-4 h-4 mr-1" />
        Confirmar
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onCancel}
        className="min-h-[40px]"
      >
        <X className="w-4 h-4 mr-1" />
        Cancelar
      </Button>
    </motion.div>
  );
};

// Mood Entry Card with swipe-to-delete
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const haptic = useHaptic();

  const { icon: Icon, color } = getMoodEmoji(isEditing ? editedMood : entry.moodScore);

  // Swipe gesture state
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-150, 0],
    ['rgb(239 68 68)', 'rgba(239 68 68 / 0)']
  );

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.x < -150) {
      haptic.impact('medium');
      setShowDeleteConfirm(true);
    }
  };

  const handleSave = async () => {
    onEdit({
      ...entry,
      moodScore: editedMood,
      notes: editedNotes.trim() || undefined
    });
    setIsEditing(false);
    haptic.notification('success');
  };

  const handleCancel = () => {
    setEditedMood(entry.moodScore);
    setEditedNotes(entry.notes || '');
    setIsEditing(false);
    haptic.impact('light');
  };

  const handleDelete = () => {
    onDelete(entry.id);
    haptic.notification('success');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, x: -300 }}
      className="relative"
    >
      {/* Swipe background */}
      <motion.div
        style={{ background }}
        className="absolute inset-0 rounded-lg flex items-center justify-end px-4"
      >
        <Trash className="w-6 h-6 text-white" weight="fill" />
      </motion.div>

      {/* Card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -150, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileHover={{ scale: isEditing ? 1 : 1.01 }}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="flex-1 min-h-[40px]"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    className="flex-1 min-h-[40px]"
                  >
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
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(entry.timestamp), "HH:mm")}
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
                        onClick={() => {
                          setIsEditing(true);
                          haptic.impact('light');
                        }}
                        className="h-10 w-10 p-0"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowDeleteConfirm(true);
                          haptic.impact('medium');
                        }}
                        className="h-10 w-10 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <AnimatePresence>
            {showDeleteConfirm && (
              <DeleteConfirmation
                onConfirm={handleDelete}
                onCancel={() => {
                  setShowDeleteConfirm(false);
                  haptic.impact('light');
                }}
              />
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </motion.div>
  );
};

// Day section with grouped entries
const DaySection = ({
  date,
  entries,
  onEdit,
  onDelete
}: {
  date: Date;
  entries: MoodEntry[];
  onEdit: (entry: MoodEntry) => void;
  onDelete: (id: string) => void;
}) => {
  const avgMood = useMemo(() => {
    const sum = entries.reduce((acc, e) => acc + e.moodScore, 0);
    return (sum / entries.length).toFixed(1);
  }, [entries]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Day Header */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h3 className="font-semibold text-sm capitalize">
            {formatDateHeader(date)}
          </h3>
          <p className="text-xs text-muted-foreground">
            {entries.length} {entries.length === 1 ? 'registro' : 'registros'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Média</p>
          <p className="font-bold text-lg">{avgMood}</p>
        </div>
      </div>

      {/* Entries */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {entries.map(entry => (
            <MoodEntryCard
              key={entry.id}
              entry={entry}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

/**
 * MoodHistory - Timeline view with grouped entries by day
 *
 * Features:
 * - Group entries by day with headers
 * - Inline editing (click to edit)
 * - Swipe-to-delete with confirmation
 * - Search and filter capabilities
 * - Responsive loading states
 */
export default function MoodHistory() {
  const { moodEntries, updateMoodEntry, deleteMoodEntry, isLoading } = useMoodEntries();
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Filter and group entries by day
  const groupedEntries = useMemo(() => {
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
    if (searchQuery) {
      filtered = filtered.filter(e =>
        e.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Group by day
    const groups = new Map<string, MoodEntry[]>();
    filtered.forEach(entry => {
      const date = new Date(entry.timestamp);
      date.setHours(0, 0, 0, 0);
      const key = date.getTime().toString();

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    });

    // Sort groups by date (newest first) and entries within groups by time (newest first)
    return Array.from(groups.entries())
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([dateKey, entries]) => ({
        date: new Date(Number(dateKey)),
        entries: entries.sort((a, b) => b.timestamp - a.timestamp)
      }));
  }, [moodEntries, timeFilter, searchQuery]);

  const handleEdit = useCallback(async (entry: MoodEntry) => {
    try {
      await updateMoodEntry(entry.id, {
        moodScore: entry.moodScore,
        anxietyLevel: entry.anxietyLevel,
        energyLevel: entry.energyLevel,
        focusLevel: entry.focusLevel,
        notes: entry.notes
      });
      toast.success('Registro atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar');
      console.error(error);
    }
  }, [updateMoodEntry]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteMoodEntry(id);
      toast.success('Registro deletado');
    } catch (error) {
      toast.error('Erro ao deletar');
      console.error(error);
    }
  }, [deleteMoodEntry]);

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nas notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as any)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
              <TabsTrigger value="today" className="text-xs">Hoje</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">Semana</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">Mês</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-10 w-32" />
                <Card className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        ) : groupedEntries.length === 0 ? (
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
              </div>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {groupedEntries.map(({ date, entries }) => (
              <DaySection
                key={date.getTime()}
                date={date}
                entries={entries}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
