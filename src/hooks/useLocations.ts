import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BBox, MapLocation } from '../types/location';
import { DataSourceError } from '../services/dataSource';
import { locationProvider } from '../services/overpassApi';
import { bboxContains } from '../utils/geo';

const AUTO_RETRIES = 3;
const RETRY_BASE_MS = 15_000;

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LocationsState {
  locations: MapLocation[];
  status: LoadStatus;
  error: string | null;
  /** Області, для яких дані вже завантажено. */
  loadedAreas: BBox[];
  /** Коли дані отримано від джерела. */
  lastUpdated: Date | null;
  /** Показано збережену копію, бо джерело недоступне. */
  stale: boolean;
  load: (bbox: BBox) => Promise<void>;
  retry: () => void;
  isAreaLoaded: (bbox: BBox) => boolean;
}

/** Завантажує об'єкти з активного джерела та накопичує їх між запитами. */
export function useLocations(initialBBox: BBox): LocationsState {
  const [byId, setById] = useState<Map<string, MapLocation>>(() => new Map());
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loadedAreas, setLoadedAreas] = useState<BBox[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [stale, setStale] = useState(false);
  const lastRequested = useRef<BBox>(initialBBox);
  const abortRef = useRef<AbortController | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const run = useCallback(async (bbox: BBox, attempt: number) => {
    lastRequested.current = bbox;
    clearTimeout(retryTimer.current);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus('loading');
    setError(null);
    try {
      const result = await locationProvider.fetchLocations(bbox, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setById((prev) => {
        const next = new Map(prev);
        for (const item of result.items) next.set(item.id, item);
        return next;
      });
      setLoadedAreas((prev) => [...prev, bbox]);
      setLastUpdated(new Date(result.fetchedAt));
      setStale(result.stale);
      setStatus('ready');
    } catch (err) {
      if (ctrl.signal.aborted) return;
      const message = err instanceof DataSourceError ? err.message : 'Дані тимчасово недоступні. Спробуйте пізніше.';
      // Перевантаження сервера — повторюємо автоматично з експоненційною паузою
      const transient = err instanceof DataSourceError && (err.kind === 'timeout' || err.kind === 'rate-limit');
      if (transient && attempt < AUTO_RETRIES) {
        const delay = RETRY_BASE_MS * 2 ** attempt;
        setError(`${message} Автоматична повторна спроба через ${Math.round(delay / 1000)} с.`);
        retryTimer.current = setTimeout(() => void run(bbox, attempt + 1), delay);
      } else {
        setError(message);
      }
      setStatus('error');
    }
  }, []);

  /** Завантаження за дією користувача — лічильник автоповторів скидається. */
  const load = useCallback((bbox: BBox) => run(bbox, 0), [run]);

  const retry = useCallback(() => {
    void load(lastRequested.current);
  }, [load]);

  const isAreaLoaded = useCallback(
    (bbox: BBox) => loadedAreas.some((area) => bboxContains(area, bbox)),
    [loadedAreas],
  );

  useEffect(() => {
    void load(initialBBox);
    return () => {
      abortRef.current?.abort();
      clearTimeout(retryTimer.current);
    };
    // Початкове завантаження — лише один раз
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Стабільна посилка на масив — інакше маркери перебудовувались би при кожному рендері
  const locations = useMemo(() => [...byId.values()], [byId]);

  return {
    locations,
    status,
    error,
    loadedAreas,
    lastUpdated,
    stale,
    load,
    retry,
    isAreaLoaded,
  };
}
