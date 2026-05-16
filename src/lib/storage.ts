const PREFIX = 'pfh:';

export function loadNumber(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(PREFIX + key);
    if (v === null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export function saveNumber(key: string, value: number): void {
  try {
    localStorage.setItem(PREFIX + key, String(value));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function loadStringSet(key: string): Set<string> {
  try {
    const v = localStorage.getItem(PREFIX + key);
    if (!v) return new Set();
    const arr: unknown = JSON.parse(v);
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

export function saveStringSet(key: string, value: Set<string>): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(Array.from(value)));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function loadString(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function saveString(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // ignore quota / privacy-mode errors
  }
}
