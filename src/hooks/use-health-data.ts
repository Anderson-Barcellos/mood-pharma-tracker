import { useLiveQuery } from 'dexie-react-hooks';
import { healthDb } from '@/features/health-data/core/health-database';
import type {
  BaseHealthRecord,
  HeartRateRecord,
  ActivityRecord,
  HealthSession,
  HealthCorrelation,
  HealthInsight
} from '@/features/health-data/core/types';

/**
 * Hook to fetch heart rate data within a time range
 */
export function useHeartRateData(startTime: number, endTime: number) {
  return useLiveQuery(async () => {
    try {
      const records = await healthDb.healthRecords
        .where('type')
        .equals('heart-rate')
        .and((r) => r.timestamp >= startTime && r.timestamp <= endTime)
        .toArray();

      return records as HeartRateRecord[];
    } catch (error) {
      console.error('Error fetching heart rate data:', error);
      return [];
    }
  }, [startTime, endTime]);
}

/**
 * Hook to fetch all health records within a time range
 */
export function useHealthRecords(startTime: number, endTime: number, type?: string) {
  return useLiveQuery(async () => {
    try {
      let query = healthDb.healthRecords.toArray();

      const records = await query;

      return records.filter((r) => {
        const inTimeRange = r.timestamp >= startTime && r.timestamp <= endTime;
        const matchesType = !type || r.type === type;
        return inTimeRange && matchesType;
      });
    } catch (error) {
      console.error('Error fetching health records:', error);
      return [];
    }
  }, [startTime, endTime, type]);
}

/**
 * Hook to fetch health sessions for a date range
 */
export function useHealthSessions(startDate?: Date, endDate?: Date) {
  return useLiveQuery(async () => {
    try {
      const sessions = await healthDb.healthSessions.orderBy('date').toArray();

      if (!startDate && !endDate) return sessions;

      const startStr = startDate?.toISOString().split('T')[0];
      const endStr = endDate?.toISOString().split('T')[0];

      return sessions.filter((session) => {
        if (startStr && session.date < startStr) return false;
        if (endStr && session.date > endStr) return false;
        return true;
      });
    } catch (error) {
      console.error('Error fetching health sessions:', error);
      return [];
    }
  }, [startDate?.getTime(), endDate?.getTime()]);
}

/**
 * Hook to fetch significant health correlations
 */
export function useHealthCorrelations(
  maxSignificance: number = 0.05,
  minCorrelation: number = 0.3
) {
  return useLiveQuery(async () => {
    try {
      const correlations = await healthDb.healthCorrelations.toArray();

      return correlations
        .filter((corr) =>
          corr.significance <= maxSignificance &&
          Math.abs(corr.correlation) >= minCorrelation
        )
        .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    } catch (error) {
      console.error('Error fetching correlations:', error);
      return [];
    }
  }, [maxSignificance, minCorrelation]);
}

/**
 * Hook to fetch recent health insights
 */
export function useHealthInsights(limit: number = 10) {
  return useLiveQuery(async () => {
    try {
      return await healthDb.healthInsights
        .orderBy('createdAt')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('Error fetching insights:', error);
      return [];
    }
  }, [limit]);
}

/**
 * Hook to fetch activity data within a time range
 */
export function useActivityData(startTime: number, endTime: number) {
  return useLiveQuery(async () => {
    try {
      const records = await healthDb.healthRecords
        .where('type')
        .equals('activity')
        .and((r) => r.timestamp >= startTime && r.timestamp <= endTime)
        .toArray();

      return records as ActivityRecord[];
    } catch (error) {
      console.error('Error fetching activity data:', error);
      return [];
    }
  }, [startTime, endTime]);
}

/**
 * Hook to get aggregated heart rate metrics for chart display
 * Groups heart rate data by time buckets for smoother visualization
 */
export function useHeartRateChartData(
  startTime: number,
  endTime: number,
  bucketSizeMs: number = 3600000 // 1 hour default
) {
  return useLiveQuery(async () => {
    try {
      const records = await healthDb.healthRecords
        .where('type')
        .equals('heart-rate')
        .and((r) => r.timestamp >= startTime && r.timestamp <= endTime)
        .toArray();

      if (records.length === 0) return [];

      // Group by time buckets
      const buckets: Record<number, { sum: number; count: number; min: number; max: number }> = {};

      (records as HeartRateRecord[]).forEach((record) => {
        const bucketTime = Math.floor(record.timestamp / bucketSizeMs) * bucketSizeMs;

        if (!buckets[bucketTime]) {
          buckets[bucketTime] = {
            sum: 0,
            count: 0,
            min: Infinity,
            max: -Infinity
          };
        }

        buckets[bucketTime].sum += record.heartRate;
        buckets[bucketTime].count += 1;
        buckets[bucketTime].min = Math.min(buckets[bucketTime].min, record.heartRate);
        buckets[bucketTime].max = Math.max(buckets[bucketTime].max, record.heartRate);
      });

      // Convert to chart data format
      return Object.entries(buckets)
        .map(([timestamp, data]) => ({
          timestamp: parseInt(timestamp),
          heartRate: Math.round(data.sum / data.count),
          heartRateMin: data.min,
          heartRateMax: data.max,
          count: data.count
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Error fetching heart rate chart data:', error);
      return [];
    }
  }, [startTime, endTime, bucketSizeMs]);
}

/**
 * Hook to get health summary statistics
 */
export function useHealthSummary() {
  return useLiveQuery(async () => {
    try {
      const [records, sessions] = await Promise.all([
        healthDb.healthRecords.toArray(),
        healthDb.healthSessions.toArray()
      ]);

      // Count records by type
      const recordsByType: Record<string, number> = {};
      records.forEach((record) => {
        recordsByType[record.type] = (recordsByType[record.type] || 0) + 1;
      });

      // Calculate date range
      let dateRange = null;
      if (sessions.length > 0) {
        const sortedSessions = sessions.sort((a, b) => a.date.localeCompare(b.date));
        dateRange = {
          start: sortedSessions[0].date,
          end: sortedSessions[sortedSessions.length - 1].date
        };
      }

      // Latest session
      const latestSession = sessions.length > 0
        ? sessions.sort((a, b) => b.createdAt - a.createdAt)[0]
        : null;

      // Average health score
      const averageHealthScore = sessions.length > 0
        ? Math.round(sessions.reduce((sum, s) => sum + s.overallScore, 0) / sessions.length)
        : 0;

      return {
        totalRecords: records.length,
        totalSessions: sessions.length,
        dateRange,
        recordsByType,
        latestSession,
        averageHealthScore
      };
    } catch (error) {
      console.error('Error fetching health summary:', error);
      return {
        totalRecords: 0,
        totalSessions: 0,
        dateRange: null,
        recordsByType: {},
        latestSession: null,
        averageHealthScore: 0
      };
    }
  }, []);
}
