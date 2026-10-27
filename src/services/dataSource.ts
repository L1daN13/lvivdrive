import type { BBox, MapLocation } from '../types/location';

/**
 * Загальний контракт джерела даних про локації.
 * Щоб підключити інше джерело (наприклад, офіційний API оператора зарядок
 * або міської системи паркування), достатньо реалізувати цей інтерфейс.
 */
export interface LocationProvider {
  /** Людська назва джерела для атрибуції. */
  readonly name: string;
  fetchLocations(bbox: BBox, signal?: AbortSignal): Promise<LocationResult>;
}

export interface LocationResult {
  items: MapLocation[];
  /** Коли дані отримано від джерела (мс з epoch). */
  fetchedAt: number;
  /** true — джерело недоступне, показано старішу збережену копію. */
  stale: boolean;
}

/** Помилка, текст якої можна показати користувачу. */
export class DataSourceError extends Error {
  constructor(
    message: string,
    readonly kind: 'network' | 'rate-limit' | 'timeout' | 'server' | 'too-soon' | 'area-too-large',
  ) {
    super(message);
    this.name = 'DataSourceError';
  }
}
