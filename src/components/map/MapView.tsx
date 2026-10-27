import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import type { BBox, MapLocation } from '../../types/location';
import type { UserPosition } from '../../services/geolocation';
import { LVIV_CENTER, LVIV_ZOOM } from '../../utils/constants';
import { MarkerLayer } from './MapMarker';
import { userLocationIcon } from './markerIcons';

interface Props {
  locations: MapLocation[];
  selectedId: string | null;
  focusNonce: number;
  userPosition: UserPosition | null;
  isFavorite: (id: string) => boolean;
  onSelect: (id: string) => void;
  onBoundsChange: (bbox: BBox, zoom: number) => void;
  onMapReady: (map: LeafletMap) => void;
  onMapClick: () => void;
}

function BoundsWatcher({ onBoundsChange, onMapClick }: Pick<Props, 'onBoundsChange' | 'onMapClick'>) {
  const map = useMapEvents({
    moveend: () => report(),
    click: () => onMapClick(),
  });
  function report() {
    const b = map.getBounds();
    onBoundsChange({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }, map.getZoom());
  }
  return null;
}

export function MapView(props: Props) {
  const { locations, selectedId, focusNonce, userPosition, isFavorite, onSelect, onBoundsChange, onMapReady, onMapClick } = props;
  return (
    <MapContainer
      center={[LVIV_CENTER.lat, LVIV_CENTER.lon]}
      zoom={LVIV_ZOOM}
      minZoom={10}
      maxZoom={19}
      zoomControl={false}
      className="h-full w-full"
      ref={(m) => {
        if (m) onMapReady(m);
      }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        subdomains={['a', 'b', 'c']}
        maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">учасники OpenStreetMap</a>'
      />
      <BoundsWatcher onBoundsChange={onBoundsChange} onMapClick={onMapClick} />
      <MarkerLayer
        locations={locations}
        selectedId={selectedId}
        focusNonce={focusNonce}
        isFavorite={isFavorite}
        onSelect={onSelect}
      />
      {userPosition && (
        <>
          <Circle
            center={[userPosition.lat, userPosition.lon]}
            radius={Math.min(userPosition.accuracy, 500)}
            pathOptions={{ color: '#2563eb', weight: 1, fillOpacity: 0.08 }}
            interactive={false}
          />
          <Marker position={[userPosition.lat, userPosition.lon]} icon={userLocationIcon()} interactive={false} />
        </>
      )}
    </MapContainer>
  );
}
