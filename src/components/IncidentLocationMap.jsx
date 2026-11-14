import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../lib/leafletIconFix';

// Tactical red emergency pin
const emergencyPinIcon = L.divIcon({
  className: 'tactical-emergency-pin',
  html: `
    <div style="
      position: relative;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        position: absolute;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.3);
        animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #ef4444;
        border: 2px solid #ffffff;
        box-shadow: 0 0 12px rgba(239, 68, 68, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 13px;
        font-weight: bold;
      ">
        📍
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

// Click handler on map surface
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    }
  });
  return null;
}

// Center updater that smoothly pans to new coordinates
function MapCenterUpdater({ center, zoom = 14 }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] != null && center[1] != null && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, Math.max(map.getZoom(), zoom), { duration: 1 });
    }
  }, [center?.[0], center?.[1], zoom, map]);
  return null;
}

export default function IncidentLocationMap({
  coords,
  onLocationSelect,
  defaultCenter = [12.914142, 74.856012], // Mangaluru, India
  height = '320px'
}) {
  const hasCoords = coords && coords.lat != null && coords.lng != null && !isNaN(coords.lat) && !isNaN(coords.lng);
  const activeCenter = hasCoords ? [coords.lat, coords.lng] : defaultCenter;

  const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY;
  const keyParam = cartoApiKey ? `?key=${cartoApiKey}` : '';
  const tileUrl = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${keyParam}`;

  const dragHandlers = useMemo(() => ({
    dragend(e) {
      const marker = e.target;
      if (marker != null) {
        const { lat, lng } = marker.getLatLng();
        onLocationSelect({ lat, lng });
      }
    }
  }), [onLocationSelect]);

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-white/10 shadow-lg" style={{ height }}>
      <MapContainer
        center={activeCenter}
        zoom={hasCoords ? 15 : 12}
        style={{ height: '100%', width: '100%', backgroundColor: '#0B1220' }}
      >
        <TileLayer
          url={tileUrl}
          subdomains="abcd"
          maxZoom={20}
          attribution='&copy; <a href="https://carto.com/" target="_blank">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
        />

        <MapClickHandler onLocationSelect={onLocationSelect} />
        <MapCenterUpdater center={activeCenter} zoom={hasCoords ? 15 : 12} />

        {/* Visual accuracy tolerance circle (e.g. ±20m GPS or ±500m Wi-Fi) */}
        {hasCoords && coords.accuracy && coords.accuracy < 10000 && (
          <Circle
            center={[coords.lat, coords.lng]}
            radius={coords.accuracy}
            pathOptions={{
              color: '#00FFCC',
              fillColor: '#00FFCC',
              fillOpacity: 0.08,
              weight: 1,
              dashArray: '3, 4'
            }}
          />
        )}

        {hasCoords && (
          <Marker
            position={[coords.lat, coords.lng]}
            icon={emergencyPinIcon}
            draggable={true}
            eventHandlers={dragHandlers}
          >
            <Popup className="custom-popup">
              <div className="font-mono text-xs font-bold text-gray-900">
                🚨 Selected Incident Location
              </div>
              <div className="font-mono text-[11px] text-gray-600 mt-0.5">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </div>
              <div className="text-[10px] text-gray-500 italic mt-1">
                (Drag pin to refine location)
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Tactical Overlay Instructions */}
      <div className="absolute top-2 right-2 z-[400] bg-black/80 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded text-[10px] font-mono text-[#00FFCC] uppercase tracking-wider pointer-events-none">
        TAP MAP TO DROP PIN • DRAG PIN TO REFINE
      </div>
    </div>
  );
}

