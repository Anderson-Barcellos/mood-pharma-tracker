import { BaseHealthRecord, HealthDataType, DataSource } from './types';

/**
 * Abstract base class for all Samsung Health data parsers
 */
export abstract class BaseHealthParser<T extends BaseHealthRecord> {
  protected readonly dataType: HealthDataType;
  protected readonly source: DataSource = 'samsung-health';

  constructor(dataType: HealthDataType) {
    this.dataType = dataType;
  }

  /**
   * Parse CSV content and return structured health records
   */
  abstract parseCSV(csvContent: string): T[];

  /**
   * Validate that a CSV header matches expected format
   */
  protected validateHeaders(headers: string[], expectedHeaders: string[]): boolean {
    return expectedHeaders.every(expected => 
      headers.some(header => header.trim().toLowerCase() === expected.toLowerCase())
    );
  }

  /**
   * Parse Samsung Health datetime format (YYYY.MM.DD HH:mm:ss)
   */
  protected parseDateTime(dateStr: string, timeStr?: string): number {
    try {
      // Handle combined datetime string or separate date/time
      let fullDateTimeStr = dateStr;
      if (timeStr) {
        fullDateTimeStr = `${dateStr} ${timeStr}`;
      }

      // Parse YYYY.MM.DD HH:mm:ss format
      const [datePart, timePart] = fullDateTimeStr.split(' ');
      const [year, month, day] = datePart.split('.').map(Number);
      
      let hours = 0, minutes = 0, seconds = 0;
      if (timePart) {
        const timeComponents = timePart.split(':').map(Number);
        hours = timeComponents[0] || 0;
        minutes = timeComponents[1] || 0;
        seconds = timeComponents[2] || 0;
      }

      const date = new Date(year, month - 1, day, hours, minutes, seconds);
      return date.getTime();
    } catch (error) {
      console.warn(`Erro ao parsear data/hora: ${dateStr} ${timeStr || ''}`, error);
      return Date.now(); // Fallback para timestamp atual
    }
  }

  /**
   * Generate unique ID for health record
   */
  protected generateId(type: HealthDataType, timestamp: number, suffix?: string): string {
    const baseId = `${type}-${timestamp}`;
    return suffix ? `${baseId}-${suffix}` : baseId;
  }

  /**
   * Clean and normalize CSV line data
   */
  protected cleanCsvValue(value: string): string {
    return value.trim().replace(/^"|"$/g, ''); // Remove quotes
  }

  /**
   * Parse numeric value with fallback
   */
  protected parseNumber(value: string, fallback: number = 0): number {
    const cleaned = this.cleanCsvValue(value);
    const parsed = parseFloat(cleaned.replace(',', '.'));
    return isNaN(parsed) ? fallback : parsed;
  }

  /**
   * Detect CSV delimiter
   */
  protected detectDelimiter(csvLine: string): string {
    const delimiters = [',', ';', '\t'];
    let maxCount = 0;
    let bestDelimiter = ',';

    for (const delimiter of delimiters) {
      const count = csvLine.split(delimiter).length - 1;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }

  /**
   * Split CSV line respecting quoted values
   */
  protected splitCsvLine(line: string, delimiter: string = ','): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Validate timestamp is within reasonable range
   */
  protected isValidTimestamp(timestamp: number): boolean {
    const now = Date.now();
    const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
    const oneYearFromNow = now + (365 * 24 * 60 * 60 * 1000);
    
    return timestamp >= oneYearAgo && timestamp <= oneYearFromNow;
  }

  /**
   * Create base health record with common fields
   */
  protected createBaseRecord(timestamp: number, suffix?: string): Omit<BaseHealthRecord, 'type'> {
    const now = Date.now();
    return {
      id: this.generateId(this.dataType, timestamp, suffix),
      timestamp,
      source: this.source,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Log parsing statistics
   */
  protected logParsingStats(fileName: string, totalLines: number, validRecords: number, errors: number): void {
    console.log(`📊 Parse Stats - ${fileName}:`);
    console.log(`  Total lines: ${totalLines}`);
    console.log(`  Valid records: ${validRecords}`);
    console.log(`  Errors: ${errors}`);
    console.log(`  Success rate: ${((validRecords / Math.max(totalLines - 1, 1)) * 100).toFixed(1)}%`);
  }
}