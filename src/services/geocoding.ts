import type { BBox, LatLon } from '../types/location';

/**
 * Nominatim (OpenStreetMap) — безкоштовний геокодер.
 * Політика використання: не частіше 1 запиту на секунду, лише за дією користувача.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const MIN_INTERVAL_MS = 1100;

let lastCall = 0;
const reverseCache = new Map<string, string | null>();
const searchCache = new Map<string, PlaceResult[]>();

async function throttle(): Promise<void> {
  const wait = lastCall + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

export interface PlaceResult extends LatLon {
  label: string;
}

/** Приблизна адреса за координатами (для об'єктів без тегів addr:*). */
export async function reverseGeocode(pos: LatLon, signal?: AbortSignal): Promise<string | null> {
  const key = `${pos.lat.toFixed(5)},${pos.lon.toFixed(5)}`;
  if (reverseCache.has(key)) return reverseCache.get(key) ?? null;
  await throttle();
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(pos.lat),
    lon: String(pos.lon),
    zoom: '18',
    addressdetails: '1',
    'accept-language': 'uk',
  });
  const res = await fetch(`${NOMINATIM}/reverse?${params}`, { signal });
  if (!res.ok) return null;
  const json = (await res.json()) as { address?: Record<string, string> };
  const a = json.address ?? {};
  const street = a.road ?? a.pedestrian ?? a.square ?? a.neighbourhood ?? a.suburb;
  const label = street ? (a.house_number ? `${street}, ${a.house_number}` : street) : null;
  reverseCache.set(key, label);
  return label;
}

/** Пошук вулиці / місця у межах області (за замовчуванням — Львів). */
export async function searchPlace(query: string, viewbox: BBox, signal?: AbortSignal): Promise<PlaceResult[]> {
  const key = query.trim().toLowerCase();
  const cached = searchCache.get(key);
  if (cached) return cached;
  await throttle();
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    limit: '5',
    'accept-language': 'uk',
    countrycodes: 'ua',
    viewbox: `${viewbox.west},${viewbox.north},${viewbox.east},${viewbox.south}`,
    bounded: '1',
  });
  const res = await fetch(`${NOMINATIM}/search?${params}`, { signal });
  if (!res.ok) throw new Error('Сервіс пошуку адрес тимчасово недоступний.');
  const json = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  const results = json.map((r) => ({
    lat: Number(r.lat),
    lon: Number(r.lon),
    // Скорочуємо довгу назву: перші 3 частини
    label: r.display_name.split(',').slice(0, 3).join(',').trim(),
  }));
  searchCache.set(key, results);
  return results;
}
