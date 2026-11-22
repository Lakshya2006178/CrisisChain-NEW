import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { Map as MapIcon, Crosshair, Navigation, Zap, Globe } from 'lucide-react';
import AlertsMapView from '../AlertsMap';

export default function MapPanel() {
    const navigate = useNavigate();
    const { addToast, alerts } = useDashboard();

    // Map alerts to include color for markers
    const mapAlerts = (alerts || []).map(a => ({
        ...a,
        color: a.color || (a.severity === 'Critical' || a.severity === 'High' ? '#ef4444' : a.severity === 'Medium' ? '#f59e0b' : '#3b82f6')
    }));

    return (
        <div className="flex flex-col h-full w-full bg-transparent relative overflow-hidden backdrop-blur-3xl group">
            
            {/* Header HUD */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] relative z-10">
                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="w-10 h-10 border border-blue-500/20 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <MapIcon className="w-5 h-5 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                        <h4 className="font-outfit font-black text-xl tracking-tight text-slate-900 dark:text-white uppercase leading-none mb-1">GEOSPATIAL_INTEL</h4>
                        <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-slate-500 dark:text-white/40 uppercase">SAT_LINK: AETHER_GRID_STABLE</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button
                        onClick={() => addToast('Recalibrating GPS...', 'info')}
                        className="w-9 h-9 border border-slate-200 dark:border-white/10 rounded-lg flex items-center justify-center text-slate-600 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all shadow-xs"
                    >
                        <Crosshair className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => addToast('Engaging Drone Uplink...', 'info')}
                        className="w-9 h-9 border border-slate-200 dark:border-white/10 rounded-lg flex items-center justify-center text-slate-600 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all shadow-xs"
                    >
                        <Navigation className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Map Body */}
            <div className="flex-1 relative overflow-hidden bg-slate-100 dark:bg-black/10 border-b border-slate-200 dark:border-white/5">
                
                {/* Subtle Coordinate Grid Overlay */}
                <div className="absolute inset-0 opacity-5 pointer-events-none z-10"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(0, 255, 204, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 204, 0.1) 1px, transparent 1px)',
                        backgroundSize: '3rem 3rem',
                    }}
                />
                
                {/* Subtle Radar Ring */}
                <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden origin-center z-10">
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] border border-blue-500/30 rounded-full animate-radar-spin" />
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-blue-500/20 rounded-full animate-radar-spin-reverse" />
                </div>

                {/* Leaflet Map Integration */}
                <div className="absolute inset-0 z-0">
                    <AlertsMapView 
                        alerts={mapAlerts} 
                        onMarkerClick={(alert) => {
                            const targetId = alert?.numeric_id || alert?.id;
                            if (targetId) {
                                navigate(`/alerts?id=${encodeURIComponent(targetId)}`);
                            }
                        }}
                    />
                </div>

                {/* Legend HUD */}
                <div className="absolute bottom-6 right-6 flex flex-col gap-3 p-4 bg-white/90 dark:bg-black/70 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-lg shadow-md z-10">
                    {[
                        { label: 'CRITICAL_HIT', color: '#ef4444' },
                        { label: 'THREAT_WARN', color: '#f59e0b' },
                        { label: 'ACTIVE_SYNK', color: '#3b82f6' },
                        { label: 'SECURE_ZONE', color: '#10b981' }
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: item.color, color: item.color }} />
                            <span className="font-mono text-[8px] font-black uppercase text-slate-700 dark:text-white tracking-widest">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Footer Telemetry */}
            <div className="px-6 py-3 flex justify-between items-center bg-slate-50/80 dark:bg-white/[0.02]">
                <div className="flex gap-8">
                    <div className="flex items-center gap-2">
                         <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-white/20" />
                         <span className="font-mono text-[9px] text-slate-500 dark:text-white/40 tracking-widest uppercase italic">COORD_SYS: WGS84_OPTIMIZED</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <Zap className="w-3.5 h-3.5 text-amber-500" />
                         <span className="font-mono text-[9px] text-slate-500 dark:text-white/40 tracking-widest uppercase italic">SIGNAL: 44.2dBm</span>
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes radar-spin {
                    from { transform: translate(-50%, -50%) rotate(0deg); }
                    to { transform: translate(-50%, -50%) rotate(360deg); }
                }
                @keyframes radar-spin-reverse {
                    from { transform: translate(-50%, -50%) rotate(360deg); }
                    to { transform: translate(-50%, -50%) rotate(0deg); }
                }
                .animate-radar-spin { animation: radar-spin 10s linear infinite; }
                .animate-radar-spin-reverse { animation: radar-spin-reverse 15s linear infinite; }
            `}} />
        </div>
    );
}
