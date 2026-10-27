import type { BBox, MapLocation } from '../types/location';
import { parseOsmElement, type OverpassElement } from './osmParser';

/**
 * Знімок даних OpenStreetMap для Львова, який GitHub Actions щодня готує
 * з вивантажки Geofabrik (див. .github/workflows/deploy.yml).
 * Віддається з того ж домену, тож не залежить від стану публічних серверів Overpass.
 */
export interface Snapshot {
  items: MapLocation[];
  bbox: BBox;
  /** Дата даних OSM у вивантажці (або дата створення знімка). */
  dataDate: Date;
}

interface SnapshotFile {
  generatedAt: string;
  sourceDate: string | null;
  bbox: BBox;
  elements: OverpassElement[];
}

export async function fetchSnapshot(signal?: AbortSignal): Promise<Snapshot | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/lviv-osm.json`, { signal });
    if (!res.ok) return null;
    const file = (await res.json()) as SnapshotFile;
    if (!Array.isArray(file.elements) || file.elements.length === 0) return null;
    const date = new Date(file.sourceDate || file.generatedAt);
    return {
      items: file.elements.map(parseOsmElement).filter((l): l is MapLocation => l !== null),
      bbox: file.bbox,
      dataDate: Number.isNaN(date.getTime()) ? new Date(file.generatedAt) : date,
    };
  } catch {
    // Немає знімка (напр., локальна розробка) — використаємо Overpass
    return null;
  }
}
