import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useMap } from 'react-leaflet';
import type { LocationKind, MapLocation } from '../../types/location';
import { displayName } from '../../utils/labels';
import { getMarkerIcon, markerVariant } from './markerIcons';

interface KindMarkerOptions extends L.MarkerOptions {
  kind: LocationKind;
}

interface Props {
  locations: MapLocation[];
  selectedId: string | null;
  /** Змінюється, коли карту треба перемістити до вибраного маркера. */
  focusNonce: number;
  isFavorite: (id: string) => boolean;
  onSelect: (id: string) => void;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const children = cluster.getAllChildMarkers();
  const charging = children.filter((m) => (m.options as KindMarkerOptions).kind === 'charging').length;
  const count = cluster.getChildCount();
  const size = count < 10 ? 36 : count < 100 ? 42 : 50;
  const share = Math.round((charging / children.length) * 100);
  // Кільце показує частку зарядок (зелений) і парковок (синій)
  return L.divIcon({
    html: `<div class="ld-cluster" style="width:${size}px;height:${size}px;background:conic-gradient(#16a34a 0 ${share}%, #2563eb ${share}% 100%)"><span>${count}</span></div>`,
    className: 'ld-marker',
    iconSize: [size, size],
  });
}

/**
 * Шар маркерів з кластеризацією (leaflet.markercluster).
 * Працює імперативно — це значно швидше за тисячі React-компонентів.
 */
export function MarkerLayer({ locations, selectedId, focusNonce, isFavorite, onSelect }: Props) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const locById = useRef(new Map<string, MapLocation>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Створюємо групу один раз
  useEffect(() => {
    const group = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: (zoom) => (zoom >= 16 ? 30 : 55),
      disableClusteringAtZoom: 18,
      iconCreateFunction: clusterIcon,
    });
    map.addLayer(group);
    groupRef.current = group;
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map]);

  // Перебудовуємо маркери при зміні набору
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();
    const markers = new Map<string, L.Marker>();
    const byId = new Map<string, MapLocation>();
    const list: L.Marker[] = [];
    for (const loc of locations) {
      const opts: KindMarkerOptions = {
        kind: loc.kind,
        icon: getMarkerIcon(markerVariant(loc), loc.id === selectedId, isFavorite(loc.id)),
        keyboard: true,
        title: displayName(loc).text,
        alt: displayName(loc).text,
        zIndexOffset: loc.id === selectedId ? 1000 : 0,
      };
      const marker = L.marker([loc.lat, loc.lon], opts);
      marker.bindTooltip(escapeHtml(displayName(loc).text), { direction: 'top', opacity: 0.95 });
      marker.on('click', () => onSelectRef.current(loc.id));
      markers.set(loc.id, marker);
      byId.set(loc.id, loc);
      list.push(marker);
    }
    group.addLayers(list);
    markersRef.current = markers;
    locById.current = byId;
    // selectedId / isFavorite оновлюються окремим ефектом нижче
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations]);

  // Оновлюємо іконки при зміні виділеного об'єкта або списку вибраного.
  // Іконки кешуються, тож змінюємо лише ті маркери, чия іконка справді інша.
  useEffect(() => {
    for (const [id, m] of markersRef.current) {
      const loc = locById.current.get(id)!;
      const icon = getMarkerIcon(markerVariant(loc), id === selectedId, isFavorite(id));
      if (m.options.icon !== icon) {
        m.setIcon(icon);
        m.setZIndexOffset(id === selectedId ? 1000 : 0);
      }
    }
  }, [selectedId, isFavorite, locations]);

  // Переміщення карти до вибраного маркера (розкриваючи кластер)
  useEffect(() => {
    if (!selectedId || focusNonce === 0) return;
    const group = groupRef.current;
    const marker = markersRef.current.get(selectedId);
    if (!group || !marker) return;
    const target = marker.getLatLng();
    if (map.getZoom() < 16) {
      map.flyTo(target, 17, { duration: 0.6 });
      map.once('moveend', () => group.zoomToShowLayer(marker, () => undefined));
    } else {
      group.zoomToShowLayer(marker, () => map.panTo(target));
    }
  }, [focusNonce, selectedId, map]);

  return null;
}
