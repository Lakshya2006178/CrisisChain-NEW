import React, { useState, useEffect } from 'react';
import { 
    X, 
    Package, 
    AlertTriangle, 
    CheckCircle2, 
    Building2, 
    Flame, 
    Activity, 
    Truck, 
    Shield, 
    Search,
    ChevronDown,
    Plus,
    Minus,
    ArrowRight
} from 'lucide-react';
import * as api from '../api/index.js';
import { useDashboard } from '../context/DashboardContext';

export default function AllocateResourceModal({
    isOpen,
    onClose,
    incident = null,
    preselectedResource = null,
    onAllocated = () => {}
}) {
    const { addToast } = useDashboard();

    const [incidents, setIncidents] = useState([]);
    const [resources, setResources] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    const [selectedIncidentId, setSelectedIncidentId] = useState('');
    const [selectedResourceId, setSelectedResourceId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [incidentSearch, setIncidentSearch] = useState('');
    const [resourceSearch, setResourceSearch] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        setError('');
        setQuantity(1);

        const loadData = async () => {
            setLoadingData(true);
            try {
                const [alertsRes, resourcesRes] = await Promise.all([
                    api.fetchAlerts(),
                    api.fetchResources()
                ]);

                // Filter active incidents
                const activeAlerts = (Array.isArray(alertsRes.data) ? alertsRes.data : [])
                    .filter(a => a.incident_status !== 'Resolved' && a.status !== 'Resolved' && a.status !== 'Closed');
                setIncidents(activeAlerts);

                const resList = Array.isArray(resourcesRes.data) ? resourcesRes.data : [];
                setResources(resList);

                // Set initial selections
                if (incident) {
                    const incId = incident.numeric_id || incident.id || incident.incident_id;
                    setSelectedIncidentId(String(incId));
                } else if (activeAlerts.length > 0) {
                    setSelectedIncidentId(String(activeAlerts[0].numeric_id || activeAlerts[0].id));
                }

                if (preselectedResource) {
                    const rId = preselectedResource.resource_id || preselectedResource.id;
                    setSelectedResourceId(String(rId));
                } else if (resList.length > 0) {
                    const firstAvailable = resList.find(r => (r.quantity_available || r.quantity || 0) > 0);
                    setSelectedResourceId(String(firstAvailable ? firstAvailable.resource_id : resList[0].resource_id));
                }
            } catch (err) {
                console.error('Failed to load allocation data:', err);
                setError('Failed to fetch incidents or inventory. Please retry.');
            } finally {
                setLoadingData(false);
            }
        };

        loadData();
    }, [isOpen, incident, preselectedResource]);

    if (!isOpen) return null;

    const selectedIncident = incidents.find(
        i => String(i.numeric_id || i.id || i.incident_id) === String(selectedIncidentId)
    );

    const selectedResource = resources.find(
        r => String(r.resource_id || r.id) === String(selectedResourceId)
    );

    const availableStock = selectedResource 
        ? (selectedResource.quantity_available !== undefined ? selectedResource.quantity_available : (selectedResource.quantity || 0))
        : 0;

    const filteredResources = resources.filter(r => {
        if (!resourceSearch.trim()) return true;
        const s = resourceSearch.toLowerCase();
        return (r.resource_type || r.name || '').toLowerCase().includes(s) ||
               (r.center_name || '').toLowerCase().includes(s) ||
               (r.organization_name || '').toLowerCase().includes(s);
    });

    const filteredIncidents = incidents.filter(i => {
        if (!incidentSearch.trim()) return true;
        const s = incidentSearch.toLowerCase();
        return (i.title || '').toLowerCase().includes(s) ||
               `al-${i.numeric_id || i.id}`.toLowerCase().includes(s) ||
               (i.location || '').toLowerCase().includes(s);
    });

    const handleQuantityChange = (val) => {
        const num = parseInt(val, 10);
        if (isNaN(num)) {
            setQuantity(1);
        } else {
            setQuantity(Math.max(1, Math.min(num, availableStock || 1)));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!selectedIncidentId) {
            setError('Please select an incident to allocate resources to.');
            return;
        }

        if (!selectedResourceId) {
            setError('Please select a resource from inventory.');
            return;
        }

        if (availableStock <= 0) {
            setError('Selected resource is depleted. Choose another resource.');
            return;
        }

        if (quantity <= 0 || quantity > availableStock) {
            setError(`Requested quantity must be between 1 and ${availableStock}.`);
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                incident_id: parseInt(selectedIncidentId, 10),
                resource_id: parseInt(selectedResourceId, 10),
                quantity_allocated: quantity
            };

            const { data } = await api.createAllocation(payload);
            addToast(`Successfully allocated ${quantity} x ${selectedResource.resource_type || selectedResource.name} to AL-${selectedIncidentId}`, 'success');
            onAllocated(data.allocation || data);
            onClose();
        } catch (err) {
            console.error('Allocation error:', err);
            const msg = err.response?.data?.error || err.message || 'Failed to allocate resource.';
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#090A0F] border border-slate-200 dark:border-white/10 shadow-2xl rounded-xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Tactical Top Bar */}
                <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-teal-500 to-blue-500" />

                {/* Modal Header */}
                <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/30 rounded-lg flex items-center justify-center text-teal-600 dark:text-[#00FFCC]">
                            <Package className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-teal-600 dark:text-[#00FFCC] block">LOGISTICS UPLINK</span>
                            <h2 className="font-outfit font-black text-xl uppercase tracking-tight text-slate-900 dark:text-white">ALLOCATE RESOURCE</h2>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                    
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="font-mono text-xs text-red-600 dark:text-red-300 uppercase tracking-wider">{error}</p>
                        </div>
                    )}

                    {/* Step 1: Target Incident */}
                    <div className="space-y-2">
                        <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-600 dark:text-white/50 block">
                            1. TARGET INCIDENT
                        </label>
                        {incident ? (
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-lg flex items-center justify-between">
                                <div>
                                    <span className="font-mono text-xs font-bold text-teal-600 dark:text-[#00FFCC] mr-3">AL-{incident.numeric_id || incident.id}</span>
                                    <span className="font-outfit font-bold text-sm text-slate-900 dark:text-white">{incident.title}</span>
                                </div>
                                <span className="font-mono text-[9px] px-2.5 py-1 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded uppercase tracking-widest">
                                    {incident.priority || incident.priority_level || 'Active'}
                                </span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30" />
                                    <input 
                                        type="text" 
                                        value={incidentSearch} 
                                        onChange={e => setIncidentSearch(e.target.value)}
                                        placeholder="SEARCH INCIDENTS (AL-1001, FIRE...)"
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                                <select 
                                    value={selectedIncidentId} 
                                    onChange={e => setSelectedIncidentId(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-black/70 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:border-teal-500 focus:outline-none"
                                >
                                    {filteredIncidents.map(inc => (
                                        <option key={inc.numeric_id || inc.id} value={inc.numeric_id || inc.id}>
                                            AL-{inc.numeric_id || inc.id} // {inc.title} ({inc.priority || inc.priority_level})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Select Resource */}
                    <div className="space-y-2">
                        <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-600 dark:text-white/50 block">
                            2. SELECT RESOURCE FROM INVENTORY
                        </label>
                        
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30" />
                            <input 
                                type="text" 
                                value={resourceSearch} 
                                onChange={e => setResourceSearch(e.target.value)}
                                placeholder="FILTER BY RESOURCE TYPE OR FACILITY..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:border-teal-500 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                            {filteredResources.map(r => {
                                const isSelected = String(r.resource_id || r.id) === String(selectedResourceId);
                                const stock = r.quantity_available !== undefined ? r.quantity_available : (r.quantity || 0);
                                const isDepleted = stock <= 0;

                                return (
                                    <div 
                                        key={r.resource_id || r.id}
                                        onClick={() => !isDepleted && setSelectedResourceId(String(r.resource_id || r.id))}
                                        className={`p-3 border rounded-lg text-left cursor-pointer transition-all ${
                                            isSelected 
                                                ? 'bg-teal-50 dark:bg-[#00FFCC]/10 border-teal-500 dark:border-[#00FFCC] shadow-xs'
                                                : isDepleted 
                                                    ? 'bg-slate-100/50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5 opacity-40 cursor-not-allowed'
                                                    : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/30 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="font-outfit font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight truncate">
                                                {r.resource_type || r.name}
                                            </span>
                                            <span className={`font-mono text-[9px] px-2 py-0.5 rounded border ${
                                                stock > 0 
                                                    ? 'text-teal-700 dark:text-[#00FFCC] border-teal-500/30 bg-teal-500/10 font-bold' 
                                                    : 'text-red-500 border-red-500/30 bg-red-500/10'
                                            }`}>
                                                {stock} AVAILABLE
                                            </span>
                                        </div>
                                        <p className="font-mono text-[10px] text-slate-500 dark:text-white/40 truncate mt-1">
                                            {r.center_name || r.location}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step 3: Quantity Specification */}
                    {selectedResource && (
                        <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-600 dark:text-white/50 block">3. DISPATCH QUANTITY</span>
                                    <p className="font-outfit font-bold text-sm text-slate-900 dark:text-white">
                                        {selectedResource.resource_type || selectedResource.name}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="font-mono text-[9px] text-slate-500 dark:text-white/40 uppercase block">STOCK AVAILABLE</span>
                                    <span className="font-mono text-base font-black text-teal-600 dark:text-[#00FFCC]">{availableStock}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => handleQuantityChange(quantity - 1)}
                                    disabled={quantity <= 1}
                                    className="w-10 h-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/30 rounded-lg text-slate-700 dark:text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                
                                <input
                                    type="number"
                                    min="1"
                                    max={availableStock}
                                    value={quantity}
                                    onChange={(e) => handleQuantityChange(e.target.value)}
                                    className="flex-1 py-2 bg-white dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-lg text-center font-outfit font-black text-2xl text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none shadow-xs"
                                />

                                <button
                                    type="button"
                                    onClick={() => handleQuantityChange(quantity + 1)}
                                    disabled={quantity >= availableStock}
                                    className="w-10 h-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/30 rounded-lg text-slate-700 dark:text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Stock Telemetry Summary */}
                            <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-500 dark:text-white/40">REMAINING AFTER DISPATCH:</span>
                                <span className={`font-bold ${availableStock - quantity < 5 ? 'text-red-500' : 'text-blue-500'}`}>
                                    {Math.max(0, availableStock - quantity)} units
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/60 hover:text-slate-900 dark:hover:text-white font-mono text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all shadow-xs"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || availableStock <= 0}
                            className="px-8 py-2.5 bg-teal-600 hover:bg-teal-700 dark:bg-[#00FFCC] dark:hover:bg-[#00FFCC]/90 text-white dark:text-black font-outfit font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm rounded-lg"
                        >
                            {isSubmitting ? (
                                <>PROCESSING DISPATCH...</>
                            ) : (
                                <>ALLOCATE TO INCIDENT <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

