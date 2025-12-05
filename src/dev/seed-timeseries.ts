import type { Medication, MedicationDose, MoodEntry, CognitiveTest, Matrix } from '@/shared/types';
import { generateMedicationSeeds } from '@/core/database/seeds/medications';
import { v4 as uuidv4 } from 'uuid';
import { fetchAppData, saveAppData, type AppDataSnapshot } from '@/core/services/app-data-service';

type SeedOptions = {
  days?: number;
  startDaysAgo?: number;
  dosesPerDay?: number;
  moodPerDay?: number;
  includeCognitive?: boolean;
  clear?: boolean;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

async function ensureMedications(snapshot: AppDataSnapshot): Promise<Medication[]> {
  if (snapshot.medications.length > 0) {
    return snapshot.medications;
  }

  const seed = generateMedicationSeeds();
  snapshot.medications = seed;
  return snapshot.medications;
}

function* timeSlots(start: number, end: number, perDay: number) {
  const dayMs = 24 * 3600 * 1000;
  for (let t = start; t <= end; t += dayMs) {
    for (let i = 0; i < perDay; i++) {
      const frac = (i + 1) / (perDay + 1);
      yield t + Math.floor(frac * dayMs);
    }
  }
}

function generateDoseSeeds(meds: Medication[], start: number, end: number, perDay: number): MedicationDose[] {
  const doses: MedicationDose[] = [];
  for (const med of meds) {
    for (const ts of timeSlots(start, end, perDay)) {
      const base = med.defaultDose ?? 1;
      const jitter = base * 0.05 * (Math.random() - 0.5);
      doses.push({
        id: uuidv4(),
        medicationId: med.id,
        timestamp: ts,
        doseAmount: Math.max(0.1, +(base + jitter).toFixed(2)),
        createdAt: ts
      });
    }
  }
  return doses;
}

function generateMoodSeeds(start: number, end: number, perDay: number): MoodEntry[] {
  const entries: MoodEntry[] = [];
  for (const ts of timeSlots(start, end, perDay)) {
    const hour = new Date(ts).getHours();
    const circadian = Math.sin(((hour - 8) / 24) * Math.PI * 2) * 1.0;
    const base = 6.5 + circadian;
    const mood = clamp(base + (Math.random() - 0.5) * 1.0, 2, 9.5);
    const anxiety = clamp(6.5 - (mood - 5) + (Math.random() - 0.5) * 1.0, 1, 9);
    const energy = clamp(5 + circadian * 1.5 + (Math.random() - 0.5) * 1.0, 1, 9.5);
    const focus = clamp(5 + circadian * 1.2 + (Math.random() - 0.5) * 1.0, 1, 9.5);
    entries.push({
      id: uuidv4(),
      timestamp: ts,
      moodScore: +mood.toFixed(1),
      anxietyLevel: +anxiety.toFixed(1),
      energyLevel: +energy.toFixed(1),
      focusLevel: +focus.toFixed(1),
      createdAt: ts,
      notes: undefined
    });
  }
  return entries;
}

function generateCognitiveSeeds(start: number, end: number): CognitiveTest[] {
  const tests: CognitiveTest[] = [];
  const dayMs = 24 * 3600 * 1000;
  for (let t = start; t <= end; t += 2 * dayMs) {
    const matrices: Matrix[] = Array.from({ length: 4 }).map(() => ({
      matrixId: uuidv4(),
      svgContent:
        '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f3f4f6"/></svg>',
      options: [],
      correctAnswer: 0,
      userAnswer: 0,
      responseTime: +(2 + Math.random() * 8).toFixed(1),
      wasCorrect: Math.random() > 0.25,
      explanation: '',
      patterns: [],
      source: 'fallback'
    }));
    const accuracy = matrices.filter((m) => m.wasCorrect).length / matrices.length;
    const avgRt = matrices.reduce((s, m) => s + m.responseTime, 0) / matrices.length;
    const totalScore = matrices.reduce(
      (s, m) => s + (m.wasCorrect ? 1 : 0) * (100 / (1 + Math.log10(Math.max(m.responseTime, 0.1)))),
      0
    );
    tests.push({
      id: uuidv4(),
      timestamp: t,
      matrices,
      totalScore: +totalScore.toFixed(1),
      averageResponseTime: +avgRt.toFixed(1),
      accuracy: +accuracy.toFixed(2),
      createdAt: t
    });
  }
  return tests;
}

export async function clearDb() {
  const snapshot = await fetchAppData();
  const cleared: AppDataSnapshot = {
    ...snapshot,
    doses: [],
    moodEntries: [],
    cognitiveTests: []
  };
  await saveAppData(cleared);
}

export async function seedDemoData(opts: SeedOptions = {}) {
  const {
    days = 14,
    startDaysAgo = days,
    dosesPerDay = 1,
    moodPerDay = 3,
    includeCognitive = true,
    clear = false
  } = opts;

  const snapshot = await fetchAppData();

  if (clear) {
    snapshot.doses = [];
    snapshot.moodEntries = [];
    snapshot.cognitiveTests = [];
  }

  const end = Date.now();
  const start = end - startDaysAgo * 24 * 3600 * 1000;

  const meds = await ensureMedications(snapshot);
  const newDoses = generateDoseSeeds(meds, start, end, dosesPerDay);
  const newMood = generateMoodSeeds(start, end, moodPerDay);
  const newCognitive = includeCognitive ? generateCognitiveSeeds(start, end) : [];

  snapshot.doses = [...newDoses, ...snapshot.doses];
  snapshot.moodEntries = [...newMood, ...snapshot.moodEntries];
  if (includeCognitive) {
    snapshot.cognitiveTests = [...newCognitive, ...snapshot.cognitiveTests];
  }

  await saveAppData(snapshot);
}

declare global {
  interface Window {
    seedDemoData?: (opts?: SeedOptions) => Promise<void>;
    clearDb?: () => Promise<void>;
  }
}

if (typeof window !== 'undefined') {
  window.seedDemoData = seedDemoData;
  window.clearDb = clearDb;
}

export default seedDemoData;
