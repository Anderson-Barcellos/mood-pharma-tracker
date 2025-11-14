// Core types for Samsung Health data integration

export type HealthDataType = 
  | 'heart-rate' 
  | 'activity' 
  | 'sleep' 
  | 'hrv' 
  | 'stress' 
  | 'blood-pressure' 
  | 'spo2' 
  | 'nutrition';

export type DataSource = 'samsung-health' | 'manual' | 'other';

// Base interface for all health data records
export interface BaseHealthRecord {
  id: string;
  timestamp: number;
  source: DataSource;
  type: HealthDataType;
  createdAt: number;
  updatedAt: number;
}

// Heart Rate data
export interface HeartRateRecord extends BaseHealthRecord {
  type: 'heart-rate';
  heartRate: number; // BPM
  context?: 'resting' | 'exercise' | 'sleep' | 'stress';
  source_device?: string;
}

export interface HeartRateMetrics {
  averageHR: number;
  minHR: number;
  maxHR: number;
  restingHR: number;
  maxHRVariation: number;
  timeInZones: {
    recovery: number;  // < 50% max
    aerobic: number;   // 50-70% max
    anaerobic: number; // 70-85% max
    maximal: number;   // > 85% max
  };
}

// Activity data
export interface ActivityRecord extends BaseHealthRecord {
  type: 'activity';
  activityType: 'WALKING' | 'RUNNING' | 'CYCLING' | 'GENERIC' | 'OTHER';
  duration: number; // seconds
  activeDuration: number; // seconds of actual activity
  steps?: number;
  distance?: number; // km
  calories?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
}

export interface ActivityMetrics {
  totalSteps: number;
  totalDistance: number; // km
  totalCalories: number;
  totalActiveDuration: number; // minutes
  averageActivityLevel: number; // 0-10 scale
  stepGoalAchievement: number; // percentage
  sedentaryTime: number; // minutes
  activeMinutes: number;
}

// Sleep data (extended from existing)
export interface SleepRecord extends BaseHealthRecord {
  type: 'sleep';
  stage: 'light' | 'deep' | 'rem' | 'awake';
  duration: number; // seconds
}

// HRV data
export interface HRVRecord extends BaseHealthRecord {
  type: 'hrv';
  rmssd: number; // Root Mean Square of Successive Differences
  sdnn?: number; // Standard deviation of NN intervals
  pnn50?: number; // Percentage of successive RR intervals > 50ms
  stressIndex?: number; // 0-100 scale
}

export interface HRVMetrics {
  averageRMSSD: number;
  hrvTrend: number; // Positive = improving, negative = declining
  recoveryScore: number; // 0-100 based on HRV
  autonomicBalance: 'parasympathetic' | 'sympathetic' | 'balanced';
}

// Stress data
export interface StressRecord extends BaseHealthRecord {
  type: 'stress';
  stressLevel: number; // 0-100 scale
  stressType: 'mental' | 'physical' | 'environmental' | 'unknown';
}

export interface StressMetrics {
  averageStress: number;
  maxStress: number;
  stressfulPeriods: number;
  recoveryTime: number; // minutes to return to baseline
}

// Combined health session (daily/period aggregation)
export interface HealthSession {
  id: string;
  date: string; // YYYY-MM-DD
  period: 'daily' | 'weekly' | 'monthly';
  heartRateMetrics?: HeartRateMetrics;
  activityMetrics?: ActivityMetrics;
  sleepMetrics?: any; // from existing sleep types
  hrvMetrics?: HRVMetrics;
  stressMetrics?: StressMetrics;
  overallScore: number; // 0-100 composite health score
  createdAt: number;
}

// Samsung Health specific CSV formats
export interface SamsungHeartRateCSV {
  Data: string;
  Hora: string;
  'Frequência Cardíaca': string;
  Origem: string;
}

export interface SamsungActivityCSV {
  'Aplicação de origem': string;
  'Tipo de atividade': string;
  'Nome da atividade': string;
  Data: string;
  Hora: string;
  'Tempo decorrido': string;
  'Tempo ativo': string;
  'Distância (km)': string;
}

export interface SamsungStepsCSV {
  Data: string;
  Hora: string;
  Passos: string;
}

// Correlation analysis types
export interface HealthCorrelation {
  id: string;
  variable1: string; // e.g., 'heart_rate_avg'
  variable2: string; // e.g., 'medication_concentration'
  correlation: number; // -1 to 1
  significance: number; // p-value
  dataPoints: number;
  timeframe: string;
  createdAt: number;
}

export interface HealthInsight {
  id: string;
  type: 'correlation' | 'trend' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  confidence: number; // 0-1
  relevantMetrics: string[];
  actionable: boolean;
  createdAt: number;
}

// Export/import format
export interface HealthDataExport {
  version: string;
  exportDate: string;
  dataTypes: HealthDataType[];
  sessions: HealthSession[];
  records: BaseHealthRecord[];
  correlations: HealthCorrelation[];
  insights: HealthInsight[];
}