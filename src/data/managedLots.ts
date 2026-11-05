import type { MapLocation, ParkingLocation } from '../types/location';

/**
 * Парковки з ручним керуванням паркомісцями.
 * Прив'язані до реальних об'єктів OpenStreetMap за id; якщо об'єкта немає
 * в завантажених даних, використовується `fallback`.
 */
interface ManagedLotConfig {
  id: string;
  name: string;
  address: string;
  fallback: { lat: number; lon: number };
  spaceCount: number;
}

const CONFIG: ManagedLotConfig[] = [
  {
    // Відкрита платна парковка біля ТЦ «Вам», вул. Івана Виговського, 100
    id: 'osm:way/492119115',
    name: 'Парковка ТЦ «Вам»',
    address: 'вул. Івана Виговського, 100',
    fallback: { lat: 49.812094, lon: 23.976934 },
    spaceCount: 10,
  },
];

function spaces(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: String(i + 1), label: String(i + 1) }));
}

function fallbackLocation(c: ManagedLotConfig): ParkingLocation {
  const [type, id] = c.id.replace('osm:', '').split('/');
  return {
    id: c.id,
    kind: 'parking',
    lat: c.fallback.lat,
    lon: c.fallback.lon,
    name: null,
    address: null,
    operator: null,
    openingHours: null,
    fee: 'unknown',
    priceText: null,
    access: null,
    wheelchair: null,
    website: null,
    sourceUrl: `https://www.openstreetmap.org/${type}/${id}`,
    sourceName: 'OpenStreetMap',
    tags: {},
    osmAmenity: 'parking',
    parkingType: null,
    capacity: null,
    capacityDisabled: null,
    maxStay: null,
    supervised: null,
    covered: null,
  };
}

/** Додає паркомісця з ручним керуванням до відповідних парковок. */
export function withManagedLots(locations: MapLocation[]): MapLocation[] {
  const byId = new Map(CONFIG.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const result = locations.map((l) => {
    const c = byId.get(l.id);
    if (!c || l.kind !== 'parking') return l;
    seen.add(l.id);
    return enrich(l, c);
  });
  for (const c of CONFIG) if (!seen.has(c.id)) result.push(enrich(fallbackLocation(c), c));
  return result;
}

function enrich(l: ParkingLocation, c: ManagedLotConfig): ParkingLocation {
  return {
    ...l,
    name: l.name ?? c.name,
    address: l.address ?? c.address,
    // capacity не чіпаємо: керовані місця — лише частина парковки, а не її повна місткість
    managed: { spaces: spaces(c.spaceCount) },
  };
}
