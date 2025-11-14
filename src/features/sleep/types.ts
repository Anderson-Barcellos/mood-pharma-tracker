// Sleep tracking types for Samsung Health data integration

export type SleepStage = 'light' | 'deep' | 'rem' | 'awake';

export interface SleepRecord {
  id: string;
  timestamp: number;
  duration: number; // Duration in seconds
  stage: SleepStage;
}

export interface SleepSession {
  id: string;
  date: string; // YYYY-MM-DD format
  startTime: number; // Unix timestamp
  endTime: number; // Unix timestamp
  totalDuration: number; // Total sleep time in minutes
  records: SleepRecord[];
  metrics: SleepMetrics;
  createdAt: number;
}

export interface SleepMetrics {
  // Basic duration metrics (in minutes)
  totalSleepTime: number;
  lightSleepTime: number;
  deepSleepTime: number;
  remSleepTime: number;
  awakeTime: number;
  
  // Sleep quality percentages
  lightSleepPercentage: number;
  deepSleepPercentage: number;
  remSleepPercentage: number;
  awakePercentage: number;
  
  // Sleep quality indicators
  sleepEfficiency: number; // (totalSleepTime / totalDuration) * 100
  wakeAfterSleepOnset: number; // WASO in minutes
  numberOfAwakenings: number;
  averageAwakeningDuration: number; // in minutes
  
  // Sleep architecture
  timeToDeepSleep: number; // minutes from start to first deep sleep
  timeToREM: number; // minutes from start to first REM
  deepSleepContinuity: number; // Longest continuous deep sleep period
  remContinuity: number; // Longest continuous REM period
  
  // Sleep score (calculated)
  sleepScore: number; // 0-100 based on multiple factors
}

export interface SamsungHealthSleepData {
  Data: string;
  Hora: string;
  'Duração em segundos': string;
  'Fase do sono': SleepStage;
}

export interface SleepAnalytics {
  weeklyAverage: Partial<SleepMetrics>;
  monthlyAverage: Partial<SleepMetrics>;
  trends: {
    sleepEfficiencyTrend: number; // Positive = improving, negative = declining
    deepSleepTrend: number;
    totalSleepTimeTrend: number;
  };
  recommendations: string[];
}