import { NavigationTab } from './AppLayout';
import { ChartLine, Pill, Smiley, Brain, ArrowSquareOut } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { cn } from '@/shared/utils';

interface BottomNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ElementType;
  externalUrl?: string;
}

// Mobile navigation items (now includes Cognitive!)
const mobileNavItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: ChartLine,
  },
  {
    id: 'mood',
    label: 'Mood',
    icon: Smiley,
  },
  {
    id: 'medications',
    label: 'Meds',
    icon: Pill,
  },
  {
    id: 'cognitive',
    label: 'Raven',
    icon: Brain,
    externalUrl: 'https://ultrassom.ai/raven',
  },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden"
      role="navigation"
      aria-label="Bottom navigation"
    >
      {/* Glassmorphism background with gradient */}
      <div className="relative">
        {/* Background blur layer */}
        <div className="absolute inset-0 bg-card/95 backdrop-blur-xl border-t border-border" />

        {/* Safe area padding for iOS notch */}
        <div className="relative pb-safe">
          <div className="grid grid-cols-4 gap-0 px-1 pt-2 pb-3">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              const handleClick = () => {
                if (item.externalUrl) {
                  window.open(item.externalUrl, '_blank', 'noopener,noreferrer');
                } else {
                  onTabChange(item.id);
                }
              };

              return (
                <button
                  key={item.id}
                  onClick={handleClick}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-lg',
                    'transition-all duration-200 ease-in-out',
                    'hover:bg-accent/50 active:scale-95',
                    'focus:outline-none focus:ring-2 focus:ring-primary/50',
                    'relative',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeBottomTab"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-b-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  {/* Icon with background glow when active */}
                  <div className="relative">
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 bg-primary/20 blur-xl rounded-full"
                      />
                    )}
                    <Icon
                      className={cn(
                        'relative z-10 transition-all',
                        isActive ? 'w-6 h-6 scale-110' : 'w-5 h-5'
                      )}
                      weight={isActive ? 'fill' : 'regular'}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      'text-xs transition-all',
                      isActive ? 'font-semibold scale-105' : 'font-medium'
                    )}
                  >
                    {item.label}
                  </span>

                  {/* External link indicator */}
                  {item.externalUrl && (
                    <ArrowSquareOut className="absolute top-1 right-1 w-3 h-3 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
