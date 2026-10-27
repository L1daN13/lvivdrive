/** Географічна точка у WGS84. */
export interface LatLon {
  lat: number;
  lon: number;
}

/** Прямокутна область карти. */
export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export type LocationKind = 'parking' | 'charging';

/**
 * Тристанний прапорець: `null` означає «невідомо».
 * Відсутність тегу в OSM не є доказом відсутності характеристики.
 */
export type TriState = boolean | null;

export type FeeStatus = 'paid' | 'free' | 'conditional' | 'unknown';

/** Стандартизовані типи роз'ємів, які ми розпізнаємо в тегах OSM. */
export type ConnectorType =
  | 'type2'
  | 'type2_cable'
  | 'ccs2'
  | 'chademo'
  | 'type1'
  | 'ccs1'
  | 'tesla'
  | 'gbt_ac'
  | 'gbt_dc'
  | 'schuko'
  | 'other';

export interface Connector {
  type: ConnectorType;
  /** Кількість роз'ємів цього типу, якщо вказана. */
  count: number | null;
  /** Максимальна потужність у кВт, якщо вказана. */
  powerKw: number | null;
}

interface BaseLocation extends LatLon {
  /** Унікальний id, напр. `osm:node/123`. */
  id: string;
  kind: LocationKind;
  /** Назва з джерела; `null`, якщо не вказана. */
  name: string | null;
  /** Адреса з тегів addr:*; `null`, якщо не вказана. */
  address: string | null;
  operator: string | null;
  openingHours: string | null;
  fee: FeeStatus;
  /** Текст тарифу з тегу `charge`, якщо він є в джерелі. */
  priceText: string | null;
  /** Доступ: public / customers / private тощо. */
  access: string | null;
  wheelchair: TriState | 'limited';
  website: string | null;
  /** Посилання на об'єкт у джерелі даних. */
  sourceUrl: string;
  sourceName: string;
  /** Сирі теги — для майбутніх джерел і налагодження. */
  tags: Record<string, string>;
}

export interface ParkingLocation extends BaseLocation {
  kind: 'parking';
  /** amenity=parking або amenity=parking_space. */
  osmAmenity: 'parking' | 'parking_space';
  /** Значення тегу parking=* (surface, underground, street_side...). */
  parkingType: string | null;
  capacity: number | null;
  capacityDisabled: number | null;
  maxStay: string | null;
  supervised: TriState;
  covered: TriState;
}

export interface ChargingLocation extends BaseLocation {
  kind: 'charging';
  brand: string | null;
  network: string | null;
  connectors: Connector[];
  /** Найбільша відома потужність серед роз'ємів / станції, кВт. */
  maxPowerKw: number | null;
  /** Кількість одночасних точок заряджання (capacity). */
  capacity: number | null;
}

export type MapLocation = ParkingLocation | ChargingLocation;

export type PowerBucket = 'any' | 'upTo22' | '22to50' | 'over50';

export type CategoryFilter = 'all' | 'parking' | 'charging';

export type FeeFilter = 'any' | 'paid' | 'free';

export interface Filters {
  category: CategoryFilter;
  fee: FeeFilter;
  connectors: ConnectorType[];
  power: PowerBucket;
  /** Максимальна відстань у км; `null` — без обмеження. */
  maxDistanceKm: number | null;
  /** Ховати об'єкти з access=private/no. */
  publicOnly: boolean;
  /** Показувати окремі паркомісця (amenity=parking_space). */
  includeSpaces: boolean;
}

export type SidebarTab = 'results' | 'favorites';
