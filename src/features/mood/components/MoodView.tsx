'use client';

import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Check,
  Pencil,
  Trash,
  MagnifyingGlass,
  Smiley,
  SmileyMeh,
  SmileySad,
  SmileyWink,
  SmileyXEyes,
  Brain,
  ArrowsLeftRight,
  Lightning,
  Drop,
  Target
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
import type { MoodEntry } from '@/shared/types';
import MoodLogForm, { type MoodLogData } from './MoodLogForm';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useState(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  });

  return isMobile;
};

const getMoodEmoji = (score: number) => {
  if (score >= 9) return { icon: Smiley, color: 'text-green-500', label: 'Excelente' };
  if (score >= 7) return { icon: SmileyWink, color: 'text-emerald-500', label: 'Muito Bom' };
  if (score >= 5) return { icon: SmileyMeh, color: 'text-amber-500', label: 'Neutro' };
  if (score >= 3) return { icon: SmileySad, color: 'text-orange-500', label: 'Ruim' };
  return { icon: SmileyXEyes, color: 'text-red-500', label: 'Terrível' };
};

const getMoodGradient = (score: number) => {
  if (score >= 7) return 'from-emerald-500/10 to-green-500/5';
  if (score >= 4) return 'from-amber-500/10 to-yellow-500/5';
  return 'from-red-500/10 to-orange-500/5';
};

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
        onValueChange={(vals) => onChange(vals[0])}
        min={1}
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

  const handleCancel = () => {
    setEditedMood(entry.moodScore);
    setEditedNotes(entry.notes || '');
    setIsEditing(false);
  };

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
                      {entry.cognitiveScore !== undefined && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          {entry.cognitiveScore}
                        </span>
                      )}
                      {entry.attentionShift !== undefined && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 flex items-center gap-1">
                          <ArrowsLeftRight className="w-3 h-3" />
                          {entry.attentionShift}
                        </span>
                      )}
                      {entry.anxietyLevel !== undefined && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                          <Drop className="w-3 h-3" />
                          {entry.anxietyLevel}
                        </span>
                      )}
                      {entry.energyLevel !== undefined && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <Lightning className="w-3 h-3" />
                          {entry.energyLevel}
                        </span>
                      )}
                      {entry.focusLevel !== undefined && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {entry.focusLevel}
                        </span>
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

export default function MoodView() {
  const { moodEntries, createMoodEntry, updateMoodEntry, deleteMoodEntry, isLoading } = useMoodEntries();
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const isMobile = useIsMobile();

  const filteredEntries = useMemo(() => {
    let filtered = [...moodEntries];

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

    if (searchQuery) {
      filtered = filtered.filter(e =>
        e.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [moodEntries, timeFilter, searchQuery]);

  const handleQuickLog = useCallback(async (data: MoodLogData) => {
    try {
      await createMoodEntry(data);
      toast.success('Humor registrado com sucesso!');
      setQuickLogOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar registro');
      console.error(error);
    }
  }, [createMoodEntry]);

  const handleEdit = useCallback(async (entry: MoodEntry) => {
    try {
      await updateMoodEntry(entry.id, {
        moodScore: entry.moodScore,
        anxietyLevel: entry.anxietyLevel,
        energyLevel: entry.energyLevel,
        focusLevel: entry.focusLevel,
        cognitiveScore: entry.cognitiveScore,
        attentionShift: entry.attentionShift,
        notes: entry.notes
      });
      toast.success('Registro atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar');
      console.error(error);
    }
  }, [updateMoodEntry]);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Tem certeza que deseja deletar este registro?')) {
      try {
        await deleteMoodEntry(id);
        toast.success('Registro deletado');
      } catch (error) {
        toast.error('Erro ao deletar');
        console.error(error);
      }
    }
  }, [deleteMoodEntry]);

  const QuickLogTrigger = isMobile ? (
    <Drawer open={quickLogOpen} onOpenChange={setQuickLogOpen}>
      <DrawerTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'fixed bottom-6 right-6 z-50',
            'w-14 h-14 rounded-full shadow-lg',
            'bg-primary text-primary-foreground',
            'flex items-center justify-center',
            'hover:shadow-xl transition-shadow'
          )}
        >
          <Plus className="w-6 h-6" weight="bold" />
        </motion.button>
      </DrawerTrigger>
      <DrawerContent className="px-4 pb-6 max-h-[85vh] overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>Registrar Humor</DrawerTitle>
        </DrawerHeader>
        <MoodLogForm onClose={() => setQuickLogOpen(false)} onSubmit={handleQuickLog} />
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={quickLogOpen} onOpenChange={setQuickLogOpen}>
      <Button onClick={() => setQuickLogOpen(true)} size="lg" className="shadow-md">
        <Plus className="w-5 h-5 mr-2" weight="bold" />
        Novo Registro
      </Button>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Humor</DialogTitle>
        </DialogHeader>
        <MoodLogForm onClose={() => setQuickLogOpen(false)} onSubmit={handleQuickLog} />
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Rastreamento de Humor</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitore seu estado emocional ao longo do tempo
          </p>
        </div>
        {!isMobile && QuickLogTrigger}
      </div>

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

          <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as typeof timeFilter)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
              <TabsTrigger value="today" className="text-xs">Hoje</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">Semana</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">Mês</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-full" />
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

      {isMobile && QuickLogTrigger}

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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
