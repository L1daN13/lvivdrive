import type { BBox, MapLocation } from '../types/location';
import { DataSourceError, type LocationProvider, type LocationResult } from './dataSource';
import { parseOsmElement, type OverpassElement } from './osmParser';
import { loadJson, removeKey, saveJson } from './storage';

/**
 * Публічні інстанси Overpass API (безкоштовні, без ключів).
 * Якщо один недоступний або перевантажений, пробуємо наступний.
 */
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

/** Мінімальний інтервал між запитами до Overpass (захист від надто частих запитів). */
const MIN_INTERVAL_MS = 4000;
/** Максимальна площа запиту в градусах² (~ 40×40 км на широті Львова). */
const MAX_AREA_DEG2 = 0.25;
/** Таймаут на стороні сервера та очікування відповіді одного інстансу. */
const SERVER_TIMEOUT_S = 25;
const CLIENT_TIMEOUT_MS = 35_000;
/** Через скільки без відповіді паралельно пробувати наступний інстанс. */
const HEDGE_DELAY_MS = 8000;
/** Скільки вважати збережені в браузері дані свіжими. */
const PERSIST_TTL_MS = 6 * 60 * 60 * 1000;
/** Скільки областей зберігати між сесіями (обмеження розміру localStorage). */
const PERSIST_MAX_AREAS = 4;

interface PersistedEntry {
  key: string;
  fetchedAt: number;
  items: MapLocation[];
}

function bboxString(b: BBox): string {
  return [b.south, b.west, b.north, b.east].map((n) => n.toFixed(5)).join(',');
}

/** Ключ кешу — область, округлена до ~100 м, щоб дрібні зсуви карти не створювали нових запитів. */
function cacheKey(b: BBox): string {
  return [b.south, b.west, b.north, b.east].map((n) => n.toFixed(3)).join(',');
}

export function buildQuery(b: BBox): string {
  const bb = bboxString(b);
  // `out center tags` повертає центр для way/relation (контури парковок)
  return `[out:json][timeout:${SERVER_TIMEOUT_S}];
(
  nwr["amenity"="parking"](${bb});
  nwr["amenity"="parking_space"](${bb});
  nwr["amenity"="charging_station"](${bb});
);
out center tags;`;
}

export class OverpassProvider implements LocationProvider {
  readonly name = 'OpenStreetMap (Overpass API)';
  /** Кеш у пам'яті на час роботи сторінки. */
  private cache = new Map<string, LocationResult>();
  private inflight = new Map<string, Promise<LocationResult>>();
  private lastRequestAt = 0;

  async fetchLocations(bbox: BBox, signal?: AbortSignal): Promise<LocationResult> {
    const area = (bbox.north - bbox.south) * (bbox.east - bbox.west);
    if (area > MAX_AREA_DEG2) {
      throw new DataSourceError('Область завелика. Наблизьте карту, щоб шукати об’єкти.', 'area-too-large');
    }

    const key = cacheKey(bbox);
    const cached = this.cache.get(key);
    if (cached) return cached;
    const pending = this.inflight.get(key);
    if (pending) return withAbort(pending, signal);

    // Свіжі дані, збережені в браузері під час попередніх відвідин
    const persisted = readPersisted(key);
    if (persisted && Date.now() - persisted.fetchedAt < PERSIST_TTL_MS) {
      const result: LocationResult = { items: persisted.items, fetchedAt: persisted.fetchedAt, stale: false };
      this.cache.set(key, result);
      return result;
    }

    const sinceLast = Date.now() - this.lastRequestAt;
    if (sinceLast < MIN_INTERVAL_MS) {
      const wait = Math.ceil((MIN_INTERVAL_MS - sinceLast) / 1000);
      throw new DataSourceError(`Забагато запитів. Спробуйте ще раз через ${wait} с.`, 'too-soon');
    }
    this.lastRequestAt = Date.now();

    // Сам запит не скасовуємо: його можуть чекати кілька викликів, а результат
    // все одно потрапить у кеш. Скасування стосується лише конкретного виклику.
    const promise = this.request(bbox)
      .then((items) => {
        const result: LocationResult = { items, fetchedAt: Date.now(), stale: false };
        this.cache.set(key, result);
        // Сирі теги не зберігаємо між сесіями — усе потрібне вже розібрано в поля
        writePersisted({ key, fetchedAt: result.fetchedAt, items: items.map((i) => ({ ...i, tags: {} })) });
        return result;
      })
      .catch((err: unknown) => {
        // Сервер недоступний, але є старіша копія — краще показати її з позначкою
        if (persisted) return { items: persisted.items, fetchedAt: persisted.fetchedAt, stale: true };
        throw err;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return withAbort(promise, signal);
  }

  /**
   * «Хеджований» запит: починаємо з першого інстансу; якщо він не відповів
   * за HEDGE_DELAY_MS або впав з помилкою — запускаємо наступний паралельно.
   * Перша успішна відповідь перемагає, решта запитів скасовуються.
   * Так не навантажуємо всі сервери одразу, але й не чекаємо хвилину на один.
   */
  private request(bbox: BBox): Promise<MapLocation[]> {
    const body = new URLSearchParams({ data: buildQuery(bbox) }).toString();
    const controllers: AbortController[] = [];
    let failures = 0;
    let lastError: DataSourceError | null = null;
    let settled = false;

    return new Promise<MapLocation[]>((resolve, reject) => {
      let next = 0;
      let hedgeTimer: ReturnType<typeof setTimeout> | undefined;

      const finish = () => {
        settled = true;
        clearTimeout(hedgeTimer);
        controllers.forEach((c) => c.abort());
      };

      const launch = () => {
        if (settled || next >= ENDPOINTS.length) return;
        const endpoint = ENDPOINTS[next++];
        const ctrl = new AbortController();
        controllers.push(ctrl);
        clearTimeout(hedgeTimer);
        hedgeTimer = setTimeout(launch, HEDGE_DELAY_MS);

        fetchFrom(endpoint, body, ctrl.signal).then(
          (items) => {
            if (settled) return;
            finish();
            resolve(items);
          },
          (err: DataSourceError) => {
            if (settled) return;
            lastError = err;
            failures++;
            if (failures >= ENDPOINTS.length) {
              finish();
              reject(lastError);
            } else {
              launch(); // помилка — одразу пробуємо наступний
            }
          },
        );
      };
      launch();
    });
  }
}

async function fetchFrom(endpoint: string, body: string, signal: AbortSignal): Promise<MapLocation[]> {
  let res: Response;
  let timedOut = false;
  // Власний таймаут замість AbortSignal.any — ширша підтримка браузерами
  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, CLIENT_TIMEOUT_MS);
  signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      body,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch {
    clearTimeout(timer);
    throw timedOut
      ? new DataSourceError('Сервер даних не відповів вчасно. Спробуйте пізніше.', 'timeout')
      : new DataSourceError('Не вдалося з’єднатися з сервером даних. Перевірте інтернет або спробуйте пізніше.', 'network');
  }
  if (!res.ok) clearTimeout(timer);
  if (res.status === 429) {
    throw new DataSourceError('Сервер даних перевантажений запитами. Спробуйте за хвилину.', 'rate-limit');
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new DataSourceError('Сервер даних OpenStreetMap зараз перевантажений. Спробуйте за кілька хвилин.', 'timeout');
  }
  if (!res.ok) throw new DataSourceError(`Сервер даних повернув помилку ${res.status}.`, 'server');

  let json: { elements?: OverpassElement[]; remark?: string };
  try {
    json = await res.json();
  } catch {
    throw timedOut
      ? new DataSourceError('Сервер даних не відповів вчасно. Спробуйте пізніше.', 'timeout')
      : new DataSourceError('Сервер даних повернув некоректну відповідь.', 'server');
  } finally {
    clearTimeout(timer);
  }
  // Overpass іноді повертає 200 з remark про таймаут і неповними даними
  if (json.remark && /timed out|out of memory/i.test(json.remark)) {
    throw new DataSourceError('Сервер даних не встиг обробити запит. Спробуйте меншу область.', 'timeout');
  }
  return dedupe((json.elements ?? []).map(parseOsmElement).filter((l): l is MapLocation => l !== null));
}

// --- Збереження в браузері між сесіями ---

const INDEX_KEY = 'overpass:index';

function readPersisted(key: string): PersistedEntry | null {
  const entry = loadJson<PersistedEntry | null>(`overpass:${key}`, null);
  return entry && Array.isArray(entry.items) ? entry : null;
}

function writePersisted(entry: PersistedEntry): void {
  const index = loadJson<string[]>(INDEX_KEY, []).filter((k) => k !== entry.key);
  index.push(entry.key);
  // Видаляємо найстаріші області, щоб не переповнити сховище
  while (index.length > PERSIST_MAX_AREAS) removeKey(`overpass:${index.shift()}`);
  saveJson(INDEX_KEY, index);
  saveJson(`overpass:${entry.key}`, entry);
}

/** Відхиляє проміс при скасуванні сигналу, не зупиняючи саму операцію. */
function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    if (signal.aborted) return onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

function dedupe(list: MapLocation[]): MapLocation[] {
  const map = new Map<string, MapLocation>();
  for (const l of list) map.set(l.id, l);
  return [...map.values()];
}

/** Активне джерело даних застосунку. Замініть тут, щоб підключити інше. */
export const locationProvider: LocationProvider = new OverpassProvider();
