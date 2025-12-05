import Dexie, { type Table } from 'dexie';
import { 
  BaseHealthRecord, 
  HealthSession, 
  HealthCorrelation, 
  HealthInsight,
  HeartRateRecord,
  ActivityRecord
} from './types';

/**
 * Extended database for health data storage
 * Extends the main MoodPharmaDatabase with health-specific tables
 */
class HealthDatabase extends Dexie {
  // Health data tables
  healthRecords!: Table<BaseHealthRecord, string>;
  healthSessions!: Table<HealthSession, string>;
  healthCorrelations!: Table<HealthCorrelation, string>;
  healthInsights!: Table<HealthInsight, string>;

  constructor() {
    super('MoodPharmaHealthDB');

    // Version 1: Initial health data schema
    this.version(1).stores({
      healthRecords: 'id, type, timestamp, source, createdAt, [type+timestamp]',
      healthSessions: 'id, date, period, overallScore, createdAt',
      healthCorrelations: 'id, variable1, variable2, correlation, significance, createdAt',
      healthInsights: 'id, type, confidence, actionable, createdAt'
    });
  }
}

export const healthDb = new HealthDatabase();

/**
 * Health data service for managing health records and sessions
 */
export class HealthDataService {
  
  /**
   * Save multiple health records efficiently
   */
  static async saveHealthRecords(records: BaseHealthRecord[]): Promise<void> {
    try {
      await healthDb.healthRecords.bulkPut(records);
      console.log(`💾 ${records.length} registros de saúde salvos`);
    } catch (error) {
      console.error('Erro salvando registros de saúde:', error);
      throw error;
    }
  }

  /**
   * Save health sessions
   */
  static async saveHealthSessions(sessions: HealthSession[]): Promise<void> {
    try {
      await healthDb.healthSessions.bulkPut(sessions);
      console.log(`💾 ${sessions.length} sessões de saúde salvas`);
    } catch (error) {
      console.error('Erro salvando sessões de saúde:', error);
      throw error;
    }
  }

  /**
   * Save correlations and insights
   */
  static async saveAnalytics(
    correlations: HealthCorrelation[],
    insights: HealthInsight[]
  ): Promise<void> {
    try {
      if (correlations.length > 0) {
        await healthDb.healthCorrelations.bulkPut(correlations);
        console.log(`💾 ${correlations.length} correlações salvas`);
      }
      
      if (insights.length > 0) {
        await healthDb.healthInsights.bulkPut(insights);
        console.log(`💾 ${insights.length} insights salvos`);
      }
    } catch (error) {
      console.error('Erro salvando analytics:', error);
      throw error;
    }
  }

  /**
   * Get health records by type and date range
   */
  static async getHealthRecords(
    type?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<BaseHealthRecord[]> {
    try {
      let query = healthDb.healthRecords.orderBy('timestamp');

      if (type) {
        query = healthDb.healthRecords.where('type').equals(type);
      }

      let records = await query.toArray();

      // Filter by date range if specified
      if (startDate || endDate) {
        const startTime = startDate?.getTime() || 0;
        const endTime = endDate?.getTime() || Date.now();
        
        records = records.filter(record => 
          record.timestamp >= startTime && record.timestamp <= endTime
        );
      }

      return records;
    } catch (error) {
      console.error('Erro buscando registros de saúde:', error);
      return [];
    }
  }

  /**
   * Get health sessions by date range
   */
  static async getHealthSessions(startDate?: Date, endDate?: Date): Promise<HealthSession[]> {
    try {
      const sessions = await healthDb.healthSessions.orderBy('date').toArray();
      
      if (!startDate && !endDate) return sessions;

      const startStr = startDate?.toISOString().split('T')[0];
      const endStr = endDate?.toISOString().split('T')[0];

      return sessions.filter(session => {
        if (startStr && session.date < startStr) return false;
        if (endStr && session.date > endStr) return false;
        return true;
      });
    } catch (error) {
      console.error('Erro buscando sessões de saúde:', error);
      return [];
    }
  }

  /**
   * Get recent insights
   */
  static async getRecentInsights(limit: number = 10): Promise<HealthInsight[]> {
    try {
      return await healthDb.healthInsights
        .orderBy('createdAt')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('Erro buscando insights:', error);
      return [];
    }
  }

  /**
   * Get correlations by significance threshold
   */
  static async getSignificantCorrelations(
    maxSignificance: number = 0.05,
    minCorrelation: number = 0.3
  ): Promise<HealthCorrelation[]> {
    try {
      const correlations = await healthDb.healthCorrelations.toArray();
      
      return correlations.filter(corr => 
        corr.significance <= maxSignificance && 
        Math.abs(corr.correlation) >= minCorrelation
      ).sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    } catch (error) {
      console.error('Erro buscando correlações:', error);
      return [];
    }
  }

  /**
   * Get health summary statistics
   */
  static async getHealthSummary(): Promise<{
    totalRecords: number;
    totalSessions: number;
    dateRange: { start: string; end: string } | null;
    recordsByType: Record<string, number>;
    latestSession: HealthSession | null;
    averageHealthScore: number;
  }> {
    try {
      const [records, sessions] = await Promise.all([
        healthDb.healthRecords.toArray(),
        healthDb.healthSessions.toArray()
      ]);

      // Count records by type
      const recordsByType: Record<string, number> = {};
      records.forEach(record => {
        recordsByType[record.type] = (recordsByType[record.type] || 0) + 1;
      });

      // Calculate date range
      let dateRange: { start: string; end: string } | null = null;
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
      console.error('Erro gerando resumo de saúde:', error);
      return {
        totalRecords: 0,
        totalSessions: 0,
        dateRange: null,
        recordsByType: {},
        latestSession: null,
        averageHealthScore: 0
      };
    }
  }

  /**
   * Clear all health data (for testing/reset)
   */
  static async clearAllHealthData(): Promise<void> {
    try {
      await Promise.all([
        healthDb.healthRecords.clear(),
        healthDb.healthSessions.clear(),
        healthDb.healthCorrelations.clear(),
        healthDb.healthInsights.clear()
      ]);
      console.log('🗑️ Todos os dados de saúde foram limpos');
    } catch (error) {
      console.error('Erro limpando dados de saúde:', error);
      throw error;
    }
  }

  /**
   * Export all health data
   */
  static async exportHealthData(): Promise<{
    records: BaseHealthRecord[];
    sessions: HealthSession[];
    correlations: HealthCorrelation[];
    insights: HealthInsight[];
  }> {
    try {
      const [records, sessions, correlations, insights] = await Promise.all([
        healthDb.healthRecords.toArray(),
        healthDb.healthSessions.toArray(),
        healthDb.healthCorrelations.toArray(),
        healthDb.healthInsights.toArray()
      ]);

      return { records, sessions, correlations, insights };
    } catch (error) {
      console.error('Erro exportando dados de saúde:', error);
      throw error;
    }
  }

  /**
   * Import health data (for sync/restore)
   */
  static async importHealthData(data: {
    records?: BaseHealthRecord[];
    sessions?: HealthSession[];
    correlations?: HealthCorrelation[];
    insights?: HealthInsight[];
  }): Promise<void> {
    try {
      const promises: Promise<any>[] = [];

      if (data.records) {
        promises.push(healthDb.healthRecords.bulkPut(data.records));
      }
      if (data.sessions) {
        promises.push(healthDb.healthSessions.bulkPut(data.sessions));
      }
      if (data.correlations) {
        promises.push(healthDb.healthCorrelations.bulkPut(data.correlations));
      }
      if (data.insights) {
        promises.push(healthDb.healthInsights.bulkPut(data.insights));
      }

      await Promise.all(promises);
      console.log('📥 Dados de saúde importados com sucesso');
    } catch (error) {
      console.error('Erro importando dados de saúde:', error);
      throw error;
    }
  }
}