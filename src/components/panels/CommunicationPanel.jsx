import { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { MessageSquare, AlertTriangle, Radio, Send, Terminal, Shield, Lock } from 'lucide-react';

export default function CommunicationPanel() {
    const { messages, addMessage } = useDashboard();
    const [input, setInput] = useState('');
    const [filter, setFilter] = useState('All');

    const filtered = filter === 'All' ? messages : messages.filter(m => m.status === filter);

    const handleSend = (e) => {
        e.preventDefault();
        if (input.trim()) { addMessage('Alex', input.trim(), 'Active'); setInput(''); }
    };

    return (
        <div className="flex flex-col h-full w-full bg-transparent relative overflow-hidden group">
            
            {/* Secure-Link Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-[#1F2937] bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="w-10 h-10 border border-emerald-500/20 bg-emerald-500/10 rounded-lg flex items-center justify-center relative">
                        <Radio className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform animate-pulse" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
                    </div>
                    <div>
                        <h4 className="font-poppins font-black text-xl tracking-tight text-slate-900 dark:text-white uppercase leading-none mb-1">TEAM CHAT</h4>
                        <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-slate-500 dark:text-white/40 uppercase flex items-center gap-2">
                           <Lock className="w-3 h-3 text-slate-400" /> SECURE CHANNEL
                        </p>
                    </div>
                </div>
                
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-[#1F2937] rounded-lg">
                    {['All','Critical'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                                className={`font-mono px-3 py-1.5 text-[9px] font-black tracking-widest uppercase rounded transition-all
                                    ${filter === f ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-[#6B7280] hover:text-slate-700 dark:hover:text-[#9CA3AF]'}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-white/[0.03]">
                {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 dark:text-white/20">
                        <Terminal className="w-10 h-10" />
                        <span className="font-mono text-[10px] font-bold tracking-[0.3em] uppercase">NO MESSAGES</span>
                    </div>
                )}
                {filtered.map(msg => (
                    <div key={msg.id} className="group/msg px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors relative">
                        <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex items-center gap-3">
                               <div className={`w-1 h-5 rounded-full ${msg.sender === 'Alex' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                               <span className={`font-poppins font-bold text-sm tracking-tight uppercase
                                   ${msg.sender === 'Alex' ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                   {msg.sender}
                               </span>
                            </div>
                            <span className="font-mono text-[9px] text-slate-400 dark:text-white/30 tracking-widest font-bold uppercase">[{msg.time}]</span>
                        </div>
                        <p className="font-inter text-xs text-slate-700 dark:text-[#9CA3AF] leading-relaxed mb-3">{msg.text}</p>
                        
                        <div className="flex justify-end items-center gap-4">
                            <div className="h-[1px] flex-1 bg-slate-100 dark:bg-white/[0.03]" />
                            <span className={`
                                font-mono text-[8px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded border
                                ${msg.status === 'Critical' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' : 'bg-slate-100 dark:bg-[#1F2937] text-slate-600 dark:text-[#6B7280] border-slate-200 dark:border-[#1F2937]'}
                            `}>
                                {msg.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Terminal Input Array */}
            <form onSubmit={handleSend} className="p-4 sm:p-5 bg-slate-50/80 dark:bg-black/40 border-t border-slate-200 dark:border-[#1F2937]">
                <div className="relative group/input flex items-center">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                         <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-500/40" />
                         <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-500/40 font-bold tracking-widest uppercase">MSG:</span>
                    </div>
                    <input
                        type="text" value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="TYPE A MESSAGE..."
                        className="font-mono w-full bg-white dark:bg-white/[0.02] border border-slate-300 dark:border-[#1F2937] rounded-lg focus:border-teal-500 dark:focus:border-[#14B8A6]/40 pl-20 pr-14 py-3 text-xs font-semibold text-slate-900 dark:text-[#14B8A6] placeholder-slate-400 dark:placeholder-white/20 outline-none transition-all uppercase shadow-xs"
                    />
                    <button type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-teal-600 hover:bg-teal-700 dark:bg-[#1F2937] dark:hover:bg-[#14B8A6] border border-teal-600 dark:border-[#374151] rounded-lg flex items-center justify-center text-white dark:text-[#9CA3AF] dark:hover:text-black transition-all shadow-xs">
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}
