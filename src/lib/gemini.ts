import { PRIMARY_AI_SERVICE_LABEL, FALLBACK_DATASET_LABEL, buildRemoteServiceUnavailableMessage } from '@/shared/constants/ai';

const env = import.meta.env as Record<string, string | undefined>;

const GEMINI_API_URL = env.VITE_GEMINI_API_URL ?? '';
const GEMINI_API_KEY = env.VITE_GEMINI_API_KEY ?? '';
const GEMINI_MODEL = env.VITE_GEMINI_MODEL ?? 'gemini-1.5-flash';

export interface RavensMatrixPayload {
export type MatrixSource = 'spark' | 'gemini' | 'fallback';

export interface GeminiMatrixPayload {
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
    throw new GeminiUnavailableError(
      `${buildRemoteServiceUnavailableMessage()} Cliente do ${PRIMARY_AI_SERVICE_LABEL} indisponível`
    );
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
export interface MatrixGenerationResult extends GeminiMatrixPayload {
  source: MatrixSource;
  id: string;
}

export type MatrixGenerationErrorCode =
  | 'SPARK_UNAVAILABLE'
  | 'SPARK_ERROR'
  | 'GEMINI_UNAVAILABLE'
  | 'GEMINI_ERROR'
  | 'FALLBACK_REQUIRED'
  | 'FALLBACK_MISSING'
  | 'PARSE_ERROR'
  | 'UNKNOWN';

export class MatrixGenerationError extends Error {
  code: MatrixGenerationErrorCode;
  cause?: unknown;

  constructor(message: string, code: MatrixGenerationErrorCode = 'UNKNOWN', cause?: unknown) {
    super(message);
    this.name = 'MatrixGenerationError';
    this.code = code;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

type FallbackMatrix = GeminiMatrixPayload & { id: string };

declare global {
  interface Window {
    spark?: {
      llm?: (prompt: string, model: string, jsonMode?: boolean) => Promise<string>;
    };
  }
}

const GEMINI_MODEL = 'gemini-1.5-flash-latest';

const FALLBACK_MATRICES: readonly FallbackMatrix[] = [
  {
    id: 'fallback-1',
    matrixSVG: `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="600" fill="#f4f4f5" />
  ${Array.from({ length: 4 }).map((_, i) => `<line x1="0" y1="${i * 200}" x2="600" y2="${i * 200}" stroke="#d4d4d8" stroke-width="4" />`).join('')}
  ${Array.from({ length: 4 }).map((_, i) => `<line x1="${i * 200}" y1="0" x2="${i * 200}" y2="600" stroke="#d4d4d8" stroke-width="4" />`).join('')}
  <g fill="#1e293b">
    <circle cx="100" cy="100" r="40" />
    <rect x="60" y="260" width="80" height="80" rx="12" />
    <polygon points="100,460 60,520 140,520" />

    <rect x="260" y="60" width="80" height="80" rx="12" />
    <polygon points="300,260 260,340 340,340" />
    <circle cx="300" cy="460" r="40" />

    <polygon points="500,100 460,140 540,140" />
    <circle cx="500" cy="300" r="40" />
  </g>
</svg>`,
    options: [
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f8fafc"/><circle cx="100" cy="100" r="40" fill="#1e293b"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f8fafc"/><rect x="60" y="60" width="80" height="80" rx="12" fill="#1e293b"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f8fafc"/><polygon points="100,60 60,140 140,140" fill="#1e293b"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f8fafc"/><path d="M100 60 L60 100 L100 140 L140 100 Z" fill="#1e293b"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f8fafc"/><polygon points="60,60 140,60 100,140" fill="none" stroke="#1e293b" stroke-width="12"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f8fafc"/><circle cx="100" cy="100" r="40" fill="none" stroke="#1e293b" stroke-width="12"/></svg>`
    ],
    correctAnswer: 2,
    explanation: 'Sequência cíclica entre círculo, quadrado e triângulo. A última célula deve repetir o quadrado.',
    patterns: ['Ciclo de formas', 'Progressão posicional']
  },
  {
    id: 'fallback-2',
    matrixSVG: `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="600" fill="#fdf2f8" />
  ${Array.from({ length: 4 }).map((_, i) => `<line x1="0" y1="${i * 200}" x2="600" y2="${i * 200}" stroke="#f9a8d4" stroke-width="3" />`).join('')}
  ${Array.from({ length: 4 }).map((_, i) => `<line x1="${i * 200}" y1="0" x2="${i * 200}" y2="600" stroke="#f9a8d4" stroke-width="3" />`).join('')}
  <g stroke="#831843" stroke-width="12" fill="none" stroke-linecap="round">
    <line x1="60" y1="60" x2="140" y2="140" />
    <line x1="60" y1="140" x2="140" y2="60" />

    <line x1="260" y1="60" x2="340" y2="140" />
    <line x1="260" y1="140" x2="340" y2="60" />
    <line x1="300" y1="60" x2="300" y2="140" />

    <line x1="460" y1="60" x2="540" y2="140" />
    <line x1="460" y1="140" x2="540" y2="60" />
    <line x1="500" y1="60" x2="500" y2="140" />
    <line x1="480" y1="100" x2="520" y2="100" />

    <line x1="60" y1="260" x2="140" y2="340" />
    <line x1="60" y1="340" x2="140" y2="260" />
    <line x1="100" y1="260" x2="100" y2="340" />

    <line x1="260" y1="260" x2="340" y2="340" />
    <line x1="260" y1="340" x2="340" y2="260" />
    <line x1="300" y1="260" x2="300" y2="340" />
    <line x1="280" y1="300" x2="320" y2="300" />

    <line x1="460" y1="260" x2="540" y2="340" />
    <line x1="460" y1="340" x2="540" y2="260" />
    <line x1="500" y1="260" x2="500" y2="340" />
    <line x1="480" y1="300" x2="520" y2="300" />
    <line x1="500" y1="280" x2="500" y2="320" />
  </g>
</svg>`,
    options: [
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#fdf2f8"/><path d="M50 50 L150 150" stroke="#831843" stroke-width="12" stroke-linecap="round"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#fdf2f8"/><path d="M50 50 L150 150 M150 50 L50 150" stroke="#831843" stroke-width="12" stroke-linecap="round"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#fdf2f8"/><path d="M50 50 L150 150 M150 50 L50 150 M100 50 L100 150" stroke="#831843" stroke-width="12" stroke-linecap="round"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#fdf2f8"/><path d="M50 50 L150 150 M150 50 L50 150 M100 50 L100 150 M50 100 L150 100" stroke="#831843" stroke-width="12" stroke-linecap="round"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#fdf2f8"/><path d="M50 50 L150 150 M150 50 L50 150 M100 50 L100 150 M50 100 L150 100 M100 80 L100 120" stroke="#831843" stroke-width="12" stroke-linecap="round"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#fdf2f8"/><path d="M50 50 L150 150 M150 50 L50 150 M100 50 L100 150 M50 100 L150 100 M100 80 L100 120 M80 50 L120 50" stroke="#831843" stroke-width="12" stroke-linecap="round"/></svg>`
    ],
    correctAnswer: 4,
    explanation: 'Cada linha adiciona um traço extra. A última célula deve incluir cinco traços.',
    patterns: ['Progressão aditiva', 'Simetria axial']
  },
  {
    id: 'fallback-3',
    matrixSVG: `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="600" fill="#ecfeff" />
  ${Array.from({ length: 4 }).map((_, i) => `<line x1="0" y1="${i * 200}" x2="600" y2="${i * 200}" stroke="#bae6fd" stroke-width="3" />`).join('')}
  ${Array.from({ length: 4 }).map((_, i) => `<line x1="${i * 200}" y1="0" x2="${i * 200}" y2="600" stroke="#bae6fd" stroke-width="3" />`).join('')}
  <g fill="#0c4a6e">
    <rect x="80" y="80" width="40" height="40" />
    <rect x="260" y="80" width="80" height="40" />
    <rect x="440" y="80" width="120" height="40" />

    <rect x="80" y="260" width="40" height="80" />
    <rect x="260" y="260" width="80" height="80" />
    <rect x="440" y="260" width="120" height="80" />

    <rect x="80" y="440" width="40" height="120" />
    <rect x="260" y="440" width="80" height="120" />
  </g>
</svg>`,
    options: [
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#ecfeff"/><rect x="40" y="40" width="40" height="120" fill="#0c4a6e"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#ecfeff"/><rect x="40" y="40" width="80" height="80" fill="#0c4a6e"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#ecfeff"/><rect x="40" y="40" width="120" height="120" fill="#0c4a6e"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#ecfeff"/><rect x="40" y="40" width="160" height="80" fill="#0c4a6e"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#ecfeff"/><rect x="40" y="40" width="160" height="120" fill="#0c4a6e"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#ecfeff"/><rect x="40" y="40" width="160" height="160" fill="#0c4a6e"/></svg>`
    ],
    correctAnswer: 4,
    explanation: 'Os retângulos crescem em largura da esquerda para a direita e em altura de cima para baixo. A última célula completa ambas as dimensões.',
    patterns: ['Progressão dimensional', 'Escalonamento multiplicativo']
  },
  {
    id: 'fallback-4',
    matrixSVG: `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="600" fill="#f1f5f9" />
  ${Array.from({ length: 4 }).map((_, i) => `<line x1="0" y1="${i * 200}" x2="600" y2="${i * 200}" stroke="#cbd5f5" stroke-width="3" />`).join('')}
  ${Array.from({ length: 4 }).map((_, i) => `<line x1="${i * 200}" y1="0" x2="${i * 200}" y2="600" stroke="#cbd5f5" stroke-width="3" />`).join('')}
  <g stroke="#0f172a" stroke-width="14" stroke-linecap="round">
    <line x1="60" y1="100" x2="140" y2="100" />

    <line x1="260" y1="80" x2="340" y2="80" />
    <line x1="260" y1="120" x2="340" y2="120" />

    <line x1="460" y1="60" x2="540" y2="60" />
    <line x1="460" y1="100" x2="540" y2="100" />
    <line x1="460" y1="140" x2="540" y2="140" />

    <line x1="60" y1="300" x2="140" y2="300" />
    <line x1="100" y1="260" x2="100" y2="340" />

    <line x1="260" y1="260" x2="340" y2="260" />
    <line x1="260" y1="300" x2="340" y2="300" />
    <line x1="260" y1="340" x2="340" y2="340" />

    <line x1="460" y1="240" x2="540" y2="240" />
    <line x1="460" y1="280" x2="540" y2="280" />
    <line x1="460" y1="320" x2="540" y2="320" />
    <line x1="460" y1="360" x2="540" y2="360" />

    <line x1="60" y1="440" x2="140" y2="520" />
    <line x1="60" y1="520" x2="140" y2="440" />

    <line x1="260" y1="420" x2="340" y2="500" />
    <line x1="260" y1="500" x2="340" y2="420" />
    <line x1="260" y1="460" x2="340" y2="460" />
  </g>
</svg>`,
    options: [
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f1f5f9"/><path d="M50 150 L150 50" stroke="#0f172a" stroke-width="14" stroke-linecap="round"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f1f5f9"/><path d="M50 150 L150 50 M50 50 L150 150" stroke="#0f172a" stroke-width="14" stroke-linecap="round"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f1f5f9"/><path d="M50 150 L150 50 M50 50 L150 150 M100 150 L100 50" stroke="#0f172a" stroke-width="14" stroke-linecap="round"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f1f5f9"/><path d="M50 150 L150 50 M50 50 L150 150 M100 150 L100 50 M50 100 L150 100" stroke="#0f172a" stroke-width="14" stroke-linecap="round"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f1f5f9"/><path d="M50 150 L150 50 M50 50 L150 150 M100 150 L100 50 M50 100 L150 100 M100 150 L150 100" stroke="#0f172a" stroke-width="14" stroke-linecap="round"/></svg>`,
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f1f5f9"/><path d="M50 150 L150 50 M50 50 L150 150 M100 150 L100 50 M50 100 L150 100 M100 50 L150 150" stroke="#0f172a" stroke-width="14" stroke-linecap="round"/></svg>`
    ],
    correctAnswer: 3,
    explanation: 'Cada linha adiciona um traço ao padrão em X. A célula final precisa do X completo com linha horizontal central.',
    patterns: ['Progressão cumulativa', 'Simetria diagonal']
  }
];

export interface RequestMatrixOptions {
  allowFallback?: boolean;
  fallbackIndex?: number;
  signal?: AbortSignal;
}

const sanitizeResponse = (raw: string): string => raw.replace(/```json|```/g, '').trim();

const parsePayload = (raw: string): GeminiMatrixPayload => {
  try {
    const clean = sanitizeResponse(raw);
    const data = JSON.parse(clean) as Partial<GeminiMatrixPayload>;
    if (!data.matrixSVG || typeof data.correctAnswer !== 'number' || !Array.isArray(data.options)) {
      throw new Error('Missing required fields');
    }
    return {
      matrixSVG: data.matrixSVG,
      correctAnswer: data.correctAnswer,
      options: data.options,
      explanation: data.explanation ?? '',
      patterns: data.patterns
    };
  } catch (error) {
    throw new MatrixGenerationError('Failed to parse matrix payload', 'PARSE_ERROR', error);
  }
};

const buildFallback = (index?: number): MatrixGenerationResult => {
  if (FALLBACK_MATRICES.length === 0) {
    throw new MatrixGenerationError(`Nenhum ${FALLBACK_DATASET_LABEL} configurado`, 'FALLBACK_MISSING');
  }

  const baseIndex = typeof index === 'number' ? index % FALLBACK_MATRICES.length : Math.floor(Math.random() * FALLBACK_MATRICES.length);
  const fallback = FALLBACK_MATRICES[baseIndex];

  return {
    id: fallback.id,
    matrixSVG: fallback.matrixSVG,
    correctAnswer: fallback.correctAnswer,
    options: [...fallback.options],
    explanation: fallback.explanation,
    patterns: fallback.patterns,
    source: 'fallback'
  };
};

const requestSparkMatrix = async (prompt: string): Promise<MatrixGenerationResult> => {
  if (typeof window === 'undefined' || !window.spark?.llm) {
    throw new MatrixGenerationError(
      `${buildRemoteServiceUnavailableMessage()} Cliente do ${PRIMARY_AI_SERVICE_LABEL} indisponível`,
      'SPARK_UNAVAILABLE'
    );
  }

  try {
    const response = await window.spark.llm(prompt, 'gpt-4o', true);
    const payload = parsePayload(response);
    return {
      id: crypto.randomUUID(),
      ...payload,
      source: 'spark'
    };
  } catch (error) {
    if (error instanceof MatrixGenerationError) {
      throw error;
    }
    throw new MatrixGenerationError(`Falha na requisição do ${PRIMARY_AI_SERVICE_LABEL}`, 'SPARK_ERROR', error);
  }
};

const requestGeminiMatrix = async (prompt: string, signal?: AbortSignal): Promise<MatrixGenerationResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new MatrixGenerationError('Gemini API key not configured', 'GEMINI_UNAVAILABLE');
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!response.ok) {
      throw new MatrixGenerationError(`Gemini API error: ${response.status}`, 'GEMINI_ERROR');
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidate) {
      throw new MatrixGenerationError('Gemini returned an empty response', 'GEMINI_ERROR');
    }

    const payload = parsePayload(candidate);
    return {
      id: crypto.randomUUID(),
      ...payload,
      source: 'gemini'
    };
  } catch (error) {
    if (error instanceof MatrixGenerationError) {
      throw error;
    }
    throw new MatrixGenerationError('Gemini request failed', 'GEMINI_ERROR', error);
  }
};

export const hasSparkSupport = (): boolean => typeof window !== 'undefined' && typeof window.spark?.llm === 'function';

export const hasGeminiSupport = (): boolean => Boolean(import.meta.env.VITE_GEMINI_API_KEY);

export const getFallbackMatrices = (): readonly FallbackMatrix[] => FALLBACK_MATRICES;

export const requestMatrix = async (
  prompt: string,
  { allowFallback = true, fallbackIndex, signal }: RequestMatrixOptions = {}
): Promise<MatrixGenerationResult> => {
  if (hasSparkSupport()) {
    try {
      return await requestSparkMatrix(prompt);
    } catch (error) {
      if (error instanceof MatrixGenerationError && error.code === 'PARSE_ERROR') {
        throw error;
      }
    }
  }

  try {
    return await requestGeminiMatrix(prompt, signal);
  } catch (error) {
    if (error instanceof MatrixGenerationError && error.code === 'PARSE_ERROR') {
      throw error;
    }
  }

  if (!allowFallback) {
    throw new MatrixGenerationError(
      `${buildRemoteServiceUnavailableMessage()} e fallback desativado`,
      'FALLBACK_REQUIRED'
    );
  }

  return buildFallback(fallbackIndex);
};

export const isLiveAiAvailable = (): boolean => hasSparkSupport() || hasGeminiSupport();
