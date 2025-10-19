import { useIsMobile } from './use-mobile';
import { format } from 'date-fns';

export function useTimeFormat() {
  const isMobile = useIsMobile();

  const formatXAxis = (timestamp: number): string => {
    if (isMobile) {
      return format(timestamp, 'HH:mm');
    }
    return format(timestamp, 'MMM d, HH:mm');
  };

  const formatTooltip = (timestamp: number): string => {
    return format(timestamp, 'MMM d, yyyy HH:mm');
  };

  const getXAxisInterval = (dataLength: number): number => {
    if (isMobile) {
      return Math.floor(dataLength / 6);
    }
    return Math.floor(dataLength / 12);
  };

  return {
    formatXAxis,
    formatTooltip,
    getXAxisInterval,
    isMobile
  };
}
