import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../lib/leafletIconFix';
import { parseAlertLatLng } from '../lib/geo';
import { useDashboard } from '../context/DashboardContext';
import { Layers, Map, Compass } from 'lucide-react';

export const createNumberedIcon = (number, color, isMajorDisaster = false) => {
    const size = isMajorDisaster ? 32 : 26;
    const border = isMajorDisaster ? '3px solid #ff2255' : '2px solid rgba(255,255,255,0.95)';
    const shadow = isMajorDisaster ? '0 0 18px rgba(255,34,85,0.9)' : `0 2px 10px rgba(0,0,0,0.35), 0 0 10px ${color}`;
    const bg = isMajorDisaster ? '#dc2626' : color;
    const content = isMajorDisaster ? '⚠️' : number;

    return L.divIcon({
        className: 'custom-numbered-icon',
        html: `<div style="background-color: ${bg}; color: #fff; width: ${size}px; height: ${size}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; border: ${border}; box-shadow: ${shadow}; font-size: ${isMajorDisaster ? '14px' : '12px'}; font-family: monospace; cursor: pointer;">${content}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
    });
};

export function MapUpdater({ alerts }) {
    const map = useMap();
    useEffect(() => {
        if (alerts && alerts.length > 0) {
            const coords = alerts.map(parseAlertLatLng).filter(Boolean);
            if (coords.length > 0) {
                const bounds = L.latLngBounds(coords);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
            }
        }
    }, [alerts, map]);
    return null;
}

const TILE_PRESETS = {
    voyager: {
        id: 'voyager',
        label: 'Live Map',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        subdomains: 'abc',
        maxZoom: 19
    },
    satellite: {
        id: 'satellite',
        label: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        subdomains: '',
        maxZoom: 19
    },
    dark: {
        id: 'dark',
        label: 'Tactical Night',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        subdomains: '',
        maxZoom: 16
    }
};

export default function AlertsMapView({ alerts, center = [12.8719, 74.8422], zoom = 12, onMarkerClick, theme: themeProp }) {
    const dashboardContext = useDashboard();
    const activeTheme = themeProp || dashboardContext?.theme || 'dark';
    const isLight = activeTheme === 'light';

    // Default to the vibrant full-color live map
    const [selectedTileKey, setSelectedTileKey] = useState('voyager');

    const activeTile = TILE_PRESETS[selectedTileKey] || TILE_PRESETS.voyager;

    return (
        <div className="relative w-full h-full">
            {/* Quick Live Map Layer Switcher */}
            <div className="absolute top-4 right-4 z-[400] flex items-center bg-slate-900/90 dark:bg-slate-950/90 text-white rounded-lg p-1.5 shadow-xl border border-white/20 backdrop-blur-md text-xs font-mono">
                <button
                    type="button"
                    onClick={() => setSelectedTileKey('voyager')}
                    className={`px-3 py-1.5 rounded transition-all font-semibold flex items-center gap-1.5 ${selectedTileKey === 'voyager' ? 'bg-[#00FFCC] text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                    title="Live colorful vector street map"
                >
                    <Map size={13} /> Live Map
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedTileKey('satellite')}
                    className={`px-3 py-1.5 rounded transition-all font-semibold flex items-center gap-1.5 ${selectedTileKey === 'satellite' ? 'bg-[#00FFCC] text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                    title="Real-world aerial satellite photography"
                >
                    <Compass size={13} /> Satellite
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedTileKey('dark')}
                    className={`px-3 py-1.5 rounded transition-all font-semibold flex items-center gap-1.5 ${selectedTileKey === 'dark' ? 'bg-[#00FFCC] text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                    title="Tactical dark HUD map"
                >
                    <Layers size={13} /> Tactical Night
                </button>
            </div>

            <MapContainer
                center={center}
                zoom={zoom}
                style={{
                    height: '100%',
                    width: '100%',
                    backgroundColor: isLight ? '#E2E8F0' : '#0B1220'
                }}
            >
                <TileLayer
                    key={activeTile.id}
                    url={activeTile.url}
                    subdomains={activeTile.subdomains || 'abcd'}
                    maxZoom={activeTile.maxZoom || 19}
                    attribution={activeTile.attribution}
                />
                <MapUpdater alerts={alerts} />
                {alerts.map((alert, idx) => {
                    const latLng = parseAlertLatLng(alert);
                    if (!latLng) return null;
                    const [lat, lng] = latLng;
                    return (
                        <Marker
                            key={alert.id}
                            position={[lat, lng]}
                            icon={createNumberedIcon(idx + 1, alert.color, alert.is_major_disaster)}
                            eventHandlers={onMarkerClick ? { click: () => onMarkerClick(alert) } : undefined}
                        >
                            <Popup className="custom-popup">
                                {alert.is_major_disaster && (
                                    <div className="text-[10px] text-red-500 font-mono font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <span>⚠️</span> MAJOR DISASTER CLUSTER
                                    </div>
                                )}
                                <div className="font-poppins font-bold text-sm leading-snug">{alert.title}</div>
                                <div className="text-xs text-slate-400 mt-1">{alert.severity} • {alert.status}</div>
                                {alert.location && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{alert.location}</div>}
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
