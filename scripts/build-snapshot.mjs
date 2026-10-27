// Перетворює GeoJSONSeq з `osmium export` на компактний знімок у форматі,
// сумісному з відповіддю Overpass (`elements` з lat/lon і tags).
//
// Використання: node scripts/build-snapshot.mjs <input.geojsonseq> <output.json> [source-date]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [input, output, sourceDate] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/build-snapshot.mjs <input.geojsonseq> <output.json> [source-date]');
  process.exit(1);
}

const TYPES = { n: 'node', w: 'way', r: 'relation' };
const WANTED = new Set(['parking', 'parking_space', 'charging_station']);

/** Середнє координат — достатньо точно для маркера парковки чи зарядки. */
function centroid(geometry) {
  let points;
  switch (geometry.type) {
    case 'Point':
      return geometry.coordinates;
    case 'LineString':
    case 'MultiPoint':
      points = geometry.coordinates;
      break;
    case 'Polygon':
      points = geometry.coordinates[0];
      break;
    case 'MultiLineString':
      points = geometry.coordinates.flat();
      break;
    case 'MultiPolygon':
      points = geometry.coordinates.flatMap((poly) => poly[0]);
      break;
    default:
      return null;
  }
  if (!points?.length) return null;
  let lon = 0;
  let lat = 0;
  for (const [x, y] of points) {
    lon += x;
    lat += y;
  }
  return [lon / points.length, lat / points.length];
}

const round = (n) => Math.round(n * 1e6) / 1e6;
const elements = new Map();

// Записи розділені переносом рядка та/або символом RS (0x1E) — залежно від налаштувань osmium
for (const raw of readFileSync(input, 'utf8').split(/[\n\x1e]/)) {
  const line = raw.trim();
  if (!line) continue;
  const feature = JSON.parse(line);
  const tags = feature.properties ?? {};
  if (!WANTED.has(tags.amenity)) continue;
  const m = String(feature.id ?? '').match(/^([nwr])(\d+)$/);
  if (!m) continue;
  const c = centroid(feature.geometry);
  if (!c) continue;
  const key = `${m[1]}${m[2]}`;
  elements.set(key, { type: TYPES[m[1]], id: Number(m[2]), lat: round(c[1]), lon: round(c[0]), tags });
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  sourceDate: sourceDate || null,
  source: 'OpenStreetMap (Geofabrik extract)',
  bbox: { south: 49.76, west: 23.89, north: 49.91, east: 24.15 },
  elements: [...elements.values()],
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(snapshot));
console.log(`Snapshot: ${snapshot.elements.length} elements → ${output}`);
if (snapshot.elements.length === 0) process.exit(2);
