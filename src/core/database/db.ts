import Dexie, { type Table } from 'dexie';
import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '@/lib/types';

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
    (window as Record<string, unknown>).__SPARK_KV_INITIAL_STATE__ as LegacyPayload,
    (window as Record<string, unknown>).__SPARK_KV_CACHE__ as LegacyPayload,
    (window as Record<string, unknown>).__SPARK_KV__ as LegacyPayload,
    (window as Record<string, unknown>).__sparkKV__ as LegacyPayload,
    (window as Record<string, unknown>).__sparkKv__ as LegacyPayload,
    (window as Record<string, unknown>).sparkKvInitialState as LegacyPayload,
    (window as Record<string, unknown>).sparkKvCache as LegacyPayload
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
  const now = Date.now();
  return {
    absorptionRate: record.absorptionRate ?? 1,
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? record.createdAt ?? now,
    notes: record.notes,
    therapeuticRange: record.therapeuticRange,
    id: record.id,
    name: record.name,
    brandName: record.brandName,
    category: record.category,
    halfLife: record.halfLife,
    volumeOfDistribution: record.volumeOfDistribution,
    bioavailability: record.bioavailability
  };
}

function ensureDose(record: MedicationDose): MedicationDose {
  const timestamp = record.timestamp ?? Date.now();
  return {
    id: record.id,
    medicationId: record.medicationId,
    timestamp,
    doseAmount: record.doseAmount,
    route: record.route,
    notes: record.notes,
    createdAt: record.createdAt ?? timestamp
  };
}

function ensureMoodEntry(record: MoodEntry): MoodEntry {
  const timestamp = record.timestamp ?? Date.now();
  return {
    id: record.id,
    timestamp,
    moodScore: record.moodScore,
    anxietyLevel: record.anxietyLevel,
    energyLevel: record.energyLevel,
    focusLevel: record.focusLevel,
    notes: record.notes,
    createdAt: record.createdAt ?? timestamp
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
    await db.open();

    const migrationFlag = await db.metadata.get(MIGRATION_FLAG_KEY);
    if (migrationFlag?.value === true) {
      return;
    }

    const [medicationsCount, dosesCount, moodCount, cognitiveCount] = await Promise.all([
      db.medications.count(),
      db.doses.count(),
      db.moodEntries.count(),
      db.cognitiveTests.count()
    ]);

    if (medicationsCount + dosesCount + moodCount + cognitiveCount > 0) {
      await db.metadata.put({
        key: MIGRATION_FLAG_KEY,
        value: true,
        updatedAt: Date.now()
      });
      return;
    }

    const legacyState = await loadLegacyState();
    const operations: Promise<unknown>[] = [];

    const legacyMedications = legacyState.medications;
    if (Array.isArray(legacyMedications) && legacyMedications.length > 0) {
      operations.push(db.medications.bulkPut(legacyMedications.map((record) => ensureMedication(record as Medication))));
    }

    const legacyDoses = legacyState.doses;
    if (Array.isArray(legacyDoses) && legacyDoses.length > 0) {
      operations.push(db.doses.bulkPut(legacyDoses.map((record) => ensureDose(record as MedicationDose))));
    }

    const legacyMood = legacyState.moodEntries;
    if (Array.isArray(legacyMood) && legacyMood.length > 0) {
      operations.push(db.moodEntries.bulkPut(legacyMood.map((record) => ensureMoodEntry(record as MoodEntry))));
    }

    const legacyTests = legacyState.cognitiveTests;
    if (Array.isArray(legacyTests) && legacyTests.length > 0) {
      operations.push(db.cognitiveTests.bulkPut(legacyTests.map((record) => ensureCognitiveTest(record as CognitiveTest))));
    }

    if (operations.length > 0) {
      await Promise.all(operations);
    }

    await db.metadata.put({
      key: MIGRATION_FLAG_KEY,
      value: true,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('[dexie-migration] Failed to migrate legacy data', error);
  }
}
