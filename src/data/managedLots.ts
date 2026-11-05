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
  /** Номери місць, зайнятих за замовчуванням. */
  defaultOccupied?: string[];
}

const CONFIG: ManagedLotConfig[] = [
  {
    // Відкрита платна парковка біля ТЦ «Вам», вул. Івана Виговського, 100
    id: 'osm:way/492119115',
    name: 'Парковка ТЦ «Вам»',
    address: 'вул. Івана Виговського, 100',
    fallback: { lat: 49.812094, lon: 23.976934 },
    spaceCount: 6,
    defaultOccupied: ['1', '2', '5'],
  },
  {
    // Центр, платна, 38 місць за OSM
    id: 'osm:way/148060834',
    name: 'Парковка на пл. Євгена Петрушевича',
    address: 'пл. Євгена Петрушевича (Личаків)',
    fallback: { lat: 49.832875, lon: 24.036941 },
    spaceCount: 6,
  },
  {
    // Біля Головного вокзалу, платна
    id: 'osm:way/161444600',
    name: 'Парковка біля залізничного вокзалу',
    address: 'вул. Городоцька (Привокзальна)',
    fallback: { lat: 49.835866, lon: 23.994778 },
    spaceCount: 6,
  },
  {
    // Личаківський район
    id: 'osm:way/170663506',
    name: 'Парковка на вул. Стрілецькій',
    address: 'вул. Стрілецька (Професорська колонія)',
    fallback: { lat: 49.842155, lon: 24.058784 },
    spaceCount: 6,
  },
  {
    // Левандівка, платна, 200 місць за OSM
    id: 'osm:way/160331055',
    name: 'Парковка на вул. Широкій, 79',
    address: 'вул. Широка, 79 (Левандівка)',
    fallback: { lat: 49.84016, lon: 23.963792 },
    spaceCount: 6,
  },
  {
    // Шевченківський район, платна
    id: 'osm:way/281256423',
    name: 'Автостоянка «Замарстинівська»',
    address: 'вул. Торфʼяна (Замарстинів)',
    fallback: { lat: 49.862397, lon: 24.023969 },
    spaceCount: 6,
  },
  {
    // Безкоштовна, 24 місця за OSM
    id: 'osm:way/1504097795',
    name: 'Парковка на вул. Городницькій',
    address: 'вул. Городницька (Замарстинів)',
    fallback: { lat: 49.862126, lon: 24.03719 },
    spaceCount: 6,
  },
  {
    // Франківський район, 50 місць за OSM
    id: 'osm:way/355961076',
    name: 'Парковка на вул. Княгині Ольги',
    address: 'вул. Княгині Ольги (Кульпарків)',
    fallback: { lat: 49.817294, lon: 24.002698 },
    spaceCount: 6,
  },
  {
    // Безкоштовна, 88 місць за OSM
    id: 'osm:way/453743052',
    name: 'Парковка на вул. Стрийській',
    address: 'вул. Стрийська (Персенківка)',
    fallback: { lat: 49.816527, lon: 24.020554 },
    spaceCount: 6,
  },
  {
    // Сихів, безкоштовна
    id: 'osm:way/333039542',
    name: 'Парковка Sport Life',
    address: 'вул. Зубрівська (Сихів)',
    fallback: { lat: 49.795641, lon: 24.058319 },
    spaceCount: 6,
  },
  {
    // Стадіон «Арена Львів»
    id: 'osm:way/228272636',
    name: 'Парковка P2 біля «Арени Львів»',
    address: 'вул. Карла Мікльоша (Боднарівка)',
    fallback: { lat: 49.773664, lon: 24.025416 },
    spaceCount: 6,
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
    // Назва з конфігурації зрозуміліша за короткі позначки OSM на кшталт «P2»
    name: c.name,
    address: l.address ?? c.address,
    // capacity не чіпаємо: керовані місця — лише частина парковки, а не її повна місткість
    managed: { spaces: spaces(c.spaceCount), defaultOccupied: c.defaultOccupied },
  };
}
