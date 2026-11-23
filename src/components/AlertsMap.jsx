import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../lib/leafletIconFix';
import { parseAlertLatLng } from '../lib/geo';
import { useDashboard } from '../context/DashboardContext';
import { Layers, Map, Compass, Radio } from 'lucide-react';

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

export const createResponderIcon = (authorityType) => {
    let emoji = '🚨';
    let ringColor = '#00FFCC';
    let glow = '0 0 14px #00FFCC';

    const lower = (authorityType || '').toLowerCase();
    if (lower.includes('paramedic') || lower.includes('ambulance') || lower.includes('medical') || lower.includes('health')) {
        emoji = '🚑';
        ringColor = '#10B981';
        glow = '0 0 14px #10B981';
    } else if (lower.includes('police') || lower.includes('law') || lower.includes('patrol')) {
        emoji = '🚓';
        ringColor = '#3B82F6';
        glow = '0 0 14px #3B82F6';
    } else if (lower.includes('fire')) {
        emoji = '🚒';
        ringColor = '#EF4444';
        glow = '0 0 14px #EF4444';
    }

    const html = `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: -4px; border-radius: 50%; border: 2px solid ${ringColor}; opacity: 0.6; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; z-index: 10; background: #0B1220; border: 2px solid ${ringColor}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: ${glow}; font-size: 16px; cursor: pointer;">
                ${emoji}
            </div>
        </div>
    `;

    return L.divIcon({
        className: 'custom-responder-icon',
        html,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17]
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

export default function AlertsMapView({ 
    alerts = [], 
    liveResponders: propResponders,
    center = [12.8719, 74.8422], 
    zoom = 12, 
    onMarkerClick, 
    theme: themeProp 
}) {
    const dashboardContext = useDashboard();
    const activeTheme = themeProp || dashboardContext?.theme || 'dark';
    const isLight = activeTheme === 'light';

    // Live Responders: use prop if provided, else fall back to dashboard context
    const liveResponders = (propResponders !== undefined ? propResponders : dashboardContext?.liveResponders) || [];
    const [showResponders, setShowResponders] = useState(true);

    // Default to the vibrant full-color live map
    const [selectedTileKey, setSelectedTileKey] = useState('voyager');

    const activeTile = TILE_PRESETS[selectedTileKey] || TILE_PRESETS.voyager;

    return (
        <div className="relative w-full h-full">
            {/* Quick Live Map Layer Switcher */}
            <div className="absolute top-4 right-4 z-[400] flex flex-wrap items-center gap-1 bg-slate-900/90 dark:bg-slate-950/90 text-white rounded-lg p-1.5 shadow-xl border border-white/20 backdrop-blur-md text-xs font-mono">
                <button
                    type="button"
                    onClick={() => setShowResponders(prev => !prev)}
                    className={`px-2.5 py-1.5 rounded transition-all font-semibold flex items-center gap-1.5 ${showResponders ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                    title="Toggle live moving emergency responders"
                >
                    <Radio size={13} className={showResponders ? 'animate-pulse text-emerald-400' : ''} />
                    <span>Responders ({liveResponders.length})</span>
                </button>
                <div className="h-4 w-px bg-white/20 mx-1 hidden sm:block" />
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
                
                {/* Incident Markers */}
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

                {/* Live Responder GPS Markers & Vectors */}
                {showResponders && liveResponders.map((resp) => {
                    const rLat = Number(resp.latitude);
                    const rLng = Number(resp.longitude);
                    if (isNaN(rLat) || isNaN(rLng) || rLat === 0) return null;

                    const hasTarget = resp.incident_latitude && resp.incident_longitude &&
                        !isNaN(Number(resp.incident_latitude)) && !isNaN(Number(resp.incident_longitude));
                    const targetLat = hasTarget ? Number(resp.incident_latitude) : null;
                    const targetLng = hasTarget ? Number(resp.incident_longitude) : null;

                    const vectorColor = (resp.authority_type || '').toLowerCase().includes('fire') ? '#EF4444' :
                        (resp.authority_type || '').toLowerCase().includes('police') ? '#3B82F6' : '#10B981';

                    return (
                        <React.Fragment key={`resp-marker-${resp.authority_id || resp.location_id}`}>
                            {hasTarget && (
                                <Polyline
                                    positions={[[rLat, rLng], [targetLat, targetLng]]}
                                    pathOptions={{
                                        color: vectorColor,
                                        dashArray: '6, 8',
                                        weight: 2.5,
                                        opacity: 0.75
                                    }}
                                />
                            )}
                            <Marker
                                position={[rLat, rLng]}
                                icon={createResponderIcon(resp.authority_type)}
                            >
                                <Popup className="custom-popup">
                                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-1.5 mb-2">
                                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                                            LIVE GPS TELEMETRY
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400">
                                            {resp.seconds_ago !== undefined ? `${resp.seconds_ago}s ago` : 'Active'}
                                        </span>
                                    </div>

                                    <div className="font-poppins font-bold text-sm leading-snug text-slate-900 dark:text-white">
                                        {resp.responder_name || 'Emergency Responder'}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-0.5">
                                        {resp.authority_type} • {resp.organization_name || 'Emergency Unit'}
                                    </div>

                                    {resp.incident_title && (
                                        <div className="mt-2 p-1.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-[11px]">
                                            <div className="text-[9px] font-mono text-slate-400 uppercase font-semibold">Assigned Incident</div>
                                            <div className="font-semibold text-teal-600 dark:text-[#00FFCC] truncate">{resp.incident_title}</div>
                                            {resp.assignment_status && (
                                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">Status: {resp.assignment_status}</div>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                                        <span>{rLat.toFixed(4)}°N, {rLng.toFixed(4)}°E</span>
                                        <span className="text-emerald-500 font-semibold">{resp.availability_status || 'On Duty'}</span>
                                    </div>
                                </Popup>
                            </Marker>
                        </React.Fragment>
                    );
                })}
            </MapContainer>
        </div>
    );
}
