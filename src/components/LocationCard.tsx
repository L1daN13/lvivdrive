import { Crosshair, Star } from 'lucide-react';
import type { MapLocation } from '../types/location';
import { formatDistance } from '../utils/geo';
import { CONNECTOR_LABELS, FEE_LABELS, displayName, formatKw, parkingTypeLabel } from '../utils/labels';
import { Badge } from './Badge';
import { LocationIcon } from './LocationIcon';

interface Props {
  location: MapLocation;
  distanceKm: number | null;
  favorite: boolean;
  selected: boolean;
  onOpen: () => void;
  onShowOnMap: () => void;
  onToggleFavorite: () => void;
}

function Summary({ location: l }: { location: MapLocation }) {
  if (l.kind === 'charging') {
    const types = [...new Set(l.connectors.map((c) => CONNECTOR_LABELS[c.type]))];
    return (
      <div className="mt-1.5 flex flex-wrap gap-1">
        {l.maxPowerKw !== null && <Badge tone={l.maxPowerKw > 50 ? 'amber' : 'green'}>до {formatKw(l.maxPowerKw)}</Badge>}
        {types.slice(0, 3).map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
        {types.length === 0 && <Badge>Роз’єми не вказані</Badge>}
      </div>
    );
  }
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {l.fee !== 'unknown' && <Badge tone={l.fee === 'free' ? 'green' : 'blue'}>{FEE_LABELS[l.fee]}</Badge>}
      {l.capacity !== null && <Badge>{l.capacity} місць</Badge>}
      {l.capacityDisabled !== null && l.capacityDisabled > 0 && <Badge>♿ {l.capacityDisabled}</Badge>}
    </div>
  );
}

export function LocationCard({ location, distanceKm, favorite, selected, onOpen, onShowOnMap, onToggleFavorite }: Props) {
  const name = displayName(location);
  const subtitle =
    location.address ?? (location.kind === 'parking' && name.fromSource ? parkingTypeLabel(location) : location.operator) ?? null;

  return (
    <li
      className={`group animate-fade-in rounded-2xl border bg-white p-3 transition hover:border-slate-300 hover:shadow-card dark:bg-slate-800/60 dark:hover:border-slate-600 ${
        selected ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200 dark:border-slate-700/80'
      }`}
    >
      <div className="flex gap-3">
        <LocationIcon location={location} />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate font-semibold text-slate-900 dark:text-slate-100">{name.text}</h3>
            {distanceKm !== null && (
              <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{formatDistance(distanceKm)}</span>
            )}
          </div>
          {subtitle && <p className="truncate text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          <Summary location={location} />
        </button>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={favorite}
            aria-label={favorite ? 'Прибрати з вибраного' : 'Додати до вибраного'}
            title={favorite ? 'Прибрати з вибраного' : 'Додати до вибраного'}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-amber-500/10"
          >
            <Star className={`h-4 w-4 ${favorite ? 'fill-amber-400 text-amber-500' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onShowOnMap}
            aria-label="Показати на карті"
            title="Показати на карті"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <Crosshair className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
