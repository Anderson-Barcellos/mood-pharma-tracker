import { useIsMobile } from './use-mobile';
import { format } from 'date-fns';

export type TimeframeType = 'hours' | 'days';

export function useTimeFormat(timeframe: TimeframeType = 'days', dayRange: number = 7) {
  const isMobile = useIsMobile();

  const formatXAxis = (timestamp: number): string => {
    if (timeframe === 'hours') {
      return format(timestamp, 'HH:mm');
    }
    
    if (isMobile) {
      return format(timestamp, dayRange <= 3 ? 'HH:mm' : 'MMM d');
    }
    
    if (dayRange <= 2) {
      return format(timestamp, 'MMM d, HH:mm');
    } else if (dayRange <= 14) {
      return format(timestamp, 'MMM d');
    } else {
      return format(timestamp, 'MMM d');
    }
  };

  const formatTooltip = (timestamp: number): string => {
    if (timeframe === 'hours' || dayRange <= 3) {
      return format(timestamp, 'MMM d, yyyy HH:mm');
    }
    return format(timestamp, 'MMM d, yyyy HH:mm');
  };

  const getXAxisInterval = (dataLength: number): number => {
    if (timeframe === 'hours') {
      if (isMobile) return Math.floor(dataLength / 4);
      return Math.floor(dataLength / 8);
    }
    
    if (dayRange <= 2) {
      if (isMobile) return Math.floor(dataLength / 6);
      return Math.floor(dataLength / 12);
    } else if (dayRange <= 7) {
      if (isMobile) return Math.floor(dataLength / 8);
      return Math.floor(dataLength / 16);
    } else if (dayRange <= 14) {
      if (isMobile) return Math.floor(dataLength / 10);
      return Math.floor(dataLength / 20);
    } else {
      if (isMobile) return Math.floor(dataLength / 12);
      return Math.floor(dataLength / 24);
    }
  };

  return {
    formatXAxis,
    formatTooltip,
    getXAxisInterval,
    isMobile
  };
}
