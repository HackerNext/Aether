import { AetherAppState } from '../types/health';

const STORAGE_PREFIX = 'aether_os_v2::';
const STATE_KEY = `${STORAGE_PREFIX}app_state`;

export function loadAetherState(): AetherAppState | null {
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AetherAppState;
    if (!parsed || !parsed.profile || !parsed.device || !Array.isArray(parsed.records)) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('[AETHER Storage] Failed to parse local state:', err);
    return null;
  }
}

export function saveAetherState(state: AetherAppState): void {
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[AETHER Storage] Failed to persist state:', err);
  }
}

export function clearAetherState(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && (k.startsWith(STORAGE_PREFIX) || k.startsWith('aether_os_v1::'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch (err) {
    console.warn('[AETHER Storage] Failed to clear storage:', err);
  }
}
