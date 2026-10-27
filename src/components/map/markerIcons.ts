import L from 'leaflet';
import type { MapLocation } from '../../types/location';

export type MarkerVariant = 'parking' | 'parking-paid' | 'parking-free' | 'charging' | 'charging-fast';

const COLORS: Record<MarkerVariant, string> = {
  parking: '#2563eb',
  'parking-paid': '#1d4ed8',
  'parking-free': '#0891b2',
  charging: '#16a34a',
  'charging-fast': '#15803d',
};

// Іконки (шляхи з набору Lucide, ліцензія ISC)
const ZAP = '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" fill="currentColor" stroke="none"/>';
const P = '<path d="M9 17V7h4a3 3 0 0 1 0 6H9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';

export function markerVariant(l: MapLocation): MarkerVariant {
  if (l.kind === 'charging') return l.maxPowerKw !== null && l.maxPowerKw > 50 ? 'charging-fast' : 'charging';
  if (l.fee === 'paid' || l.fee === 'conditional') return 'parking-paid';
  if (l.fee === 'free') return 'parking-free';
  return 'parking';
}

const cache = new Map<string, L.DivIcon>();

/** Маркер-«крапля» з іконкою; виділений — більший і з обводкою. */
export function getMarkerIcon(variant: MarkerVariant, selected: boolean, favorite: boolean): L.DivIcon {
  const key = `${variant}|${selected}|${favorite}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = selected ? 44 : 32;
  const color = COLORS[variant];
  const glyph = variant.startsWith('charging') ? ZAP : P;
  const badge =
    variant === 'parking-paid'
      ? '<span class="ld-badge" style="background:#f59e0b">₴</span>'
      : variant === 'parking-free'
        ? '<span class="ld-badge" style="background:#10b981">0</span>'
        : variant === 'charging-fast'
          ? '<span class="ld-badge" style="background:#f59e0b">DC</span>'
          : '';
  const star = favorite ? '<span class="ld-fav">★</span>' : '';

  const html = `
    <div class="ld-pin${selected ? ' ld-pin--selected' : ''}" style="--pin:${color};width:${size}px;height:${size}px">
      <svg viewBox="0 0 24 24" width="${Math.round(size * 0.55)}" height="${Math.round(size * 0.55)}" style="color:#fff">${glyph}</svg>
      ${badge}${star}
    </div>`;

  const icon = L.divIcon({
    html,
    className: 'ld-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    tooltipAnchor: [0, -size],
  });
  cache.set(key, icon);
  return icon;
}

export function userLocationIcon(): L.DivIcon {
  return L.divIcon({
    html: '<div class="ld-user"><span></span></div>',
    className: 'ld-marker',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}
