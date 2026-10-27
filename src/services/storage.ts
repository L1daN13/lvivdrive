/** Безпечна обгортка над localStorage (приватний режим / заблоковане сховище не ламають застосунок). */
const PREFIX = 'lvivdrive:';

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    // Сховище недоступне або переповнене — працюємо без збереження
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ігноруємо
  }
}
