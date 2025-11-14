import { 
  SamsungHealthSleepData, 
  SleepRecord, 
  SleepSession, 
  SleepMetrics, 
  SleepStage 
} from '../types';

export class SamsungHealthParser {
  
  /**
   * Parse CSV content from Samsung Health sleep export
   */
  static parseSleepCSV(csvContent: string): SleepSession {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    
    // Parse records
    const records: SleepRecord[] = [];
    let sessionDate = '';
    let sessionStart = 0;
    let sessionEnd = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < 4) continue;
      
      const rawData: SamsungHealthSleepData = {
        Data: values[0],
        Hora: values[1], 
        'Duração em segundos': values[2],
        'Fase do sono': values[3] as SleepStage
      };
      
      // Convert to structured data
      const timestamp = this.parseDateTime(rawData.Data, rawData.Hora);
      const duration = parseInt(rawData['Duração em segundos']);
      
      if (i === 1) {
        sessionDate = rawData.Data;
        sessionStart = timestamp;
      }
      sessionEnd = timestamp + duration * 1000; // Convert to milliseconds
      
      records.push({
        id: `sleep-${i}`,
        timestamp,
        duration,
        stage: rawData['Fase do sono']
      });
    }
    
    // Calculate metrics
    const metrics = this.calculateMetrics(records);
    
    // Calculate total session duration more reliably
    const totalDurationMs = sessionEnd - sessionStart;
    const totalDurationMinutes = totalDurationMs > 0 ? Math.round(totalDurationMs / (1000 * 60)) : 
      Math.round(records.reduce((sum, r) => sum + r.duration, 0) / 60);

    return {
      id: `sleep-session-${sessionDate.replace(/\./g, '-')}`,
      date: sessionDate.replace(/\./g, '-'),
      startTime: sessionStart,
      endTime: sessionEnd,
      totalDuration: totalDurationMinutes,
      records,
      metrics,
      createdAt: Date.now()
    };
  }
  
  /**
   * Parse Samsung Health datetime format (YYYY.MM.DD HH:mm:ss)
   */
  private static parseDateTime(dateStr: string, timeStr: string): number {
    try {
      const [year, month, day] = dateStr.split('.').map(Number);
      const [hours, minutes, seconds = 0] = timeStr.split(':').map(Number);
      
      const date = new Date(year, month - 1, day, hours, minutes, seconds);
      return date.getTime();
    } catch (error) {
      console.warn(`Erro ao parsear data/hora: ${dateStr} ${timeStr}`, error);
      return Date.now(); // Fallback para timestamp atual
    }
  }
  
  /**
   * Calculate comprehensive sleep metrics from records
   */
  private static calculateMetrics(records: SleepRecord[]): SleepMetrics {
    // Basic duration calculations
    let lightSleepTime = 0;
    let deepSleepTime = 0;
    let remSleepTime = 0;
    let awakeTime = 0;
    
    let timeToDeepSleep = 0;
    let timeToREM = 0;
    let firstDeepFound = false;
    let firstREMFound = false;
    
    let numberOfAwakenings = 0;
    let currentAwakeStreak = 0;
    let totalAwakeStreak = 0;
    let longestDeepSleep = 0;
    let currentDeepStreak = 0;
    let longestREMSleep = 0;
    let currentREMStreak = 0;
    
    let cumulativeTime = 0;
    
    records.forEach((record, index) => {
      const durationMinutes = record.duration / 60;
      
      switch (record.stage) {
        case 'light':
          lightSleepTime += durationMinutes;
          currentAwakeStreak = 0;
          currentDeepStreak = 0;
          currentREMStreak = 0;
          break;
          
        case 'deep':
          deepSleepTime += durationMinutes;
          currentDeepStreak += durationMinutes;
          longestDeepSleep = Math.max(longestDeepSleep, currentDeepStreak);
          
          if (!firstDeepFound) {
            timeToDeepSleep = cumulativeTime;
            firstDeepFound = true;
          }
          
          currentAwakeStreak = 0;
          currentREMStreak = 0;
          break;
          
        case 'rem':
          remSleepTime += durationMinutes;
          currentREMStreak += durationMinutes;
          longestREMSleep = Math.max(longestREMSleep, currentREMStreak);
          
          if (!firstREMFound) {
            timeToREM = cumulativeTime;
            firstREMFound = true;
          }
          
          currentAwakeStreak = 0;
          currentDeepStreak = 0;
          break;
          
        case 'awake':
          awakeTime += durationMinutes;
          
          if (currentAwakeStreak === 0 && index > 0) {
            numberOfAwakenings++;
          }
          currentAwakeStreak += durationMinutes;
          totalAwakeStreak += durationMinutes;
          
          currentDeepStreak = 0;
          currentREMStreak = 0;
          break;
      }
      
      cumulativeTime += durationMinutes;
    });
    
    const totalSleepTime = lightSleepTime + deepSleepTime + remSleepTime;
    const totalDuration = totalSleepTime + awakeTime;
    
    // Calculate percentages
    const lightSleepPercentage = (lightSleepTime / totalSleepTime) * 100;
    const deepSleepPercentage = (deepSleepTime / totalSleepTime) * 100;
    const remSleepPercentage = (remSleepTime / totalSleepTime) * 100;
    const awakePercentage = (awakeTime / totalDuration) * 100;
    
    // Sleep efficiency
    const sleepEfficiency = (totalSleepTime / totalDuration) * 100;
    
    // Average awakening duration
    const averageAwakeningDuration = numberOfAwakenings > 0 ? 
      totalAwakeStreak / numberOfAwakenings : 0;
    
    // Calculate sleep score (0-100)
    const sleepScore = this.calculateSleepScore({
      sleepEfficiency,
      deepSleepPercentage,
      remSleepPercentage,
      numberOfAwakenings,
      totalSleepTime
    });
    
    return {
      totalSleepTime: Math.round(totalSleepTime),
      lightSleepTime: Math.round(lightSleepTime),
      deepSleepTime: Math.round(deepSleepTime),
      remSleepTime: Math.round(remSleepTime),
      awakeTime: Math.round(awakeTime),
      
      lightSleepPercentage: Math.round(lightSleepPercentage * 10) / 10,
      deepSleepPercentage: Math.round(deepSleepPercentage * 10) / 10,
      remSleepPercentage: Math.round(remSleepPercentage * 10) / 10,
      awakePercentage: Math.round(awakePercentage * 10) / 10,
      
      sleepEfficiency: Math.round(sleepEfficiency * 10) / 10,
      wakeAfterSleepOnset: Math.round(awakeTime),
      numberOfAwakenings,
      averageAwakeningDuration: Math.round(averageAwakeningDuration * 10) / 10,
      
      timeToDeepSleep: Math.round(timeToDeepSleep),
      timeToREM: Math.round(timeToREM),
      deepSleepContinuity: Math.round(longestDeepSleep),
      remContinuity: Math.round(longestREMSleep),
      
      sleepScore: Math.round(sleepScore)
    };
  }
  
  /**
   * Calculate overall sleep score based on multiple factors
   */
  private static calculateSleepScore(factors: {
    sleepEfficiency: number;
    deepSleepPercentage: number;
    remSleepPercentage: number;
    numberOfAwakenings: number;
    totalSleepTime: number;
  }): number {
    let score = 0;
    
    // Sleep efficiency (0-30 points)
    if (factors.sleepEfficiency >= 95) score += 30;
    else if (factors.sleepEfficiency >= 85) score += 25;
    else if (factors.sleepEfficiency >= 75) score += 20;
    else if (factors.sleepEfficiency >= 65) score += 15;
    else score += 10;
    
    // Deep sleep percentage (0-25 points) - Optimal: 15-20%
    if (factors.deepSleepPercentage >= 15 && factors.deepSleepPercentage <= 25) score += 25;
    else if (factors.deepSleepPercentage >= 10 && factors.deepSleepPercentage <= 30) score += 20;
    else if (factors.deepSleepPercentage >= 5) score += 15;
    else score += 5;
    
    // REM sleep percentage (0-25 points) - Optimal: 20-25%
    if (factors.remSleepPercentage >= 20 && factors.remSleepPercentage <= 30) score += 25;
    else if (factors.remSleepPercentage >= 15 && factors.remSleepPercentage <= 35) score += 20;
    else if (factors.remSleepPercentage >= 10) score += 15;
    else score += 5;
    
    // Sleep duration (0-10 points) - Optimal: 7-9 hours
    const hoursSlept = factors.totalSleepTime / 60;
    if (hoursSlept >= 7 && hoursSlept <= 9) score += 10;
    else if (hoursSlept >= 6 && hoursSlept <= 10) score += 8;
    else if (hoursSlept >= 5) score += 5;
    else score += 2;
    
    // Number of awakenings (0-10 points) - Fewer is better
    if (factors.numberOfAwakenings <= 2) score += 10;
    else if (factors.numberOfAwakenings <= 5) score += 7;
    else if (factors.numberOfAwakenings <= 8) score += 4;
    else score += 1;
    
    return Math.min(score, 100);
  }
  
  /**
   * Save processed sleep session to data folder
   */
  static async saveSleepSession(session: SleepSession, dataPath = '/root/CODEX/mood-pharma-tracker/public/data'): Promise<void> {
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    
    // Save individual session
    const sessionPath = path.join(dataPath, `sleep-session-${session.date}.json`);
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
    
    // Update or create sessions index
    const indexPath = path.join(dataPath, 'sleep-sessions-index.json');
    
    let index: { sessions: string[]; lastUpdated: number } = {
      sessions: [],
      lastUpdated: Date.now()
    };
    
    try {
      const existingIndex = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(existingIndex);
    } catch {
      // Index doesn't exist yet, use default
    }
    
    if (!index.sessions.includes(session.date)) {
      index.sessions.push(session.date);
      index.sessions.sort(); // Keep chronological order
    }
    index.lastUpdated = Date.now();
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }
}