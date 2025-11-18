/**
 * Data Migration Utility
 * 
 * Migrates data from IndexedDB (browser storage) to server files.
 * This should be run once when switching from browser-first to server-first storage.
 */

import { db } from '@/core/database/db';
import * as serverApi from '@/core/services/server-api';

export interface MigrationResult {
  success: boolean;
  medications: {
    total: number;
    migrated: number;
    errors: number;
  };
  doses: {
    total: number;
    migrated: number;
    errors: number;
  };
  moodEntries: {
    total: number;
    migrated: number;
    errors: number;
  };
  cognitiveTests: {
    total: number;
    migrated: number;
    errors: number;
  };
  errors: string[];
}

/**
 * Migrate all data from IndexedDB to server
 */
export async function migrateDataToServer(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    medications: { total: 0, migrated: 0, errors: 0 },
    doses: { total: 0, migrated: 0, errors: 0 },
    moodEntries: { total: 0, migrated: 0, errors: 0 },
    cognitiveTests: { total: 0, migrated: 0, errors: 0 },
    errors: []
  };

  try {
    console.log('[Migration] Starting data migration from IndexedDB to server...');

    // Check server health first
    const serverHealthy = await serverApi.checkServerHealth();
    if (!serverHealthy) {
      throw new Error('Server is not available. Please ensure the API server is running on port 3001.');
    }

    // Migrate medications
    console.log('[Migration] Migrating medications...');
    const medications = await db.medications.toArray();
    result.medications.total = medications.length;
    
    for (const medication of medications) {
      try {
        await serverApi.createMedication(medication);
        result.medications.migrated++;
      } catch (error) {
        result.medications.errors++;
        const errorMsg = `Failed to migrate medication ${medication.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.warn(errorMsg);
      }
    }

    // Migrate doses
    console.log('[Migration] Migrating doses...');
    const doses = await db.doses.toArray();
    result.doses.total = doses.length;
    
    for (const dose of doses) {
      try {
        await serverApi.createDose(dose);
        result.doses.migrated++;
      } catch (error) {
        result.doses.errors++;
        const errorMsg = `Failed to migrate dose ${dose.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.warn(errorMsg);
      }
    }

    // Migrate mood entries
    console.log('[Migration] Migrating mood entries...');
    const moodEntries = await db.moodEntries.toArray();
    result.moodEntries.total = moodEntries.length;
    
    for (const entry of moodEntries) {
      try {
        await serverApi.createMoodEntry(entry);
        result.moodEntries.migrated++;
      } catch (error) {
        result.moodEntries.errors++;
        const errorMsg = `Failed to migrate mood entry ${entry.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.warn(errorMsg);
      }
    }

    // Migrate cognitive tests
    console.log('[Migration] Migrating cognitive tests...');
    const cognitiveTests = await db.cognitiveTests.toArray();
    result.cognitiveTests.total = cognitiveTests.length;
    
    for (const test of cognitiveTests) {
      try {
        await serverApi.createCognitiveTest(test);
        result.cognitiveTests.migrated++;
      } catch (error) {
        result.cognitiveTests.errors++;
        const errorMsg = `Failed to migrate cognitive test ${test.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.warn(errorMsg);
      }
    }

    const totalMigrated = 
      result.medications.migrated + 
      result.doses.migrated + 
      result.moodEntries.migrated + 
      result.cognitiveTests.migrated;

    const totalErrors = 
      result.medications.errors + 
      result.doses.errors + 
      result.moodEntries.errors + 
      result.cognitiveTests.errors;

    result.success = totalErrors === 0;

    console.log('[Migration] Migration complete!', {
      migrated: totalMigrated,
      errors: totalErrors
    });

    return result;
  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMsg);
    console.error('[Migration]', errorMsg);
    return result;
  }
}

/**
 * Check if IndexedDB has any data that needs migration
 */
export async function checkForMigrationData(): Promise<{
  hasData: boolean;
  counts: {
    medications: number;
    doses: number;
    moodEntries: number;
    cognitiveTests: number;
  };
}> {
  try {
    const [medications, doses, moodEntries, cognitiveTests] = await Promise.all([
      db.medications.count(),
      db.doses.count(),
      db.moodEntries.count(),
      db.cognitiveTests.count()
    ]);

    const total = medications + doses + moodEntries + cognitiveTests;

    return {
      hasData: total > 0,
      counts: {
        medications,
        doses,
        moodEntries,
        cognitiveTests
      }
    };
  } catch (error) {
    console.error('[Migration] Failed to check for migration data:', error);
    return {
      hasData: false,
      counts: {
        medications: 0,
        doses: 0,
        moodEntries: 0,
        cognitiveTests: 0
      }
    };
  }
}

/**
 * Clear IndexedDB after successful migration
 * CAUTION: This will permanently delete all local data!
 */
export async function clearLocalData(): Promise<void> {
  console.warn('[Migration] Clearing local IndexedDB data...');
  
  await db.medications.clear();
  await db.doses.clear();
  await db.moodEntries.clear();
  await db.cognitiveTests.clear();
  
  console.log('[Migration] Local data cleared successfully');
}
