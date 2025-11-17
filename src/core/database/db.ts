import Dexie, { type Table } from 'dexie';
import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '@/shared/types';
import { normalizeMedicationRecord } from '@/core/database/medication-helpers';
import { validateTimestamp, normalizeTimestamp } from '@/shared/utils/date-helpers';

type LegacyKey = 'medications' | 'doses' | 'moodEntries' | 'cognitiveTests';

interface AppMetadata {
  key: string;
  value: unknown;
  updatedAt: number;
}

class MoodPharmaDatabase extends Dexie {
  medications!: Table<Medication, string>;
  doses!: Table<MedicationDose, string>;
  moodEntries!: Table<MoodEntry, string>;
  cognitiveTests!: Table<CognitiveTest, string>;
  metadata!: Table<AppMetadata, string>;

  constructor() {
    super('MoodPharmaTrackerDB');

    this.version(1).stores({
      medications: 'id, name, category, createdAt, updatedAt',
      doses: 'id, medicationId, timestamp, createdAt',
      moodEntries: 'id, timestamp, createdAt',
      cognitiveTests: 'id, timestamp, createdAt'
    });

    this.version(2)
      .stores({
        medications: 'id, name, category, createdAt, updatedAt',
        doses: 'id, medicationId, timestamp, createdAt',
        moodEntries: 'id, timestamp, createdAt, moodScore',
        cognitiveTests: 'id, timestamp, createdAt, totalScore',
        metadata: '&key, updatedAt'
      })
      .upgrade(async (transaction) => {
        const now = Date.now();

        await transaction.table('medications').toCollection().modify((med: Medication) => {
          if (!med.createdAt) {
            med.createdAt = now;
          }
          if (!med.updatedAt) {
            med.updatedAt = med.createdAt;
          }
        });

        await transaction.table('doses').toCollection().modify((dose: MedicationDose) => {
          if (!dose.createdAt) {
            dose.createdAt = dose.timestamp ?? now;
          }
        });

        await transaction.table('moodEntries').toCollection().modify((entry: MoodEntry) => {
          if (!entry.createdAt) {
            entry.createdAt = entry.timestamp ?? now;
          }
        });

        await transaction.table('cognitiveTests').toCollection().modify((test: CognitiveTest) => {
          if (!test.createdAt) {
            test.createdAt = test.timestamp ?? now;
          }
        });
      });

    this.version(3)
      .stores({
        medications: 'id, name, category, createdAt, updatedAt',
        doses: 'id, medicationId, timestamp, createdAt, [medicationId+timestamp]',
        moodEntries: 'id, timestamp, createdAt, moodScore',
        cognitiveTests: 'id, timestamp, createdAt, totalScore',
        metadata: '&key, updatedAt'
      });
  }
}

export const db = new MoodPharmaDatabase();

const MIGRATION_FLAG_KEY = 'legacyKvMigration';
const LEGACY_KEYS: LegacyKey[] = ['medications', 'doses', 'moodEntries', 'cognitiveTests'];

type LegacyPayload = Partial<Record<LegacyKey, unknown>>;

type LegacyState = Partial<Record<LegacyKey, unknown>>;

function safeParse<T>(value: string | null): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('[dexie-migration] Failed to parse legacy value', error);
    return undefined;
  }
}

function readFromStorage<T>(storage: Storage | undefined, key: string): T | undefined {
  if (!storage) return undefined;
  const raw = storage.getItem(key);
  return safeParse<T>(raw);
}

function readLegacyFromStorage<T>(key: LegacyKey): T | undefined {
  if (typeof window === 'undefined') return undefined;

  const candidates = [
    key,
    `spark-kv:${key}`,
    `sparkkv:${key}`,
    `spark:${key}`,
    `kv:${key}`,
    `SPARK_KV:${key}`
  ];

  for (const candidate of candidates) {
    const fromLocal = readFromStorage<T>(window.localStorage, candidate);
    if (fromLocal !== undefined) {
      return fromLocal;
    }
    const fromSession = readFromStorage<T>(window.sessionStorage, candidate);
    if (fromSession !== undefined) {
      return fromSession;
    }
  }

  return undefined;
}

function readLegacyFromGlobals<T>(key: LegacyKey): T | undefined {
  if (typeof window === 'undefined') return undefined;
  const globalCandidates = [
    (window as unknown as Record<string, unknown>).__SPARK_KV_INITIAL_STATE__ as LegacyPayload,
    (window as unknown as Record<string, unknown>).__SPARK_KV_CACHE__ as LegacyPayload,
    (window as unknown as Record<string, unknown>).__SPARK_KV__ as LegacyPayload,
    (window as unknown as Record<string, unknown>).__sparkKV__ as LegacyPayload,
    (window as unknown as Record<string, unknown>).__sparkKv__ as LegacyPayload,
    (window as unknown as Record<string, unknown>).sparkKvInitialState as LegacyPayload,
    (window as unknown as Record<string, unknown>).sparkKvCache as LegacyPayload
  ].filter((candidate): candidate is LegacyPayload => Boolean(candidate));

  for (const source of globalCandidates) {
    if (source && typeof source === 'object' && key in source) {
      const value = source[key];
      if (value !== undefined) {
        return value as T;
      }
    }
  }

  return undefined;
}

async function loadLegacyState(): Promise<LegacyState> {
  if (typeof window === 'undefined') {
    return {};
  }

  const state: LegacyState = {};

  for (const key of LEGACY_KEYS) {
    const fromStorage = readLegacyFromStorage<unknown>(key);
    if (fromStorage !== undefined) {
      state[key] = fromStorage;
      continue;
    }

    const fromGlobals = readLegacyFromGlobals<unknown>(key);
    if (fromGlobals !== undefined) {
      state[key] = fromGlobals;
    }
  }

  return state;
}

function ensureMedication(record: Medication): Medication {
  return normalizeMedicationRecord(record);
}

function ensureDose(record: MedicationDose): MedicationDose {
  let timestamp = normalizeTimestamp(record.timestamp);
  let createdAt = normalizeTimestamp(record.createdAt, timestamp);
  
  return {
    id: record.id,
    medicationId: record.medicationId,
    timestamp,
    doseAmount: record.doseAmount,
    route: record.route,
    notes: record.notes,
    createdAt
  };
}

function ensureMoodEntry(record: MoodEntry): MoodEntry {
  let timestamp = normalizeTimestamp(record.timestamp);
  let createdAt = normalizeTimestamp(record.createdAt, timestamp);
  
  return {
    id: record.id,
    timestamp,
    moodScore: record.moodScore,
    anxietyLevel: record.anxietyLevel,
    energyLevel: record.energyLevel,
    focusLevel: record.focusLevel,
    notes: record.notes,
    createdAt
  };
}

function ensureCognitiveTest(record: CognitiveTest): CognitiveTest {
  const timestamp = record.timestamp ?? Date.now();
  return {
    id: record.id,
    timestamp,
    matrices: record.matrices,
    totalScore: record.totalScore,
    averageResponseTime: record.averageResponseTime,
    accuracy: record.accuracy,
    createdAt: record.createdAt ?? timestamp
  };
}

export async function migrateLegacyData(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    console.log('[MoodPharma DB] Opening database...');
    await db.open();
    console.log('[MoodPharma DB] Database opened successfully');

    // First, check if database actually has data
    const [medicationsCount, dosesCount, moodCount, cognitiveCount] = await Promise.all([
      db.medications.count(),
      db.doses.count(),
      db.moodEntries.count(),
      db.cognitiveTests.count()
    ]);

    const totalCount = medicationsCount + dosesCount + moodCount + cognitiveCount;

    console.log('[MoodPharma DB] Current counts:', {
      medications: medicationsCount,
      doses: dosesCount,
      moodEntries: moodCount,
      cognitiveTests: cognitiveCount,
      total: totalCount
    });

    // If database has data, mark migration as complete and skip
    if (totalCount > 0) {
      console.log('[MoodPharma DB] ✅ Database has', totalCount, 'records, marking migration as complete');
      await db.metadata.put({
        key: MIGRATION_FLAG_KEY,
        value: true,
        updatedAt: Date.now()
      });
      return;
    }

    // Database is empty - check migration flag
    const migrationFlag = await db.metadata.get(MIGRATION_FLAG_KEY);
    console.log('[MoodPharma DB] Migration flag:', migrationFlag);

    if (migrationFlag?.value === true) {
      console.log('[MoodPharma DB] ⚠️ Migration flag is set but database is empty! Attempting migration anyway...');
      // Don't return - continue to attempt migration
    }

    console.log('[MoodPharma DB] Database is empty, checking for legacy data...');

    const legacyState = await loadLegacyState();
    const operations: Promise<unknown>[] = [];

    console.log('[MoodPharma DB] Legacy state found:', {
      medications: Array.isArray(legacyState.medications) ? legacyState.medications.length : 0,
      doses: Array.isArray(legacyState.doses) ? legacyState.doses.length : 0,
      moodEntries: Array.isArray(legacyState.moodEntries) ? legacyState.moodEntries.length : 0,
      cognitiveTests: Array.isArray(legacyState.cognitiveTests) ? legacyState.cognitiveTests.length : 0
    });

    const legacyMedications = legacyState.medications;
    if (Array.isArray(legacyMedications) && legacyMedications.length > 0) {
      console.log('[MoodPharma DB] Migrating', legacyMedications.length, 'medications');
      operations.push(db.medications.bulkPut(legacyMedications.map((record) => ensureMedication(record as Medication))));
    }

    const legacyDoses = legacyState.doses;
    if (Array.isArray(legacyDoses) && legacyDoses.length > 0) {
      console.log('[MoodPharma DB] Migrating', legacyDoses.length, 'doses');
      operations.push(db.doses.bulkPut(legacyDoses.map((record) => ensureDose(record as MedicationDose))));
    }

    const legacyMood = legacyState.moodEntries;
    if (Array.isArray(legacyMood) && legacyMood.length > 0) {
      console.log('[MoodPharma DB] Migrating', legacyMood.length, 'mood entries');
      operations.push(db.moodEntries.bulkPut(legacyMood.map((record) => ensureMoodEntry(record as MoodEntry))));
    }

    const legacyTests = legacyState.cognitiveTests;
    if (Array.isArray(legacyTests) && legacyTests.length > 0) {
      console.log('[MoodPharma DB] Migrating', legacyTests.length, 'cognitive tests');
      operations.push(db.cognitiveTests.bulkPut(legacyTests.map((record) => ensureCognitiveTest(record as CognitiveTest))));
    }

    if (operations.length > 0) {
      console.log('[MoodPharma DB] Running', operations.length, 'migration operations...');
      await Promise.all(operations);
      console.log('[MoodPharma DB] Migration completed successfully!');
    } else {
      console.log('[MoodPharma DB] No legacy data found to migrate');
    }

    await db.metadata.put({
      key: MIGRATION_FLAG_KEY,
      value: true,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('[MoodPharma DB] ❌ Failed to migrate legacy data', error);
  }
}
