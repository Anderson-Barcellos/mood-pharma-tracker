'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Plus,
  Check,
  X,
  Smiley,
  SmileyMeh,
  SmileySad,
  SmileyWink,
  SmileyXEyes
} from '@phosphor-icons/react';
import { useMoodEntries } from '@/hooks/use-mood-entries';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/shared/ui/drawer';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Slider } from '@/shared/ui/slider';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/shared/utils';
import { parseLocalDateTime } from '@/shared/utils/date-helpers';
import { useHaptic } from '@/hooks/use-haptic';
import { useIsMobile } from '@/shared/hooks/use-mobile';

// Emoji mapping for mood scores
const getMoodEmoji = (score: number) => {
  if (score >= 9) return { icon: Smiley, color: 'text-green-500', bg: 'bg-green-500', label: 'Excelente' };
  if (score >= 7) return { icon: SmileyWink, color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'Muito Bom' };
  if (score >= 5) return { icon: SmileyMeh, color: 'text-amber-500', bg: 'bg-amber-500', label: 'Neutro' };
  if (score >= 3) return { icon: SmileySad, color: 'text-orange-500', bg: 'bg-orange-500', label: 'Ruim' };
  return { icon: SmileyXEyes, color: 'text-red-500', bg: 'bg-red-500', label: 'Terrível' };
};

// Mood Slider Component with reactive emoji
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

// Quick Log Form Component
const QuickLogForm = ({
  onClose,
  onSubmit
}: {
  onClose: () => void;
  onSubmit: (data: any) => void;
}) => {
  const [moodScore, setMoodScore] = useState(5);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [notes, setNotes] = useState('');
  const haptic = useHaptic();

  const handleSubmit = () => {
    try {
      const timestamp = parseLocalDateTime(date, time);
      onSubmit({
        timestamp,
        moodScore,
        notes: notes.trim() || undefined
      });
      haptic.notification('success');
    } catch (error) {
      toast.error('Invalid date/time', {
        description: error instanceof Error ? error.message : 'Please check the date and time fields'
      });
    }
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

      <div className="space-y-2">
        <Label className="text-sm">Notas (opcional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Como você está se sentindo? O que aconteceu hoje?"
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={() => {
            haptic.impact('light');
            onClose();
          }}
          className="flex-1 min-h-[48px]"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1 min-h-[48px]"
        >
          <Check className="w-4 h-4 mr-2" />
          Salvar
        </Button>
      </div>
    </motion.div>
  );
};

/**
 * QuickMoodButton - Floating Action Button for quick mood logging
 *
 * Features:
 * - Dynamic emoji based on last mood entry
 * - Mobile: Bottom-right FAB with drawer
 * - Desktop: Regular button with dialog
 * - Haptic feedback on interactions
 * - Touch-friendly 48px minimum target
 */
export default function QuickMoodButton() {
  const { moodEntries, createMoodEntry } = useMoodEntries();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const haptic = useHaptic();

  // Get the last mood entry to show appropriate emoji
  const lastMood = useMemo(() => {
    if (moodEntries.length === 0) return null;
    return [...moodEntries].sort((a, b) => b.timestamp - a.timestamp)[0];
  }, [moodEntries]);

  const currentEmoji = lastMood ? getMoodEmoji(lastMood.moodScore) : getMoodEmoji(5);
  const { icon: EmojiIcon, bg } = currentEmoji;

  const handleSubmit = async (data: any) => {
    try {
      await createMoodEntry(data);
      toast.success('Humor registrado com sucesso!');
      setIsOpen(false);
      haptic.notification('success');
    } catch (error) {
      toast.error('Erro ao salvar registro');
      haptic.notification('error');
      console.error(error);
    }
  };

  const handleOpen = () => {
    haptic.impact('medium');
    setIsOpen(true);
  };

  // Mobile: FAB with Drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <motion.button
          onClick={handleOpen}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'fixed bottom-6 right-6 z-50',
            'w-14 h-14 rounded-full shadow-lg',
            'flex items-center justify-center',
            'hover:shadow-xl transition-all duration-300',
            'bg-gradient-to-br',
            bg,
            'text-white'
          )}
          aria-label="Quick mood log"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={lastMood?.id || 'default'}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <EmojiIcon className="w-7 h-7" weight="fill" />
            </motion.div>
          </AnimatePresence>
        </motion.button>

        <DrawerContent className="px-4 pb-6">
          <DrawerHeader>
            <DrawerTitle>Registrar Humor</DrawerTitle>
          </DrawerHeader>
          <QuickLogForm onClose={() => setIsOpen(false)} onSubmit={handleSubmit} />
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Button with Dialog
  return (
    <>
      <Button
        onClick={handleOpen}
        size="lg"
        className="shadow-md gap-2 min-h-[48px]"
      >
        <EmojiIcon className="w-5 h-5" weight="fill" />
        Novo Registro
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Humor</DialogTitle>
          </DialogHeader>
          <QuickLogForm onClose={() => setIsOpen(false)} onSubmit={handleSubmit} />
        </DialogContent>
      </Dialog>
    </>
  );
}
