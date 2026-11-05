import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Booking, ManagedLot, SpaceState, SpaceStatuses } from '../types/location';
import { loadJson, saveJson } from '../services/storage';
import { usePersistentState } from './usePersistentState';
import { useNow } from './useNow';

/** Межі тривалості броні, хв. */
export const BOOKING_MIN_MINUTES = 5;
export const BOOKING_MAX_MINUTES = 240;

const MINUTE = 60_000;

/** Стабільний анонімний id цього браузера — щоб відрізняти «свою» бронь. */
function getClientId(): string {
  let id = loadJson<string | null>('clientId', null);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    saveJson('clientId', id);
  }
  return id;
}

/** Підтримка старого формату { occupied: boolean }. */
function normalize(raw: unknown): SpaceState | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<SpaceState> & { occupied?: boolean };
  if (r.status) return r as SpaceState;
  if (typeof r.occupied === 'boolean') return { status: r.occupied ? 'occupied' : 'free', at: r.at ?? 0 };
  return undefined;
}

/** Фактичний стан з урахуванням часу: прострочена бронь — вільне місце. */
export function effectiveState(s: SpaceState | undefined, now: number): SpaceState {
  if (!s) return { status: 'free', at: 0 };
  if (s.status === 'reserved' && (s.reservedUntil ?? 0) <= now) return { status: 'free', at: s.reservedUntil ?? s.at };
  return s;
}

const clampMinutes = (m: number) => Math.min(BOOKING_MAX_MINUTES, Math.max(BOOKING_MIN_MINUTES, Math.round(m)));

/**
 * Статуси паркомісць і бронювання.
 * Поки що зберігаються в LocalStorage цього браузера; місце без запису — вільне.
 */
export function useSpaceStatus() {
  const [stored, setStored] = usePersistentState<SpaceStatuses>('spaceStatus', {});
  const [clientId] = useState(getClientId);
  /** Повідомлення про бронь, час якої щойно сплив. */
  const [expired, setExpired] = useState<Booking | null>(null);

  const statuses = useMemo(() => {
    const out: SpaceStatuses = {};
    for (const [lotId, lot] of Object.entries(stored)) {
      out[lotId] = {};
      for (const [spaceId, s] of Object.entries(lot)) {
        const n = normalize(s);
        if (n) out[lotId][spaceId] = n;
      }
    }
    return out;
  }, [stored]);

  const hasReservations = useMemo(
    () => Object.values(statuses).some((lot) => Object.values(lot).some((s) => s.status === 'reserved')),
    [statuses],
  );
  // Тікаємо щосекунди лише коли є броні — для відліку та автоматичного звільнення
  const now = useNow(hasReservations);

  // Прострочені броні переводимо у «вільне» і повідомляємо, якщо бронь була наша
  useEffect(() => {
    if (!hasReservations) return;
    let mineExpired: Booking | null = null;
    let changed = false;
    const next: SpaceStatuses = {};
    for (const [lotId, lot] of Object.entries(statuses)) {
      next[lotId] = { ...lot };
      for (const [spaceId, s] of Object.entries(lot)) {
        if (s.status === 'reserved' && (s.reservedUntil ?? 0) <= now) {
          changed = true;
          next[lotId][spaceId] = { status: 'free', at: s.reservedUntil ?? now };
          if (s.reservedBy === clientId) mineExpired = { lotId, spaceId, until: s.reservedUntil ?? now };
        }
      }
    }
    if (changed) {
      setStored(next);
      if (mineExpired) setExpired(mineExpired);
    }
  }, [now, hasReservations, statuses, clientId, setStored]);

  const update = useCallback(
    (lotId: string, spaceId: string, fn: (current: SpaceState) => SpaceState | null) => {
      setStored((prev) => {
        const lot = prev[lotId] ?? {};
        const current = effectiveState(normalize(lot[spaceId]), Date.now());
        const next = fn(current);
        if (!next) return prev;
        return { ...prev, [lotId]: { ...lot, [spaceId]: next } };
      });
    },
    [setStored],
  );

  const myBooking = useMemo<Booking | null>(() => {
    for (const [lotId, lot] of Object.entries(statuses)) {
      for (const [spaceId, s] of Object.entries(lot)) {
        if (s.status === 'reserved' && s.reservedBy === clientId && (s.reservedUntil ?? 0) > now) {
          return { lotId, spaceId, until: s.reservedUntil! };
        }
      }
    }
    return null;
  }, [statuses, clientId, now]);

  /** Позначити місце вільним або зайнятим вручну. Чужу активну бронь не чіпаємо. */
  const setOccupied = useCallback(
    (lotId: string, spaceId: string, occupied: boolean) =>
      update(lotId, spaceId, (cur) => {
        if (cur.status === 'reserved' && cur.reservedBy !== clientId) return null;
        return { status: occupied ? 'occupied' : 'free', at: Date.now() };
      }),
    [update, clientId],
  );

  /** Забронювати вільне місце на `minutes` хвилин. Одна активна бронь на користувача. */
  const reserve = useCallback(
    (lotId: string, spaceId: string, minutes: number): boolean => {
      if (myBooking) return false;
      if (effectiveState(statuses[lotId]?.[spaceId], Date.now()).status !== 'free') return false;
      update(lotId, spaceId, (cur) => {
        if (cur.status !== 'free') return null;
        const at = Date.now();
        return { status: 'reserved', at, reservedUntil: at + clampMinutes(minutes) * MINUTE, reservedBy: clientId };
      });
      return true;
    },
    [update, clientId, myBooking, statuses],
  );

  /** Продовжити свою бронь; загальний залишок не більший за максимум. */
  const extend = useCallback(
    (lotId: string, spaceId: string, minutes: number) =>
      update(lotId, spaceId, (cur) => {
        if (cur.status !== 'reserved' || cur.reservedBy !== clientId) return null;
        const t = Date.now();
        const until = Math.min((cur.reservedUntil ?? t) + minutes * MINUTE, t + BOOKING_MAX_MINUTES * MINUTE);
        return { ...cur, reservedUntil: until };
      }),
    [update, clientId],
  );

  const cancel = useCallback(
    (lotId: string, spaceId: string) =>
      update(lotId, spaceId, (cur) =>
        cur.status === 'reserved' && cur.reservedBy === clientId ? { status: 'free', at: Date.now() } : null,
      ),
    [update, clientId],
  );

  /** «Я на місці»: бронь перетворюється на зайняте місце. */
  const arrive = useCallback(
    (lotId: string, spaceId: string) =>
      update(lotId, spaceId, (cur) =>
        cur.status === 'reserved' && cur.reservedBy === clientId ? { status: 'occupied', at: Date.now() } : null,
      ),
    [update, clientId],
  );

  const lotStates = useCallback(
    (lotId: string, lot: ManagedLot): Record<string, SpaceState> =>
      Object.fromEntries(lot.spaces.map((s) => [s.id, effectiveState(statuses[lotId]?.[s.id], now)])),
    [statuses, now],
  );

  const freeCount = useCallback(
    (lotId: string, lot: ManagedLot) =>
      lot.spaces.filter((s) => effectiveState(statuses[lotId]?.[s.id], now).status === 'free').length,
    [statuses, now],
  );

  return {
    clientId,
    now,
    myBooking,
    expired,
    clearExpired: useCallback(() => setExpired(null), []),
    lotStates,
    freeCount,
    setOccupied,
    reserve,
    extend,
    cancel,
    arrive,
  };
}

export type SpaceStatusApi = ReturnType<typeof useSpaceStatus>;
