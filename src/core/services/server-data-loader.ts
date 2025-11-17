/**
 * Server Data Loader
 *
 * Loads application data from server JSON file and syncs with local IndexedDB
 */

import { db } from '@/core/database/db';
import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '@/shared/types';
import { normalizeTimestamp } from '@/shared/utils/date-helpers';

export interface ServerData {
  version: string;
  lastUpdated: string;
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  cognitiveTests?: CognitiveTest[];
}

export interface LoadResult {
  success: boolean;
  version?: string;
  lastUpdated?: string;
  error?: string;
  stats?: {
    medications: number;
    doses: number;
    moodEntries: number;
    cognitiveTests: number;
  };
}

const SERVER_DATA_URL = '/data/app-data.json';
const LAST_SYNC_KEY = 'server_data_last_sync';
const LAST_SYNC_META_KEY = 'server_data_last_sync_ts';

async function getLocalSyncTimestamp(): Promise<number | null> {
  try {
    const record = await db.metadata.get(LAST_SYNC_META_KEY);
    if (!record) return null;
    if (typeof record.value === 'number') {
      return record.value;
    }
    if (typeof record.value === 'string') {
      const parsed = Number(record.value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  } catch (error) {
    console.warn('[ServerLoader] Could not read sync metadata', error);
    return null;
  }
}

async function setLocalSyncTimestamp(timestamp: number): Promise<void> {
  try {
    await db.metadata.put({
      key: LAST_SYNC_META_KEY,
      value: timestamp,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.warn('[ServerLoader] Could not persist sync metadata', error);
  }
}

/**
 * Get timestamp of last successful sync
 */
export function getLastSyncTime(): number | null {
  try {
    const value = localStorage.getItem(LAST_SYNC_KEY);
    return value ? parseInt(value, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Set timestamp of last successful sync
 */
function setLastSyncTime(timestamp: number): void {
  try {
    localStorage.setItem(LAST_SYNC_KEY, timestamp.toString());
  } catch (error) {
    console.warn('[ServerLoader] Could not save last sync time', error);
  }
}

/**
 * Fetch server data from JSON file
 */
async function fetchServerData(): Promise<ServerData> {
  const response = await fetch(SERVER_DATA_URL, {
    cache: 'no-store', // Always fetch fresh data
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  // Validate structure
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid server data format');
  }

  return data as ServerData;
}

/**
 * Sync server data with local IndexedDB
 * Strategy: Replace all local data with server data (full sync)
 */
async function syncWithLocalDB(serverData: ServerData): Promise<void> {
  console.log('[ServerLoader] Starting sync with local DB...');
  const parsedTimestamp = Date.parse(serverData.lastUpdated ?? '');
  const syncTimestamp = Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.now();

  // Clear existing data
  await db.medications.clear();
  await db.doses.clear();
  await db.moodEntries.clear();
  await db.cognitiveTests.clear();

  // Insert server data with normalization
  if (serverData.medications && serverData.medications.length > 0) {
    await db.medications.bulkAdd(serverData.medications);
    console.log(`[ServerLoader] Synced ${serverData.medications.length} medications`);
  }

  if (serverData.doses && serverData.doses.length > 0) {
    // Normalize timestamps before inserting
    const normalizedDoses = serverData.doses.map(dose => ({
      ...dose,
      timestamp: normalizeTimestamp(dose.timestamp),
      createdAt: normalizeTimestamp(dose.createdAt, dose.timestamp)
    }));
    await db.doses.bulkAdd(normalizedDoses);
    console.log(`[ServerLoader] Synced ${normalizedDoses.length} doses`);
  }

  if (serverData.moodEntries && serverData.moodEntries.length > 0) {
    // Normalize timestamps before inserting
    const normalizedMoodEntries = serverData.moodEntries.map(entry => ({
      ...entry,
      timestamp: normalizeTimestamp(entry.timestamp),
      createdAt: normalizeTimestamp(entry.createdAt, entry.timestamp)
    }));
    await db.moodEntries.bulkAdd(normalizedMoodEntries);
    console.log(`[ServerLoader] Synced ${normalizedMoodEntries.length} mood entries`);
  }

  if (serverData.cognitiveTests && serverData.cognitiveTests.length > 0) {
    await db.cognitiveTests.bulkAdd(serverData.cognitiveTests);
    console.log(`[ServerLoader] Synced ${serverData.cognitiveTests.length} cognitive tests`);
  }

  console.log('[ServerLoader] Sync complete!');
  await setLocalSyncTimestamp(syncTimestamp);
  setLastSyncTime(syncTimestamp);
}

/**
 * Load data from server and sync with local database
 *
 * @param force - Force reload even if recently synced
 * @returns Load result with stats
 */
export async function loadServerData(force = false): Promise<LoadResult> {
  try {
    // Check if recently synced (within last 5 minutes)
    const lastSync = getLastSyncTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (!force && lastSync && (now - lastSync) < fiveMinutes) {
      // CRITICAL FIX: Verify IndexedDB actually has data before trusting cache timestamp
      const hasLocalData = await checkLocalData();
      if (hasLocalData) {
        console.log('[ServerLoader] Skipping sync (recent sync within 5 min, data verified)');
        const stats = await getLocalStats();
        return {
          success: true,
          version: 'cached',
          lastUpdated: new Date(lastSync).toISOString(),
          stats
        };
      } else {
        console.warn('[ServerLoader] Cache timestamp exists but IndexedDB is empty! Forcing sync...');
        // Continue to fetch server data
      }
    }

    console.log('[ServerLoader] Fetching data from server...');
    const serverData = await fetchServerData();
    const fetchedAt = Date.now();
    const serverTimestamp = Date.parse(serverData.lastUpdated ?? '');
    const localSyncTimestamp = await getLocalSyncTimestamp();

    if (Number.isFinite(serverTimestamp) && localSyncTimestamp && serverTimestamp < localSyncTimestamp) {
      // CRITICAL FIX: Only keep local state if IndexedDB actually has data
      const hasLocalData = await checkLocalData();
      if (hasLocalData) {
        console.log('[ServerLoader] Server data is older than local cache, keeping local state');
        setLastSyncTime(fetchedAt);
        const stats = await getLocalStats();
        return {
          success: true,
          version: 'local-newer',
          lastUpdated: new Date(localSyncTimestamp).toISOString(),
          stats
        };
      } else {
        console.warn('[ServerLoader] Local timestamp newer but IndexedDB empty! Using server data...');
        // Continue to sync with server data
      }
    }

    console.log('[ServerLoader] Syncing with local database...');
    await syncWithLocalDB(serverData);

    return {
      success: true,
      version: serverData.version,
      lastUpdated: serverData.lastUpdated,
      stats: {
        medications: serverData.medications?.length ?? 0,
        doses: serverData.doses?.length ?? 0,
        moodEntries: serverData.moodEntries?.length ?? 0,
        cognitiveTests: serverData.cognitiveTests?.length ?? 0
      }
    };
  } catch (error) {
    console.warn('[ServerLoader] Failed to load server data:', error);

    // Check if there's local data available
    const hasLocalData = await checkLocalData();

    if (hasLocalData) {
      console.log('[ServerLoader] Using existing local data');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } else {
      console.error('[ServerLoader] No server data and no local data available');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Check if local database has any data
 */
async function checkLocalData(): Promise<boolean> {
  try {
    const medCount = await db.medications.count();
    const doseCount = await db.doses.count();
    const moodCount = await db.moodEntries.count();

    return (medCount + doseCount + moodCount) > 0;
  } catch {
    return false;
  }
}

async function getLocalStats(): Promise<{
  medications: number;
  doses: number;
  moodEntries: number;
  cognitiveTests: number;
}> {
  const [medications, doses, moodEntries, cognitiveTests] = await Promise.all([
    db.medications.count(),
    db.doses.count(),
    db.moodEntries.count(),
    db.cognitiveTests.count()
  ]);

  return {
    medications,
    doses,
    moodEntries,
    cognitiveTests
  };
}

/**
 * Export current local data to JSON format
 * (for manual backup/sync)
 */
export async function exportLocalData(): Promise<ServerData> {
  const [medications, doses, moodEntries, cognitiveTests] = await Promise.all([
    db.medications.toArray(),
    db.doses.toArray(),
    db.moodEntries.toArray(),
    db.cognitiveTests.toArray()
  ]);

  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    medications,
    doses,
    moodEntries,
    cognitiveTests
  };
}

/**
 * Save current local data to server
 * Sends POST request to /api/save-data endpoint
 */
export async function saveToServer(): Promise<{
  success: boolean;
  error?: string;
  stats?: { medications: number; doses: number; moodEntries: number; cognitiveTests: number };
}> {
  try {
    const data = await exportLocalData();

    const response = await fetch('/api/save-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(errorData.error || `Server returned ${response.status}`);
    }

    const result = await response.json();
    const acknowledgedAt =
      typeof result.timestamp === 'number'
        ? result.timestamp
        : (Number.isFinite(Date.parse(data.lastUpdated)) ? Date.parse(data.lastUpdated) : Date.now());
    await setLocalSyncTimestamp(acknowledgedAt);
    setLastSyncTime(acknowledgedAt);
    console.log('[ServerLoader] Data saved to server successfully:', result.stats);

    return {
      success: true,
      stats: result.stats
    };
  } catch (error) {
    console.warn('[ServerLoader] Failed to save to server:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
