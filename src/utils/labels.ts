import type { ConnectorType, FeeStatus, MapLocation, ParkingLocation, PowerBucket } from '../types/location';

export const CONNECTOR_LABELS: Record<ConnectorType, string> = {
  type2: 'Type 2',
  type2_cable: 'Type 2 (кабель)',
  ccs2: 'CCS2',
  chademo: 'CHAdeMO',
  type1: 'Type 1',
  ccs1: 'CCS1',
  tesla: 'Tesla',
  gbt_ac: 'GB/T AC',
  gbt_dc: 'GB/T DC',
  schuko: 'Побутова (Schuko)',
  other: 'Інший',
};

/** Групи для фільтра роз'ємів: кілька OSM-типів зводимо в одну зрозумілу кнопку. */
export const CONNECTOR_FILTER_GROUPS: { id: ConnectorType; label: string; matches: ConnectorType[] }[] = [
  { id: 'type2', label: 'Type 2', matches: ['type2', 'type2_cable'] },
  { id: 'ccs2', label: 'CCS', matches: ['ccs2', 'ccs1'] },
  { id: 'chademo', label: 'CHAdeMO', matches: ['chademo'] },
  { id: 'gbt_dc', label: 'GB/T', matches: ['gbt_ac', 'gbt_dc'] },
  { id: 'type1', label: 'Type 1', matches: ['type1'] },
  { id: 'tesla', label: 'Tesla', matches: ['tesla'] },
  { id: 'schuko', label: 'Побутова', matches: ['schuko'] },
  { id: 'other', label: 'Інші', matches: ['other'] },
];

export const POWER_LABELS: Record<PowerBucket, string> = {
  any: 'Будь-яка',
  upTo22: 'До 22 кВт',
  '22to50': '22–50 кВт',
  over50: 'Понад 50 кВт',
};

const PARKING_TYPES: Record<string, string> = {
  surface: 'Відкритий майданчик',
  underground: 'Підземний паркінг',
  'multi-storey': 'Багаторівневий паркінг',
  rooftop: 'На даху',
  street_side: 'Вздовж вулиці',
  lane: 'Смуга на проїжджій частині',
  on_kerb: 'На бордюрі',
  half_on_kerb: 'Частково на бордюрі',
  layby: 'Кишеня біля дороги',
  carports: 'Навіси',
  garage_boxes: 'Гаражні бокси',
  sheds: 'Навіси',
};

export function parkingTypeLabel(p: ParkingLocation): string {
  if (p.osmAmenity === 'parking_space') return 'Окреме паркомісце';
  if (p.parkingType && PARKING_TYPES[p.parkingType]) return PARKING_TYPES[p.parkingType];
  if (p.parkingType) return p.parkingType;
  return 'Парковка';
}

export const FEE_LABELS: Record<FeeStatus, string> = {
  paid: 'Платна',
  free: 'Безкоштовна',
  conditional: 'Платна за умовами',
  unknown: 'Оплата невідома',
};

const ACCESS_LABELS: Record<string, string> = {
  yes: 'Загальнодоступна',
  public: 'Загальнодоступна',
  permissive: 'Доступ дозволено власником',
  customers: 'Для клієнтів',
  private: 'Приватна',
  no: 'Доступ заборонено',
  destination: 'Лише для відвідувачів',
  residents: 'Для мешканців',
  permit: 'За дозволом',
  delivery: 'Для доставки',
  employees: 'Для працівників',
};

export function accessLabel(access: string | null): string | null {
  if (!access) return null;
  return ACCESS_LABELS[access] ?? access;
}

/** Назва для показу: з джерела або описова (позначена як така). */
export function displayName(l: MapLocation): { text: string; fromSource: boolean } {
  if (l.name) return { text: l.name, fromSource: true };
  if (l.kind === 'charging') {
    const who = l.operator ?? l.brand ?? l.network;
    return { text: who ? `Зарядна станція ${who}` : 'Зарядна станція', fromSource: false };
  }
  return { text: parkingTypeLabel(l), fromSource: false };
}

export function formatOpeningHours(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.trim() === '24/7') return 'Цілодобово';
  return raw
    .replace(/\bMo\b/g, 'Пн').replace(/\bTu\b/g, 'Вт').replace(/\bWe\b/g, 'Ср')
    .replace(/\bTh\b/g, 'Чт').replace(/\bFr\b/g, 'Пт').replace(/\bSa\b/g, 'Сб')
    .replace(/\bSu\b/g, 'Нд').replace(/\bPH\b/g, 'Свята').replace(/\boff\b/g, 'вихідний');
}

export function formatKw(kw: number): string {
  return `${String(kw).replace('.', ',')} кВт`;
}
