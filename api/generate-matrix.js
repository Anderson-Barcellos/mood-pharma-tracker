/**
 * Backend Endpoint: Generate Matrix
 *
 * POST /api/generate-matrix
 * Generates Raven's Progressive Matrices using Google Gemini 2.5 Pro
 *
 * Request body: { difficulty: 'normal' | 'difficult' }
 * Response: { matrix, options, correctAnswerIndex, explanation, patterns }
 */

/**
 * Prompt configurations for different difficulty levels
 */
const PROMPTS = {
  normal: {
    systemContext: `You are an expert in psychometrics creating Raven's Progressive Matrices.
Your task is to generate clear, logical puzzles suitable for cognitive assessment.`,

    taskDescription: `TASK: Generate a 3x3 matrix puzzle where cells follow logical patterns. The 9th cell (bottom-right) is missing.`,

    difficultyInstructions: `DIFFICULTY: Normal
- Use 1-2 clear and obvious patterns
- Keep transformations simple and easy to identify
- Patterns should be immediately visible to the user
- Avoid combining multiple transformations`,

    patternRules: `PATTERN RULES (choose 1-2):
1. Shape progression: cycle through shapes in order (circle → square → triangle → diamond → cross)
2. Rotation progression: rotate by consistent increments (e.g., +45° each step)
3. Size progression: grow or shrink consistently (0.4 → 0.6 → 0.8)
4. Fill progression: cycle through fill types (solid → outline → striped)
5. Color progression: cycle through colors (dark → medium → light)
6. Positional patterns: patterns within rows, columns, or diagonals

RECOMMENDED PATTERNS FOR NORMAL:
- Row-based repetition (same pattern in each row)
- Column-based progression (consistent change down columns)
- Single attribute variation (only one property changes)`,

    outputFormat: `SHAPE DEFINITION:
{
  "shape": "circle" | "square" | "triangle" | "cross" | "diamond",
  "color": "#374151" | "#9ca3af" | "#f3f4f6",  // gray-700, gray-400, gray-100
  "fill": "solid" | "outline" | "striped",
  "size": 0.4 | 0.6 | 0.8,  // relative to cell size (small, medium, large)
  "rotation": 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315  // degrees
}

OUTPUT FORMAT (JSON only, no markdown):
{
  "matrix": [ShapeDefinition, ...],  // Array of exactly 8 shapes (cells 0-7)
  "options": [ShapeDefinition, ...], // Array of exactly 6 answer options
  "correctAnswerIndex": number,      // Index (0-5) of correct answer in options
  "explanation": "string",            // Clear explanation in Portuguese
  "patterns": ["string", ...]         // List of patterns used
}`,

    importantNotes: `CRITICAL REQUIREMENTS:
✓ Matrix must have EXACTLY 8 shapes (cells 0-7, cell 8 is missing)
✓ Options must have EXACTLY 6 shapes (one correct + 5 distractors)
✓ correctAnswerIndex must be between 0 and 5
✓ ALL shape properties MUST use EXACT values from schema
✓ Patterns must be consistent, logical, and deterministic
✓ Distractors should be plausible but clearly incorrect
✓ The correct answer must logically complete the pattern
✓ Use Portuguese for explanation and pattern descriptions
✓ Return ONLY valid JSON, no markdown formatting or additional text`
  },

  difficult: {
    systemContext: `You are an expert in psychometrics creating Raven's Progressive Matrices.
Your task is to generate challenging, multi-layered puzzles for advanced cognitive assessment.`,

    taskDescription: `TASK: Generate a complex 3x3 matrix puzzle where cells follow multiple simultaneous logical patterns. The 9th cell (bottom-right) is missing.`,

    difficultyInstructions: `DIFFICULTY: Difficult
- Use 2-3 simultaneous patterns that interact
- Combine multiple transformations (e.g., rotation + size + fill)
- Create patterns that require deeper analysis
- Use diagonal relationships and cross-references
- Make distractors highly plausible (differ by only 1-2 properties)`,

    patternRules: `ADVANCED PATTERN RULES (use 2-3 simultaneously):
1. Multi-attribute progression: combine shape + rotation + size changes
2. Diagonal patterns: consistent transformations along diagonals
3. Interference patterns: one pattern for rows, another for columns
4. Conditional patterns: "if row X, then apply rule Y"
5. Composite patterns: outer pattern + inner variation
6. Symmetry breaking: establish symmetry then break it systematically

RECOMMENDED COMBINATIONS FOR DIFFICULT:
- Shape progression + rotation increment (2 patterns)
- Size variation + fill progression + color change (3 patterns)
- Row-based shape pattern + column-based fill pattern (2 interfering patterns)
- Diagonal symmetry with rotation (2 patterns)`,

    outputFormat: `SHAPE DEFINITION:
{
  "shape": "circle" | "square" | "triangle" | "cross" | "diamond",
  "color": "#374151" | "#9ca3af" | "#f3f4f6",  // gray-700, gray-400, gray-100
  "fill": "solid" | "outline" | "striped",
  "size": 0.4 | 0.6 | 0.8,  // relative to cell size (small, medium, large)
  "rotation": 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315  // degrees
}

OUTPUT FORMAT (JSON only, no markdown):
{
  "matrix": [ShapeDefinition, ...],  // Array of exactly 8 shapes (cells 0-7)
  "options": [ShapeDefinition, ...], // Array of exactly 6 answer options
  "correctAnswerIndex": number,      // Index (0-5) of correct answer in options
  "explanation": "string",            // Detailed explanation in Portuguese covering all patterns
  "patterns": ["string", ...]         // List of ALL patterns used (2-3 items)
}`,

    importantNotes: `CRITICAL REQUIREMENTS FOR DIFFICULT MODE:
✓ Matrix must have EXACTLY 8 shapes (cells 0-7, cell 8 is missing)
✓ Options must have EXACTLY 6 shapes (one correct + 5 carefully crafted distractors)
✓ correctAnswerIndex must be between 0 and 5
✓ ALL shape properties MUST use EXACT values from schema
✓ Use 2-3 simultaneous patterns (list all in "patterns" array)
✓ Distractors should differ from correct answer by only 1-2 properties
✓ The correct answer must be the ONLY option satisfying ALL patterns
✓ Explanation must describe ALL patterns and their interaction
✓ Use Portuguese for explanation and pattern descriptions
✓ Return ONLY valid JSON, no markdown formatting or additional text

DISTRACTOR STRATEGY:
- Option A: correct for pattern 1, wrong for pattern 2
- Option B: correct for pattern 2, wrong for pattern 1
- Option C: correct answer (satisfies all patterns)
- Option D: differs from correct by rotation only
- Option E: differs from correct by fill only
- Option F: plausible but violates core pattern rule`
  }
};

/**
 * Build complete prompt for Gemini API
 */
function buildGeminiPrompt(difficulty = 'normal') {
  const config = PROMPTS[difficulty];
  return `${config.systemContext}

${config.taskDescription}

${config.difficultyInstructions}

${config.patternRules}

${config.outputFormat}

${config.importantNotes}`;
}

/**
 * Call Gemini 2.5 Pro API to generate a matrix
 */
async function callGeminiAPI(difficulty) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured in environment variables');
  }

  const prompt = buildGeminiPrompt(difficulty);
  const model = 'gemini-2.0-flash-exp'; // Using flash as 2.5 Pro not yet available
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json'
    }
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  if (!result.candidates || !result.candidates[0]?.content?.parts[0]) {
    throw new Error('Invalid response structure from Gemini API');
  }

  const jsonText = result.candidates[0].content.parts[0].text;
  const matrixData = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

  // Validate response structure
  if (!matrixData.matrix || !Array.isArray(matrixData.matrix) || matrixData.matrix.length !== 8) {
    throw new Error('Invalid matrix structure: must have exactly 8 shapes');
  }

  if (!matrixData.options || !Array.isArray(matrixData.options) || matrixData.options.length !== 6) {
    throw new Error('Invalid options structure: must have exactly 6 options');
  }

  if (typeof matrixData.correctAnswerIndex !== 'number' ||
      matrixData.correctAnswerIndex < 0 ||
      matrixData.correctAnswerIndex > 5) {
    throw new Error('Invalid correctAnswerIndex: must be between 0 and 5');
  }

  return matrixData;
}

/**
 * Express request handler
 */
async function generateMatrixHandler(req, res) {
  try {
    const { difficulty = 'normal' } = req.body;

    // Validate difficulty
    if (!['normal', 'difficult'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid difficulty. Must be "normal" or "difficult"'
      });
    }

    console.log(`[🔎]: Generating ${difficulty} matrix via Gemini API...`);

    const matrixData = await callGeminiAPI(difficulty);

    console.log('[✅]: Matrix generated successfully');

    res.json({
      success: true,
      data: matrixData
    });

  } catch (error) {
    console.error('[❌]: Matrix generation error:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate matrix'
    });
  }
}

// Export for use with Express
export default generateMatrixHandler;

// Standalone server (if run directly)
import express from 'express';

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = express();

  // Middleware
  app.use(express.json());

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
  app.post('/api/generate-matrix', generateMatrixHandler);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'matrix-generator',
      hasApiKey: !!process.env.GEMINI_API_KEY
    });
  });

  const PORT = process.env.API_PORT || 3001;
  app.listen(PORT, () => {
    console.log(`[🏁]: Matrix generator API running on http://localhost:${PORT}`);
    console.log(`[🔎]: POST /api/generate-matrix - Generate cognitive matrix`);
    console.log(`[🔎]: GET /api/health - Health check`);
    console.log(`[🔑]: Gemini API Key configured: ${!!process.env.GEMINI_API_KEY}`);
  });
}
