import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '@/shared/types';
import { getStoredValue, setStoredValue } from '@/core/storage/persistent-store';

type LegacyKey = 'medications' | 'doses' | 'moodEntries' | 'cognitiveTests';

type LegacyPayload = Partial<Record<LegacyKey, unknown>>;

const LEGACY_KEYS: LegacyKey[] = ['medications', 'doses', 'moodEntries', 'cognitiveTests'];
const MIGRATION_FLAG_KEY = 'legacyKvMigration';

function safeParse<T>(value: string | null): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('[kv-migration] failed to parse legacy value', error);
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
  const sources = [
    (window as Record<string, unknown>).__SPARK_KV_INITIAL_STATE__ as LegacyPayload,
    (window as Record<string, unknown>).__SPARK_KV_CACHE__ as LegacyPayload,
    (window as Record<string, unknown>).__SPARK_KV__ as LegacyPayload,
    (window as Record<string, unknown>).__sparkKV__ as LegacyPayload,
    (window as Record<string, unknown>).__sparkKv__ as LegacyPayload,
    (window as Record<string, unknown>).sparkKvInitialState as LegacyPayload,
    (window as Record<string, unknown>).sparkKvCache as LegacyPayload
  ].filter((candidate): candidate is LegacyPayload => Boolean(candidate));

  for (const source of sources) {
    if (source && typeof source === 'object' && key in source) {
      const value = source[key];
      if (value !== undefined) {
        return value as T;
      }
    }
  }

  return undefined;
}

async function loadLegacyState(): Promise<Partial<Record<LegacyKey, unknown>>> {
  if (typeof window === 'undefined') {
    return {};
  }

  const state: Partial<Record<LegacyKey, unknown>> = {};

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

function normalizeMedication(record: Medication): Medication {
  const now = Date.now();
  return {
    absorptionRate: record.absorptionRate ?? 1,
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? record.createdAt ?? now,
    therapeuticRange: record.therapeuticRange,
    notes: record.notes,
    id: record.id,
    name: record.name,
    brandName: record.brandName,
    category: record.category,
    halfLife: record.halfLife,
    volumeOfDistribution: record.volumeOfDistribution,
    bioavailability: record.bioavailability
  };
}

function normalizeDose(record: MedicationDose): MedicationDose {
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

function normalizeMoodEntry(record: MoodEntry): MoodEntry {
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

function normalizeCognitiveTest(record: CognitiveTest): CognitiveTest {
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

  const migrationCompleted = getStoredValue<boolean>(MIGRATION_FLAG_KEY);
  if (migrationCompleted) {
    return;
  }

  const legacyState = await loadLegacyState();
  let migrated = false;

  const currentMedications = getStoredValue<Medication[]>('medications') ?? [];
  if (currentMedications.length === 0) {
    const legacyMedications = legacyState.medications;
    if (Array.isArray(legacyMedications) && legacyMedications.length > 0) {
      const normalized = legacyMedications
        .map((record) => normalizeMedication(record as Medication));
      setStoredValue('medications', normalized);
      migrated = true;
    }
  }

  const currentDoses = getStoredValue<MedicationDose[]>('doses') ?? [];
  if (currentDoses.length === 0) {
    const legacyDoses = legacyState.doses;
    if (Array.isArray(legacyDoses) && legacyDoses.length > 0) {
      const normalized = legacyDoses
        .map((record) => normalizeDose(record as MedicationDose));
      setStoredValue('doses', normalized);
      migrated = true;
    }
  }

  const currentMoodEntries = getStoredValue<MoodEntry[]>('moodEntries') ?? [];
  if (currentMoodEntries.length === 0) {
    const legacyMood = legacyState.moodEntries;
    if (Array.isArray(legacyMood) && legacyMood.length > 0) {
      const normalized = legacyMood
        .map((record) => normalizeMoodEntry(record as MoodEntry));
      setStoredValue('moodEntries', normalized);
      migrated = true;
    }
  }

  const currentCognitiveTests = getStoredValue<CognitiveTest[]>('cognitiveTests') ?? [];
  if (currentCognitiveTests.length === 0) {
    const legacyTests = legacyState.cognitiveTests;
    if (Array.isArray(legacyTests) && legacyTests.length > 0) {
      const normalized = legacyTests
        .map((record) => normalizeCognitiveTest(record as CognitiveTest));
      setStoredValue('cognitiveTests', normalized);
      migrated = true;
    }
  }

  if (migrated) {
    console.info('[kv-migration] migrated legacy Spark data into local storage');
  }

  setStoredValue(MIGRATION_FLAG_KEY, true);
}
