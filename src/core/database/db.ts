import type { CognitiveTest, Medication, MedicationDose, MoodEntry } from '@/lib/types';

type TableName = 'medications' | 'doses' | 'moodEntries' | 'cognitiveTests';

const DB_NAME = 'mood-pharma-tracker';
const DB_VERSION = 1;
const KV_MIGRATION_FLAG = 'mood-pharma-indexeddb-migrated';
const BASE_KV_SERVICE_URL = '/_spark/kv';

let dbPromise: Promise<IDBDatabase> | null = null;
const dbEvents = new EventTarget();

const TABLE_EVENT: Record<TableName, string> = {
  medications: 'medications-changed',
  doses: 'doses-changed',
  moodEntries: 'moodEntries-changed',
  cognitiveTests: 'cognitiveTests-changed'
};

async function openDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains('medications')) {
          const store = db.createObjectStore('medications', { keyPath: 'id' });
          store.createIndex('byUpdatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('doses')) {
          const store = db.createObjectStore('doses', { keyPath: 'id' });
          store.createIndex('byMedicationId', 'medicationId', { unique: false });
          store.createIndex('byTimestamp', 'timestamp', { unique: false });
          store.createIndex('byMedicationAndTimestamp', ['medicationId', 'timestamp'], { unique: false });
        }

        if (!db.objectStoreNames.contains('moodEntries')) {
          const store = db.createObjectStore('moodEntries', { keyPath: 'id' });
          store.createIndex('byTimestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('cognitiveTests')) {
          const store = db.createObjectStore('cognitiveTests', { keyPath: 'id' });
          store.createIndex('byTimestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}

function emitChange(table: TableName) {
  const eventName = TABLE_EVENT[table];
  dbEvents.dispatchEvent(new Event(eventName));
}

function runTransaction<T>(table: TableName, mode: IDBTransactionMode, executor: (store: IDBObjectStore) => void): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(table, mode);
      const store = transaction.objectStore(table);
      let result: T | undefined;

      const requestResult = executor(store);
      if (requestResult !== undefined) {
        result = requestResult;
      }

      transaction.oncomplete = () => resolve(result as T);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    } catch (error) {
      reject(error);
    }
  });
}

async function getAllFromStore<T>(table: TableName): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(table, 'readonly');
    const store = transaction.objectStore(table);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function putRecord<T>(table: TableName, value: T) {
  await runTransaction<void>(table, 'readwrite', (store) => {
    store.put(value as any);
  });
  emitChange(table);
}

async function deleteRecord(table: TableName, id: string) {
  await runTransaction<void>(table, 'readwrite', (store) => {
    store.delete(id);
  });
  emitChange(table);
}

async function bulkPut<T>(table: TableName, values: T[]) {
  if (values.length === 0) return;
  await runTransaction<void>(table, 'readwrite', (store) => {
    for (const value of values) {
      store.put(value as any);
    }
  });
  emitChange(table);
}

async function deleteDosesForMedication(medicationId: string) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('doses', 'readwrite');
    const store = transaction.objectStore('doses');
    const index = store.index('byMedicationId');
    const request = index.openKeyCursor(IDBKeyRange.only(medicationId));

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      cursor.delete();
      cursor.continue();
    };

    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
  emitChange('doses');
}

export async function getMedications(): Promise<Medication[]> {
  const records = await getAllFromStore<Medication>('medications');
  return records.sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveMedication(medication: Medication) {
  await putRecord('medications', medication);
}

export async function removeMedication(id: string) {
  await deleteRecord('medications', id);
}

export async function getDoses(): Promise<MedicationDose[]> {
  const records = await getAllFromStore<MedicationDose>('doses');
  return records.sort((a, b) => a.timestamp - b.timestamp);
}

export async function saveDose(dose: MedicationDose) {
  await putRecord('doses', dose);
}

export async function removeDose(id: string) {
  await deleteRecord('doses', id);
}

export async function removeDosesByMedication(medicationId: string) {
  await deleteDosesForMedication(medicationId);
}

export async function getMoodEntries(): Promise<MoodEntry[]> {
  const records = await getAllFromStore<MoodEntry>('moodEntries');
  return records.sort((a, b) => a.timestamp - b.timestamp);
}

export async function saveMoodEntry(entry: MoodEntry) {
  await putRecord('moodEntries', entry);
}

export async function removeMoodEntry(id: string) {
  await deleteRecord('moodEntries', id);
}

export async function getCognitiveTests(): Promise<CognitiveTest[]> {
  const records = await getAllFromStore<CognitiveTest>('cognitiveTests');
  return records.sort((a, b) => a.timestamp - b.timestamp);
}

export async function saveCognitiveTest(test: CognitiveTest) {
  await putRecord('cognitiveTests', test);
}

export async function removeCognitiveTest(id: string) {
  await deleteRecord('cognitiveTests', id);
}

export async function subscribeToTable(table: TableName, callback: () => void) {
  const eventName = TABLE_EVENT[table];
  const handler = () => callback();
  dbEvents.addEventListener(eventName, handler);
  return () => dbEvents.removeEventListener(eventName, handler);
}

async function fetchKvKey<T>(key: string): Promise<T | undefined> {
  try {
    const response = await fetch(`${BASE_KV_SERVICE_URL}/${encodeURIComponent(key)}`);
    if (!response.ok) {
      if (response.status === 404) {
        return undefined;
      }
      throw new Error(`Failed to fetch KV key "${key}": ${response.status} ${response.statusText}`);
    }

    const payload = await response.text();
    return payload ? (JSON.parse(payload) as T) : undefined;
  } catch (error) {
    console.error('Failed to migrate key from KV', key, error);
    return undefined;
  }
}

export async function migrateKvToIndexedDb() {
  if (typeof window === 'undefined') return;

  const db = await openDatabase();
  void db; // ensure database is created before migration

  const alreadyMigrated = window.localStorage.getItem(KV_MIGRATION_FLAG);
  if (alreadyMigrated === 'true') {
    return;
  }

  const [medications, doses, moodEntries, cognitiveTests] = await Promise.all([
    getMedications(),
    getDoses(),
    getMoodEntries(),
    getCognitiveTests()
  ]);

  if (medications.length + doses.length + moodEntries.length + cognitiveTests.length > 0) {
    window.localStorage.setItem(KV_MIGRATION_FLAG, 'true');
    return;
  }

  const [kvMedications, kvDoses, kvMoodEntries, kvCognitiveTests] = await Promise.all([
    fetchKvKey<Medication[]>('medications'),
    fetchKvKey<MedicationDose[]>('doses'),
    fetchKvKey<MoodEntry[]>('moodEntries'),
    fetchKvKey<CognitiveTest[]>('cognitiveTests')
  ]);

  await bulkPut('medications', kvMedications ?? []);
  await bulkPut('doses', kvDoses ?? []);
  await bulkPut('moodEntries', kvMoodEntries ?? []);
  await bulkPut('cognitiveTests', kvCognitiveTests ?? []);

  window.localStorage.setItem(KV_MIGRATION_FLAG, 'true');
}

let initializationPromise: Promise<void> | null = null;

export function initializeDatabase() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      if (typeof window === 'undefined') return;
      try {
        await openDatabase();
        await migrateKvToIndexedDb();
      } catch (error) {
        console.error('Failed to initialize IndexedDB database', error);
        throw error;
      }
    })();
  }

  return initializationPromise;
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
