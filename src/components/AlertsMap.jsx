import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../lib/leafletIconFix';
import { parseAlertLatLng } from '../lib/geo';
import { useDashboard } from '../context/DashboardContext';

export const createNumberedIcon = (number, color) => {
    return L.divIcon({
        className: 'custom-numbered-icon',
        html: `<div style="background-color: ${color}; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid rgba(255,255,255,0.8); box-shadow: 0 0 10px ${color}; font-size: 12px; font-family: monospace;">${number}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
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

export default function AlertsMapView({ alerts, center = [12.8719, 74.8422], zoom = 12, onMarkerClick, theme: themeProp }) {
    const dashboardContext = useDashboard();
    const activeTheme = themeProp || dashboardContext?.theme || 'dark';
    const isLight = activeTheme === 'light';

    // CARTO Basemaps API key and dynamic theme styling
    const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY;
    const keyParam = cartoApiKey ? `?key=${cartoApiKey}` : '';
    const style = isLight ? 'light_all' : 'dark_all';
    const tileUrl = `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png${keyParam}`;

    return (
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
                key={`${style}-${Boolean(cartoApiKey)}`}
                url={tileUrl}
                subdomains="abcd"
                maxZoom={20}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>'
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
                        icon={createNumberedIcon(idx + 1, alert.color)}
                        eventHandlers={onMarkerClick ? { click: () => onMarkerClick(alert) } : undefined}
                    >
                        <Popup className="custom-popup">
                            <div className="font-poppins font-bold">{alert.title}</div>
                            <div className="text-xs">{alert.severity} • {alert.status}</div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
