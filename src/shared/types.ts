export interface Medication {
  id: string;
  name: string;
  brandName?: string;
  category: string;
  halfLife: number;
  volumeOfDistribution: number;
  bioavailability: number;
  absorptionRate: number;
  therapeuticRange?: {
    min: number;
    max: number;
    unit: string;
  };
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MedicationDose {
  id: string;
  medicationId: string;
  timestamp: number;
  doseAmount: number;
  route?: string;
  notes?: string;
  createdAt: number;
}

export interface MoodEntry {
  id: string;
  timestamp: number;
  moodScore: number;
  anxietyLevel?: number;
  energyLevel?: number;
  focusLevel?: number;
  notes?: string;
  createdAt: number;
}

export interface Matrix {
  matrixId: string;
  svgContent: string;
  options: string[];
  correctAnswer: number;
  userAnswer: number;
  responseTime: number;
  wasCorrect: boolean;
  explanation: string;
  patterns?: string[];
  source?: 'spark' | 'gemini' | 'fallback';
}

export interface CognitiveTest {
  id: string;
  timestamp: number;
  matrices: Matrix[];
  totalScore: number;
  averageResponseTime: number;
  accuracy: number;
  createdAt: number;
}

export type MedicationCategory = 
  | 'SSRI'
  | 'SNRI'
  | 'Stimulant'
  | 'Benzodiazepine'
  | 'Antipsychotic'
  | 'Mood Stabilizer'
  | 'Other';
