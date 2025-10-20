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
}
