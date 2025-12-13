export interface Medication {
  id: string;
  name: string;
  brandName?: string;
  genericName?: string; // Generic name (e.g., "Lisdexanfetamina")
  category?: string; // Category (legacy field)
  class?: string; // Medication class (alternative to category)
  defaultDose?: number; // Default dose amount
  unit?: string; // Dose unit (mg, mcg, etc.)
  color?: string; // UI color for visual identification
  halfLife: number;
  volumeOfDistribution: number;
  bioavailability: number;
  absorptionRate: number;
  therapeuticRange?: {
    min: number;
    max: number;
    unit: string;
  };
  therapeuticRangeMin?: number; // Alternative therapeutic range format
  therapeuticRangeMax?: number;
  therapeuticRangeUnit?: string;
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
  cognitiveScore?: number;
  attentionShift?: number;
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
  source?: 'gemini' | 'fallback';
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
  | 'Nootropic'
  | 'Amino Acid'
  | 'Fatty Acid'
  | 'Other';
