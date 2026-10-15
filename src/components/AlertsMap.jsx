import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../lib/leafletIconFix';
import { parseAlertLatLng } from '../lib/geo';

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

export default function AlertsMapView({ alerts, center = [12.8719, 74.8422], zoom = 12, onMarkerClick }) {
    return (
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%', backgroundColor: '#0B1220' }}>
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
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
