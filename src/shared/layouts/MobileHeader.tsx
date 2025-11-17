import { List, Pill } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/shared/components/ThemeToggle';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-card/95 backdrop-blur-xl border-b border-border lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Menu Button */}
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-accent rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Open menu"
        >
          <List className="w-6 h-6 text-foreground" weight="bold" />
        </button>

        {/* App Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Pill className="w-5 h-5 text-primary" weight="duotone" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight text-foreground leading-none">
              Mood & Pharma
            </h1>
            <p className="text-xs text-muted-foreground leading-none mt-0.5">
              Tracker
            </p>
          </div>
        </motion.div>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
