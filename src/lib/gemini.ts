const RAVEN_PROMPT = `You are an expert in psychometrics creating Raven's Progressive Matrices.

INSTRUCTIONS:
1. Create a 3x3 matrix where the first 8 cells follow a logical pattern
2. The 9th cell (bottom right) is empty - this is what the user must complete
3. Difficulty level: medium

PATTERN RULES (choose 1-2 simultaneous patterns):
- Numerical progression of elements
- Systematic rotation (45°, 90°, etc.)
- Shape transformation (circle → square → triangle)
- Fill pattern (solid → striped → empty)
- Spatial position changes
- Overlapping/layering

OUTPUT FORMAT (JSON):
{
  "matrixSVG": "Complete 3x3 grid SVG (viewBox 0 0 600 600)",
  "correctAnswer": number (0-5),
  "options": ["SVG option 0", ..., "SVG option 5"],
  "explanation": "Explanation of the pattern",
  "patterns": ["list of patterns applied"]
}

TECHNICAL REQUIREMENTS:
- Matrix: viewBox 0 0 600 600, cells 200x200 each
- Options: viewBox 0 0 200 200 each
- Use distinct but not vibrant colors
- Subtle grid delimiting cells
- Cell 9 empty/gray with question mark
- 1 correct answer + 5 plausible distractors

Return ONLY valid JSON, no markdown or additional text.`

interface RavenMatrixResponse {
  matrixSVG: string
  correctAnswer: number
  options: string[]
  explanation: string
  patterns: string[]
}

export interface RavenMatrixResult extends RavenMatrixResponse {
  source: 'spark' | 'fallback'
}

const FALLBACK_MATRICES: RavenMatrixResponse[] = [
  {
    matrixSVG: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="#f8fafc" />
  <g stroke="#cbd5f5" stroke-width="2">
    <line x1="200" y1="0" x2="200" y2="600" />
    <line x1="400" y1="0" x2="400" y2="600" />
    <line x1="0" y1="200" x2="600" y2="200" />
    <line x1="0" y1="400" x2="600" y2="400" />
  </g>
  <g fill="none" stroke="#1e293b" stroke-width="6">
    <g transform="translate(0 0)">
      <rect x="40" y="40" width="120" height="120" rx="12" />
      <rect x="95" y="40" width="10" height="120" fill="#1e293b" />
    </g>
    <g transform="translate(200 0)">
      <rect x="40" y="40" width="120" height="120" rx="12" />
      <rect x="75" y="40" width="10" height="120" fill="#1e293b" />
      <rect x="115" y="40" width="10" height="120" fill="#1e293b" />
    </g>
    <g transform="translate(400 0)">
      <rect x="40" y="40" width="120" height="120" rx="12" />
      <rect x="65" y="40" width="10" height="120" fill="#1e293b" />
      <rect x="95" y="40" width="10" height="120" fill="#1e293b" />
      <rect x="125" y="40" width="10" height="120" fill="#1e293b" />
    </g>
    <g transform="translate(0 200) rotate(90 100 100)">
      <rect x="40" y="40" width="120" height="120" rx="12" />
      <rect x="95" y="40" width="10" height="120" fill="#1e293b" />
    </g>
    <g transform="translate(200 200) rotate(90 100 100)">
      <rect x="40" y="40" width="120" height="120" rx="12" />
      <rect x="75" y="40" width="10" height="120" fill="#1e293b" />
      <rect x="115" y="40" width="10" height="120" fill="#1e293b" />
    </g>
    <g transform="translate(400 200) rotate(90 100 100)">
      <rect x="40" y="40" width="120" height="120" rx="12" />
      <rect x="65" y="40" width="10" height="120" fill="#1e293b" />
      <rect x="95" y="40" width="10" height="120" fill="#1e293b" />
      <rect x="125" y="40" width="10" height="120" fill="#1e293b" />
    </g>
    <g transform="translate(0 400) rotate(180 100 100)">
      <rect x="40" y="40" width="120" height="120" rx="12" />
      <rect x="95" y="40" width="10" height="120" fill="#1e293b" />
    </g>
    <g transform="translate(200 400) rotate(180 100 100)">
      <rect x="40" y="40" width="120" height="120" rx="12" />
      <rect x="75" y="40" width="10" height="120" fill="#1e293b" />
      <rect x="115" y="40" width="10" height="120" fill="#1e293b" />
    </g>
  </g>
  <g transform="translate(400 400)">
    <rect x="20" y="20" width="160" height="160" rx="16" fill="#e2e8f0" stroke="#1e293b" stroke-width="5" />
    <text x="100" y="120" text-anchor="middle" font-size="72" fill="#1e293b" font-family="monospace">?</text>
  </g>
</svg>`,
    options: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="16" fill="#f8fafc" stroke="#1e293b" stroke-width="4" />
  <g transform="rotate(180 100 100)">
    <rect x="40" y="40" width="120" height="120" rx="12" fill="none" stroke="#1e293b" stroke-width="6" />
    <rect x="95" y="40" width="10" height="120" fill="#1e293b" />
  </g>
</svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="16" fill="#f8fafc" stroke="#1e293b" stroke-width="4" />
  <g transform="rotate(180 100 100)">
    <rect x="40" y="40" width="120" height="120" rx="12" fill="none" stroke="#1e293b" stroke-width="6" />
    <rect x="75" y="40" width="10" height="120" fill="#1e293b" />
    <rect x="115" y="40" width="10" height="120" fill="#1e293b" />
  </g>
</svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="16" fill="#f8fafc" stroke="#1e293b" stroke-width="4" />
  <g transform="rotate(180 100 100)">
    <rect x="40" y="40" width="120" height="120" rx="12" fill="none" stroke="#1e293b" stroke-width="6" />
    <rect x="65" y="40" width="10" height="120" fill="#1e293b" />
    <rect x="95" y="40" width="10" height="120" fill="#1e293b" />
    <rect x="125" y="40" width="10" height="120" fill="#1e293b" />
  </g>
</svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="16" fill="#fef9c3" stroke="#1e293b" stroke-width="4" />
  <g transform="rotate(180 100 100)">
    <rect x="40" y="40" width="120" height="120" rx="12" fill="none" stroke="#1e293b" stroke-width="6" />
    <rect x="65" y="40" width="10" height="120" fill="#1e293b" />
    <rect x="95" y="40" width="10" height="120" fill="#1e293b" />
  </g>
</svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="16" fill="#e0f2fe" stroke="#1e293b" stroke-width="4" />
  <g transform="rotate(270 100 100)">
    <rect x="40" y="40" width="120" height="120" rx="12" fill="none" stroke="#1e293b" stroke-width="6" />
    <rect x="65" y="40" width="10" height="120" fill="#1e293b" />
    <rect x="95" y="40" width="10" height="120" fill="#1e293b" />
    <rect x="125" y="40" width="10" height="120" fill="#1e293b" />
  </g>
</svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="16" fill="#fae8ff" stroke="#1e293b" stroke-width="4" />
  <g transform="rotate(0 100 100)">
    <rect x="40" y="40" width="120" height="120" rx="12" fill="none" stroke="#1e293b" stroke-width="6" />
    <rect x="65" y="40" width="10" height="120" fill="#1e293b" />
    <rect x="95" y="40" width="10" height="120" fill="#1e293b" />
  </g>
</svg>`
    ],
    correctAnswer: 2,
    explanation: 'Cada linha gira o padrão anterior em 90° e cada coluna adiciona uma listra extra. A célula final precisa de três listras rotacionadas 180°.',
    patterns: ['Progressão por colunas adicionando elementos', 'Rotação de 90° por linha']
  },
  {
    matrixSVG: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="#f9fafb" />
  <g stroke="#cbd5f5" stroke-width="2">
    <line x1="200" y1="0" x2="200" y2="600" />
    <line x1="400" y1="0" x2="400" y2="600" />
    <line x1="0" y1="200" x2="600" y2="200" />
    <line x1="0" y1="400" x2="600" y2="400" />
  </g>
  <g stroke="#1f2937" stroke-width="6" fill="#1f2937">
    <g transform="translate(0 0)">
      <circle cx="100" cy="100" r="55" />
    </g>
    <g transform="translate(200 0)">
      <circle cx="100" cy="100" r="55" fill="url(#stripeCircle)" />
    </g>
    <g transform="translate(400 0)">
      <circle cx="100" cy="100" r="55" fill="none" />
    </g>
    <g transform="translate(0 200)">
      <rect x="45" y="45" width="110" height="110" rx="12" />
    </g>
    <g transform="translate(200 200)">
      <rect x="45" y="45" width="110" height="110" rx="12" fill="url(#stripeSquare)" />
    </g>
    <g transform="translate(400 200)">
      <rect x="45" y="45" width="110" height="110" rx="12" fill="none" />
    </g>
    <g transform="translate(0 400)">
      <polygon points="100,50 145,140 55,140" />
    </g>
    <g transform="translate(200 400)">
      <polygon points="100,50 145,140 55,140" fill="url(#stripeTriangle)" />
    </g>
  </g>
  <defs>
    <pattern id="stripeCircle" patternUnits="userSpaceOnUse" width="20" height="20">
      <rect width="20" height="20" fill="#94a3b8" />
      <path d="M0 0 L20 20" stroke="#1f2937" stroke-width="4" />
      <path d="M20 0 L0 20" stroke="#1f2937" stroke-width="4" />
    </pattern>
    <pattern id="stripeSquare" patternUnits="userSpaceOnUse" width="12" height="12">
      <rect width="12" height="12" fill="#cbd5f5" />
      <rect width="6" height="12" fill="#1f2937" opacity="0.35" />
    </pattern>
    <pattern id="stripeTriangle" patternUnits="userSpaceOnUse" width="16" height="16">
      <rect width="16" height="16" fill="#bfdbfe" />
      <path d="M0 16 L16 0" stroke="#1f2937" stroke-width="4" opacity="0.55" />
    </pattern>
  </defs>
  <g transform="translate(400 400)">
    <rect x="20" y="20" width="160" height="160" rx="16" fill="#e2e8f0" stroke="#1f2937" stroke-width="5" />
    <text x="100" y="120" text-anchor="middle" font-size="72" fill="#1f2937" font-family="monospace">?</text>
  </g>
</svg>`,
    options: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="16" fill="#f9fafb" stroke="#1f2937" stroke-width="4" />
  <polygon points="100,50 145,140 55,140" fill="#1f2937" />
</svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="16" fill="#f9fafb" stroke="#1f2937" stroke-width="4" />
  <polygon points="100,50 145,140 55,140" fill="url(#triStripeOption)" />
  <defs>
    <pattern id="triStripeOption" patternUnits="userSpaceOnUse" width="16" height="16">
      <rect width="16" height="16" fill="#bfdbfe" />
      <path d="M0 16 L16 0" stroke="#1f2937" stroke-width="4" opacity="0.55" />
    </pattern>
  </defs>
</svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="16" fill="#f9fafb" stroke="#1f2937" stroke-width="4" />
  <rect x="45" y="45" width="110" height="110" rx="12" fill="none" stroke="#1f2937" stroke-width="6" />
</svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="16" fill="#f9fafb" stroke="#1f2937" stroke-width="4" />
  <polygon points="100,50 145,140 55,140" fill="none" stroke="#1f2937" stroke-width="6" />
</svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="16" fill="#f9fafb" stroke="#1f2937" stroke-width="4" />
  <circle cx="100" cy="100" r="55" fill="none" stroke="#1f2937" stroke-width="6" />
</svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="16" fill="#f9fafb" stroke="#1f2937" stroke-width="4" />
  <polygon points="100,50 145,140 55,140" fill="#1f2937" opacity="0.25" />
</svg>`
    ],
    correctAnswer: 3,
    explanation: 'Colunas variam o preenchimento (sólido, listrado, contorno) e linhas alternam o formato (círculo, quadrado, triângulo). Falta o triângulo em contorno.',
    patterns: ['Mudança de forma por linha', 'Mudança de preenchimento por coluna']
  }
]

function parseRavenResponse(raw: string): RavenMatrixResponse | null {
  try {
    const data = JSON.parse(raw) as Partial<RavenMatrixResponse>

    if (
      !data ||
      typeof data.matrixSVG !== 'string' ||
      !Array.isArray(data.options) ||
      typeof data.correctAnswer !== 'number' ||
      typeof data.explanation !== 'string' ||
      !Array.isArray(data.patterns)
    ) {
      return null
    }

    if (data.options.length < 4 || !data.options.every(option => typeof option === 'string')) {
      return null
    }

    if (data.correctAnswer < 0 || data.correctAnswer >= data.options.length) {
      return null
    }

    return {
      matrixSVG: data.matrixSVG,
      options: data.options,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
      patterns: data.patterns
    }
  } catch (error) {
    console.warn('Failed to parse Raven matrix response', error)
    return null
  }
}

function getFallbackMatrix(): RavenMatrixResult {
  const fallback = FALLBACK_MATRICES[Math.floor(Math.random() * FALLBACK_MATRICES.length)]
  return { ...fallback, source: 'fallback' }
}

export async function fetchRavenMatrix(): Promise<RavenMatrixResult> {
  if (typeof window !== 'undefined' && window.spark?.llm) {
    try {
      const response = await window.spark.llm(RAVEN_PROMPT, 'gpt-4o', true)
      const parsed = parseRavenResponse(response)

      if (parsed) {
        return { ...parsed, source: 'spark' }
      }
    } catch (error) {
      console.warn('Spark LLM unavailable, using fallback matrix', error)
    }
  }

  return getFallbackMatrix()
}

export { RAVEN_PROMPT }

declare global {
  interface Window {
    spark?: {
      llm?: (prompt: string, model: string, stream?: boolean) => Promise<string>
    }
  }
}
