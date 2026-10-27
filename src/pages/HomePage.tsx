import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import type { BBox, ConnectorType, Filters, LatLon, MapLocation, SidebarTab } from '../types/location';
import { BottomSheet } from '../components/BottomSheet';
import { FilterPanel } from '../components/FilterPanel';
import { Header, type NavKey } from '../components/Header';
import { LocationDetails } from '../components/LocationDetails';
import { MapLegend } from '../components/MapLegend';
import { MapControls } from '../components/map/MapControls';
import { MapView } from '../components/map/MapView';
import { SearchBar } from '../components/SearchBar';
import { Sidebar } from '../components/Sidebar';
import { StatusBanner } from '../components/StatusBanner';
import { Toast } from '../components/Toast';
import { useFavorites } from '../hooks/useFavorites';
import { useGeolocation } from '../hooks/useGeolocation';
import { useLocations } from '../hooks/useLocations';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePersistentState } from '../hooks/usePersistentState';
import { useTheme } from '../hooks/useTheme';
import type { PlaceResult } from '../services/geocoding';
import { DEFAULT_FILTERS, LVIV_BBOX, LVIV_CENTER, LVIV_ZOOM } from '../utils/constants';
import { countActiveFilters, matchesFilters, matchesQuery } from '../utils/filters';
import { distanceKm, isInBBox } from '../utils/geo';
import { displayName } from '../utils/labels';

/** Мінімальний масштаб, з якого дозволено довантажувати нову область. */
const MIN_SEARCH_ZOOM = 12;

export function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const data = useLocations(LVIV_BBOX);
  const { favorites, isFavorite, toggleFavorite, clearFavorites } = useFavorites();
  const geo = useGeolocation();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [storedFilters, setFilters] = usePersistentState<Filters>('filters', DEFAULT_FILTERS);
  const filters = useMemo(() => ({ ...DEFAULT_FILTERS, ...storedFilters }), [storedFilters]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SidebarTab>('results');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [view, setView] = useState<{ bbox: BBox; zoom: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const userPos: LatLon | null = geo.position;

  // --- Похідні дані ---
  const filtered = useMemo(
    () => data.locations.filter((l) => matchesFilters(l, filters, userPos) && matchesQuery(l, query)),
    [data.locations, filters, userPos, query],
  );

  const selected = useMemo<MapLocation | null>(
    () => (selectedId ? data.locations.find((l) => l.id === selectedId) ?? favorites.find((f) => f.id === selectedId) ?? null : null),
    [selectedId, data.locations, favorites],
  );

  // На вкладці «Вибране» карта показує лише вибрані об'єкти
  const mapLocations = useMemo(() => {
    const base = tab === 'favorites' ? favorites : filtered;
    return selected && !base.some((l) => l.id === selected.id) ? [...base, selected] : base;
  }, [tab, favorites, filtered, selected]);

  const visibleResults = useMemo(() => {
    const bbox = view?.bbox;
    const inView = bbox ? filtered.filter((l) => isInBBox(l, bbox)) : filtered;
    const origin: LatLon = userPos ?? (bbox ? { lat: (bbox.north + bbox.south) / 2, lon: (bbox.east + bbox.west) / 2 } : LVIV_CENTER);
    return inView
      .map((l) => ({ l, d: distanceKm(origin, l) }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.l);
  }, [filtered, view, userPos]);

  const availableConnectors = useMemo(() => {
    const s = new Set<ConnectorType>();
    for (const l of data.locations) if (l.kind === 'charging') for (const c of l.connectors) s.add(c.type);
    return s;
  }, [data.locations]);

  // --- Дії ---
  const selectFromMap = useCallback((id: string) => {
    setSelectedId(id);
    setSheetExpanded(true);
  }, []);

  const openFromList = (l: MapLocation) => {
    setSelectedId(l.id);
    setFocusNonce((n) => n + 1);
  };

  const showOnMap = (l: MapLocation) => {
    setSelectedId(l.id);
    setFocusNonce((n) => n + 1);
    if (!isDesktop) setSheetExpanded(false);
  };

  const handleNav = (key: NavKey) => {
    setSelectedId(null);
    if (!isDesktop) setSheetExpanded(true);
    if (key === 'favorites') {
      setTab((t) => (t === 'favorites' ? 'results' : 'favorites'));
      return;
    }
    setTab('results');
    setFilters({ ...filters, category: filters.category === key ? 'all' : key });
  };

  const locate = async () => {
    const pos = await geo.locate();
    if (pos && map) map.flyTo([pos.lat, pos.lon], 15, { duration: 0.8 });
  };

  const { error: geoError, clearError: clearGeoError } = geo;
  useEffect(() => {
    if (geoError) {
      setToast(geoError);
      clearGeoError();
      // Без геолокації фільтр відстані не працює — скидаємо його
      setFilters((f) => (f.maxDistanceKm === null ? f : { ...f, maxDistanceKm: null }));
    }
  }, [geoError, clearGeoError, setFilters]);

  // На мобільному панель згорнута — дублюємо помилку даних спливаючим повідомленням
  useEffect(() => {
    if (!isDesktop && data.status === 'error' && data.error) setToast(data.error);
  }, [isDesktop, data.status, data.error]);

  // Escape закриває картку об'єкта
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onBoundsChange = useCallback((bbox: BBox, zoom: number) => setView({ bbox, zoom }), []);
  const onMapClick = useCallback(() => setSelectedId(null), []);
  const closeToast = useCallback(() => setToast(null), []);

  const needsAreaSearch = view !== null && !data.isAreaLoaded(view.bbox) && tab === 'results';
  const searchAreaDisabledReason = view && view.zoom < MIN_SEARCH_ZOOM ? 'Наблизьте карту, щоб шукати тут' : null;

  const onPlaceSelect = (p: PlaceResult) => {
    setQuery('');
    map?.flyTo([p.lat, p.lon], 17, { duration: 0.8 });
    if (!isDesktop) setSheetExpanded(false);
  };

  const navActive: NavKey | null =
    tab === 'favorites' ? 'favorites' : filters.category === 'all' ? null : filters.category;

  // --- Розмітка ---
  const panelContent = selected ? (
    <LocationDetails
      key={selected.id}
      location={selected}
      userPosition={userPos}
      favorite={isFavorite(selected.id)}
      onBack={() => setSelectedId(null)}
      onShowOnMap={() => showOnMap(selected)}
      onToggleFavorite={() => toggleFavorite(selected)}
    />
  ) : (
    <Sidebar
      tab={tab}
      onTabChange={(t) => setTab(t)}
      results={visibleResults}
      totalFiltered={filtered.length}
      favorites={favorites}
      selectedId={selectedId}
      userPosition={userPos}
      isFavorite={isFavorite}
      onOpen={openFromList}
      onShowOnMap={showOnMap}
      onToggleFavorite={toggleFavorite}
      onClearFavorites={clearFavorites}
      statusSlot={
        <StatusBanner status={data.status} error={data.error} onRetry={data.retry} lastUpdated={data.lastUpdated} stale={data.stale} />
      }
      loading={data.status === 'loading'}
      filtersOpen={filtersOpen}
      onToggleFilters={() => setFiltersOpen((o) => !o)}
      activeFilterCount={countActiveFilters(filters)}
      filterSlot={
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_FILTERS)}
          hasUserPosition={userPos !== null}
          onRequestLocation={() => void locate()}
          availableConnectors={availableConnectors}
        />
      }
    />
  );

  const sheetSummary = selected ? (
    <span className="truncate font-semibold">{displayName(selected).text}</span>
  ) : tab === 'favorites' ? (
    <span>
      <b>Вибране:</b> {favorites.length}
    </span>
  ) : data.status === 'loading' ? (
    <span>Завантаження даних…</span>
  ) : data.status === 'error' && data.locations.length === 0 ? (
    <span className="text-red-600 dark:text-red-400">Дані тимчасово недоступні</span>
  ) : (
    <span>
      <b>{visibleResults.length}</b> об’єктів у видимій області
    </span>
  );

  return (
    <div className="flex h-full flex-col bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <Header
        search={<SearchBar value={query} onChange={setQuery} matchCount={filtered.length} onPlaceSelect={onPlaceSelect} />}
        active={navActive}
        onNav={handleNav}
        favoritesCount={favorites.length}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="relative flex min-h-0 flex-1">
        {isDesktop && (
          <aside className="w-[380px] shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50/60 p-4 lg:w-[420px] dark:border-slate-800 dark:bg-slate-900">
            {panelContent}
          </aside>
        )}

        <main className={`relative min-w-0 flex-1 ${isDesktop ? '' : sheetExpanded ? 'has-sheet sheet-open' : 'has-sheet'}`}>
          <MapView
            locations={mapLocations}
            selectedId={selectedId}
            focusNonce={focusNonce}
            userPosition={geo.position}
            isFavorite={isFavorite}
            onSelect={selectFromMap}
            onBoundsChange={onBoundsChange}
            onMapReady={setMap}
            onMapClick={onMapClick}
          />
          <MapControls
            onZoomIn={() => map?.zoomIn()}
            onZoomOut={() => map?.zoomOut()}
            onResetView={() => map?.flyTo([LVIV_CENTER.lat, LVIV_CENTER.lon], LVIV_ZOOM, { duration: 0.8 })}
            onLocate={() => void locate()}
            locating={geo.locating}
            showSearchArea={needsAreaSearch && data.status !== 'loading'}
            searchAreaDisabledReason={searchAreaDisabledReason}
            searchAreaLoading={data.status === 'loading'}
            onSearchArea={() => view && void data.load(view.bbox)}
          />
          <MapLegend />
          {!isDesktop && (
            <BottomSheet expanded={sheetExpanded} onToggle={() => setSheetExpanded((e) => !e)} summary={sheetSummary}>
              {panelContent}
            </BottomSheet>
          )}
        </main>

        <Toast message={toast} onClose={closeToast} />
      </div>
    </div>
  );
}
