import type { BBox, Filters, LatLon } from '../types/location';

export const LVIV_CENTER: LatLon = { lat: 49.8419, lon: 24.0315 };
export const LVIV_ZOOM = 13;

/** Львів і найближчі околиці (Винники, Брюховичі, Рудне, Сокільники). */
export const LVIV_BBOX: BBox = { south: 49.76, west: 23.89, north: 49.91, east: 24.15 };

export const DEFAULT_FILTERS: Filters = {
  category: 'all',
  fee: 'any',
  connectors: [],
  power: 'any',
  maxDistanceKm: null,
  publicOnly: true,
  includeSpaces: false,
};

export const DISTANCE_OPTIONS = [1, 3, 5, 10] as const;
