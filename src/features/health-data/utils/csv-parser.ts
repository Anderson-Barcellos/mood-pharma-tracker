import type { HeartRateRecord } from '../core/types';

export interface CSVParseOptions {
  skipHeader?: boolean;
  delimiter?: string;
  trimFields?: boolean;
}

export interface HeartRateCSVParseOptions extends CSVParseOptions {
  fileName?: string;
  validateHR?: (hr: number) => boolean;
  inferContext?: boolean;
}

const DEFAULT_HR_VALIDATION = (hr: number): boolean => {
  return hr >= 30 && hr <= 220;
};

const inferHeartRateContext = (heartRate: number, hour: number): HeartRateRecord['context'] => {
  if ((hour >= 22 || hour <= 6) && heartRate < 70) {
    return 'sleep';
  } else if (heartRate > 120) {
    return 'exercise';
  } else if (heartRate > 100 || heartRate < 50) {
    return 'stress';
  }
  return 'resting';
};

export function parseSamsungHealthHeartRateCSV(
  csvContent: string, 
  options: HeartRateCSVParseOptions = {}
): HeartRateRecord[] {
  const {
    skipHeader = true,
    delimiter = ',',
    trimFields = true,
    fileName = '',
    validateHR = DEFAULT_HR_VALIDATION,
    inferContext = true
  } = options;

  const lines = csvContent.trim().split('\n');
  const records: HeartRateRecord[] = [];
  const startLine = skipHeader ? 1 : 0;

  const fileDate = extractDateFromFileName(fileName);

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(delimiter).map(p => 
      trimFields ? p.replace(/"/g, '').trim() : p.replace(/"/g, '')
    );

    if (parts.length < 3) continue;

    const dateTimeStr = parts[0];
    const hrStr = parts[2];

    if (!dateTimeStr || !hrStr) continue;

    const parsedRecord = parseHeartRateEntry(
      dateTimeStr, 
      hrStr, 
      validateHR, 
      inferContext
    );

    if (parsedRecord) {
      records.push(parsedRecord);
    }
  }

  return records;
}

function parseHeartRateEntry(
  dateTimeStr: string,
  hrStr: string,
  validateHR: (hr: number) => boolean,
  inferContext: boolean
): HeartRateRecord | null {
  const [datePart, timePart] = dateTimeStr.split(' ');
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split('.').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);

  if (isNaN(year) || isNaN(month) || isNaN(day) || 
      year < 2000 || year > 2100 ||
      month < 1 || month > 12 ||
      day < 1 || day > 31) {
    return null;
  }

  const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
  
  if (isNaN(date.getTime())) return null;

  const heartRate = parseInt(hrStr);
  
  if (isNaN(heartRate) || !validateHR(heartRate)) return null;

  const timestamp = date.getTime();
  const context = inferContext ? inferHeartRateContext(heartRate, hour || 0) : undefined;

  return {
    id: `hr_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
    heartRate,
    context,
    source: 'samsung-health',
    type: 'heart-rate',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function extractDateFromFileName(fileName: string): Date | null {
  const dateMatch = fileName.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!dateMatch) return null;
  
  const year = parseInt(dateMatch[1]);
  const month = parseInt(dateMatch[2]);
  const day = parseInt(dateMatch[3]);
  
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  
  return new Date(year, month - 1, day);
}

export function parseCSVLine(
  line: string, 
  delimiter: string = ',', 
  trimFields: boolean = true
): string[] {
  const parts = line.split(delimiter);
  return parts.map(p => {
    let field = p.replace(/^"|"$/g, '');
    return trimFields ? field.trim() : field;
  });
}

export function validateCSVStructure(
  csvContent: string,
  expectedColumns: number,
  options: CSVParseOptions = {}
): { valid: boolean; error?: string } {
  const { skipHeader = true, delimiter = ',' } = options;
  
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < (skipHeader ? 2 : 1)) {
    return { valid: false, error: 'CSV tem linhas insuficientes' };
  }

  const headerLine = lines[0];
  const headerParts = parseCSVLine(headerLine, delimiter);
  
  if (headerParts.length < expectedColumns) {
    return { 
      valid: false, 
      error: `CSV esperado ${expectedColumns} colunas, encontrado ${headerParts.length}` 
    };
  }

  return { valid: true };
}
