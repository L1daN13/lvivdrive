/** Рівень доступності парковки за кількістю вільних місць. */
export type AvailabilityLevel = 'many' | 'few' | 'last' | 'none';

export function availabilityLevel(free: number): AvailabilityLevel {
  if (free > 2) return 'many';
  if (free === 2) return 'few';
  if (free === 1) return 'last';
  return 'none';
}

/** Кольори маркерів: більше 2 — зелений, 2 — жовтий, 1 — червоний, 0 — сірий. */
export const AVAILABILITY_COLORS: Record<AvailabilityLevel, string> = {
  many: '#16a34a',
  few: '#eab308',
  last: '#dc2626',
  none: '#6b7280',
};

export const AVAILABILITY_LEGEND: { level: AvailabilityLevel; label: string }[] = [
  { level: 'many', label: '>2' },
  { level: 'few', label: '2' },
  { level: 'last', label: '1' },
  { level: 'none', label: '0' },
];

/** Тон бейджа та колір тексту для списку й картки. */
export const AVAILABILITY_TONE = {
  many: 'green',
  few: 'amber',
  last: 'red',
  none: 'slate',
} as const satisfies Record<AvailabilityLevel, string>;

export const AVAILABILITY_TEXT: Record<AvailabilityLevel, string> = {
  many: 'text-green-600 dark:text-green-400',
  few: 'text-yellow-600 dark:text-yellow-400',
  last: 'text-red-600 dark:text-red-400',
  none: 'text-slate-500 dark:text-slate-400',
};
