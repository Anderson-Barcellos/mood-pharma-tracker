import { readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import { HeartRateParser } from '../heart-rate/parser';
import { ActivityParser } from '../activity/parser';
import { SamsungHealthParser } from '../../sleep/services/samsung-health-parser';
import { CorrelationEngine } from './correlation-engine';
import { 
  HeartRateRecord, 
  ActivityRecord, 
  HealthSession, 
  HealthCorrelation,
  HealthInsight,
  HealthDataExport
} from './types';

export class HealthDataProcessor {
  private static readonly DATA_PATH = '/root/CODEX/mood-pharma-tracker/HEALTH_DATA';
  private static readonly OUTPUT_PATH = '/root/CODEX/mood-pharma-tracker/public/data/health';

  /**
   * Process all Samsung Health CSV files in the HEALTH_DATA directory
   */
  static async processAllHealthData(): Promise<HealthDataExport> {
    console.log('🏥 Iniciando processamento completo dos dados de saúde...');
    
    // Ensure output directory exists
    await this.ensureOutputDirectory();
    
    // Read all CSV files
    const csvFiles = await this.findCsvFiles();
    console.log(`📁 Encontrados ${csvFiles.length} arquivos CSV`);
    
    // Initialize data containers
    const heartRateRecords: HeartRateRecord[] = [];
    const activityRecords: ActivityRecord[] = [];
    const sleepSessions: any[] = [];
    
    // Process each file
    for (const file of csvFiles) {
      console.log(`\n📊 Processando ${file}...`);
      
      try {
        const content = await readFile(join(this.DATA_PATH, file), 'utf-8');
        
        if (this.isHeartRateFile(file)) {
          const parser = new HeartRateParser();
          const records = parser.parseCSV(content);
          heartRateRecords.push(...records);
          console.log(`❤️ ${records.length} registros de frequência cardíaca processados`);
          
        } else if (this.isActivityFile(file)) {
          const parser = new ActivityParser();
          const records = parser.parseCSV(content);
          activityRecords.push(...records);
          console.log(`🏃 ${records.length} registros de atividade processados`);
          
        } else if (this.isSleepFile(file)) {
          const session = SamsungHealthParser.parseSleepCSV(content);
          sleepSessions.push(session);
          console.log(`😴 Sessão de sono processada: ${session.date}`);
        }
        
      } catch (error) {
        console.error(`❌ Erro processando ${file}:`, error);
      }
    }
    
    // Create health sessions (daily aggregations)
    const healthSessions = await this.createHealthSessions(
      heartRateRecords, 
      activityRecords, 
      sleepSessions
    );
    
    console.log(`\n📈 ${healthSessions.length} sessões de saúde criadas`);
    
    // Calculate correlations (placeholder for now - would need mood data)
    const correlations: HealthCorrelation[] = [];
    const insights: HealthInsight[] = [];
    
    // Create export object
    const exportData: HealthDataExport = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      dataTypes: ['heart-rate', 'activity', 'sleep'],
      sessions: healthSessions,
      records: [...heartRateRecords, ...activityRecords],
      correlations,
      insights
    };
    
    // Save processed data
    await this.saveProcessedData(exportData);
    
    // Generate summary report
    this.generateSummaryReport(exportData);
    
    return exportData;
  }
  
  /**
   * Create daily health sessions by aggregating records
   */
  private static async createHealthSessions(
    heartRateRecords: HeartRateRecord[],
    activityRecords: ActivityRecord[],
    sleepSessions: any[]
  ): Promise<HealthSession[]> {
    // Group records by date
    const recordsByDate = new Map<string, {
      heartRate: HeartRateRecord[];
      activity: ActivityRecord[];
      sleep?: any;
    }>();
    
    // Group heart rate records by date
    heartRateRecords.forEach(record => {
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      if (!recordsByDate.has(date)) {
        recordsByDate.set(date, { heartRate: [], activity: [] });
      }
      recordsByDate.get(date)!.heartRate.push(record);
    });
    
    // Group activity records by date
    activityRecords.forEach(record => {
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      if (!recordsByDate.has(date)) {
        recordsByDate.set(date, { heartRate: [], activity: [] });
      }
      recordsByDate.get(date)!.activity.push(record);
    });
    
    // Add sleep sessions
    sleepSessions.forEach(session => {
      const date = session.date.split(' ')[0]; // Extract date part
      const existing = recordsByDate.get(date);
      if (existing) {
        existing.sleep = session;
      } else {
        recordsByDate.set(date, { 
          heartRate: [], 
          activity: [], 
          sleep: session 
        });
      }
    });
    
    // Create health sessions
    const sessions: HealthSession[] = [];
    
    for (const [date, records] of recordsByDate.entries()) {
      const session: HealthSession = {
        id: `health-session-${date}`,
        date,
        period: 'daily',
        overallScore: 0,
        createdAt: Date.now()
      };
      
      // Calculate heart rate metrics
      if (records.heartRate.length > 0) {
        session.heartRateMetrics = HeartRateParser.calculateMetrics(records.heartRate);
      }
      
      // Calculate activity metrics
      if (records.activity.length > 0) {
        session.activityMetrics = ActivityParser.calculateMetrics(records.activity);
      }
      
      // Add sleep metrics
      if (records.sleep) {
        session.sleepMetrics = records.sleep.metrics;
      }
      
      // Calculate overall health score
      session.overallScore = CorrelationEngine.calculateHealthScore(session);
      
      sessions.push(session);
    }
    
    return sessions.sort((a, b) => a.date.localeCompare(b.date));
  }
  
  /**
   * Determine file type based on filename and content
   */
  private static isHeartRateFile(filename: string): boolean {
    return filename.toLowerCase().includes('frequência') || 
           filename.toLowerCase().includes('cardíaca') ||
           filename.toLowerCase().includes('heart');
  }
  
  private static isActivityFile(filename: string): boolean {
    return filename.toLowerCase().includes('passos') || 
           filename.toLowerCase().includes('steps') ||
           filename.toLowerCase().includes('atividade') ||
           filename.toLowerCase().includes('activity') ||
           filename.toLowerCase().includes('generic');
  }
  
  private static isSleepFile(filename: string): boolean {
    return filename.toLowerCase().includes('dormir') || 
           filename.toLowerCase().includes('sono') ||
           filename.toLowerCase().includes('sleep');
  }
  
  /**
   * Find all CSV files in the data directory
   */
  private static async findCsvFiles(): Promise<string[]> {
    try {
      const files = await readdir(this.DATA_PATH);
      return files.filter(file => file.toLowerCase().endsWith('.csv'));
    } catch (error) {
      console.error('Erro lendo diretório de dados:', error);
      return [];
    }
  }
  
  /**
   * Ensure output directory exists
   */
  private static async ensureOutputDirectory(): Promise<void> {
    try {
      const { mkdir } = await import('fs').then(m => m.promises);
      await mkdir(this.OUTPUT_PATH, { recursive: true });
    } catch (error) {
      console.warn('Erro criando diretório de saída:', error);
    }
  }
  
  /**
   * Save all processed data to files
   */
  private static async saveProcessedData(data: HealthDataExport): Promise<void> {
    // Save main export file
    await writeFile(
      join(this.OUTPUT_PATH, 'health-data-export.json'),
      JSON.stringify(data, null, 2)
    );
    
    // Save individual data types
    if (data.sessions.length > 0) {
      await writeFile(
        join(this.OUTPUT_PATH, 'health-sessions.json'),
        JSON.stringify(data.sessions, null, 2)
      );
    }
    
    // Save session index
    const sessionIndex = {
      sessions: data.sessions.map(s => s.date),
      totalSessions: data.sessions.length,
      dateRange: {
        start: data.sessions[0]?.date,
        end: data.sessions[data.sessions.length - 1]?.date
      },
      lastUpdated: Date.now()
    };
    
    await writeFile(
      join(this.OUTPUT_PATH, 'sessions-index.json'),
      JSON.stringify(sessionIndex, null, 2)
    );
    
    console.log(`💾 Dados salvos em ${this.OUTPUT_PATH}/`);
  }
  
  /**
   * Generate and display summary report
   */
  private static generateSummaryReport(data: HealthDataExport): void {
    console.log('\n📋 RELATÓRIO RESUMO - DADOS DE SAÚDE');
    console.log('=====================================');
    
    console.log(`📅 Período: ${data.sessions[0]?.date} até ${data.sessions[data.sessions.length - 1]?.date}`);
    console.log(`📊 Total de sessões: ${data.sessions.length}`);
    
    // Heart rate summary
    const hrSessions = data.sessions.filter(s => s.heartRateMetrics);
    if (hrSessions.length > 0) {
      const avgHR = hrSessions.reduce((sum, s) => sum + (s.heartRateMetrics?.averageHR || 0), 0) / hrSessions.length;
      const avgRestingHR = hrSessions.reduce((sum, s) => sum + (s.heartRateMetrics?.restingHR || 0), 0) / hrSessions.length;
      
      console.log('\n❤️ FREQUÊNCIA CARDÍACA:');
      console.log(`  FC média: ${Math.round(avgHR)} bpm`);
      console.log(`  FC repouso média: ${Math.round(avgRestingHR)} bpm`);
      console.log(`  Dias com dados: ${hrSessions.length}`);
    }
    
    // Activity summary
    const actSessions = data.sessions.filter(s => s.activityMetrics);
    if (actSessions.length > 0) {
      const totalSteps = actSessions.reduce((sum, s) => sum + (s.activityMetrics?.totalSteps || 0), 0);
      const totalDistance = actSessions.reduce((sum, s) => sum + (s.activityMetrics?.totalDistance || 0), 0);
      const avgActivityLevel = actSessions.reduce((sum, s) => sum + (s.activityMetrics?.averageActivityLevel || 0), 0) / actSessions.length;
      
      console.log('\n🏃 ATIVIDADE FÍSICA:');
      console.log(`  Total de passos: ${totalSteps.toLocaleString()}`);
      console.log(`  Distância total: ${totalDistance.toFixed(2)} km`);
      console.log(`  Nível de atividade médio: ${avgActivityLevel.toFixed(1)}/10`);
      console.log(`  Dias com dados: ${actSessions.length}`);
    }
    
    // Sleep summary  
    const sleepSessions = data.sessions.filter(s => s.sleepMetrics);
    if (sleepSessions.length > 0) {
      const avgSleepScore = sleepSessions.reduce((sum, s) => sum + (s.sleepMetrics?.sleepScore || 0), 0) / sleepSessions.length;
      const avgSleepTime = sleepSessions.reduce((sum, s) => sum + (s.sleepMetrics?.totalSleepTime || 0), 0) / sleepSessions.length;
      const avgEfficiency = sleepSessions.reduce((sum, s) => sum + (s.sleepMetrics?.sleepEfficiency || 0), 0) / sleepSessions.length;
      
      console.log('\n😴 SONO:');
      console.log(`  Score médio: ${Math.round(avgSleepScore)}/100`);
      console.log(`  Tempo médio de sono: ${(avgSleepTime / 60).toFixed(1)} horas`);
      console.log(`  Eficiência média: ${avgEfficiency.toFixed(1)}%`);
      console.log(`  Noites com dados: ${sleepSessions.length}`);
    }
    
    // Overall health score
    const avgHealthScore = data.sessions.reduce((sum, s) => sum + s.overallScore, 0) / data.sessions.length;
    console.log(`\n🎯 SCORE GERAL DE SAÚDE: ${Math.round(avgHealthScore)}/100`);
    
    console.log('\n✅ Processamento concluído com sucesso!');
  }
}

// Execute if run directly
if (process.argv[1]?.endsWith('process-health-data.ts')) {
  HealthDataProcessor.processAllHealthData()
    .then((data) => {
      console.log('\n🎉 Todos os dados de saúde foram processados!');
      console.log(`📁 Arquivos salvos em: ${HealthDataProcessor['OUTPUT_PATH']}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro durante o processamento:', error);
      process.exit(1);
    });
}