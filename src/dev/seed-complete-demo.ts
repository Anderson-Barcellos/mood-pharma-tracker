/**
 * Comprehensive Demo Data Seeder
 *
 * Populates the database with realistic test data:
 * - Medications (antidepressants, antipsychotics, etc.)
 * - Medication doses (multiple times per day)
 * - Mood entries (with circadian patterns)
 * - Heart rate data (with exercise, sleep, and stress patterns)
 *
 * Usage:
 * 1. In browser console: window.seedCompleteDemo()
 * 2. Via CLI: npx tsx src/dev/seed-complete-demo.ts
 */

import { db } from '@/core/database/db';
import { healthDb, HealthDataService } from '@/features/health-data/core/health-database';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import type { HeartRateRecord } from '@/features/health-data/core/types';
import { generateMedicationSeeds } from '@/core/database/seeds/medications';
import { v4 as uuidv4 } from 'uuid';

type SeedOptions = {
  days?: number;
  startDaysAgo?: number;
  dosesPerDay?: number;
  moodPerDay?: number;
  heartRatePerDay?: number;
  clear?: boolean;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * Ensure medications exist in database
 */
async function ensureMedications(): Promise<Medication[]> {
  const meds = await db.medications.toArray();
  if (meds.length > 0) {
    console.log('✅ Medications already exist:', meds.length);
    return meds;
  }
  const seed = generateMedicationSeeds();
  await db.medications.bulkPut(seed);
  console.log('✅ Created medications:', seed.length);
  return db.medications.toArray();
}

/**
 * Generate time slots throughout the day
 */
function* timeSlots(start: number, end: number, perDay: number) {
  const dayMs = 24 * 3600 * 1000;
  for (let t = start; t <= end; t += dayMs) {
    for (let i = 0; i < perDay; i++) {
      const frac = (i + 1) / (perDay + 1);
      yield t + Math.floor(frac * dayMs);
    }
  }
}

/**
 * Seed medication doses
 */
async function seedDoses(meds: Medication[], start: number, end: number, perDay: number) {
  const doses: MedicationDose[] = [];

  for (const med of meds) {
    for (const ts of timeSlots(start, end, perDay)) {
      const base = med.defaultDose ?? 10;
      const jitter = base * 0.05 * (Math.random() - 0.5);
      doses.push({
        id: uuidv4(),
        medicationId: med.id,
        timestamp: ts,
        doseAmount: Math.max(0.1, +(base + jitter).toFixed(2)),
        route: 'oral',
        createdAt: ts,
      });
    }
  }

  if (doses.length > 0) {
    await db.doses.bulkPut(doses);
    console.log('✅ Created doses:', doses.length);
  }
}

/**
 * Seed mood entries with circadian rhythm patterns
 */
async function seedMood(start: number, end: number, perDay: number) {
  const entries: MoodEntry[] = [];

  for (const ts of timeSlots(start, end, perDay)) {
    const hour = new Date(ts).getHours();

    // Circadian rhythm: peak in afternoon/evening
    const circadian = Math.sin(((hour - 8) / 24) * Math.PI * 2) * 1.5;

    const baseMood = 6.5 + circadian;
    const mood = clamp(baseMood + (Math.random() - 0.5) * 1.5, 2, 9.5);

    // Anxiety inversely correlated with mood
    const anxiety = clamp(7 - (mood - 5) + (Math.random() - 0.5) * 1.2, 1, 9);

    // Energy follows circadian rhythm
    const energy = clamp(5 + circadian * 1.3 + (Math.random() - 0.5) * 1.2, 1, 9.5);

    // Focus correlates with energy
    const focus = clamp(energy * 0.9 + (Math.random() - 0.5) * 1.0, 1, 9.5);

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

  if (entries.length > 0) {
    await db.moodEntries.bulkPut(entries);
    console.log('✅ Created mood entries:', entries.length);
  }
}

/**
 * Seed heart rate data with realistic patterns:
 * - Sleep: 50-65 bpm (22:00-06:00)
 * - Resting: 60-80 bpm (daytime)
 * - Exercise: 120-160 bpm (random peaks)
 * - Stress: 85-110 bpm (work hours)
 */
async function seedHeartRate(start: number, end: number, perDay: number) {
  const records: HeartRateRecord[] = [];

  for (const ts of timeSlots(start, end, perDay)) {
    const date = new Date(ts);
    const hour = date.getHours();
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    let baseHR: number;
    let context: 'resting' | 'exercise' | 'sleep' | 'stress';

    // Sleep period (22:00 - 06:00)
    if (hour >= 22 || hour <= 6) {
      baseHR = 55 + Math.random() * 10; // 55-65 bpm
      context = 'sleep';
    }
    // Exercise period (random chance, higher on weekends)
    else if (Math.random() < (dayOfWeek === 0 || dayOfWeek === 6 ? 0.15 : 0.08)) {
      baseHR = 120 + Math.random() * 40; // 120-160 bpm
      context = 'exercise';
    }
    // Work hours stress (09:00 - 17:00 on weekdays)
    else if (hour >= 9 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      baseHR = 85 + Math.random() * 15; // 85-100 bpm
      context = 'stress';
    }
    // Resting
    else {
      baseHR = 65 + Math.random() * 15; // 65-80 bpm
      context = 'resting';
    }

    // Add natural variability
    const heartRate = Math.round(baseHR + (Math.random() - 0.5) * 5);

    records.push({
      id: uuidv4(),
      timestamp: ts,
      type: 'heart-rate',
      heartRate: clamp(heartRate, 40, 200),
      context,
      source: 'samsung-health',
      source_device: 'Galaxy Watch',
      createdAt: ts,
      updatedAt: ts,
    });
  }

  if (records.length > 0) {
    await HealthDataService.saveHealthRecords(records);
    console.log('✅ Created heart rate records:', records.length);
  }

  return records;
}

/**
 * Clear all databases
 */
export async function clearAllData() {
  console.log('🗑️ Clearing all databases...');

  await db.transaction('rw', [db.doses, db.moodEntries, db.cognitiveTests, db.medications], async () => {
    await db.doses.clear();
    await db.moodEntries.clear();
    await db.cognitiveTests.clear();
    await db.medications.clear();
  });

  await HealthDataService.clearAllHealthData();

  console.log('✅ All data cleared');
}

/**
 * Main seeding function
 */
export async function seedCompleteDemo(opts: SeedOptions = {}) {
  const {
    days = 30,
    startDaysAgo = days,
    dosesPerDay = 2,
    moodPerDay = 4,
    heartRatePerDay = 12, // Every 2 hours
    clear = false,
  } = opts;

  console.log('🌱 Starting comprehensive data seeding...');
  console.log('📅 Days:', days);
  console.log('💊 Doses per day:', dosesPerDay);
  console.log('😊 Mood entries per day:', moodPerDay);
  console.log('❤️ Heart rate measurements per day:', heartRatePerDay);

  if (clear) {
    await clearAllData();
  }

  const end = Date.now();
  const start = end - startDaysAgo * 24 * 3600 * 1000;

  // Seed data in parallel where possible
  console.log('\n📦 Creating data...');

  const meds = await ensureMedications();

  await Promise.all([
    seedDoses(meds, start, end, dosesPerDay),
    seedMood(start, end, moodPerDay),
    seedHeartRate(start, end, heartRatePerDay),
  ]);

  // Display summary
  const [medsCount, dosesCount, moodCount, hrRecords] = await Promise.all([
    db.medications.count(),
    db.doses.count(),
    db.moodEntries.count(),
    healthDb.healthRecords.count(),
  ]);

  console.log('\n✨ Seeding complete!');
  console.log('━'.repeat(50));
  console.log('📊 Database Summary:');
  console.log(`  💊 Medications: ${medsCount}`);
  console.log(`  💉 Doses: ${dosesCount}`);
  console.log(`  😊 Mood entries: ${moodCount}`);
  console.log(`  ❤️ Heart rate records: ${hrRecords}`);
  console.log('━'.repeat(50));
  console.log('\n🎯 Next steps:');
  console.log('  1. Open the Analytics page');
  console.log('  2. View concentration curves and correlations');
  console.log('  3. Check mood vs medication vs heart rate correlations');

  localStorage.setItem('app-initialized', 'true');
}

// Expose to window for browser console usage
declare global {
  interface Window {
    seedCompleteDemo?: (opts?: SeedOptions) => Promise<void>;
    clearAllData?: () => Promise<void>;
  }
}

if (typeof window !== 'undefined') {
  window.seedCompleteDemo = seedCompleteDemo;
  window.clearAllData = clearAllData;
  console.log('✅ Seed functions available:');
  console.log('  - window.seedCompleteDemo()');
  console.log('  - window.clearAllData()');
}

export default seedCompleteDemo;
