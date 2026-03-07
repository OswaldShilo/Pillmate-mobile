/**
 * Local JSON cache using expo-secure-store.
 * Keeps a local copy of profile, medications, and alarms
 * for offline access and faster loads.
 *
 * Note: expo-secure-store has a ~2KB limit per key on some platforms,
 * so we stringify and store JSON. For large data sets, consider
 * splitting across multiple keys.
 */

import * as SecureStore from 'expo-secure-store';

const KEYS = {
    profile: 'pillmate_profile',
    medications: 'pillmate_medications',
    alarms: 'pillmate_alarms',
} as const;

// ── Profile ───────────────────────────────────────────────────────────────────

export async function cacheProfile(profile: any): Promise<void> {
    await SecureStore.setItemAsync(KEYS.profile, JSON.stringify(profile));
}

export async function getCachedProfile(): Promise<any | null> {
    const raw = await SecureStore.getItemAsync(KEYS.profile);
    return raw ? JSON.parse(raw) : null;
}

// ── Medications ───────────────────────────────────────────────────────────────

export async function cacheMedications(meds: any[]): Promise<void> {
    await SecureStore.setItemAsync(KEYS.medications, JSON.stringify(meds));
}

export async function getCachedMedications(): Promise<any[]> {
    const raw = await SecureStore.getItemAsync(KEYS.medications);
    return raw ? JSON.parse(raw) : [];
}

// ── Alarms ────────────────────────────────────────────────────────────────────

export async function cacheAlarms(alarms: any[]): Promise<void> {
    await SecureStore.setItemAsync(KEYS.alarms, JSON.stringify(alarms));
}

export async function getCachedAlarms(): Promise<any[]> {
    const raw = await SecureStore.getItemAsync(KEYS.alarms);
    return raw ? JSON.parse(raw) : [];
}

// ── Clear all ─────────────────────────────────────────────────────────────────

export async function clearAllCache(): Promise<void> {
    await Promise.all(
        Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key))
    );
}
