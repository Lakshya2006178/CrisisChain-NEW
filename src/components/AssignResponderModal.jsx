import { useState, useEffect } from 'react';
import { Shield, Users, Search, X, Check, AlertCircle, Loader2, Phone, Building2, UserCheck } from 'lucide-react';
import * as api from '../api/index.js';

export default function AssignResponderModal({
    isOpen,
    onClose,
    incident,
    onAssigned,
    addToast
}) {
    const [responders, setResponders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedAuthorityId, setSelectedAuthorityId] = useState(null);
    const [notes, setNotes] = useState('');
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');

    useEffect(() => {
        if (isOpen) {
            loadResponders();
            setSelectedAuthorityId(null);
            setNotes('');
            setSearch('');
            setTypeFilter('All');
        }
    }, [isOpen]);

    const loadResponders = async () => {
        try {
            setIsLoading(true);
            const { data } = await api.fetchAvailableResponders();
            setResponders(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load responders:', err);
            if (addToast) addToast(err.response?.data?.error || 'Failed to load responders', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !incident) return null;

    const handleAssign = async (e) => {
        e.preventDefault();
        if (!selectedAuthorityId) {
            if (addToast) addToast('Please select a responder to assign', 'error');
            return;
        }

        try {
            setIsSubmitting(true);
            const incidentId = incident.numeric_id || parseInt(String(incident.id || incident.incident_id).replace(/^AL-/i, ''), 10);
            const { data } = await api.createAssignment({
                incident_id: incidentId,
                authority_id: selectedAuthorityId,
                notes: notes.trim() || undefined
            });

            if (addToast) addToast(`Assigned ${data.responder?.name || 'Responder'} successfully`, 'success');
            if (onAssigned) onAssigned(data);
            onClose();
        } catch (err) {
            console.error('Failed to create assignment:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to create assignment';
            if (addToast) addToast(errorMsg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const types = ['All', ...new Set(responders.map(r => r.authority_type).filter(Boolean))];

    const filtered = responders.filter(r => {
        const matchesSearch = (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (r.organization?.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (r.authority_type || '').toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'All' || r.authority_type === typeFilter;
        return matchesSearch && matchesType;
    });

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-2xl bg-white dark:bg-[#0E1015] border border-slate-200 dark:border-white/10 shadow-2xl rounded-xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 border border-blue-500/20 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                            <UserCheck size={20} />
                        </div>
                        <div>
                            <div className="font-mono text-[9px] text-slate-500 dark:text-white/40 uppercase tracking-widest">
                                DISPATCH UNIT // {incident.id || `AL-${incident.numeric_id}`}
                            </div>
                            <h3 className="font-outfit font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-md">
                                {incident.title}
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/30 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                    {/* Search & Filter */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" size={14} />
                            <input
                                type="text"
                                placeholder="Search responders or organizations..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2.5 font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none focus:border-blue-500"
                            />
                        </div>
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white outline-none cursor-pointer"
                        >
                            {types.map(t => (
                                <option key={t} value={t} className="bg-white dark:bg-[#111318] text-slate-900 dark:text-white">
                                    {t === 'All' ? 'All Roles' : t}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Responders Selection List */}
                    <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                        {isLoading ? (
                            <div className="p-8 text-center text-slate-400 dark:text-white/40 flex items-center justify-center gap-3">
                                <Loader2 size={16} className="animate-spin text-blue-500" />
                                <span className="font-mono text-xs uppercase tracking-widest">Loading personnel roster...</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 dark:text-white/30 font-mono text-xs uppercase tracking-widest border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01] rounded-lg">
                                No responders found matching criteria
                            </div>
                        ) : (
                            filtered.map(r => {
                                const isSelected = selectedAuthorityId === r.authority_id;
                                const isAvailable = r.availability_status === 'Available';
                                return (
                                    <div
                                        key={r.authority_id}
                                        onClick={() => setSelectedAuthorityId(r.authority_id)}
                                        className={`p-3.5 border rounded-lg transition-all cursor-pointer flex items-center justify-between gap-4 ${
                                            isSelected
                                                ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-slate-900 dark:text-white shadow-xs'
                                                : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-white/80'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div
                                                className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-black border ${
                                                    isSelected
                                                        ? 'bg-blue-600 border-blue-400 text-white'
                                                        : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/50'
                                                }`}
                                            >
                                                {r.name ? r.name[0].toUpperCase() : 'R'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-poppins font-bold text-sm text-slate-900 dark:text-white truncate">
                                                        {r.name}
                                                    </span>
                                                    <span className="px-1.5 py-0.2 text-[8px] font-mono border border-slate-200 dark:border-white/10 rounded uppercase tracking-widest text-slate-500 dark:text-white/50">
                                                        {r.authority_type}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 dark:text-white/40 mt-0.5 truncate">
                                                    <span className="flex items-center gap-1">
                                                        <Building2 size={10} /> {r.organization?.name}
                                                    </span>
                                                    {r.phone_number && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone size={10} /> {r.phone_number}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <div className="text-right">
                                                <span
                                                    className={`inline-block px-2 py-0.5 text-[8px] font-mono uppercase tracking-widest border rounded ${
                                                        isAvailable
                                                            ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                                            : 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                                                    }`}
                                                >
                                                    {r.availability_status}
                                                </span>
                                                <div className="text-[8px] font-mono text-slate-400 dark:text-white/30 mt-0.5">
                                                    {r.active_assignments_count} ACTIVE
                                                </div>
                                            </div>
                                            <div
                                                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                                    isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 dark:border-white/10'
                                                }`}
                                            >
                                                {isSelected && <Check size={12} />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Dispatch Notes */}
                    <div className="space-y-1 pt-2">
                        <label className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-white/40">
                            Dispatch Notes / Orders (Optional)
                        </label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="e.g. Primary rescue team. Contact site coordinator on arrival."
                            className="w-full bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-white/10 rounded-lg p-3 font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none focus:border-blue-500 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 dark:bg-white/[0.01] border-t border-slate-200 dark:border-white/5 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-all shadow-xs"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleAssign}
                        disabled={!selectedAuthorityId || isSubmitting}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={12} className="animate-spin" /> DISPATCHING...
                            </>
                        ) : (
                            <>
                                <UserCheck size={12} /> CONFIRM DISPATCH
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

