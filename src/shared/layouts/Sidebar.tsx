import { NavigationTab } from './AppLayout';
import {
  ChartLine,
  Pill,
  Smiley,
  Brain,
  CaretLeft,
  CaretRight,
  X,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { cn } from '@/shared/utils';
import { ThemeToggle } from '@/shared/components/ThemeToggle';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isCollapsed: boolean;
  onCollapse?: (collapsed: boolean) => void;
  onClose?: () => void; // For mobile overlay close
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ElementType;
  description: string;
  externalUrl?: string;
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: ChartLine,
    description: 'Overview and quick stats',
  },
  {
    id: 'mood',
    label: 'Mood Logs',
    icon: Smiley,
    description: 'Track your daily mood',
  },
  {
    id: 'medications',
    label: 'Medications',
    icon: Pill,
    description: 'Manage your meds',
  },
  {
    id: 'cognitive',
    label: 'Raven Test',
    icon: Brain,
    description: 'Teste cognitivo externo',
    externalUrl: 'https://ultrassom.ai/raven',
  },
];

export function Sidebar({
  activeTab,
  onTabChange,
  isCollapsed,
  onCollapse,
  onClose,
}: SidebarProps) {
  const handleNavClick = (tab: NavigationTab, externalUrl?: string) => {
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    } else {
      onTabChange(tab);
    }
    if (onClose) onClose();
  };

  return (
    <aside
      className={cn(
        'h-screen bg-card/95 backdrop-blur-xl border-r border-border',
        'transition-all duration-300 ease-in-out',
        'flex flex-col',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Mood & Pharma
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tracker
            </p>
          </motion.div>
        )}

        {isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full flex justify-center"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Pill className="w-5 h-5 text-primary" weight="duotone" />
            </div>
          </motion.div>
        )}

        {/* Close button (mobile only) */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}

        {/* Collapse button (desktop/tablet only) */}
        {onCollapse && !onClose && (
          <button
            onClick={() => onCollapse(!isCollapsed)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <CaretRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <CaretLeft className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id, item.externalUrl)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg',
                'transition-all duration-200 ease-in-out',
                'hover:bg-accent/50 hover:scale-[1.02]',
                'focus:outline-none focus:ring-2 focus:ring-primary/50',
                'group relative',
                isActive
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              {/* Icon */}
              <Icon
                className={cn(
                  'flex-shrink-0 transition-transform',
                  isCollapsed ? 'w-6 h-6' : 'w-5 h-5',
                  isActive && 'scale-110'
                )}
                weight={isActive ? 'fill' : 'regular'}
              />

              {/* Label & Description */}
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 text-left"
                >
                  <div
                    className={cn(
                      'text-sm font-medium',
                      isActive && 'font-semibold'
                    )}
                  >
                    {item.label}
                  </div>
                  <div className="text-xs text-muted-foreground/70 flex items-center gap-1">
                    {item.description}
                    {item.externalUrl && <ArrowSquareOut className="w-3 h-3" />}
                  </div>
                </motion.div>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-6 px-3 py-2 bg-popover border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  <div className="text-sm font-medium text-foreground">
                    {item.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground"
            >
              <p className="font-medium">Theme</p>
            </motion.div>
          )}
          <div className={cn(isCollapsed && "mx-auto")}>
            <ThemeToggle />
          </div>
        </div>

        {!isCollapsed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground text-center mt-3"
          >
            <p>Personal Health Tracker</p>
            <p className="mt-1">v1.0.0</p>
          </motion.div>
        ) : (
          <div className="flex justify-center mt-3">
            <div className="w-2 h-2 rounded-full bg-primary/50" />
          </div>
        )}
      </div>
    </aside>
  );
}
