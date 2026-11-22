import { useState } from 'react';
import { X } from 'lucide-react';

export const STATUS_COLOR = {
    Available: '#00FFCC', Full: '#ef4444', 'Near Capacity': '#f59e0b',
    Dispatched: '#3b82f6', Maintenance: '#ef4444', Deployed: '#3b82f6',
    'On Duty': '#00FFCC', 'Off Duty': '#f59e0b', Leave: '#ef4444',
    Resolved: '#10b981', Active: '#ef4444',
    Good: '#00FFCC', Moderate: '#f59e0b', Poor: '#ef4444',
};

export function Badge({ label }) {
    const colorMap = {
        Available: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
        'On Duty': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
        Good: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
        Resolved: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
        Deployed: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
        Dispatched: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
        'Near Capacity': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
        'Off Duty': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
        Moderate: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
        Full: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
        Maintenance: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
        Leave: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
        Active: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
        Poor: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
    };
    const cls = colorMap[label] || 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-white/10 dark:text-white/70 dark:border-white/20';
    return (
        <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded border ${cls}`}>
            {label}
        </span>
    );
}

export function CrudModal({ title, fields, initialData, submitLabel = 'Add', onSave, onClose }) {
    const [form, setForm] = useState(() => {
        if (initialData) {
            return Object.fromEntries(fields.map(f => [
                f.key,
                initialData[f.key] !== undefined && initialData[f.key] !== null ? initialData[f.key] : (f.default || '')
            ]));
        }
        return Object.fromEntries(fields.map(f => [f.key, f.default || '']));
    });
    return (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white dark:bg-[#0E1015] border border-slate-200 dark:border-white/10 w-full max-w-md shadow-2xl rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02]">
                    <span className="font-poppins font-bold text-lg text-slate-900 dark:text-white uppercase tracking-tight">{title}</span>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:text-white/30 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {fields.map(f => (
                        <div key={f.key} className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-white/50 uppercase tracking-wider">{f.label}</label>
                            {f.options ? (
                                <select 
                                    value={form[f.key]} 
                                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-[#111318] border border-slate-300 dark:border-white/10 rounded-lg px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                                >
                                    {f.options.map(o => <option key={o} value={o} className="bg-white dark:bg-[#0E1015] text-slate-900 dark:text-white">{o}</option>)}
                                </select>
                            ) : (
                                <input 
                                    type={f.type || 'text'} 
                                    value={form[f.key]}
                                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-[#111318] border border-slate-300 dark:border-white/10 rounded-lg px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" 
                                />
                            )}
                        </div>
                    ))}
                    <div className="flex gap-3 pt-3">
                        <button 
                            onClick={onClose} 
                            className="flex-1 py-2.5 border border-slate-300 dark:border-white/10 rounded-lg font-semibold text-xs text-slate-600 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => onSave(form)} 
                            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 dark:bg-[#00FFCC] dark:hover:brightness-110 text-white dark:text-black rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
                        >
                            {submitLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
