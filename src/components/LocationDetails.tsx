import { useEffect, useState, type ReactNode } from 'react';
import {
  Accessibility,
  ArrowLeft,
  Banknote,
  Building2,
  CircleHelp,
  Clock,
  Crosshair,
  ExternalLink,
  Gauge,
  Info,
  KeyRound,
  MapPin,
  Navigation,
  Plug,
  Star,
  Timer,
  Users,
} from 'lucide-react';
import type { ChargingLocation, LatLon, MapLocation, ParkingLocation } from '../types/location';
import { reverseGeocode } from '../services/geocoding';
import { googleMapsRouteUrl, osmRouteUrl } from '../services/routing';
import { distanceKm, formatCoords, formatDistance } from '../utils/geo';
import {
  CONNECTOR_LABELS,
  FEE_LABELS,
  accessLabel,
  displayName,
  formatKw,
  formatOpeningHours,
  parkingTypeLabel,
} from '../utils/labels';
import { Badge } from './Badge';
import { LocationIcon } from './LocationIcon';

interface Props {
  location: MapLocation;
  userPosition: LatLon | null;
  favorite: boolean;
  onBack: () => void;
  onShowOnMap: () => void;
  onToggleFavorite: () => void;
}

const UNKNOWN = <span className="text-slate-400 dark:text-slate-500">не вказано в джерелі</span>;

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5">
      <div className="mt-0.5 text-slate-400 dark:text-slate-500">{icon}</div>
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="mt-0.5 break-words text-sm text-slate-800 dark:text-slate-200">{children}</dd>
      </div>
    </div>
  );
}

function wheelchairText(w: MapLocation['wheelchair']): ReactNode {
  if (w === true) return 'Так';
  if (w === false) return 'Ні';
  if (w === 'limited') return 'Частково';
  return UNKNOWN;
}

/** Адреса з тегів або приблизна адреса з Nominatim (чітко позначена). */
function AddressValue({ location }: { location: MapLocation }) {
  const [approx, setApprox] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  useEffect(() => {
    if (location.address) return;
    const ctrl = new AbortController();
    setApprox(null);
    setState('loading');
    reverseGeocode(location, ctrl.signal)
      .then((a) => {
        setApprox(a);
        setState('done');
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setState('error');
      });
    return () => ctrl.abort();
  }, [location]);

  if (location.address) return <>{location.address}</>;
  return (
    <>
      {state === 'loading' && <span className="text-slate-400">Визначаємо приблизну адресу…</span>}
      {state === 'done' && approx && (
        <span>
          ≈ {approx}{' '}
          <span className="text-xs text-slate-400" title="Адресу не вказано в джерелі; визначено за координатами через Nominatim">
            (приблизно, за координатами)
          </span>
        </span>
      )}
      {(state === 'error' || (state === 'done' && !approx)) && UNKNOWN}
      <span className="mt-0.5 block font-mono text-xs text-slate-500 dark:text-slate-400">{formatCoords(location)}</span>
    </>
  );
}

function ParkingFields({ p }: { p: ParkingLocation }) {
  return (
    <>
      <Row icon={<Building2 className="h-4 w-4" />} label="Тип">
        {parkingTypeLabel(p)}
      </Row>
      <Row icon={<Banknote className="h-4 w-4" />} label="Оплата">
        {p.fee === 'unknown' ? UNKNOWN : FEE_LABELS[p.fee]}
        {p.priceText && <span className="block text-slate-600 dark:text-slate-300">Тариф у джерелі: {p.priceText}</span>}
      </Row>
      <Row icon={<Users className="h-4 w-4" />} label="Кількість місць">
        {p.capacity ?? UNKNOWN}
        {p.capacityDisabled !== null && <span className="block">З них для людей з інвалідністю: {p.capacityDisabled}</span>}
      </Row>
      {p.maxStay && (
        <Row icon={<Timer className="h-4 w-4" />} label="Максимальний час стоянки">
          {p.maxStay}
        </Row>
      )}
    </>
  );
}

function ChargingFields({ c }: { c: ChargingLocation }) {
  return (
    <>
      <Row icon={<Plug className="h-4 w-4" />} label="Роз’єми">
        {c.connectors.length === 0 ? (
          UNKNOWN
        ) : (
          <ul className="mt-1 space-y-1">
            {c.connectors.map((con) => (
              <li key={con.type} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-700/40">
                <span className="font-medium">{CONNECTOR_LABELS[con.type]}</span>
                <span className="text-slate-600 dark:text-slate-300">
                  {con.count !== null ? `${con.count} шт.` : 'к-сть ?'} · {con.powerKw !== null ? formatKw(con.powerKw) : 'потужність ?'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Row>
      <Row icon={<Gauge className="h-4 w-4" />} label="Максимальна потужність">
        {c.maxPowerKw !== null ? formatKw(c.maxPowerKw) : UNKNOWN}
      </Row>
      <Row icon={<Users className="h-4 w-4" />} label="Точок заряджання">
        {c.capacity ?? UNKNOWN}
      </Row>
      <Row icon={<Banknote className="h-4 w-4" />} label="Вартість">
        {c.fee === 'free' ? 'Безкоштовно (за даними OSM)' : c.fee === 'unknown' ? null : FEE_LABELS[c.fee]}
        {c.priceText ? (
          <span className="block">Тариф у джерелі: {c.priceText}</span>
        ) : (
          c.fee !== 'free' && <span className="block text-slate-500 dark:text-slate-400">Актуальну ціну уточнюйте в застосунку оператора</span>
        )}
      </Row>
    </>
  );
}

export function LocationDetails({ location: l, userPosition, favorite, onBack, onShowOnMap, onToggleFavorite }: Props) {
  const name = displayName(l);
  const dist = userPosition ? distanceKm(userPosition, l) : null;
  const access = accessLabel(l.access);

  return (
    <div className="animate-fade-in">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> До списку
      </button>

      <div className="flex gap-3">
        <LocationIcon location={l} size="lg" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white">{name.text}</h2>
          {!name.fromSource && <p className="text-xs text-slate-400">Назву не вказано в джерелі</p>}
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Badge tone={l.kind === 'charging' ? 'green' : 'blue'}>{l.kind === 'charging' ? 'Зарядна станція' : 'Парковка'}</Badge>
            {dist !== null && <Badge>{formatDistance(dist)} від вас</Badge>}
            {access && <Badge tone={l.access === 'private' || l.access === 'no' ? 'red' : 'slate'}>{access}</Badge>}
          </div>
        </div>
      </div>

      {/* Статус у реальному часі — чесно повідомляємо, що його немає */}
      <div className="mt-4 flex gap-2.5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20">
        <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          {l.kind === 'charging' ? (
            <>
              <b>Статус невідомий.</b> Дані про зайнятість роз’ємів і працездатність станції в реальному часі недоступні.
            </>
          ) : (
            <>
              <b>Фактична зайнятість невідома.</b> Джерело не надає даних про вільні місця в реальному часі.
            </>
          )}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={googleMapsRouteUrl(l, userPosition)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
        >
          <Navigation className="h-4 w-4" /> Прокласти маршрут
        </a>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 transition active:scale-[0.98] ${
            favorite
              ? 'bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30'
              : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700'
          }`}
        >
          <Star className={`h-4 w-4 ${favorite ? 'fill-amber-400 text-amber-500' : ''}`} />
          {favorite ? 'У вибраному' : 'До вибраного'}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a href={osmRouteUrl(l, userPosition)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400">
          Маршрут в OpenStreetMap <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button type="button" onClick={onShowOnMap} className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400">
          <Crosshair className="h-3.5 w-3.5" /> Показати на карті
        </button>
      </div>

      <dl className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        <Row icon={<MapPin className="h-4 w-4" />} label="Адреса">
          <AddressValue location={l} />
        </Row>
        {l.kind === 'parking' ? <ParkingFields p={l} /> : <ChargingFields c={l} />}
        <Row icon={<Clock className="h-4 w-4" />} label="Графік роботи">
          {formatOpeningHours(l.openingHours) ?? UNKNOWN}
        </Row>
        <Row icon={<Building2 className="h-4 w-4" />} label="Оператор">
          {l.operator ?? (l.kind === 'charging' ? l.brand ?? l.network : null) ?? UNKNOWN}
        </Row>
        <Row icon={<Accessibility className="h-4 w-4" />} label="Доступність для людей з інвалідністю">
          {wheelchairText(l.wheelchair)}
        </Row>
        {l.access && (
          <Row icon={<KeyRound className="h-4 w-4" />} label="Доступ">
            {access}
          </Row>
        )}
        {l.website && (
          <Row icon={<ExternalLink className="h-4 w-4" />} label="Вебсайт">
            <a href={l.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
              {l.website.replace(/^https?:\/\//, '')}
            </a>
          </Row>
        )}
      </dl>

      <div className="mt-3 flex gap-2.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Джерело:{' '}
          <a href={l.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            {l.sourceName} ({l.id.replace('osm:', '')})
          </a>
          . Дані наповнюють волонтери й можуть бути неповними або застарілими. Якщо знайшли помилку — її можна виправити
          безпосередньо в OpenStreetMap.
        </p>
      </div>
    </div>
  );
}
