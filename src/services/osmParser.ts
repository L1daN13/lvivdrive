import type {
  ChargingLocation,
  Connector,
  ConnectorType,
  FeeStatus,
  MapLocation,
  ParkingLocation,
  TriState,
} from '../types/location';

/** Елемент відповіді Overpass (`out center tags`). */
export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Відповідність ключів socket:* у OSM нашим типам роз'ємів. */
const SOCKET_KEYS: Record<string, ConnectorType> = {
  type2: 'type2',
  type2_cable: 'type2_cable',
  type2_combo: 'ccs2',
  chademo: 'chademo',
  type1: 'type1',
  type1_combo: 'ccs1',
  tesla_supercharger: 'tesla',
  tesla_supercharger_ccs: 'ccs2',
  tesla_destination: 'tesla',
  nacs: 'tesla',
  gb_t: 'gbt_ac',
  gb_t_ac: 'gbt_ac',
  gb_t_dc: 'gbt_dc',
  gbt_ac: 'gbt_ac',
  gbt_dc: 'gbt_dc',
  schuko: 'schuko',
  typee: 'schuko',
  typef: 'schuko',
  cee_blue: 'other',
  cee_red_16a: 'other',
  cee_red_32a: 'other',
  cee_red_63a: 'other',
};

/**
 * Розбирає значення потужності з OSM («22 kW», «50kW», «7400 W», «22»).
 * Повертає кВт або `null`. Голе число без одиниць трактуємо як кВт,
 * якщо воно правдоподібне (≤ 1000), інакше як Вт.
 */
export function parsePowerKw(raw: string | undefined): number | null {
  if (!raw) return null;
  let best: number | null = null;
  // Значення можуть бути через «;» — беремо максимальне
  for (const part of raw.split(/[;,]/)) {
    const m = part.trim().replace(',', '.').match(/^([\d.]+)\s*(kw|kva|w|mw)?$/i);
    if (!m) continue;
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n <= 0) continue;
    const unit = (m[2] ?? '').toLowerCase();
    let kw: number;
    if (unit === 'w') kw = n / 1000;
    else if (unit === 'mw') kw = n * 1000;
    else if (unit === 'kw' || unit === 'kva') kw = n;
    else kw = n > 1000 ? n / 1000 : n;
    if (best === null || kw > best) best = kw;
  }
  return best === null ? null : Math.round(best * 10) / 10;
}

function parseCount(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 && String(n) === raw.trim() ? n : null;
}

function parseTri(raw: string | undefined): TriState {
  if (!raw) return null;
  if (['yes', 'true', '1'].includes(raw)) return true;
  if (['no', 'false', '0'].includes(raw)) return false;
  return null;
}

function parseFee(tags: Record<string, string>): FeeStatus {
  const fee = tags.fee;
  if (fee === 'no') return 'free';
  if (fee === 'yes') return 'paid';
  if (fee && fee !== 'unknown') return 'conditional';
  // Деякі мапери вказують fee:conditional без основного тегу
  if (tags['fee:conditional']) return 'conditional';
  return 'unknown';
}

function parseWheelchair(raw: string | undefined): TriState | 'limited' {
  if (raw === 'limited') return 'limited';
  return parseTri(raw);
}

function buildAddress(tags: Record<string, string>): string | null {
  const street = tags['addr:street'] ?? tags['addr:place'];
  const house = tags['addr:housenumber'];
  if (street) return house ? `${street}, ${house}` : street;
  if (tags['addr:full']) return tags['addr:full'];
  return null;
}

function pickName(tags: Record<string, string>): string | null {
  return tags['name:uk'] ?? tags.name ?? tags['name:en'] ?? null;
}

function parseConnectors(tags: Record<string, string>): Connector[] {
  const byType = new Map<ConnectorType, Connector>();
  for (const [key, value] of Object.entries(tags)) {
    // Шукаємо лише ключі виду socket:<тип> (без :output, :current тощо)
    const m = key.match(/^socket:([a-z0-9_]+)$/);
    if (!m) continue;
    const socketKey = m[1];
    if (value === 'no' || value === '0') continue;
    const type = SOCKET_KEYS[socketKey] ?? 'other';
    const count = value === 'yes' ? null : parseCount(value);
    const powerKw = parsePowerKw(tags[`socket:${socketKey}:output`]);
    const existing = byType.get(type);
    if (existing) {
      existing.count = existing.count !== null && count !== null ? existing.count + count : existing.count ?? count;
      if (powerKw !== null && (existing.powerKw === null || powerKw > existing.powerKw)) existing.powerKw = powerKw;
    } else {
      byType.set(type, { type, count, powerKw });
    }
  }
  return [...byType.values()];
}

function stationPowerKw(tags: Record<string, string>, connectors: Connector[]): number | null {
  const candidates = [
    ...connectors.map((c) => c.powerKw),
    parsePowerKw(tags['charging_station:output']),
    parsePowerKw(tags.maxpower),
    parsePowerKw(tags.output),
  ].filter((v): v is number => v !== null);
  return candidates.length ? Math.max(...candidates) : null;
}

function coords(el: OverpassElement): { lat: number; lon: number } | null {
  if (typeof el.lat === 'number' && typeof el.lon === 'number') return { lat: el.lat, lon: el.lon };
  if (el.center) return el.center;
  return null;
}

/** Перетворює елемент Overpass на нашу модель, або `null`, якщо він не підходить. */
export function parseOsmElement(el: OverpassElement): MapLocation | null {
  const tags = el.tags ?? {};
  const pos = coords(el);
  if (!pos) return null;

  const base = {
    id: `osm:${el.type}/${el.id}`,
    lat: pos.lat,
    lon: pos.lon,
    name: pickName(tags),
    address: buildAddress(tags),
    operator: tags.operator ?? null,
    openingHours: tags.opening_hours ?? null,
    fee: parseFee(tags),
    priceText: tags.charge ?? tags['charge:conditional'] ?? null,
    access: tags.access ?? null,
    wheelchair: parseWheelchair(tags.wheelchair),
    website: tags.website ?? tags['contact:website'] ?? tags.url ?? null,
    sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    sourceName: 'OpenStreetMap',
    tags,
  };

  if (tags.amenity === 'charging_station') {
    const connectors = parseConnectors(tags);
    const loc: ChargingLocation = {
      ...base,
      kind: 'charging',
      brand: tags.brand ?? null,
      network: tags.network ?? null,
      connectors,
      maxPowerKw: stationPowerKw(tags, connectors),
      capacity: parseCount(tags.capacity),
    };
    return loc;
  }

  if (tags.amenity === 'parking' || tags.amenity === 'parking_space') {
    const loc: ParkingLocation = {
      ...base,
      kind: 'parking',
      osmAmenity: tags.amenity,
      parkingType: tags.parking ?? null,
      capacity: parseCount(tags.capacity),
      capacityDisabled: parseCount(tags['capacity:disabled']),
      maxStay: tags.maxstay ?? null,
      supervised: parseTri(tags.supervised),
      covered: parseTri(tags.covered),
    };
    return loc;
  }

  return null;
}
