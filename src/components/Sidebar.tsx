import { useEffect, useState, type ReactNode } from 'react';
import { SlidersHorizontal, Star, Trash2 } from 'lucide-react';
import type { LatLon, MapLocation, SidebarTab } from '../types/location';
import { distanceKm } from '../utils/geo';
import { LocationCard } from './LocationCard';

const PAGE_SIZE = 50;

interface Props {
  tab: SidebarTab;
  onTabChange: (t: SidebarTab) => void;
  /** Відфільтровані об'єкти у видимій області, вже відсортовані. */
  results: MapLocation[];
  /** Усього відфільтрованих об'єктів (на всій завантаженій території). */
  totalFiltered: number;
  favorites: MapLocation[];
  selectedId: string | null;
  userPosition: LatLon | null;
  isFavorite: (id: string) => boolean;
  onOpen: (l: MapLocation) => void;
  onShowOnMap: (l: MapLocation) => void;
  onToggleFavorite: (l: MapLocation) => void;
  onClearFavorites: () => void;
  statusSlot: ReactNode;
  loading: boolean;
  filterSlot: ReactNode;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

export function Sidebar(p: Props) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  useEffect(() => setLimit(PAGE_SIZE), [p.results]);

  const list = p.tab === 'results' ? p.results : p.favorites;
  const shown = list.slice(0, limit);

  const renderCard = (l: MapLocation) => (
    <LocationCard
      key={l.id}
      location={l}
      distanceKm={p.userPosition ? distanceKm(p.userPosition, l) : null}
      favorite={p.isFavorite(l.id)}
      selected={l.id === p.selectedId}
      onOpen={() => p.onOpen(l)}
      onShowOnMap={() => p.onShowOnMap(l)}
      onToggleFavorite={() => p.onToggleFavorite(l)}
    />
  );

  return (
    <div className="space-y-3">
      <div role="tablist" className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <TabButton active={p.tab === 'results'} onClick={() => p.onTabChange('results')}>
          Результати
        </TabButton>
        <TabButton active={p.tab === 'favorites'} onClick={() => p.onTabChange('favorites')}>
          Вибране{p.favorites.length > 0 && ` (${p.favorites.length})`}
        </TabButton>
      </div>

      {p.tab === 'results' && (
        <>
          {p.statusSlot}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <b className="text-slate-900 dark:text-white">{p.results.length}</b> у видимій області
              <span className="text-slate-400"> · {p.totalFiltered} усього</span>
            </p>
            <button
              type="button"
              onClick={p.onToggleFilters}
              aria-expanded={p.filtersOpen}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium ring-1 transition ${
                p.filtersOpen || p.activeFilterCount > 0
                  ? 'bg-brand-50 text-brand-700 ring-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100'
                  : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Фільтри
              {p.activeFilterCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{p.activeFilterCount}</span>}
            </button>
          </div>
          {p.filtersOpen && p.filterSlot}
        </>
      )}

      {p.tab === 'favorites' && p.favorites.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Зберігається у цьому браузері</span>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Очистити весь список вибраного?')) p.onClearFavorites();
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Очистити
          </button>
        </div>
      )}

      {list.length === 0 && p.tab === 'results' && p.loading ? (
        <ul className="space-y-2" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="h-[76px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </ul>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {p.tab === 'favorites' ? (
            <>
              <Star className="mx-auto mb-2 h-6 w-6 text-slate-300 dark:text-slate-600" />
              Тут з’являться збережені парковки й зарядки. Натисніть ☆ на картці об’єкта.
            </>
          ) : (
            'У видимій області немає об’єктів, що відповідають пошуку та фільтрам. Змініть фільтри або перемістіть карту.'
          )}
        </div>
      ) : (
        <ul className="space-y-2">{shown.map(renderCard)}</ul>
      )}

      {list.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + PAGE_SIZE)}
          className="w-full rounded-xl py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
        >
          Показати ще ({list.length - limit})
        </button>
      )}
    </div>
  );
}
