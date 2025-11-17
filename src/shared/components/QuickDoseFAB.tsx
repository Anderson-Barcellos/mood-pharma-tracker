import { useState } from 'react';
import { Pill } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/shared/utils';
import { QuickDoseModal } from '@/features/doses/components/QuickDoseModal';

interface QuickDoseFABProps {
  className?: string;
}

export function QuickDoseFAB({ className }: QuickDoseFABProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* FAB Button */}
      <motion.button
        onClick={() => setIsModalOpen(true)}
        className={cn(
          // Base styles
          'fixed z-40 flex items-center justify-center',
          'rounded-full shadow-lg backdrop-blur-md',
          'transition-all duration-300',

          // Glassmorphism
          'bg-gradient-to-br from-blue-500/80 to-indigo-600/80',
          'border border-white/20',
          'dark:from-blue-600/70 dark:to-indigo-700/70',
          'dark:border-white/10',

          // Glow effect
          'shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)]',
          'dark:shadow-[0_0_30px_-5px_rgba(59,130,246,0.6)]',

          // Hover effects
          'hover:shadow-[0_0_40px_-5px_rgba(59,130,246,0.7)]',
          'hover:scale-110',
          'active:scale-95',

          // Size
          'size-14 lg:size-16',

          // Position: bottom-center on mobile, bottom-right on desktop
          'bottom-20 left-1/2 -translate-x-1/2',
          'lg:bottom-8 lg:right-8 lg:left-auto lg:translate-x-0',

          className
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Quick dose logger"
      >
        <Pill className="size-6 lg:size-7 text-white" weight="fill" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <QuickDoseModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
