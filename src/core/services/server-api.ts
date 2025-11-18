/**
 * Server API Client
 * 
 * Provides methods to interact with the backend REST API.
 * All data operations go through the server instead of IndexedDB.
 */

import type { Medication, MedicationDose, MoodEntry, CognitiveTest } from '@/shared/types';

// Use import.meta.env for Vite environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Generic fetch wrapper with error handling
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(errorData.error || `Server returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[ServerAPI] Error fetching ${endpoint}:`, error);
    throw error;
  }
}

// ===== MEDICATIONS API =====

export async function fetchMedications(): Promise<Medication[]> {
  return apiFetch<Medication[]>('/medications');
}

export async function fetchMedication(id: string): Promise<Medication> {
  return apiFetch<Medication>(`/medications/${id}`);
}

export async function createMedication(medication: Medication): Promise<Medication> {
  return apiFetch<Medication>('/medications', {
    method: 'POST',
    body: JSON.stringify(medication),
  });
}

export async function updateMedication(id: string, updates: Partial<Medication>): Promise<Medication> {
  return apiFetch<Medication>(`/medications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteMedication(id: string): Promise<void> {
  await apiFetch<Medication>(`/medications/${id}`, {
    method: 'DELETE',
  });
}

// ===== DOSES API =====

export async function fetchDoses(medicationId?: string): Promise<MedicationDose[]> {
  const query = medicationId ? `?medicationId=${encodeURIComponent(medicationId)}` : '';
  return apiFetch<MedicationDose[]>(`/doses${query}`);
}

export async function fetchDose(id: string): Promise<MedicationDose> {
  return apiFetch<MedicationDose>(`/doses/${id}`);
}

export async function createDose(dose: MedicationDose): Promise<MedicationDose> {
  return apiFetch<MedicationDose>('/doses', {
    method: 'POST',
    body: JSON.stringify(dose),
  });
}

export async function updateDose(id: string, updates: Partial<MedicationDose>): Promise<MedicationDose> {
  return apiFetch<MedicationDose>(`/doses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteDose(id: string): Promise<void> {
  await apiFetch<MedicationDose>(`/doses/${id}`, {
    method: 'DELETE',
  });
}

// ===== MOOD ENTRIES API =====

export async function fetchMoodEntries(): Promise<MoodEntry[]> {
  return apiFetch<MoodEntry[]>('/mood-entries');
}

export async function fetchMoodEntry(id: string): Promise<MoodEntry> {
  return apiFetch<MoodEntry>(`/mood-entries/${id}`);
}

export async function createMoodEntry(entry: MoodEntry): Promise<MoodEntry> {
  return apiFetch<MoodEntry>('/mood-entries', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

export async function updateMoodEntry(id: string, updates: Partial<MoodEntry>): Promise<MoodEntry> {
  return apiFetch<MoodEntry>(`/mood-entries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteMoodEntry(id: string): Promise<void> {
  await apiFetch<MoodEntry>(`/mood-entries/${id}`, {
    method: 'DELETE',
  });
}

// ===== COGNITIVE TESTS API =====

export async function fetchCognitiveTests(): Promise<CognitiveTest[]> {
  return apiFetch<CognitiveTest[]>('/cognitive-tests');
}

export async function createCognitiveTest(test: CognitiveTest): Promise<CognitiveTest> {
  return apiFetch<CognitiveTest>('/cognitive-tests', {
    method: 'POST',
    body: JSON.stringify(test),
  });
}

export async function deleteCognitiveTest(id: string): Promise<void> {
  await apiFetch<CognitiveTest>(`/cognitive-tests/${id}`, {
    method: 'DELETE',
  });
}

// ===== HEALTH CHECK =====

export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
