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
    const color = STATUS_COLOR[label] || '#ffffff40';
    return (
        <span className="px-3 py-1 text-[9px] font-mono font-black uppercase tracking-widest border"
            style={{ color, borderColor: `${color}40`, background: `${color}10` }}>
            {label}
        </span>
    );
}

export function CrudModal({ title, fields, onSave, onClose }) {
    const [form, setForm] = useState(() => Object.fromEntries(fields.map(f => [f.key, f.default || ''])));
    return (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-xl flex items-center justify-center p-8">
            <div className="bg-[#08080A] border border-white/10 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                    <span className="font-outfit font-black text-xl text-white uppercase tracking-tight">{title}</span>
                    <button onClick={onClose}><X className="w-5 h-5 text-white/30 hover:text-white" /></button>
                </div>
                <div className="p-8 space-y-5">
                    {fields.map(f => (
                        <div key={f.key} className="space-y-2">
                            <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{f.label}</label>
                            {f.options ? (
                                <select value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                    className="w-full bg-white/5 border border-white/5 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#00FFCC]/40 appearance-none">
                                    {f.options.map(o => <option key={o} value={o} className="bg-[#08080A]">{o}</option>)}
                                </select>
                            ) : (
                                <input type={f.type || 'text'} value={form[f.key]}
                                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                    className="w-full bg-white/5 border border-white/5 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#00FFCC]/40" />
                            )}
                        </div>
                    ))}
                    <div className="flex gap-4 pt-4">
                        <button onClick={onClose} className="flex-1 py-3 border border-white/10 font-mono text-xs text-white/40 hover:text-white uppercase tracking-widest">Cancel</button>
                        <button onClick={() => onSave(form)} className="flex-1 py-3 bg-[#00FFCC] text-black font-outfit font-black text-xs uppercase tracking-widest hover:brightness-110">Add</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
