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

    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../public/data');
    await fs.mkdir(dataDir, { recursive: true });

    // Save to file
    const filePath = path.join(dataDir, 'app-data.json');
    let existingSnapshot;
    let existingTimestamp = null;
    try {
      const currentContent = await fs.readFile(filePath, 'utf8');
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

    if (existingTimestamp && incomingTimestamp <= existingTimestamp) {
      return res.status(409).json({
        success: false,
        error: 'Incoming data is older than current snapshot'
      });
    }

    if (existingSnapshot) {
      const backupStamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(dataDir, `app-data-${backupStamp}.json`);
      try {
        await fs.writeFile(backupPath, JSON.stringify(existingSnapshot, null, 2), 'utf8');
        console.log(`[API] Backup saved: ${backupPath}`);
      } catch (backupError) {
        console.warn('[API] Failed to write backup snapshot:', backupError);
      }
    }

    const jsonContent = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonContent, 'utf8');

    console.log(`[API] Data saved successfully: ${data.medications.length} meds, ${data.doses.length} doses, ${data.moodEntries.length} moods`);

    res.json({
      success: true,
      timestamp: Date.now(),
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

  // Route
  app.post('/api/save-data', saveDataHandler);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'mood-pharma-api' });
  });

  const PORT = process.env.API_PORT || 3001;
  app.listen(PORT, () => {
    console.log(`[API] Server running on http://localhost:${PORT}`);
    console.log(`[API] POST /api/save-data - Save application data`);
    console.log(`[API] GET /api/health - Health check`);
  });
}
