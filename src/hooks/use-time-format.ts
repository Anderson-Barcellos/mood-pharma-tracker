import { useIsMobile } from '@/shared/hooks/use-mobile';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type TimeframeType = 'hours' | 'days';

export function useTimeFormat(timeframe: TimeframeType = 'days', dayRange: number = 7) {
  const isMobile = useIsMobile();

  const formatXAxis = (timestamp: number): string => {
    if (!timestamp || !Number.isFinite(timestamp) || timestamp < 0) {
      return '';
    }

    try {
      if (timeframe === 'hours') {
        return format(timestamp, 'HH:mm');
      }

      if (isMobile) {
        return format(timestamp, dayRange <= 3 ? 'HH:mm' : 'dd/MM', { locale: ptBR });
      }

      if (dayRange <= 2) {
        return format(timestamp, 'dd/MM HH:mm', { locale: ptBR });
      } else if (dayRange <= 14) {
        return format(timestamp, 'dd/MM', { locale: ptBR });
      } else {
        return format(timestamp, 'dd/MM', { locale: ptBR });
      }
    } catch (error) {
      console.warn('Invalid timestamp for formatting:', timestamp, error);
      return '';
    }
  };

  const formatTooltip = (timestamp: number): string => {
    if (!timestamp || !Number.isFinite(timestamp) || timestamp < 0) {
      return '';
    }

    try {
      return format(timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      console.warn('Invalid timestamp for tooltip formatting:', timestamp, error);
      return '';
    }
  };

  const getXAxisInterval = (dataLength: number): number => {
    if (dataLength <= 0) return 0;
    
    if (timeframe === 'hours') {
      if (isMobile) return Math.max(1, Math.floor(dataLength / 4));
      return Math.max(1, Math.floor(dataLength / 8));
    }
    
    if (dayRange <= 2) {
      if (isMobile) return Math.max(1, Math.floor(dataLength / 6));
      return Math.max(1, Math.floor(dataLength / 12));
    } else if (dayRange <= 7) {
      if (isMobile) return Math.max(1, Math.floor(dataLength / 8));
      return Math.max(1, Math.floor(dataLength / 16));
    } else if (dayRange <= 14) {
      if (isMobile) return Math.max(1, Math.floor(dataLength / 10));
      return Math.max(1, Math.floor(dataLength / 20));
    } else {
      if (isMobile) return Math.max(1, Math.floor(dataLength / 12));
      return Math.max(1, Math.floor(dataLength / 24));
    }
  };

  const getXAxisLabel = (startTime: number, endTime: number, _dayRange?: number): string => {
    if (!startTime || !endTime) return '';
    
    try {
      const start = format(startTime, 'dd/MM', { locale: ptBR });
      const end = format(endTime, 'dd/MM', { locale: ptBR });
      return `${start} - ${end}`;
    } catch {
      return '';
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
