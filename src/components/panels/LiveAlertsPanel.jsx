import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { ShieldAlert, Zap, Clock, Terminal, Activity, ChevronRight, Activity as Heartbeat, Camera } from 'lucide-react';
import * as api from '../../api/index.js';

export default function LiveAlertsPanel() {
    const navigate = useNavigate();
    const { alerts: rawAlerts, getIcon, addToast, user, refreshData } = useDashboard();
    
    // Map backend alerts to component state
    const alerts = (rawAlerts || []).map(a => ({
        ...a,
        critical: a.severity === 'Critical' || a.severity === 'High',
        status: (a.status || 'reported').toLowerCase()
    }));
    
    const criticalCount = alerts.filter(a => a.critical).length;

    return (
        <div className="flex flex-col h-full w-full bg-transparent relative overflow-hidden group">
            
            {/* Header Header Status Bar */}
            <div className={`
                flex items-center justify-between px-6 py-5 border-b transition-all duration-700
                ${criticalCount > 0 ? 'bg-red-500/[0.05] border-red-500/20' : 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-200 dark:border-[#1F2937]'}
            `}>
                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="relative">
                        <Heartbeat className={`w-6 h-6 ${criticalCount > 0 ? 'text-red-500 animate-[pulse_2s_infinite]' : 'text-blue-500'}`} />
                        {criticalCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />}
                    </div>
                    <div>
                        <h4 className="font-poppins font-black text-xl tracking-tight text-slate-900 dark:text-white uppercase leading-none mb-1">LIVE INCIDENTS</h4>
                        <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-slate-500 dark:text-white/40 uppercase">MONITORING: {alerts.length} AREAS</p>
                    </div>
                </div>
                {criticalCount > 0 && (
                    <div className="px-4 py-1.5 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-mono text-[9px] font-black tracking-widest uppercase rounded animate-pulse">
                        {criticalCount} URGENT
                    </div>
                )}
            </div>

            {/* Alert List Feed */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-white/[0.03]">
                {alerts.map((alert, idx) => {
                    const Icon = getIcon(alert.iconName);
                    const targetId = alert.numeric_id || alert.id;
                    const statusKey = (alert.status || '').toLowerCase();
                    return (
                        <div
                            key={alert.id}
                            onClick={() => {
                                navigate(`/alerts?id=${encodeURIComponent(targetId)}`);
                            }}
                            title="Click to view complete incident telemetry, responder units & resource allocations"
                            className={`
                                group/alert flex items-start gap-4 sm:gap-5 px-6 py-5 cursor-pointer transition-all duration-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] relative border-l-2
                                ${alert.critical ? 'border-l-red-500 bg-red-500/[0.02]' : 'border-l-teal-500/50'}
                            `}
                        >
                            {/* Marker */}
                            <div className="relative flex-shrink-0 mt-1">
                                <div className={`w-10 h-10 border rounded-lg flex items-center justify-center transition-all group-hover/alert:scale-105 ${alert.critical ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-slate-100 dark:bg-[#1F2937] border-slate-200 dark:border-[#1F2937] text-slate-600 dark:text-[#9CA3AF]'}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                {alert.critical && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />}
                            </div>

                            {/* Content Block */}
                            <div className="flex-1 min-w-0 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <h5 className={`font-poppins font-black text-lg tracking-tight uppercase leading-none group-hover/alert:text-teal-600 dark:group-hover/alert:text-[#00FFCC] transition-colors truncate ${alert.critical ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                            {alert.type}
                                        </h5>
                                        {alert.is_major_disaster && (
                                            <span className="text-[9px] font-mono font-bold text-red-700 dark:text-red-300 bg-red-500/20 border border-red-500/50 px-1.5 py-0.5 rounded uppercase tracking-widest flex-shrink-0 animate-pulse">
                                                MAJOR DISASTER
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="font-mono text-[9px] text-slate-500 dark:text-[#6B7280] tracking-widest font-bold uppercase">[{alert.time}]</span>
                                        <ChevronRight size={14} className="text-slate-400 dark:text-white/20 group-hover/alert:text-teal-600 dark:group-hover/alert:text-[#00FFCC] group-hover/alert:translate-x-1 transition-all" />
                                    </div>
                                </div>
                                <p className="font-mono text-[10px] text-slate-500 dark:text-white/40 uppercase italic tracking-tighter line-clamp-1">LOCATION: {alert.location}</p>
                                
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                                    <div className="px-3 py-1 bg-slate-100 dark:bg-[#1F2937] border border-slate-200 dark:border-[#1F2937] rounded font-mono text-[8px] font-black tracking-widest uppercase text-slate-600 dark:text-[#6B7280]">
                                        ID: {alert.id}
                                    </div>
                                    {alert.image_url && (
                                        <div className="px-2 py-1 bg-teal-500/10 border border-teal-500/30 rounded font-mono text-[8px] font-black tracking-widest uppercase text-teal-600 dark:text-teal-400 flex items-center gap-1">
                                            <Camera size={10} /> PHOTO
                                        </div>
                                    )}
                                    <div className={`px-3 py-1 border rounded font-mono text-[8px] font-black tracking-widest uppercase ${
                                        statusKey === 'reported' ? 'border-yellow-500/30 text-yellow-700 dark:text-yellow-400 bg-yellow-500/10' :
                                        statusKey === 'assigned' ? 'border-cyan-500/30 text-cyan-700 dark:text-cyan-400 bg-cyan-500/10' :
                                        statusKey === 'responding' || statusKey === 'inprogress' ? 'border-blue-500/30 text-blue-700 dark:text-blue-400 bg-blue-500/10' :
                                        'border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                                    }`}>
                                        {statusKey === 'reported' ? 'ACTIVE_UNASSIGNED' : 
                                         statusKey === 'assigned' ? 'DISPATCH_PENDING' :
                                         statusKey === 'responding' || statusKey === 'inprogress' ? 'RESPONDERS_DISPATCHED' : 
                                         'RESOLVED'}
                                    </div>
                                    
                                    {/* Responder Actions */}
                                    {(user?.role === 'responder' || user?.role === 'admin') && (
                                       <div className="flex gap-2">
                                          {statusKey === 'reported' && (
                                            <button 
                                              onClick={async (e) => { 
                                                e.stopPropagation(); 
                                                await api.updateAlertStatus(alert.id, 'responding'); 
                                                refreshData();
                                                addToast('Units Dispatched', 'success');
                                              }}
                                              className="px-3 py-1 bg-blue-600 text-white font-mono text-[8px] font-black uppercase hover:bg-blue-700 transition-colors rounded"
                                            >
                                              Dispatch
                                            </button>
                                          )}
                                          {(statusKey === 'responding' || statusKey === 'inprogress' || statusKey === 'assigned') && (
                                            <button 
                                              onClick={async (e) => { 
                                                e.stopPropagation(); 
                                                await api.updateAlertStatus(alert.id, 'resolved'); 
                                                refreshData();
                                                addToast('Incident Resolved', 'success');
                                              }}
                                              className="px-3 py-1 bg-green-600 text-white font-mono text-[8px] font-black uppercase hover:bg-green-700 transition-colors rounded"
                                            >
                                              Resolve
                                            </button>
                                          )}
                                       </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-[#1F2937] bg-slate-50/50 dark:bg-black/40">
                <button
                    onClick={() => {
                        addToast('Opening Alert Feed…', 'info');
                        navigate('/alerts');
                    }}
                    className="w-full h-11 bg-white hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/10 border border-slate-200 dark:border-[#1F2937] hover:border-slate-300 dark:hover:border-white/20 transition-all font-mono text-[10px] font-black tracking-[0.3em] text-slate-700 dark:text-[#9CA3AF] hover:text-teal-600 dark:hover:text-[#14B8A6] uppercase rounded shadow-xs"
                >
                    VIEW ALL ALERTS
                </button>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
            `}} />
        </div>
    );
}
