import { BaseHealthParser } from '../core/base-parser';
import { ActivityRecord, SamsungActivityCSV, SamsungStepsCSV } from '../core/types';

export class ActivityParser extends BaseHealthParser<ActivityRecord> {
  constructor() {
    super('activity');
  }

  /**
   * Parse combined activity data (steps and exercises)
   */
  parseCSV(csvContent: string): ActivityRecord[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      console.warn('CSV de atividade vazio ou inválido');
      return [];
    }

    const headerLine = lines[0];
    
    // Detect if this is steps data or activity data based on headers
    if (this.isStepsData(headerLine)) {
      return this.parseStepsCSV(csvContent);
    } else if (this.isActivityData(headerLine)) {
      return this.parseActivityCSV(csvContent);
    } else {
      console.warn('Formato de CSV de atividade não reconhecido');
      return [];
    }
  }

  /**
   * Parse steps-specific CSV data
   */
  parseStepsCSV(csvContent: string): ActivityRecord[] {
    const lines = csvContent.trim().split('\n');
    const delimiter = this.detectDelimiter(lines[0]);
    const headers = this.splitCsvLine(lines[0], delimiter);

    const records: ActivityRecord[] = [];
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = this.splitCsvLine(line, delimiter);
        const record = this.parseStepsLine(values);
        if (record) {
          records.push(record);
        }
      } catch (error) {
        console.warn(`Erro na linha ${i + 1} do CSV de passos:`, error);
        errorCount++;
      }
    }

    this.logParsingStats('Passos', lines.length - 1, records.length, errorCount);
    return records;
  }

  /**
   * Parse activity/exercise CSV data
   */
  parseActivityCSV(csvContent: string): ActivityRecord[] {
    const lines = csvContent.trim().split('\n');
    const delimiter = this.detectDelimiter(lines[0]);
    const headers = this.splitCsvLine(lines[0], delimiter);

    const records: ActivityRecord[] = [];
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = this.splitCsvLine(line, delimiter);
        const record = this.parseActivityLine(values);
        if (record) {
          records.push(record);
        }
      } catch (error) {
        console.warn(`Erro na linha ${i + 1} do CSV de atividade:`, error);
        errorCount++;
      }
    }

    this.logParsingStats('Atividade', lines.length - 1, records.length, errorCount);
    return records;
  }

  private isStepsData(headerLine: string): boolean {
    return headerLine.toLowerCase().includes('passos');
  }

  private isActivityData(headerLine: string): boolean {
    return headerLine.toLowerCase().includes('atividade') || 
           headerLine.toLowerCase().includes('tempo decorrido');
  }

  private parseStepsLine(values: string[]): ActivityRecord | null {
    if (values.length < 3) {
      console.warn('Linha de passos incompleta:', values);
      return null;
    }

    const rawData: SamsungStepsCSV = {
      Data: this.cleanCsvValue(values[0]),
      Hora: this.cleanCsvValue(values[1]),
      Passos: this.cleanCsvValue(values[2])
    };

    // Parse timestamp
    const timestamp = this.parseDateTime(rawData.Data, rawData.Hora);
    if (!this.isValidTimestamp(timestamp)) {
      console.warn('Timestamp inválido para passos:', rawData.Data, rawData.Hora);
      return null;
    }

    // Parse steps
    const steps = this.parseNumber(rawData.Passos);
    if (steps < 0 || steps > 10000) { // Reasonable range for a single measurement
      console.warn('Número de passos inválido:', steps);
      return null;
    }

    // Estimate duration (assuming this is a period measurement)
    // Samsung usually logs steps in time intervals
    const duration = this.estimateStepsDuration(steps);

    return {
      ...this.createBaseRecord(timestamp),
      type: 'activity',
      activityType: 'WALKING',
      duration,
      activeDuration: duration,
      steps,
      distance: this.estimateDistanceFromSteps(steps),
      calories: this.estimateCaloriesFromSteps(steps)
    };
  }

  private parseActivityLine(values: string[]): ActivityRecord | null {
    if (values.length < 8) {
      console.warn('Linha de atividade incompleta:', values);
      return null;
    }

    const rawData: SamsungActivityCSV = {
      'Aplicação de origem': this.cleanCsvValue(values[0]),
      'Tipo de atividade': this.cleanCsvValue(values[1]),
      'Nome da atividade': this.cleanCsvValue(values[2]),
      Data: this.cleanCsvValue(values[3]),
      Hora: this.cleanCsvValue(values[4]),
      'Tempo decorrido': this.cleanCsvValue(values[5]),
      'Tempo ativo': this.cleanCsvValue(values[6]),
      'Distância (km)': this.cleanCsvValue(values[7])
    };

    // Parse timestamp  
    const timestamp = this.parseDateTime(rawData.Data, rawData.Hora);
    if (!this.isValidTimestamp(timestamp)) {
      console.warn('Timestamp inválido para atividade:', rawData.Data, rawData.Hora);
      return null;
    }

    // Parse activity data
    const duration = this.parseNumber(rawData['Tempo decorrido']);
    const activeDuration = this.parseNumber(rawData['Tempo ativo']);
    const distance = this.parseNumber(rawData['Distância (km)']);
    
    if (duration <= 0) {
      console.warn('Duração inválida para atividade:', duration);
      return null;
    }

    const activityType = this.normalizeActivityType(rawData['Tipo de atividade']);

    return {
      ...this.createBaseRecord(timestamp),
      type: 'activity',
      activityType,
      duration,
      activeDuration,
      distance,
      steps: activityType === 'WALKING' || activityType === 'RUNNING' 
        ? this.estimateStepsFromDistance(distance) : undefined,
      calories: this.estimateCaloriesFromActivity(activityType, duration, distance)
    };
  }

  private normalizeActivityType(activityType: string): ActivityRecord['activityType'] {
    const normalized = activityType.toUpperCase();
    
    switch (normalized) {
      case 'WALKING':
      case 'CAMINHADA':
        return 'WALKING';
      case 'RUNNING':
      case 'CORRIDA':
        return 'RUNNING';
      case 'CYCLING':
      case 'CICLISMO':
        return 'CYCLING';
      case 'GENERIC':
      case 'GENÉRICO':
        return 'GENERIC';
      default:
        return 'OTHER';
    }
  }

  private estimateStepsDuration(steps: number): number {
    // Assume average walking speed of 100 steps per minute
    return Math.max(60, (steps / 100) * 60); // minimum 1 minute
  }

  private estimateDistanceFromSteps(steps: number): number {
    // Average stride length: 0.7 meters
    return (steps * 0.7) / 1000; // Convert to km
  }

  private estimateStepsFromDistance(distanceKm: number): number {
    // Reverse calculation: distance / average stride length
    return Math.round((distanceKm * 1000) / 0.7);
  }

  private estimateCaloriesFromSteps(steps: number): number {
    // Rough estimate: 0.04 calories per step for average person
    return Math.round(steps * 0.04);
  }

  private estimateCaloriesFromActivity(
    activityType: ActivityRecord['activityType'], 
    durationSeconds: number, 
    distance: number
  ): number {
    const durationMinutes = durationSeconds / 60;
    
    // METs (Metabolic Equivalent of Task) values
    const mets: Record<string, number> = {
      WALKING: 3.5,
      RUNNING: 8.0,
      CYCLING: 6.0,
      GENERIC: 4.0,
      OTHER: 3.0
    };

    const met = mets[activityType] || 3.0;
    // Assume 70kg person: Calories = METs × weight(kg) × time(hours)
    return Math.round(met * 70 * (durationMinutes / 60));
  }

  /**
   * Calculate activity metrics for a set of records
   */
  static calculateMetrics(records: ActivityRecord[]): any {
    if (records.length === 0) return null;

    const totalSteps = records.reduce((sum, r) => sum + (r.steps || 0), 0);
    const totalDistance = records.reduce((sum, r) => sum + (r.distance || 0), 0);
    const totalCalories = records.reduce((sum, r) => sum + (r.calories || 0), 0);
    const totalActiveDuration = Math.round(
      records.reduce((sum, r) => sum + r.activeDuration, 0) / 60
    ); // Convert to minutes

    // Calculate sedentary time (periods with no activity)
    const sortedRecords = records.sort((a, b) => a.timestamp - b.timestamp);
    let sedentaryTime = 0;
    
    for (let i = 1; i < sortedRecords.length; i++) {
      const timeDiff = (sortedRecords[i].timestamp - sortedRecords[i-1].timestamp) / (1000 * 60);
      if (timeDiff > 60 && timeDiff < 8 * 60) { // Between 1 and 8 hours
        sedentaryTime += timeDiff;
      }
    }

    // Activity level score (0-10 based on WHO recommendations)
    const weeklyActiveMinutes = totalActiveDuration * 7; // Extrapolate to week
    const whoRecommendation = 150; // minutes per week
    const averageActivityLevel = Math.min(10, (weeklyActiveMinutes / whoRecommendation) * 10);

    // Daily step goal achievement (assuming 10,000 steps goal)
    const dailyStepGoal = 10000;
    const stepGoalAchievement = Math.min(100, (totalSteps / dailyStepGoal) * 100);

    return {
      totalSteps,
      totalDistance: Math.round(totalDistance * 100) / 100, // Round to 2 decimals
      totalCalories,
      totalActiveDuration,
      averageActivityLevel: Math.round(averageActivityLevel * 10) / 10,
      stepGoalAchievement: Math.round(stepGoalAchievement),
      sedentaryTime: Math.round(sedentaryTime),
      activeMinutes: totalActiveDuration
    };
  }
}