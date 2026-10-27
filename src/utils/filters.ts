import type { Filters, LatLon, MapLocation } from '../types/location';
import { distanceKm } from './geo';
import { CONNECTOR_FILTER_GROUPS, displayName } from './labels';

const PRIVATE_ACCESS = new Set(['private', 'no']);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’'`ʼ]/g, '')
    .replace(/ё/g, 'е')
    .trim();
}

/** Текст для пошуку: назва, адреса, оператор, бренд, мережа. */
function haystack(l: MapLocation): string {
  const parts = [displayName(l).text, l.name, l.address, l.operator, l.tags['addr:street']];
  if (l.kind === 'charging') parts.push(l.brand, l.network);
  return normalize(parts.filter(Boolean).join(' '));
}

export function matchesQuery(l: MapLocation, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const text = haystack(l);
  return q.split(/\s+/).every((word) => text.includes(word));
}

export function matchesFilters(l: MapLocation, f: Filters, userPos: LatLon | null): boolean {
  if (f.category !== 'all' && l.kind !== f.category) return false;
  if (f.publicOnly && l.access && PRIVATE_ACCESS.has(l.access)) return false;
  if (f.maxDistanceKm !== null && userPos && distanceKm(userPos, l) > f.maxDistanceKm) return false;

  if (l.kind === 'parking') {
    if (!f.includeSpaces && l.osmAmenity === 'parking_space') return false;
    // «Безкоштовні» — лише підтверджені fee=no; «Платні» — fee=yes або за умовами
    if (f.fee === 'free' && l.fee !== 'free') return false;
    if (f.fee === 'paid' && l.fee !== 'paid' && l.fee !== 'conditional') return false;
    // Фільтри зарядок не відсіюють парковки, лише якщо обрано «лише зарядки»
    return true;
  }

  // Зарядні станції
  if (f.connectors.length) {
    const wanted = new Set(
      CONNECTOR_FILTER_GROUPS.filter((g) => f.connectors.includes(g.id)).flatMap((g) => g.matches),
    );
    if (!l.connectors.some((c) => wanted.has(c.type))) return false;
  }
  if (f.power !== 'any') {
    const p = l.maxPowerKw;
    if (p === null) return false;
    if (f.power === 'upTo22' && p > 22) return false;
    if (f.power === '22to50' && (p < 22 || p > 50)) return false;
    if (f.power === 'over50' && p <= 50) return false;
  }
  return true;
}

/** Чи активний хоч один фільтр, специфічний для зарядок. */
export function hasChargingFilters(f: Filters): boolean {
  return f.connectors.length > 0 || f.power !== 'any';
}

export function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.fee !== 'any') n++;
  if (f.connectors.length) n++;
  if (f.power !== 'any') n++;
  if (f.maxDistanceKm !== null) n++;
  if (!f.publicOnly) n++;
  if (f.includeSpaces) n++;
  return n;
}
