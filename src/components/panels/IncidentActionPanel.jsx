import { useDashboard } from '../../context/DashboardContext';
import { CheckCircle, ChevronsUp, ShieldAlert, Zap, Clock, Terminal, Activity } from 'lucide-react';

export default function IncidentActionPanel() {
    const { actions, acknowledgeAction, escalateAction } = useDashboard();

    return (
        <div className="flex flex-col h-full w-full bg-transparent relative overflow-hidden group">
            
            {/* Mission Critical Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-red-500/20 bg-red-500/[0.04]">
                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="w-10 h-10 border border-red-500/30 bg-red-500/10 rounded-lg flex items-center justify-center relative">
                        <ShieldAlert className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform animate-pulse" />
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_12px_#ef4444]" />
                    </div>
                    <div>
                        <h4 className="font-poppins font-black text-xl tracking-tight text-slate-900 dark:text-white uppercase leading-none mb-1">ACTION_QUEUE</h4>
                        <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-slate-500 dark:text-white/40 uppercase flex items-center gap-2">
                           <Activity className="w-3 h-3 text-red-500" /> PENDING_PROTOCOL_SYNC
                        </p>
                    </div>
                </div>
                
                <div className="px-3.5 py-1.5 bg-red-600/10 border border-red-600/30 text-red-600 dark:text-red-400 font-mono text-[9px] font-black tracking-widest uppercase rounded animate-pulse">
                    {actions.length} MISSIONS
                </div>
            </div>

            {/* Action Stream */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-white/[0.03]">
                {actions.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 dark:text-white/20">
                        <Terminal className="w-10 h-10" />
                        <span className="font-mono text-[10px] font-bold tracking-[0.3em] uppercase">SYSTEM_STABLE: NO_PENDING_THREADS</span>
                    </div>
                )}
                {actions.map((act) => (
                    <div key={act.id} className="group/action px-6 py-5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all duration-300 relative overflow-hidden">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-start gap-4">
                               <div className={`w-1 h-8 mt-1 rounded-full ${act.priority === 'High' ? 'bg-red-500' : 'bg-amber-500'}`} />
                               <div>
                                   <h5 className="font-poppins font-bold text-base tracking-tight uppercase leading-snug text-slate-900 dark:text-white group-hover/action:text-red-600 dark:group-hover/action:text-red-400 transition-colors">
                                       {act.title}
                                   </h5>
                                   <div className="flex items-center gap-3 mt-1.5">
                                      <span className={`font-mono text-[8px] font-black tracking-[0.2em] uppercase px-2.5 py-0.5 rounded border ${act.priority === 'High' ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'}`}>
                                         {act.priority}_PRIORITY
                                      </span>
                                      <span className="font-mono text-[9px] text-slate-500 dark:text-[#6B7280] tracking-widest font-bold uppercase">SOURCE: {act.source}</span>
                                   </div>
                               </div>
                            </div>
                            <span className="font-mono text-[9px] text-slate-500 dark:text-[#6B7280] tracking-widest font-bold uppercase">[{act.time}]</span>
                        </div>
                        
                        {/* Action Clusters */}
                        <div className="grid grid-cols-2 gap-3 relative z-10 mt-3">
                            <button
                                onClick={() => acknowledgeAction(act.id)}
                                className="flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-[#1F2937] hover:border-slate-300 rounded-lg transition-all font-mono text-[9px] font-black tracking-[0.2em] uppercase text-blue-600 dark:text-blue-400 shadow-xs"
                            >
                                <CheckCircle className="w-4 h-4" />
                                ACKNOWLEDGE
                            </button>
                            <button
                                onClick={() => escalateAction(act.id)}
                                className="flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white border border-transparent rounded-lg transition-all font-mono text-[9px] font-black tracking-[0.2em] uppercase shadow-sm"
                            >
                                <ChevronsUp className="w-4 h-4" />
                                ESCALATE
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tactical Footer Overlay */}
            <div className="px-6 py-4 bg-slate-50/80 dark:bg-black/40 border-t border-slate-200 dark:border-[#1F2937] relative group/footer">
                <div className="flex items-center justify-between opacity-40 group-hover/footer:opacity-80 transition-opacity">
                   <div className="flex gap-3 items-center">
                      <Zap className="w-3.5 h-3.5 text-slate-600 dark:text-white" />
                      <span className="font-mono text-[8px] font-bold tracking-[0.3em] text-slate-600 dark:text-white uppercase">CORTEX_RESPONSE_INITIATED</span>
                   </div>
                   <Clock className="w-3.5 h-3.5 text-slate-600 dark:text-white" />
                </div>
            </div>
        </div>
    );
}
