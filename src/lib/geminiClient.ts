const DEFAULT_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-1.5-flash-latest';
const DEFAULT_TIMEOUT = 20000;

export type GeminiClientErrorCode = 'CONFIG_ERROR' | 'REQUEST_ERROR' | 'TIMEOUT' | 'ABORTED' | 'PARSER_ERROR';

export class GeminiClientError extends Error {
  readonly code: GeminiClientErrorCode;
  readonly status?: number;
  readonly cause?: unknown;

  constructor(message: string, code: GeminiClientErrorCode, status?: number, cause?: unknown) {
    super(message);
    this.name = 'GeminiClientError';
    this.code = code;
    if (status !== undefined) {
      this.status = status;
    }
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export interface GeminiClientConfig {
  apiUrl?: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  requiresApiKey?: boolean;
  defaultGenerationConfig?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface GeminiRequestOptions {
  prompt: string;
  signal?: AbortSignal;
  generationConfig?: Record<string, unknown>;
  extraBody?: Record<string, unknown>;
}

export class GeminiClient {
  private readonly apiUrl: string;
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly requiresApiKey: boolean;
  private readonly defaultGenerationConfig: Record<string, unknown>;
  private readonly headers: Record<string, string>;

  constructor({
    apiUrl = DEFAULT_API_URL,
    apiKey,
    model = DEFAULT_MODEL,
    timeoutMs = DEFAULT_TIMEOUT,
    fetchImpl = fetch,
    requiresApiKey = true,
    defaultGenerationConfig = {},
    headers = {}
  }: GeminiClientConfig = {}) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
    this.requiresApiKey = requiresApiKey;
    this.defaultGenerationConfig = defaultGenerationConfig;
    this.headers = headers;
  }

  isConfigured(): boolean {
    if (!this.apiUrl) return false;
    if (!this.requiresApiKey) return true;
    return Boolean(this.apiKey);
  }

  async generateContent({ prompt, signal, generationConfig, extraBody }: GeminiRequestOptions): Promise<string> {
    if (!prompt?.trim()) {
      throw new GeminiClientError('Prompt must be provided', 'CONFIG_ERROR');
    }

    if (!this.isConfigured()) {
      throw new GeminiClientError('Gemini client not configured', 'CONFIG_ERROR');
    }

    if (signal?.aborted) {
      throw new GeminiClientError('Request aborted before execution', 'ABORTED');
    }

    const endpoint = this.appendApiKeyIfNeeded(this.buildEndpoint());
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    let abortedByCaller = false;

    const abortListener = () => {
      abortedByCaller = true;
      controller.abort();
    };

    if (signal) {
      signal.addEventListener('abort', abortListener, { once: true });
    }

    if (this.timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, this.timeoutMs);
    }

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', abortListener);
    };

    try {
      const response = await this.fetchImpl(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'x-goog-api-key': this.apiKey } : {}),
          ...this.headers
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            ...this.defaultGenerationConfig,
            ...generationConfig
          },
          ...extraBody
        })
      });

      if (!response.ok) {
        const errorText = await this.safeReadText(response);
        throw new GeminiClientError(
          errorText || `Gemini request failed with status ${response.status}`,
          'REQUEST_ERROR',
          response.status
        );
      }

      const payload = await response.json();
      const text = this.extractText(payload);
      if (!text) {
        throw new GeminiClientError('Empty response from provider', 'PARSER_ERROR');
      }
      return text;
    } catch (error) {
      if (error instanceof GeminiClientError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        if (timedOut) {
          throw new GeminiClientError(
            `Gemini request timed out after ${this.timeoutMs}ms`,
            'TIMEOUT',
            undefined,
            error
          );
        }

        if (abortedByCaller) {
          throw new GeminiClientError('Gemini request aborted', 'ABORTED', undefined, error);
        }
      }

      throw new GeminiClientError('Gemini request failed', 'REQUEST_ERROR', undefined, error);
    } finally {
      cleanup();
    }
  }

  private buildEndpoint(): string {
    const trimmed = this.apiUrl.replace(/\/$/, '');
    if (trimmed.includes(':generate')) {
      return trimmed;
    }
    return `${trimmed}/${this.model}:generateContent`;
  }

  private appendApiKeyIfNeeded(url: string): string {
    if (!this.apiKey) return url;

    try {
      const parsed = new URL(url);
      if (!parsed.searchParams.has('key')) {
        parsed.searchParams.set('key', this.apiKey);
      }
      return parsed.toString();
    } catch {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}key=${encodeURIComponent(this.apiKey)}`;
    }
  }

  private extractText(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null;

    const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return null;
    }

    const parts = candidates[0]?.content?.parts;
    if (!Array.isArray(parts)) {
      return null;
    }

    const text = parts
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n')
      .trim();

    return text || null;
  }

  private async safeReadText(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch (error) {
      if (error instanceof Error) {
        return error.message;
      }
      return '';
    }
  }
}
