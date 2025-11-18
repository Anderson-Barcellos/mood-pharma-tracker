/**
 * Backend API Server
 * 
 * Full REST API for medications, doses, mood entries, and cognitive tests.
 * Uses file-based storage in /public/data/ directory.
 * 
 * Usage:
 * ```bash
 * node api/server.js
 * # Runs Express server on port 3001
 * ```
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import rateLimit from 'express-rate-limit';

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all API routes
app.use('/api/', limiter);

// Middleware
app.use(express.json({ limit: '10mb' }));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Data file paths
const DATA_DIR = path.join(__dirname, '../public/data');
const MEDICATIONS_FILE = path.join(DATA_DIR, 'medications.json');
const DOSES_FILE = path.join(DATA_DIR, 'doses.json');
const MOOD_ENTRIES_FILE = path.join(DATA_DIR, 'mood-entries.json');
const COGNITIVE_TESTS_FILE = path.join(DATA_DIR, 'cognitive-tests.json');

// Ensure data directory exists
async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// Read JSON file with fallback to empty array
async function readJSONFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Write JSON file with backup
async function writeJSONFile(filePath, data) {
  // Create backup if file exists
  try {
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    if (exists) {
      const backupPath = filePath.replace('.json', `-backup-${Date.now()}.json`);
      await fs.copyFile(filePath, backupPath);
      console.log(`[API] Backup created: ${backupPath}`);
    }
  } catch (error) {
    console.warn('[API] Failed to create backup:', error);
  }

  // Write new data
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ===== MEDICATIONS ENDPOINTS =====

// GET /api/medications - List all medications
app.get('/api/medications', async (req, res) => {
  try {
    const medications = await readJSONFile(MEDICATIONS_FILE);
    res.json(medications);
  } catch (error) {
    console.error('[API] Error reading medications:', error);
    res.status(500).json({ error: 'Failed to read medications' });
  }
});

// GET /api/medications/:id - Get single medication
app.get('/api/medications/:id', async (req, res) => {
  try {
    const medications = await readJSONFile(MEDICATIONS_FILE);
    const medication = medications.find(m => m.id === req.params.id);
    
    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    
    res.json(medication);
  } catch (error) {
    console.error('[API] Error reading medication:', error);
    res.status(500).json({ error: 'Failed to read medication' });
  }
});

// POST /api/medications - Create medication
app.post('/api/medications', async (req, res) => {
  try {
    const newMedication = req.body;
    
    // Validation
    if (!newMedication.id || !newMedication.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const medications = await readJSONFile(MEDICATIONS_FILE);
    
    // Check for duplicate ID
    if (medications.some(m => m.id === newMedication.id)) {
      return res.status(409).json({ error: 'Medication with this ID already exists' });
    }
    
    medications.push(newMedication);
    await writeJSONFile(MEDICATIONS_FILE, medications);
    
    console.log(`[API] Created medication: ${newMedication.name} (${newMedication.id})`);
    res.status(201).json(newMedication);
  } catch (error) {
    console.error('[API] Error creating medication:', error);
    res.status(500).json({ error: 'Failed to create medication' });
  }
});

// PUT /api/medications/:id - Update medication
app.put('/api/medications/:id', async (req, res) => {
  try {
    const medications = await readJSONFile(MEDICATIONS_FILE);
    const index = medications.findIndex(m => m.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    
    medications[index] = { ...medications[index], ...req.body, id: req.params.id };
    await writeJSONFile(MEDICATIONS_FILE, medications);
    
    console.log(`[API] Updated medication: ${req.params.id}`);
    res.json(medications[index]);
  } catch (error) {
    console.error('[API] Error updating medication:', error);
    res.status(500).json({ error: 'Failed to update medication' });
  }
});

// DELETE /api/medications/:id - Delete medication
app.delete('/api/medications/:id', async (req, res) => {
  try {
    const medications = await readJSONFile(MEDICATIONS_FILE);
    const index = medications.findIndex(m => m.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    
    const deleted = medications.splice(index, 1)[0];
    await writeJSONFile(MEDICATIONS_FILE, medications);
    
    // Also delete related doses
    const doses = await readJSONFile(DOSES_FILE);
    const filteredDoses = doses.filter(d => d.medicationId !== req.params.id);
    if (filteredDoses.length !== doses.length) {
      await writeJSONFile(DOSES_FILE, filteredDoses);
      console.log(`[API] Deleted ${doses.length - filteredDoses.length} doses for medication ${req.params.id}`);
    }
    
    console.log(`[API] Deleted medication: ${req.params.id}`);
    res.json(deleted);
  } catch (error) {
    console.error('[API] Error deleting medication:', error);
    res.status(500).json({ error: 'Failed to delete medication' });
  }
});

// ===== DOSES ENDPOINTS =====

// GET /api/doses - List all doses (with optional medicationId filter)
app.get('/api/doses', async (req, res) => {
  try {
    let doses = await readJSONFile(DOSES_FILE);
    
    // Filter by medicationId if provided
    if (req.query.medicationId) {
      doses = doses.filter(d => d.medicationId === req.query.medicationId);
    }
    
    res.json(doses);
  } catch (error) {
    console.error('[API] Error reading doses:', error);
    res.status(500).json({ error: 'Failed to read doses' });
  }
});

// GET /api/doses/:id - Get single dose
app.get('/api/doses/:id', async (req, res) => {
  try {
    const doses = await readJSONFile(DOSES_FILE);
    const dose = doses.find(d => d.id === req.params.id);
    
    if (!dose) {
      return res.status(404).json({ error: 'Dose not found' });
    }
    
    res.json(dose);
  } catch (error) {
    console.error('[API] Error reading dose:', error);
    res.status(500).json({ error: 'Failed to read dose' });
  }
});

// POST /api/doses - Create dose
app.post('/api/doses', async (req, res) => {
  try {
    const newDose = req.body;
    
    // Validation
    if (!newDose.id || !newDose.medicationId || newDose.doseAmount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const doses = await readJSONFile(DOSES_FILE);
    
    // Check for duplicate ID
    if (doses.some(d => d.id === newDose.id)) {
      return res.status(409).json({ error: 'Dose with this ID already exists' });
    }
    
    doses.push(newDose);
    await writeJSONFile(DOSES_FILE, doses);
    
    console.log(`[API] Created dose: ${newDose.doseAmount}mg for medication ${newDose.medicationId}`);
    res.status(201).json(newDose);
  } catch (error) {
    console.error('[API] Error creating dose:', error);
    res.status(500).json({ error: 'Failed to create dose' });
  }
});

// PUT /api/doses/:id - Update dose
app.put('/api/doses/:id', async (req, res) => {
  try {
    const doses = await readJSONFile(DOSES_FILE);
    const index = doses.findIndex(d => d.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Dose not found' });
    }
    
    doses[index] = { ...doses[index], ...req.body, id: req.params.id };
    await writeJSONFile(DOSES_FILE, doses);
    
    console.log(`[API] Updated dose: ${req.params.id}`);
    res.json(doses[index]);
  } catch (error) {
    console.error('[API] Error updating dose:', error);
    res.status(500).json({ error: 'Failed to update dose' });
  }
});

// DELETE /api/doses/:id - Delete dose
app.delete('/api/doses/:id', async (req, res) => {
  try {
    const doses = await readJSONFile(DOSES_FILE);
    const index = doses.findIndex(d => d.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Dose not found' });
    }
    
    const deleted = doses.splice(index, 1)[0];
    await writeJSONFile(DOSES_FILE, doses);
    
    console.log(`[API] Deleted dose: ${req.params.id}`);
    res.json(deleted);
  } catch (error) {
    console.error('[API] Error deleting dose:', error);
    res.status(500).json({ error: 'Failed to delete dose' });
  }
});

// ===== MOOD ENTRIES ENDPOINTS =====

// GET /api/mood-entries - List all mood entries
app.get('/api/mood-entries', async (req, res) => {
  try {
    const moodEntries = await readJSONFile(MOOD_ENTRIES_FILE);
    res.json(moodEntries);
  } catch (error) {
    console.error('[API] Error reading mood entries:', error);
    res.status(500).json({ error: 'Failed to read mood entries' });
  }
});

// GET /api/mood-entries/:id - Get single mood entry
app.get('/api/mood-entries/:id', async (req, res) => {
  try {
    const moodEntries = await readJSONFile(MOOD_ENTRIES_FILE);
    const entry = moodEntries.find(e => e.id === req.params.id);
    
    if (!entry) {
      return res.status(404).json({ error: 'Mood entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    console.error('[API] Error reading mood entry:', error);
    res.status(500).json({ error: 'Failed to read mood entry' });
  }
});

// POST /api/mood-entries - Create mood entry
app.post('/api/mood-entries', async (req, res) => {
  try {
    const newEntry = req.body;
    
    // Validation
    if (!newEntry.id || newEntry.moodScore === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const moodEntries = await readJSONFile(MOOD_ENTRIES_FILE);
    
    // Check for duplicate ID
    if (moodEntries.some(e => e.id === newEntry.id)) {
      return res.status(409).json({ error: 'Mood entry with this ID already exists' });
    }
    
    moodEntries.push(newEntry);
    await writeJSONFile(MOOD_ENTRIES_FILE, moodEntries);
    
    console.log(`[API] Created mood entry: ${newEntry.id} (score: ${newEntry.moodScore})`);
    res.status(201).json(newEntry);
  } catch (error) {
    console.error('[API] Error creating mood entry:', error);
    res.status(500).json({ error: 'Failed to create mood entry' });
  }
});

// PUT /api/mood-entries/:id - Update mood entry
app.put('/api/mood-entries/:id', async (req, res) => {
  try {
    const moodEntries = await readJSONFile(MOOD_ENTRIES_FILE);
    const index = moodEntries.findIndex(e => e.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Mood entry not found' });
    }
    
    moodEntries[index] = { ...moodEntries[index], ...req.body, id: req.params.id };
    await writeJSONFile(MOOD_ENTRIES_FILE, moodEntries);
    
    console.log(`[API] Updated mood entry: ${req.params.id}`);
    res.json(moodEntries[index]);
  } catch (error) {
    console.error('[API] Error updating mood entry:', error);
    res.status(500).json({ error: 'Failed to update mood entry' });
  }
});

// DELETE /api/mood-entries/:id - Delete mood entry
app.delete('/api/mood-entries/:id', async (req, res) => {
  try {
    const moodEntries = await readJSONFile(MOOD_ENTRIES_FILE);
    const index = moodEntries.findIndex(e => e.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Mood entry not found' });
    }
    
    const deleted = moodEntries.splice(index, 1)[0];
    await writeJSONFile(MOOD_ENTRIES_FILE, moodEntries);
    
    console.log(`[API] Deleted mood entry: ${req.params.id}`);
    res.json(deleted);
  } catch (error) {
    console.error('[API] Error deleting mood entry:', error);
    res.status(500).json({ error: 'Failed to delete mood entry' });
  }
});

// ===== COGNITIVE TESTS ENDPOINTS =====

// GET /api/cognitive-tests - List all cognitive tests
app.get('/api/cognitive-tests', async (req, res) => {
  try {
    const cognitiveTests = await readJSONFile(COGNITIVE_TESTS_FILE);
    res.json(cognitiveTests);
  } catch (error) {
    console.error('[API] Error reading cognitive tests:', error);
    res.status(500).json({ error: 'Failed to read cognitive tests' });
  }
});

// POST /api/cognitive-tests - Create cognitive test
app.post('/api/cognitive-tests', async (req, res) => {
  try {
    const newTest = req.body;
    
    if (!newTest.id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const cognitiveTests = await readJSONFile(COGNITIVE_TESTS_FILE);
    
    if (cognitiveTests.some(t => t.id === newTest.id)) {
      return res.status(409).json({ error: 'Cognitive test with this ID already exists' });
    }
    
    cognitiveTests.push(newTest);
    await writeJSONFile(COGNITIVE_TESTS_FILE, cognitiveTests);
    
    console.log(`[API] Created cognitive test: ${newTest.id}`);
    res.status(201).json(newTest);
  } catch (error) {
    console.error('[API] Error creating cognitive test:', error);
    res.status(500).json({ error: 'Failed to create cognitive test' });
  }
});

// DELETE /api/cognitive-tests/:id - Delete cognitive test
app.delete('/api/cognitive-tests/:id', async (req, res) => {
  try {
    const cognitiveTests = await readJSONFile(COGNITIVE_TESTS_FILE);
    const index = cognitiveTests.findIndex(t => t.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Cognitive test not found' });
    }
    
    const deleted = cognitiveTests.splice(index, 1)[0];
    await writeJSONFile(COGNITIVE_TESTS_FILE, cognitiveTests);
    
    console.log(`[API] Deleted cognitive test: ${req.params.id}`);
    res.json(deleted);
  } catch (error) {
    console.error('[API] Error deleting cognitive test:', error);
    res.status(500).json({ error: 'Failed to delete cognitive test' });
  }
});

// ===== LEGACY COMPATIBILITY ENDPOINT =====

// POST /api/save-data - Legacy bulk save endpoint (for backwards compatibility)
import saveDataHandler from './save-data.js';
app.post('/api/save-data', saveDataHandler);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'mood-pharma-api',
    endpoints: {
      medications: '/api/medications',
      doses: '/api/doses',
      moodEntries: '/api/mood-entries',
      cognitiveTests: '/api/cognitive-tests'
    }
  });
});

// Start server
const PORT = process.env.API_PORT || 3001;

ensureDataDir().then(() => {
  app.listen(PORT, () => {
    console.log(`[API] Server running on http://localhost:${PORT}`);
    console.log(`[API] Endpoints available:`);
    console.log(`[API]   GET/POST/PUT/DELETE /api/medications`);
    console.log(`[API]   GET/POST/PUT/DELETE /api/doses`);
    console.log(`[API]   GET/POST/PUT/DELETE /api/mood-entries`);
    console.log(`[API]   GET/POST/DELETE /api/cognitive-tests`);
    console.log(`[API]   GET /api/health - Health check`);
  });
}).catch(error => {
  console.error('[API] Failed to start server:', error);
  process.exit(1);
});
