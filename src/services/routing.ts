import type { LatLon } from '../types/location';

/**
 * Маршрути будуються зовнішніми сервісами — ми лише формуємо посилання.
 * Жодних вигаданих маршрутів чи часу прибуття в застосунку не показуємо.
 */

export function googleMapsRouteUrl(to: LatLon, from?: LatLon | null): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${to.lat},${to.lon}`,
    travelmode: 'driving',
  });
  if (from) params.set('origin', `${from.lat},${from.lon}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function osmRouteUrl(to: LatLon, from?: LatLon | null): string {
  const origin = from ? `${from.lat},${from.lon}` : '';
  const route = `${origin};${to.lat},${to.lon}`;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(route)}#map=16/${to.lat}/${to.lon}`;
}
