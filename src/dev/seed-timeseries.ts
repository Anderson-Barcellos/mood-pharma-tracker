import { db } from '@/core/database/db';
import type { Medication, MedicationDose, MoodEntry, CognitiveTest, Matrix } from '@/shared/types';
import { generateMedicationSeeds } from '@/core/database/seeds/medications';
import { v4 as uuidv4 } from 'uuid';

type SeedOptions = {
  days?: number;
  startDaysAgo?: number;
  dosesPerDay?: number;
  moodPerDay?: number;
  includeCognitive?: boolean;
  clear?: boolean;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

async function ensureMedications(): Promise<Medication[]> {
  const meds = await db.medications.toArray();
  if (meds.length > 0) return meds;
  const seed = generateMedicationSeeds();
  await db.medications.bulkPut(seed);
  return db.medications.toArray();
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

async function seedDoses(meds: Medication[], start: number, end: number, perDay: number) {
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
        createdAt: ts,
      });
    }
  }
  if (doses.length > 0) await db.doses.bulkPut(doses);
}

async function seedMood(start: number, end: number, perDay: number) {
  const entries: MoodEntry[] = [];
  for (const ts of timeSlots(start, end, perDay)) {
    const hour = new Date(ts).getHours();
    const circadian = Math.sin(((hour - 8) / 24) * Math.PI * 2) * 1.0; // pico tarde
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
      notes: undefined,
    });
  }
  if (entries.length > 0) await db.moodEntries.bulkPut(entries);
}

async function seedCognitive(start: number, end: number) {
  const tests: CognitiveTest[] = [];
  const dayMs = 24 * 3600 * 1000;
  for (let t = start; t <= end; t += 2 * dayMs) {
    const matrices: Matrix[] = Array.from({ length: 4 }).map(() => ({
      matrixId: uuidv4(),
      svgContent: '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f3f4f6"/></svg>',
      options: [],
      correctAnswer: 0,
      userAnswer: 0,
      responseTime: +(2 + Math.random() * 8).toFixed(1),
      wasCorrect: Math.random() > 0.25,
      explanation: '',
      patterns: [],
      source: 'fallback',
    }));
    const accuracy = matrices.filter(m => m.wasCorrect).length / matrices.length;
    const avgRt = matrices.reduce((s, m) => s + m.responseTime, 0) / matrices.length;
    const totalScore = matrices.reduce((s, m) => s + (m.wasCorrect ? 1 : 0) * (100 / (1 + Math.log10(Math.max(m.responseTime, 0.1)))), 0);
    tests.push({
      id: uuidv4(),
      timestamp: t,
      matrices,
      totalScore: +totalScore.toFixed(1),
      averageResponseTime: +avgRt.toFixed(1),
      accuracy: +accuracy.toFixed(2),
      createdAt: t,
    });
  }
  if (tests.length > 0) await db.cognitiveTests.bulkPut(tests);
}

export async function clearDb() {
  await db.transaction('rw', [db.doses, db.moodEntries, db.cognitiveTests], async () => {
    await db.doses.clear();
    await db.moodEntries.clear();
    await db.cognitiveTests.clear();
    // mantemos medications; se quiser zerar, remova comentário abaixo
    // await db.medications.clear();
  });
}

export async function seedDemoData(opts: SeedOptions = {}) {
  const {
    days = 14,
    startDaysAgo = days,
    dosesPerDay = 1,
    moodPerDay = 3,
    includeCognitive = true,
    clear = false,
  } = opts;

  if (clear) await clearDb();

  const end = Date.now();
  const start = end - startDaysAgo * 24 * 3600 * 1000;

  const meds = await ensureMedications();
  await seedDoses(meds, start, end, dosesPerDay);
  await seedMood(start, end, moodPerDay);
  if (includeCognitive) await seedCognitive(start, end);

  localStorage.setItem('app-initialized', 'true');
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

