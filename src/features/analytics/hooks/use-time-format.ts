import { useIsMobile } from '@/shared/hooks/use-mobile';
import { format } from 'date-fns';

export type TimeframeType = 'hours' | 'days';

/**
 * Hook for adaptive time formatting in charts
 * - < 24h: Hour only (14:30, 16:00)
 * - 24h - 7d: Date + short hour (21/10 14h)
 * - > 7d: Date only (21/10, 28/10)
 */
export function useTimeFormat(timeframe: TimeframeType = 'days', dayRange: number = 7) {
  const isMobile = useIsMobile();
  const hoursRange = dayRange * 24;

  const formatXAxis = (timestamp: number): string => {
    // Validate timestamp to prevent "Invalid time value" errors
    if (!timestamp || !Number.isFinite(timestamp) || timestamp < 0) {
      return '';
    }

    try {
      // Adaptive formatting based on time range
      if (hoursRange < 24) {
        // < 24h: Only time (14:30, 16:00)
        return format(timestamp, 'HH:mm');
      } else if (hoursRange <= 168) {
        // 24h - 7d: Date + short hour
        if (isMobile) {
          return format(timestamp, 'dd/MM HH\'h\'');
        }
        return format(timestamp, 'dd/MM HH\'h\'');
      } else {
        // > 7d: Only date
        return format(timestamp, 'dd/MM');
      }
    } catch (error) {
      console.warn('Invalid timestamp for formatting:', timestamp, error);
      return '';
    }
  };

  const formatTooltip = (timestamp: number): string => {
    // Validate timestamp to prevent "Invalid time value" errors
    if (!timestamp || !Number.isFinite(timestamp) || timestamp < 0) {
      return '';
    }

    try {
      // Contextual tooltip based on time range
      if (hoursRange < 24) {
        // < 24h: Time with seconds for precision
        return format(timestamp, 'HH:mm:ss');
      } else if (hoursRange <= 168) {
        // 24h - 7d: Date + time
        return format(timestamp, 'dd/MM/yyyy HH:mm');
      } else {
        // > 7d: Full date only
        return format(timestamp, 'dd/MM/yyyy');
      }
    } catch (error) {
      console.warn('Invalid timestamp for tooltip formatting:', timestamp, error);
      return '';
    }
  };

  const getXAxisInterval = (dataLength: number): number => {
    // Target: 6-8 labels maximum for cleaner charts
    const targetLabels = isMobile ? 5 : 7;

    if (dataLength <= targetLabels) {
      return 0; // Show all points
    }

    // Calculate interval to show ~targetLabels points
    return Math.floor(dataLength / targetLabels);
  };

  const getXAxisLabel = (startTime: number, endTime: number, isZoomed: boolean = false): string => {
    // Validate timestamps
    if (!startTime || !endTime || !Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      return 'Tempo';
    }

    try {
      const hoursRange = (endTime - startTime) / (1000 * 60 * 60);
      const prefix = isZoomed ? 'Tempo (zoom: ' : 'Tempo (';

      if (hoursRange < 24) {
        // < 24h: Show date + time
        const start = format(startTime, 'dd/MM HH:mm');
        const end = format(endTime, 'HH:mm');
        return `${prefix}${start} - ${end})`;
      } else if (hoursRange <= 168) {
        // 24h - 7d: Show date with short hour
        const start = format(startTime, 'dd/MM HH\'h\'');
        const end = format(endTime, 'dd/MM HH\'h\'');
        return `${prefix}${start} - ${end})`;
      } else {
        // > 7d: Only date
        const start = format(startTime, 'dd/MM');
        const end = format(endTime, 'dd/MM');
        return `${prefix}${start} - ${end})`;
      }
    } catch (error) {
      console.warn('Invalid timestamp for X-axis label:', startTime, endTime, error);
      return 'Tempo';
    }
  };

  return {
    formatXAxis,
    formatTooltip,
    getXAxisInterval,
    getXAxisLabel,
    isMobile
  };
}
