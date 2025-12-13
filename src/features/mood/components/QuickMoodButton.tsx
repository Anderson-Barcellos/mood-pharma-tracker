'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
import { toast } from 'sonner';
import { cn } from '@/shared/utils';
import { useHaptic } from '@/hooks/use-haptic';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import MoodLogForm, { type MoodLogData } from './MoodLogForm';

const getMoodEmoji = (score: number) => {
  if (score >= 9) return { icon: Smiley, color: 'text-green-500', bg: 'bg-green-500', label: 'Excelente' };
  if (score >= 7) return { icon: SmileyWink, color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'Muito Bom' };
  if (score >= 5) return { icon: SmileyMeh, color: 'text-amber-500', bg: 'bg-amber-500', label: 'Neutro' };
  if (score >= 3) return { icon: SmileySad, color: 'text-orange-500', bg: 'bg-orange-500', label: 'Ruim' };
  return { icon: SmileyXEyes, color: 'text-red-500', bg: 'bg-red-500', label: 'Terrível' };
};

export default function QuickMoodButton() {
  const { moodEntries, createMoodEntry } = useMoodEntries();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const haptic = useHaptic();

  const lastMood = useMemo(() => {
    if (moodEntries.length === 0) return null;
    return [...moodEntries].sort((a, b) => b.timestamp - a.timestamp)[0];
  }, [moodEntries]);

  const currentEmoji = lastMood ? getMoodEmoji(lastMood.moodScore) : getMoodEmoji(5);
  const { icon: EmojiIcon, bg } = currentEmoji;

  const handleSubmit = async (data: MoodLogData) => {
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

        <DrawerContent className="px-4 pb-6 max-h-[85vh] overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>Registrar Humor</DrawerTitle>
          </DrawerHeader>
          <MoodLogForm onClose={() => setIsOpen(false)} onSubmit={handleSubmit} />
        </DrawerContent>
      </Drawer>
    );
  }

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
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Humor</DialogTitle>
          </DialogHeader>
          <MoodLogForm onClose={() => setIsOpen(false)} onSubmit={handleSubmit} />
        </DialogContent>
      </Dialog>
    </>
  );
}
