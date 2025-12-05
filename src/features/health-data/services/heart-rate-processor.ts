import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { HeartRateRecord as BaseHeartRateRecord } from '../core/types';

export interface HeartRateRecord extends BaseHeartRateRecord {
  date: Date;
  quality: 'high' | 'medium' | 'low';
  metadata?: {
    fileName?: string;
    hourOfDay?: number;
    dayOfWeek?: number;
    isNight?: boolean;
    isWeekend?: boolean;
  };
}

export interface HeartRateStats {
  totalRecords: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  avgHeartRate: number;
  minHeartRate: number;
  maxHeartRate: number;
  stdDeviation: number;
  contextDistribution: Record<string, number>;
  hourlyAverages: Record<number, number>;
  dailyAverages: Record<string, number>;
}

export interface ProcessingResult {
  records: HeartRateRecord[];
  stats: HeartRateStats;
  errors: string[];
  processedFiles: string[];
}

export class HeartRateProcessor {
  private records: HeartRateRecord[] = [];
  private errors: string[] = [];
  private processedFiles: string[] = [];

  /**
   * Processa múltiplos arquivos CSV de frequência cardíaca
   */
  async processFiles(files: File[]): Promise<ProcessingResult> {
    this.records = [];
    this.errors = [];
    this.processedFiles = [];

    for (const file of files) {
      try {
        await this.processFile(file);
        this.processedFiles.push(file.name);
      } catch (error) {
        this.errors.push(`Erro ao processar ${file.name}: ${error}`);
      }
    }

    // Remove duplicatas baseadas em timestamp
    this.removeDuplicates();

    // Ordena por timestamp
    this.records.sort((a, b) => a.timestamp - b.timestamp);

    // Detecta e atualiza contextos
    this.detectContexts();

    // Calcula estatísticas
    const stats = this.calculateStats();

    return {
      records: this.records,
      stats,
      errors: this.errors,
      processedFiles: this.processedFiles
    };
  }

  /**
   * Processa um único arquivo CSV
   */
  private async processFile(file: File): Promise<void> {
    const content = await file.text();
    const lines = content.trim().split('\n');
    
    if (lines.length < 2) {
      this.errors.push(`${file.name}: arquivo vazio ou inválido`);
      return;
    }

    // Detecta formato do CSV baseado no header
    const header = lines[0].toLowerCase();
    const isSamsungHealth = header.includes('data') && header.includes('frequência');
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const record = isSamsungHealth 
          ? this.parseSamsungHealthLine(lines[i], file.name)
          : this.parseGenericLine(lines[i], file.name);
        
        if (record) {
          this.records.push(record);
        }
      } catch (error) {
        // Log erro mas continua processando
        console.warn(`Erro na linha ${i} de ${file.name}:`, error);
      }
    }
  }

  /**
   * Parse linha do formato Samsung Health
   * Format: "2025.08.24 21:12:00","21:12:00","71",""
   */
  private parseSamsungHealthLine(line: string, fileName: string): HeartRateRecord | null {
    const parts = line.split(',').map(p => p.replace(/"/g, '').trim());
    
    if (parts.length < 3) return null;

    const dateTimeStr = parts[0];
    const hrStr = parts[2];
    
    if (!dateTimeStr || !hrStr) return null;

    // Parse da data e hora
    const [datePart, timePart] = dateTimeStr.split(' ');
    if (!datePart || !timePart) return null;

    const [year, month, day] = datePart.split('.').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
    const heartRate = parseInt(hrStr);

    // Validação de valores
    if (!isValid(date) || heartRate < 30 || heartRate > 250) return null;

    const timestamp = date.getTime();
    const isNight = hour >= 22 || hour <= 6;
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Determina contexto inicial baseado em FC e horário
    let context: HeartRateRecord['context'] = 'resting';
    
    if (isNight && heartRate < 65) {
      context = 'sleep';
    } else if (heartRate > 140) {
      context = 'exercise';
    } else if (heartRate > 100) {
      context = heartRate > 120 ? 'exercise' : 'stress';
    } else if (heartRate < 55 && !isNight) {
      context = 'resting';
    }

    // Determina qualidade baseada na consistência
    const quality: HeartRateRecord['quality'] = 'high';

    return {
      id: `hr_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      date,
      heartRate,
      context,
      source: 'samsung-health',
      type: 'heart-rate',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      quality,
      metadata: {
        fileName,
        hourOfDay: hour,
        dayOfWeek,
        isNight,
        isWeekend
      }
    };
  }

  /**
   * Parse linha de formato genérico
   */
  private parseGenericLine(line: string, fileName: string): HeartRateRecord | null {
    const parts = line.split(',').map(p => p.trim());
    
    if (parts.length < 2) return null;

    // Tenta diferentes formatos de data/hora
    let date: Date | null = null;
    let heartRate: number | null = null;

    // Formato ISO
    try {
      date = parseISO(parts[0]);
      heartRate = parseInt(parts[1]);
    } catch {
      // Formato timestamp
      try {
        const timestamp = parseInt(parts[0]);
        date = new Date(timestamp);
        heartRate = parseInt(parts[1]);
      } catch {
        return null;
      }
    }

    if (!isValid(date) || !heartRate || heartRate < 30 || heartRate > 250) {
      return null;
    }

    const timestamp = date.getTime();
    const hour = date.getHours();
    const isNight = hour >= 22 || hour <= 6;
    
    let context: HeartRateRecord['context'] = 'resting';
    if (isNight && heartRate < 65) {
      context = 'sleep';
    } else if (heartRate > 120) {
      context = 'exercise';
    } else if (heartRate > 100) {
      context = 'stress';
    }

    return {
      id: `hr_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      date,
      heartRate,
      context,
      source: 'manual',
      type: 'heart-rate',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      quality: 'medium',
      metadata: {
        fileName,
        hourOfDay: hour,
        dayOfWeek: date.getDay(),
        isNight,
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      }
    };
  }

  /**
   * Remove registros duplicados baseados no timestamp
   */
  private removeDuplicates(): void {
    const seen = new Set<number>();
    const unique: HeartRateRecord[] = [];

    for (const record of this.records) {
      // Considera duplicata se timestamp está dentro de 30 segundos
      const roundedTimestamp = Math.floor(record.timestamp / 30000) * 30000;
      
      if (!seen.has(roundedTimestamp)) {
        seen.add(roundedTimestamp);
        unique.push(record);
      }
    }

    this.records = unique;
  }

  /**
   * Detecta contextos baseado em padrões temporais e valores de FC
   */
  private detectContexts(): void {
    const windowSize = 5; // minutos para análise de contexto

    for (let i = 0; i < this.records.length; i++) {
      const record = this.records[i];
      const hour = record.metadata?.hourOfDay ?? 0;
      
      // Coleta registros na janela temporal
      const windowRecords: HeartRateRecord[] = [];
      const windowStart = record.timestamp - (windowSize * 60 * 1000);
      const windowEnd = record.timestamp + (windowSize * 60 * 1000);

      for (let j = Math.max(0, i - 10); j < Math.min(this.records.length, i + 10); j++) {
        const r = this.records[j];
        if (r.timestamp >= windowStart && r.timestamp <= windowEnd) {
          windowRecords.push(r);
        }
      }

      if (windowRecords.length > 0) {
        const avgHR = windowRecords.reduce((sum, r) => sum + r.heartRate, 0) / windowRecords.length;
        const variance = this.calculateVariance(windowRecords.map(r => r.heartRate));
        
        // Refina contexto baseado em análise da janela
        if (hour >= 23 || hour <= 5) {
          if (avgHR < 60 && variance < 25) {
            record.context = 'sleep';
          } else if (avgHR < 70) {
            record.context = 'resting';
          }
        } else {
          if (avgHR > 150 || (avgHR > 130 && variance > 100)) {
            record.context = 'exercise';
          } else if (avgHR > 100 && variance > 50) {
            record.context = 'stress';
          } else if (avgHR < 80) {
            record.context = 'resting';
          }
        }
      }
    }
  }

  /**
   * Calcula variância de um conjunto de valores
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calcula estatísticas dos dados processados
   */
  private calculateStats(): HeartRateStats {
    if (this.records.length === 0) {
      return {
        totalRecords: 0,
        dateRange: { start: new Date(), end: new Date() },
        avgHeartRate: 0,
        minHeartRate: 0,
        maxHeartRate: 0,
        stdDeviation: 0,
        contextDistribution: {},
        hourlyAverages: {},
        dailyAverages: {}
      };
    }

    const heartRates = this.records.map(r => r.heartRate);
    const timestamps = this.records.map(r => r.timestamp);
    
    // Estatísticas básicas
    const totalRecords = this.records.length;
    const avgHeartRate = heartRates.reduce((sum, hr) => sum + hr, 0) / totalRecords;
    const minHeartRate = Math.min(...heartRates);
    const maxHeartRate = Math.max(...heartRates);
    
    // Desvio padrão
    const variance = this.calculateVariance(heartRates);
    const stdDeviation = Math.sqrt(variance);

    // Range de datas
    const dateRange = {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps))
    };

    // Distribuição por contexto
    const contextDistribution: Record<string, number> = {};
    this.records.forEach(r => {
      const context = r.context || 'resting';
      contextDistribution[context] = (contextDistribution[context] || 0) + 1;
    });

    // Médias por hora do dia
    const hourlyData: Record<number, number[]> = {};
    this.records.forEach(r => {
      const hour = r.metadata?.hourOfDay ?? 0;
      if (!hourlyData[hour]) hourlyData[hour] = [];
      hourlyData[hour].push(r.heartRate);
    });

    const hourlyAverages: Record<number, number> = {};
    Object.entries(hourlyData).forEach(([hour, values]) => {
      hourlyAverages[parseInt(hour)] = values.reduce((sum, v) => sum + v, 0) / values.length;
    });

    // Médias diárias
    const dailyData: Record<string, number[]> = {};
    this.records.forEach(r => {
      const day = format(r.date, 'yyyy-MM-dd');
      if (!dailyData[day]) dailyData[day] = [];
      dailyData[day].push(r.heartRate);
    });

    const dailyAverages: Record<string, number> = {};
    Object.entries(dailyData).forEach(([day, values]) => {
      dailyAverages[day] = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
    });

    return {
      totalRecords,
      dateRange,
      avgHeartRate: Math.round(avgHeartRate),
      minHeartRate,
      maxHeartRate,
      stdDeviation: Math.round(stdDeviation * 10) / 10,
      contextDistribution,
      hourlyAverages,
      dailyAverages
    };
  }

  /**
   * Agrupa dados por intervalos de tempo
   */
  static aggregateByInterval(
    records: HeartRateRecord[],
    intervalMinutes: number
  ): HeartRateRecord[] {
    if (records.length === 0) return [];

    const intervalMs = intervalMinutes * 60 * 1000;
    const aggregated: Map<number, HeartRateRecord[]> = new Map();

    // Agrupa registros por intervalo
    records.forEach(record => {
      const intervalKey = Math.floor(record.timestamp / intervalMs) * intervalMs;
      
      if (!aggregated.has(intervalKey)) {
        aggregated.set(intervalKey, []);
      }
      aggregated.get(intervalKey)!.push(record);
    });

    // Cria registros agregados
    const result: HeartRateRecord[] = [];
    
    aggregated.forEach((group, timestamp) => {
      const avgHeartRate = Math.round(
        group.reduce((sum, r) => sum + r.heartRate, 0) / group.length
      );
      
      // Determina contexto mais frequente
      const contextCounts: Record<string, number> = {};
      group.forEach(r => {
        const context = r.context || 'resting';
        contextCounts[context] = (contextCounts[context] || 0) + 1;
      });
      
      const mostFrequentContext = Object.entries(contextCounts)
        .sort((a, b) => b[1] - a[1])[0][0] as HeartRateRecord['context'];

      result.push({
        id: `agg_${timestamp}`,
        timestamp,
        date: new Date(timestamp),
        heartRate: avgHeartRate,
        context: mostFrequentContext,
        source: 'manual',
        type: 'heart-rate',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        quality: 'high',
        metadata: {
          hourOfDay: new Date(timestamp).getHours(),
          dayOfWeek: new Date(timestamp).getDay(),
          isNight: new Date(timestamp).getHours() >= 22 || new Date(timestamp).getHours() <= 6,
          isWeekend: new Date(timestamp).getDay() === 0 || new Date(timestamp).getDay() === 6
        }
      });
    });

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }
}