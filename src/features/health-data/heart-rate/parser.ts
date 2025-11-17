import { BaseHealthParser } from '../core/base-parser';
import { HeartRateRecord, SamsungHeartRateCSV } from '../core/types';

export class HeartRateParser extends BaseHealthParser<HeartRateRecord> {
  constructor() {
    super('heart-rate');
  }

  parseCSV(csvContent: string): HeartRateRecord[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      console.warn('CSV de frequência cardíaca vazio ou inválido');
      return [];
    }

    const headerLine = lines[0];
    const delimiter = this.detectDelimiter(headerLine);
    const headers = this.splitCsvLine(headerLine, delimiter);

    // Validate expected headers
    const expectedHeaders = ['data', 'hora', 'frequência cardíaca', 'origem'];
    if (!this.validateHeaders(headers, expectedHeaders)) {
      console.warn('Headers do CSV de frequência cardíaca não reconhecidos:', headers);
    }

    const records: HeartRateRecord[] = [];
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = this.splitCsvLine(line, delimiter);
        const record = this.parseLine(values);
        if (record) {
          records.push(record);
        }
      } catch (error) {
        console.warn(`Erro na linha ${i + 1} do CSV de FC:`, error);
        errorCount++;
      }
    }

    this.logParsingStats('Frequência Cardíaca', lines.length - 1, records.length, errorCount);
    return records;
  }

  private parseLine(values: string[]): HeartRateRecord | null {
    if (values.length < 3) {
      console.warn('Linha de FC incompleta:', values);
      return null;
    }

    const rawData: SamsungHeartRateCSV = {
      Data: this.cleanCsvValue(values[0]),
      Hora: this.cleanCsvValue(values[1]),
      'Frequência Cardíaca': this.cleanCsvValue(values[2]),
      Origem: values[3] ? this.cleanCsvValue(values[3]) : ''
    };

    // Parse timestamp
    const timestamp = this.parseDateTime(rawData.Data, rawData.Hora);
    if (!this.isValidTimestamp(timestamp)) {
      console.warn('Timestamp inválido para FC:', rawData.Data, rawData.Hora);
      return null;
    }

    // Parse heart rate
    const heartRate = this.parseNumber(rawData['Frequência Cardíaca']);
    if (heartRate <= 0 || heartRate > 300) {
      console.warn('Frequência cardíaca inválida:', heartRate);
      return null;
    }

    // Determine context based on heart rate ranges
    const context = this.determineHRContext(heartRate, timestamp);

    return {
      ...this.createBaseRecord(timestamp),
      type: 'heart-rate',
      heartRate,
      context,
      source_device: rawData.Origem || undefined
    };
  }

  /**
   * Determine heart rate context based on value and time
   */
  private determineHRContext(heartRate: number, timestamp: number): 'resting' | 'exercise' | 'sleep' | 'stress' {
    const hour = new Date(timestamp).getHours();
    
    // Sleep period (22:00 - 06:00)
    if (hour >= 22 || hour <= 6) {
      return 'sleep';
    }
    
    // High HR suggests exercise
    if (heartRate > 120) {
      return 'exercise';
    }
    
    // Very low or very high HR during day suggests stress or medical issue
    if (heartRate < 50 || (heartRate > 100 && heartRate <= 120)) {
      return 'stress';
    }
    
    // Normal daytime HR
    return 'resting';
  }

  /**
   * Calculate heart rate metrics for a set of records
   */
  static calculateMetrics(records: HeartRateRecord[]): any {
    if (records.length === 0) return null;

    const heartRates = records.map(r => r.heartRate);
    const averageHR = Math.round(heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length);
    const minHR = Math.min(...heartRates);
    const maxHR = Math.max(...heartRates);
    
    // Calculate resting HR (sleep + resting context, exclude obvious outliers)
    const restingRecords = records.filter(r => 
      (r.context === 'sleep' || r.context === 'resting') && 
      r.heartRate >= 40 && r.heartRate <= 100
    );
    const restingHR = restingRecords.length > 0 
      ? Math.round(restingRecords.reduce((sum, r) => sum + r.heartRate, 0) / restingRecords.length)
      : averageHR;

    // HR variation (standard deviation)
    const avgHR = heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length;
    const variance = heartRates.reduce((sum, hr) => sum + Math.pow(hr - avgHR, 2), 0) / heartRates.length;
    const maxHRVariation = Math.round(Math.sqrt(variance));

    // Time in HR zones (estimated based on age - using generic 180 as max)
    const maxTheoreticalHR = 180; // Could be calculated as 220 - age if available
    const zones = {
      recovery: 0,   // < 50% max
      aerobic: 0,    // 50-70% max  
      anaerobic: 0,  // 70-85% max
      maximal: 0     // > 85% max
    };

    records.forEach(record => {
      const percentage = (record.heartRate / maxTheoreticalHR) * 100;
      if (percentage < 50) zones.recovery++;
      else if (percentage < 70) zones.aerobic++;
      else if (percentage < 85) zones.anaerobic++;
      else zones.maximal++;
    });

    return {
      averageHR,
      minHR,
      maxHR,
      restingHR,
      maxHRVariation,
      timeInZones: zones
    };
  }
}