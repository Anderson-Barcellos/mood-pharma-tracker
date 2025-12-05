import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '@/shared/types';

export interface AppDataSnapshot {
  version: string;
  lastUpdated: string;
  medications: Medication[];
  doses: MedicationDose[];
  moodEntries: MoodEntry[];
  cognitiveTests: CognitiveTest[];
}

const API_ENDPOINT = '/mood/api/app-data';

function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeSnapshot(snapshot?: Partial<AppDataSnapshot>): AppDataSnapshot {
  return {
    version: snapshot?.version ?? '1.0.0',
    lastUpdated: snapshot?.lastUpdated ?? nowIso(),
    medications: snapshot?.medications ?? [],
    doses: snapshot?.doses ?? [],
    moodEntries: snapshot?.moodEntries ?? [],
    cognitiveTests: snapshot?.cognitiveTests ?? []
  };
}

async function parseResponse(response: Response) {
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${text}`);
  }

  const payload = await response.json();
  return payload?.data ?? payload;
}

export async function fetchAppData(): Promise<AppDataSnapshot> {
  const response = await fetch(API_ENDPOINT, {
    cache: 'no-store',
    headers: { Accept: 'application/json' }
  });

  const raw = await parseResponse(response);
  return normalizeSnapshot(raw);
}

export async function saveAppData(snapshot: AppDataSnapshot): Promise<AppDataSnapshot> {
  const payload = normalizeSnapshot({
    ...snapshot,
    lastUpdated: nowIso()
  });

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const raw = await parseResponse(response);
  return normalizeSnapshot(raw);
}

export function cloneSnapshot(source: AppDataSnapshot): AppDataSnapshot {
  if (typeof structuredClone === 'function') {
    return structuredClone(source);
  }
  return JSON.parse(JSON.stringify(source)) as AppDataSnapshot;
}

export type AppDataUpdater = (current: AppDataSnapshot) => AppDataSnapshot;
