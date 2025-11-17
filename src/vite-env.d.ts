/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_URL?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_MODEL?: string;
  readonly VITE_GEMINI_TIMEOUT_MS?: string;
  readonly GEMINI_API_URL?: string;
  readonly GEMINI_API_KEY?: string;
  readonly GEMINI_MODEL?: string;
  readonly GEMINI_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
