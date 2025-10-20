const env = import.meta.env as Record<string, string | undefined>;

const GEMINI_API_URL = env.VITE_GEMINI_API_URL ?? '';
const GEMINI_API_KEY = env.VITE_GEMINI_API_KEY ?? '';
const GEMINI_MODEL = env.VITE_GEMINI_MODEL ?? 'gemini-1.5-flash';

export interface RavensMatrixPayload {
  matrixSVG: string;
  correctAnswer: number;
  options: string[];
  explanation: string;
  patterns?: string[];
}

export class GeminiUnavailableError extends Error {
  constructor(message = 'Gemini support unavailable') {
    super(message);
    this.name = 'GeminiUnavailableError';
  }
}

declare global {
  interface Window {
    spark?: {
      llm?: (prompt: string, model: string, stream?: boolean) => Promise<string>;
    };
  }
}

const fallbackDataset: RavensMatrixPayload[] = [
  {
    matrixSVG: `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="stripe" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="#cbd5f5" />
      <path d="M0 20 L20 0" stroke="#94a3b8" stroke-width="4" />
    </pattern>
  </defs>
  <rect width="600" height="600" fill="#f8fafc" />
  ${Array.from({ length: 3 }).map((_, row) => Array.from({ length: 3 }).map((_, col) => {
      const x = col * 200;
      const y = row * 200;
      const fill = row === 2 && col === 2 ? '#e2e8f0' : row === col ? 'url(#stripe)' : '#cbd5f5';
      const label = row === 2 && col === 2 ? '?' : row * 3 + col + 1;
      return `<g transform="translate(${x}, ${y})">
        <rect x="10" y="10" width="180" height="180" rx="16" fill="${fill}" stroke="#64748b" stroke-width="3" />
        <text x="100" y="115" font-size="64" text-anchor="middle" fill="#334155">${label}</text>
      </g>`;
    }).join('')).join('')}
</svg>`,
    correctAnswer: 3,
    options: [
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="170" height="170" rx="16" fill="#cbd5f5" stroke="#64748b" stroke-width="3" /><text x="100" y="120" font-size="64" text-anchor="middle" fill="#334155">7</text></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="170" height="170" rx="16" fill="#cbd5f5" stroke="#64748b" stroke-width="3" /><text x="100" y="120" font-size="64" text-anchor="middle" fill="#334155">8</text></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="170" height="170" rx="16" fill="url(#stripe)" stroke="#64748b" stroke-width="3" /><text x="100" y="120" font-size="64" text-anchor="middle" fill="#334155">9</text></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="170" height="170" rx="16" fill="#e2e8f0" stroke="#64748b" stroke-width="3" /><text x="100" y="120" font-size="64" text-anchor="middle" fill="#334155">4</text></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="170" height="170" rx="16" fill="#cbd5f5" stroke="#64748b" stroke-width="3" /><text x="100" y="120" font-size="64" text-anchor="middle" fill="#334155">6</text></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="170" height="170" rx="16" fill="#cbd5f5" stroke="#64748b" stroke-width="3" /><text x="100" y="120" font-size="64" text-anchor="middle" fill="#334155">5</text></svg>`
    ],
    explanation: 'Progressão numérica e alternância de textura nas diagonais. O item correto mantém a rotação do padrão listrado e continua a sequência 7, 8, 9.',
    patterns: ['Sequência numérica', 'Alternância de textura']
  },
  {
    matrixSVG: `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="600" fill="#f8fafc" />
  ${Array.from({ length: 3 }).map((_, row) => Array.from({ length: 3 }).map((_, col) => {
      const x = col * 200;
      const y = row * 200;
      const rotation = (row * 3 + col) * 45;
      const isMissing = row === 2 && col === 2;
      return `<g transform="translate(${x + 100}, ${y + 100})">
        <rect x="-90" y="-90" width="180" height="180" rx="16" fill="#cbd5f5" stroke="#64748b" stroke-width="3" />
        ${isMissing
          ? '<text x="0" y="25" font-size="64" text-anchor="middle" fill="#334155">?</text>'
          : `<polygon points="0,-60 52,30 -52,30" fill="#1d4ed8" opacity="0.75" transform="rotate(${rotation})" />`}
      </g>`;
    }).join('')).join('')}
</svg>`,
    correctAnswer: 1,
    options: [
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="170" height="170" rx="16" fill="#cbd5f5" stroke="#64748b" stroke-width="3" /><polygon points="100,40 155,150 45,150" fill="#1d4ed8" opacity="0.75" transform="rotate(180 100 100)" /></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="170" height="170" rx="16" fill="#cbd5f5" stroke="#64748b" stroke-width="3" /><polygon points="100,40 155,150 45,150" fill="#1d4ed8" opacity="0.75" transform="rotate(135 100 100)" /></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="170" height="170" rx="16" fill="#cbd5f5" stroke="#64748b" stroke-width="3" /><polygon points="100,40 155,150 45,150" fill="#1d4ed8" opacity="0.75" transform="rotate(45 100 100)" /></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="170" height="170" rx="16" fill="#cbd5f5" stroke="#64748b" stroke-width="3" /><polygon points="100,40 155,150 45,150" fill="#1d4ed8" opacity="0.75" transform="rotate(225 100 100)" /></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="170" height="170" rx="16" fill="#cbd5f5" stroke="#64748b" stroke-width="3" /><polygon points="100,40 155,150 45,150" fill="#1d4ed8" opacity="0.75" transform="rotate(315 100 100)" /></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="170" height="170" rx="16" fill="#cbd5f5" stroke="#64748b" stroke-width="3" /><polygon points="100,40 155,150 45,150" fill="#1d4ed8" opacity="0.75" transform="rotate(90 100 100)" /></svg>`
    ],
    explanation: 'Rotação de 45° a cada célula. A peça ausente precisa completar a sequência chegando a 180° na posição final.',
    patterns: ['Rotação angular constante']
  }
];

let fallbackIndex = 0;

export function getOfflineRavensMatrix(): RavensMatrixPayload {
  const entry = fallbackDataset[fallbackIndex % fallbackDataset.length];
  fallbackIndex += 1;
  return JSON.parse(JSON.stringify(entry));
}

export function isSparkAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.spark?.llm;
}

function hasGeminiRestConfig(): boolean {
  return Boolean(GEMINI_API_URL && GEMINI_API_KEY);
}

export function hasGeminiSupport(): boolean {
  return isSparkAvailable() || hasGeminiRestConfig();
}

function buildGeminiUrl(): string {
  if (!GEMINI_API_URL) return '';
  if (!GEMINI_API_KEY) return GEMINI_API_URL;
  if (GEMINI_API_URL.includes('key=')) return GEMINI_API_URL;
  const separator = GEMINI_API_URL.includes('?') ? '&' : '?';
  return `${GEMINI_API_URL}${separator}key=${GEMINI_API_KEY}`;
}

async function requestThroughSpark(prompt: string): Promise<string> {
  if (!isSparkAvailable() || !window.spark?.llm) {
    throw new GeminiUnavailableError('Spark LLM not available');
  }
  return window.spark.llm(prompt, 'gpt-4o', true);
}

async function requestThroughGeminiRest(prompt: string, signal?: AbortSignal): Promise<string> {
  if (!hasGeminiRestConfig()) {
    throw new GeminiUnavailableError('Gemini REST not configured');
  }

  const url = buildGeminiUrl();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(GEMINI_API_KEY ? { 'x-goog-api-key': GEMINI_API_KEY } : {})
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      model: GEMINI_MODEL
    }),
    signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini REST error: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    throw new Error('Gemini REST returned an unexpected payload');
  }

  const raw = parts
    .map((part: { text?: string }) => part?.text ?? '')
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!raw) {
    throw new Error('Gemini REST returned empty content');
  }

  return raw;
}

function parseMatrixPayload(raw: string): RavensMatrixPayload {
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.matrixSVG !== 'string' ||
      typeof parsed.correctAnswer !== 'number' ||
      !Array.isArray(parsed.options) ||
      typeof parsed.explanation !== 'string'
    ) {
      throw new Error('Incomplete matrix payload');
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Unable to parse matrix payload: ${error.message}`);
    }
    throw new Error('Unable to parse matrix payload');
  }
}

interface RequestOptions {
  signal?: AbortSignal;
  useFallback?: boolean;
}

export async function requestRavensMatrix(prompt: string, options: RequestOptions = {}): Promise<RavensMatrixPayload> {
  const { signal, useFallback = false } = options;

  if (useFallback) {
    return getOfflineRavensMatrix();
  }

  if (isSparkAvailable()) {
    const raw = await requestThroughSpark(prompt);
    return parseMatrixPayload(raw);
  }

  if (hasGeminiRestConfig()) {
    const raw = await requestThroughGeminiRest(prompt, signal);
    return parseMatrixPayload(raw);
  }

  throw new GeminiUnavailableError();
}
