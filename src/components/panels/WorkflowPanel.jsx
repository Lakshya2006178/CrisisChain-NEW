import { useDashboard } from '../../context/DashboardContext';
import { AlertTriangle, ClipboardCheck, Siren, HeartHandshake, ChevronRight } from 'lucide-react';

const STEPS = [
    { id:1, title:'INCIDENT REPORTED',      sub:'12:01 UTC',   icon: AlertTriangle,  color:'#ef4444', desc:'Emergency reported and logged.' },
    { id:2, title:'SITUATION ANALYSIS',     sub:'12:45 UTC',   icon: ClipboardCheck, color:'#fbbf24', desc:'Analyzing the impact and scope.' },
    { id:3, title:'EMERGENCY RESPONSE',    sub:'13:30 UTC',   icon: Siren,          color:'#3b82f6', desc:'Rescue teams on the move.' },
    { id:4, title:'RECOVERY & STABILITY',      sub:'PLANNED',     icon: HeartHandshake, color:'#10b981', desc:'Final checks and long-term help.' },
];

export default function WorkflowPanel() {
    const { workflowId, advanceWorkflow } = useDashboard();

    return (
        <div className="flex h-full w-full items-stretch divide-x divide-slate-200 dark:divide-white/5 overflow-x-auto custom-scrollbar">
            {/* Header Label */}
            <div className="flex-shrink-0 flex flex-col justify-center px-8 bg-slate-50/80 dark:bg-white/[0.02]">
                <div className="h-1 w-8 bg-teal-500 dark:bg-[#14B8A6] mb-4" />
                <p className="font-mono text-[10px] text-slate-400 dark:text-[#9CA3AF] tracking-[0.5em] uppercase vertical-text">
                    STATUS
                </p>
            </div>

            {/* Steps */}
            <div className="flex flex-1 min-w-max">
                {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive    = step.id === workflowId;
                    const isCompleted = step.id < workflowId;
                    const isDimmed    = step.id > workflowId;

                    return (
                        <div key={step.id} className="flex items-center">
                            <button
                                onClick={() => { if (isActive && step.id < 4) advanceWorkflow(); }}
                                className={`
                                    group/step relative flex flex-col justify-center gap-4 px-10 py-8 text-left transition-all duration-700 w-[280px] h-full
                                    ${isActive ? 'bg-teal-500/10 dark:bg-[#14B8A6]/[0.03] shadow-[inset_0_0_40px_rgba(20,184,166,0.05)]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}
                                    ${isDimmed ? 'opacity-60 dark:opacity-40' : ''}
                                `}
                            >
                                {/* Step Indicator */}
                                <div className="absolute top-4 left-10 flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-teal-500 animate-pulse shadow-[0_0_8px_#14B8A6]' : isCompleted ? 'bg-teal-600 dark:bg-white/40' : 'bg-slate-300 dark:bg-white/10'}`} />
                                    <span className="font-mono text-[9px] text-slate-500 dark:text-[#6B7280] font-bold tracking-widest uppercase">STEP 0{step.id}</span>
                                </div>

                                {/* Icon & Title */}
                                <div className="flex items-start gap-5">
                                    <div className={`
                                        flex-shrink-0 w-12 h-12 flex items-center justify-center border transition-all duration-500 rounded-lg
                                        ${isActive ? 'bg-teal-500/15 border-teal-500/50 text-teal-600 dark:text-[#14B8A6]' : isCompleted ? 'bg-slate-100 dark:bg-[#1F2937] border-slate-300 dark:border-[#374151] text-slate-700 dark:text-[#D1D5DB]' : 'bg-slate-50 dark:bg-transparent border-slate-200 dark:border-[#1F2937] text-slate-400 dark:text-[#6B7280]'}
                                    `}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <h4 className={`font-poppins font-black text-lg tracking-tight uppercase leading-none mb-1 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-[#9CA3AF]'}`}>
                                            {step.title}
                                        </h4>
                                        <p className={`font-mono text-[9px] font-bold tracking-[0.2em] mb-3 ${isActive ? 'text-teal-600 dark:text-[#14B8A6]' : 'text-slate-500 dark:text-[#6B7280]'}`}>
                                            {step.sub}
                                        </p>
                                    </div>
                                </div>

                                <p className="text-[10px] leading-relaxed text-slate-600 dark:text-[#9CA3AF] font-inter uppercase italic group-hover/step:text-slate-900 dark:group-hover/step:text-[#D1D5DB] transition-colors">
                                    {step.desc}
                                </p>

                                {isActive && (
                                    <div className="absolute bottom-0 left-0 h-1 bg-teal-500 dark:bg-[#14B8A6] animate-progress-glow" style={{ width: '40%' }} />
                                )}
                            </button>

                            {/* Chevron Divider */}
                            {idx < STEPS.length - 1 && (
                                <div className="flex-shrink-0 h-full flex items-center px-2">
                                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/10" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); }
                @keyframes progress-glow {
                    0% { opacity: 0.3; width: 0%; }
                    50% { opacity: 1; width: 100%; }
                    100% { opacity: 0.3; width: 0%; }
                }
                .animate-progress-glow { animation: progress-glow 4s ease-in-out infinite; }
            `}} />
        </div>
    );
}
