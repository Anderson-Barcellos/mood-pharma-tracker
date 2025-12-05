/**
 * Backend Endpoint: Save Data
 *
 * POST /api/save-data
 * Receives JSON data and saves to /public/data/app-data.json
 *
 * Usage with Express:
 * ```js
 * const express = require('express');
 * const saveDataHandler = require('./api/save-data.js');
 * app.post('/api/save-data', saveDataHandler);
 * ```
 *
 * Usage standalone:
 * ```bash
 * node api/save-data.js
 * # Runs Express server on port 3001
 * ```
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../public/data');
const SNAPSHOT_FILE = path.join(DATA_DIR, 'app-data.json');

function nowISO() {
  return new Date().toISOString();
}

function createEmptySnapshot() {
  return {
    version: '1.0.0',
    lastUpdated: nowISO(),
    medications: [],
    doses: [],
    moodEntries: [],
    cognitiveTests: []
  };
}

async function ensureDataFileExists() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(SNAPSHOT_FILE);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(SNAPSHOT_FILE, JSON.stringify(createEmptySnapshot(), null, 2), 'utf8');
    } else {
      throw error;
    }
  }
}

export async function readSnapshot() {
  await ensureDataFileExists();
  try {
    const fileContent = await fs.readFile(SNAPSHOT_FILE, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const empty = createEmptySnapshot();
      await fs.writeFile(SNAPSHOT_FILE, JSON.stringify(empty, null, 2), 'utf8');
      return empty;
    }
    throw error;
  }
}

/**
 * Validate timestamp
 * Returns true if timestamp is a valid number within reasonable range
 */
function validateTimestamp(ts) {
  if (typeof ts !== 'number') return false;
  if (!Number.isFinite(ts)) return false;
  if (ts < 0) return false;
  
  // Timestamp não pode ser muito antigo (antes de 2000) ou muito futuro (depois de 2100)
  const minTimestamp = new Date('2000-01-01').getTime();
  const maxTimestamp = new Date('2100-01-01').getTime();
  
  return ts >= minTimestamp && ts <= maxTimestamp;
}

/**
 * Validate data structure
 */
function validateData(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data must be an object' };
  }

  // Required fields
  const requiredFields = ['version', 'lastUpdated', 'medications', 'doses', 'moodEntries'];

  for (const field of requiredFields) {
    if (!(field in data)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  // Check array types
  if (!Array.isArray(data.medications)) {
    return { valid: false, error: 'medications must be an array' };
  }
  if (!Array.isArray(data.doses)) {
    return { valid: false, error: 'doses must be an array' };
  }
  if (!Array.isArray(data.moodEntries)) {
    return { valid: false, error: 'moodEntries must be an array' };
  }

  if (typeof data.lastUpdated !== 'string') {
    return { valid: false, error: 'lastUpdated must be an ISO string' };
  }

  // Validate timestamps in doses
  if (Array.isArray(data.doses)) {
    for (const dose of data.doses) {
      if (!validateTimestamp(dose.timestamp)) {
        return { valid: false, error: `Invalid timestamp in dose ${dose.id || 'unknown'}` };
      }
      if (!validateTimestamp(dose.createdAt)) {
        return { valid: false, error: `Invalid createdAt in dose ${dose.id || 'unknown'}` };
      }
    }
  }

  // Validate timestamps in moodEntries
  if (Array.isArray(data.moodEntries)) {
    for (const entry of data.moodEntries) {
      if (!validateTimestamp(entry.timestamp)) {
        return { valid: false, error: `Invalid timestamp in mood entry ${entry.id || 'unknown'}` };
      }
      if (!validateTimestamp(entry.createdAt)) {
        return { valid: false, error: `Invalid createdAt in mood entry ${entry.id || 'unknown'}` };
      }
    }
  }

  return { valid: true };
}

/**
 * Express request handler
 */
async function saveDataHandler(req, res) {
  try {
    const data = req.body;

    // Validate
    const validation = validateData(data);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const incomingTimestamp = Date.parse(data.lastUpdated);
    if (!Number.isFinite(incomingTimestamp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid lastUpdated timestamp'
      });
    }

    await ensureDataFileExists();

    // Save to file
    let existingSnapshot;
    let existingTimestamp = null;
    try {
      const currentContent = await fs.readFile(SNAPSHOT_FILE, 'utf8');
      existingSnapshot = JSON.parse(currentContent);
      if (existingSnapshot && typeof existingSnapshot.lastUpdated === 'string') {
        const parsedExisting = Date.parse(existingSnapshot.lastUpdated);
        if (Number.isFinite(parsedExisting)) {
          existingTimestamp = parsedExisting;
        }
      }
    } catch (readError) {
      if (readError.code !== 'ENOENT') {
        console.warn('[API] Could not read current snapshot:', readError);
      }
    }


    if (existingSnapshot) {
      const backupStamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(DATA_DIR, `app-data-${backupStamp}.json`);
      try {
        await fs.writeFile(backupPath, JSON.stringify(existingSnapshot, null, 2), 'utf8');
        console.log(`[API] Backup saved: ${backupPath}`);
      } catch (backupError) {
        console.warn('[API] Failed to write backup snapshot:', backupError);
      }
    }

    const jsonContent = JSON.stringify(data, null, 2);
    await fs.writeFile(SNAPSHOT_FILE, jsonContent, 'utf8');

    console.log(`[API] Data saved successfully: ${data.medications.length} meds, ${data.doses.length} doses, ${data.moodEntries.length} moods`);

    res.json({
      success: true,
      timestamp: Date.now(),
      data,
      lastUpdated: data.lastUpdated,
      version: data.version,
      stats: {
        medications: data.medications.length,
        doses: data.doses.length,
        moodEntries: data.moodEntries.length,
        cognitiveTests: data.cognitiveTests?.length ?? 0
      }
    });
  } catch (error) {
    console.error('[API] Save error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Express handler to load current snapshot
 */
export async function loadDataHandler(_req, res) {
  try {
    const snapshot = await readSnapshot();
    res.json({
      success: true,
      data: snapshot,
      lastUpdated: snapshot.lastUpdated,
      version: snapshot.version
    });
  } catch (error) {
    console.error('[API] Load error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Export for use with Express
export default saveDataHandler;

// Standalone server (if run directly)
import express from 'express';

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '10mb' }));

  // CORS for development
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Router scoped under /api
  const api = express.Router();
  api.get('/app-data', loadDataHandler);
  api.post('/app-data', saveDataHandler);
  api.post('/save-data', saveDataHandler); // legacy
  api.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'mood-pharma-api' });
  });
  app.use('/api', api);

  const PORT = process.env.API_PORT || 8113;
  const server = app.listen(PORT, () => {
    console.log(`[API] Server running on http://localhost:${PORT}`);
    console.log(`[API] POST /api/save-data - Save application data`);
    console.log(`[API] GET /api/health - Health check`);
  });

  // Prevent the process from exiting in environments where the HTTP server is unref'd
  // (observed on some Node/Express combos with ESM). This keeps the event loop alive.
  if (server) {
    setInterval(() => {}, 60_000);
  }
}
