/**
 * API client for the PillMate FastAPI backend.
 */

import { Platform } from 'react-native';

// android: 'http://100.26.110.185:8000',
//   default: 'http://100.26.110.185:8000',

const API_BASE = Platform.select({
  android: 'http://32.192.26.168:8080',
  default: 'http://32.192.26.168:8080',
});

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DetectedMed {
  name_english: string;
  dosage: string;
  frequency: string;
  dicription: string;
  megication_importance: string;
  timing: ('morning' | 'afternoon' | 'night')[];
  with_food: string;
}

export interface AnalysisResult {
  detected_language: string;
  detected_language_name: string;
  medications: DetectedMed[];
}

export interface MedicationItem {
  medication_id: string;
  user_id: string;
  name: string;
  dosage: string;
  frequency: string;
  timing: ('morning' | 'afternoon' | 'night')[];
  with_food: string;
  description: string;
  importance: string;
  source: string;
  created_at: string;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

/** Send a prescription image (base64) to Gemini for analysis. */
export async function analyzePrescription(
  imageBase64: string,
): Promise<AnalysisResult> {
  const resp = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ image_base64: imageBase64, save: true }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(body || `Server error (${resp.status})`);
  }

  return resp.json();
}

/** Import detected medications into the server's medication list. */
export async function importMedications(
  medications: DetectedMed[],
): Promise<MedicationItem[]> {
  const resp = await fetch(`${API_BASE}/medications/import-prescription`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ medications }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(body || `Import failed (${resp.status})`);
  }

  return resp.json();
}

/** Fetch all saved medications. */
export async function fetchMedications(): Promise<MedicationItem[]> {
  const resp = await fetch(`${API_BASE}/medications`, {
    headers: JSON_HEADERS,
  });

  if (!resp.ok) {
    throw new Error(`Failed to load medications (${resp.status})`);
  }

  return resp.json();
}
