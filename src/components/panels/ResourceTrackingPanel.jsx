import { useDashboard } from '../../context/DashboardContext';
import { Truck, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ResourceTrackingPanel() {
    const { resources, getIcon } = useDashboard();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-full w-full bg-transparent relative overflow-hidden group">
            
            {/* Header Status Bar */}
            <div className="flex items-center justify-between px-6 sm:px-10 py-6 border-b border-slate-200 dark:border-[#1F2937] bg-slate-50/50 dark:bg-white/[0.02] cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.05] transition-all"
                 onClick={() => navigate('/resources')}>
                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="w-10 h-10 border border-emerald-500/20 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                        <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                        <h4 className="font-poppins font-black text-xl tracking-tight text-slate-900 dark:text-white uppercase leading-none mb-1">RESOURCES</h4>
                        <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-slate-500 dark:text-white/40 uppercase">STOCK LEVEL: {resources.length} ITEMS</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                   <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-500 font-bold tracking-widest uppercase italic">CONNECTED</span>
                </div>
            </div>

            {/* Asset List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-white/[0.03]">
                {resources.map((res) => {
                    const Icon = getIcon(res.iconName);
                    const pct = Math.min(Math.round((res.deployed / res.total) * 100), 100);
                    const barColor = pct >= 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#0d9488';
                    const textColor = pct >= 80 ? 'text-rose-600 dark:text-red-400' : pct >= 60 ? 'text-amber-600 dark:text-yellow-400' : 'text-teal-600 dark:text-[#14B8A6]';

                    return (
                        <div key={res.id} className="group/asset px-6 sm:px-10 py-5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all duration-300 flex items-center gap-6 sm:gap-8 border-l-2 border-l-transparent hover:border-l-emerald-500">
                            {/* Icon Pod */}
                            <div className="flex-shrink-0 w-11 h-11 bg-slate-100 dark:bg-[#1F2937] border border-slate-200 dark:border-[#1F2937] rounded-lg flex items-center justify-center transition-all group-hover/asset:border-emerald-500/40 group-hover/asset:bg-emerald-500/10">
                                <Icon className="w-5 h-5 text-slate-600 dark:text-[#6B7280] group-hover/asset:text-emerald-600 dark:group-hover/asset:text-emerald-400 transition-colors" />
                            </div>

                            {/* Data Block */}
                            <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                                <div className="flex items-center justify-between">
                                    <h5 className="font-poppins font-bold text-base tracking-tight uppercase leading-none text-slate-900 dark:text-white group-hover/asset:text-emerald-600 dark:group-hover/asset:text-emerald-400 transition-colors truncate">
                                        {res.name}
                                    </h5>
                                    <div className="font-mono text-[10px] font-bold tracking-widest text-slate-500 dark:text-white/40 uppercase">
                                        <b className="text-slate-900 dark:text-[#D1D5DB] font-extrabold">{res.deployed}</b> / {res.total}
                                    </div>
                                </div>
                                
                                {/* Progress HUD */}
                                <div className="relative h-2 bg-slate-200 dark:bg-white/[0.05] rounded-full overflow-hidden">
                                     <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 shadow-xs"
                                          style={{ width: `${pct}%`, backgroundColor: barColor }} />
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-[8px] font-bold tracking-widest uppercase text-slate-500 dark:text-[#6B7280]">CAPACITY</span>
                                    <span className={`font-mono text-[9px] font-bold tracking-widest uppercase italic ${textColor}`}>
                                        {pct >= 80 ? 'SUPPLY CRITICAL' : pct >= 60 ? 'MODERATE' : 'OPTIMAL'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* View Full Inventory Action */}
            <div className="p-6 border-t border-slate-200 dark:border-[#1F2937] bg-slate-50/50 dark:bg-black/40">
                <button
                    onClick={() => navigate('/resources')}
                    className="w-full h-11 bg-white hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-emerald-500 text-slate-700 hover:text-slate-900 dark:text-[#9CA3AF] dark:hover:text-black border border-slate-200 dark:border-[#1F2937] hover:border-slate-300 dark:hover:border-transparent transition-all duration-300 font-mono text-[10px] font-black tracking-[0.3em] uppercase flex items-center justify-center gap-3 group/btn rounded-lg shadow-xs"
                >
                    VIEW FULL INVENTORY
                    <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </button>
            </div>
        </div>
    );
}
