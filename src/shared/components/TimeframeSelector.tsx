/**
 * TimeframeSelector - Reusable timeframe picker with animations
 *
 * Provides consistent time period selection across all analytics views
 * with smooth animated transitions via Framer Motion.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { cn } from '@/shared/utils';

export type TimeframePeriod = '24h' | '3d' | '7d' | '14d' | '30d' | '90d' | '180d' | '365d' | 'all';

export interface TimeframeOption {
  value: TimeframePeriod;
  label: string;
  days: number | null; // null = 'all'
}

export const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { value: '24h', label: '24 hours', days: 1 },
  { value: '3d', label: '3 days', days: 3 },
  { value: '7d', label: '7 days', days: 7 },
  { value: '14d', label: '14 days', days: 14 },
  { value: '30d', label: '30 days', days: 30 },
  { value: '90d', label: '3 months', days: 90 },
  { value: '180d', label: '6 months', days: 180 },
  { value: '365d', label: '1 year', days: 365 },
  { value: 'all', label: 'All time', days: null },
];

interface TimeframeSelectorProps {
  value: TimeframePeriod;
  onChange: (period: TimeframePeriod) => void;
  className?: string;
  label?: string;
  storageKey?: string; // localStorage key to persist selection
  showLabel?: boolean;
}

export function TimeframeSelector({
  value,
  onChange,
  className,
  label = 'Time Range',
  storageKey,
  showLabel = true,
}: TimeframeSelectorProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  // Persist to localStorage if key provided
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, value);
      } catch (e) {
        console.warn('Failed to persist timeframe:', e);
      }
    }
  }, [value, storageKey]);

  const handleChange = (newValue: string) => {
    setIsAnimating(true);
    onChange(newValue as TimeframePeriod);

    // Reset animation state after transition
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <motion.div
      className={cn('space-y-2', className)}
      initial={false}
      animate={{ opacity: isAnimating ? 0.7 : 1 }}
      transition={{ duration: 0.15 }}
    >
      {showLabel && <Label htmlFor="timeframe-select">{label}</Label>}
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger id="timeframe-select" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIMEFRAME_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </motion.div>
  );
}

/**
 * Get days from timeframe period
 */
export function getTimeframeDays(period: TimeframePeriod): number | null {
  const option = TIMEFRAME_OPTIONS.find(opt => opt.value === period);
  return option?.days ?? null;
}

/**
 * Get timestamp range from timeframe
 */
export function getTimeframeRange(period: TimeframePeriod, endTime: number = Date.now()): {
  startTime: number;
  endTime: number;
  days: number | null;
} {
  const days = getTimeframeDays(period);

  if (days === null) {
    // 'all' - return epoch to now
    return {
      startTime: 0,
      endTime,
      days: null,
    };
  }

  const startTime = endTime - (days * 24 * 60 * 60 * 1000);

  return {
    startTime,
    endTime,
    days,
  };
}

/**
 * Hook to load persisted timeframe from localStorage
 */
export function usePersistedTimeframe(
  storageKey: string,
  defaultValue: TimeframePeriod = '7d'
): TimeframePeriod {
  const [timeframe, setTimeframe] = useState<TimeframePeriod>(() => {
    if (!storageKey) return defaultValue;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && TIMEFRAME_OPTIONS.some(opt => opt.value === stored)) {
        return stored as TimeframePeriod;
      }
    } catch (e) {
      console.warn('Failed to load persisted timeframe:', e);
    }

    return defaultValue;
  });

  return timeframe;
}
