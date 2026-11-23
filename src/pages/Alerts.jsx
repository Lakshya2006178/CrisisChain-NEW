import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';
import * as api from '../api/index.js';
import { resolveImageUrl } from '../api/index.js';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import ErrorBoundary from '../components/ErrorBoundary';
import AlertsMapView from '../components/AlertsMap';
import {
    AlertTriangle, Flame, Droplets, Activity,
    Clock, MapPin, ShieldAlert,
    Bell,
    CheckCircle2, Truck, Info,
    Globe, HeartPulse, Satellite, Shield, X, Radio, Wind, Radiation, Loader2, Siren,
    UserCheck, Trash2, Phone, Building2, Package, RotateCcw,
    Camera, ZoomIn, ExternalLink
} from 'lucide-react';
import AssignResponderModal from '../components/AssignResponderModal';
import AllocateResourceModal from '../components/AllocateResourceModal';
import { isCriticalSeverity } from '../lib/incidentTypes';
import { SZ } from '../constants';

// Map DB iconName strings to actual icon components
const ICON_MAP = {
    Flame, Droplets, HeartPulse, AlertTriangle, Wind,
    Radiation, Activity, Shield, Truck, Globe,
};
const resolveIcon = (iconName) => ICON_MAP[iconName] || AlertTriangle;


// ── CUSTOM COMPONENTS ──

function StatCard({ label, value, icon: Icon, color, sub }) {
    return (
        <div className="p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111827] shadow-xs hover:shadow-sm transition-all flex items-center justify-between group">
            <div>
                <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</span>
                <span className="text-2xl sm:text-3xl font-bold font-poppins text-slate-900 dark:text-white leading-none">{value}</span>
                {sub && <span className="block text-[11px] text-teal-600 dark:text-teal-400 font-medium mt-1">{sub}</span>}
            </div>
            <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
                style={{ backgroundColor: `${color}18`, color }}
            >
                <Icon size={20} />
            </div>
        </div>
    );
}

function BroadcastModal({ isOpen, onClose, onBroadcast }) {
    const [formData, setFormData] = useState({
        title: '',
        type: 'Fire',
        severity: 'High',
        location: '',
        description: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate broadcast authorization
        setTimeout(() => {
            onBroadcast(formData);
            setIsSubmitting(false);
            onClose();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-white dark:bg-[#0B1220] rounded-xl border border-slate-200 dark:border-[#1F2937] shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-200 dark:border-[#1F2937] bg-slate-50/70 dark:bg-transparent flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 rounded-lg">
                            <Radio size={20} />
                        </div>
                        <h2 className="font-poppins text-xl font-bold text-slate-900 dark:text-gray-100">Send New Alert</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1F2937] text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6 flex-1 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">Incident Name*</label>
                        <input 
                            required
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            placeholder="e.g. Major Structure Fire"
                            className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-300 dark:border-[#1F2937] rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-gray-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">Type*</label>
                            <select 
                                value={formData.type}
                                onChange={e => setFormData({...formData, type: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-300 dark:border-[#1F2937] rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-gray-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                            >
                                <option value="Fire">Fire</option>
                                <option value="Flood">Flood</option>
                                <option value="Medical Emergency">Medical Emergency</option>
                                <option value="Road Accident">Road Accident</option>
                                <option value="Natural Disaster">Natural Disaster</option>
                                <option value="Structural Collapse">Structural Collapse</option>
                                <option value="Hazardous Material">Hazardous Material</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">Severity*</label>
                            <select
                                value={formData.severity}
                                onChange={e => setFormData({...formData, severity: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-300 dark:border-[#1F2937] rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-gray-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                            >
                                <option value="Critical">Critical</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">Location*</label>
                        <input 
                            required
                            type="text"
                            value={formData.location}
                            onChange={e => setFormData({...formData, location: e.target.value})}
                            placeholder="Enter address or area..."
                            className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-300 dark:border-[#1F2937] rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-gray-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">Details*</label>
                        <textarea 
                            required
                            rows="4"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            placeholder="Describe what happened..."
                            className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-300 dark:border-[#1F2937] rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-gray-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all resize-none"
                        />
                    </div>
                    
                    <div className="pt-6 border-t border-slate-200 dark:border-[#1F2937] flex justify-end gap-4">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-[#1F2937] text-sm font-semibold text-slate-700 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-[#1F2937] transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                        >
                            {isSubmitting ? 'Sending...' : 'Send Alert'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function NewEmergencyModal({ alert, onClose }) {
    if (!alert) return null;
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md transition-all duration-300">
            <div className="w-full max-w-lg bg-[#2b0d0d] rounded-xl border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.3)] flex flex-col overflow-hidden relative">
                {/* Flashing background effect */}
                <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />
                
                <div className="px-8 py-6 border-b border-red-500/30 flex items-center justify-between relative z-10 bg-[#1a0808]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-600 text-white rounded-md animate-bounce">
                            <Siren size={24} />
                        </div>
                        <h2 className="font-poppins text-xl font-black text-red-400 tracking-wider">NEW EMERGENCY DETECTED</h2>
                    </div>
                    <button onClick={onClose} className="text-red-400 hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-8 space-y-6 relative z-10 flex flex-col items-center">
                    <div className="text-center w-full">
                        <h3 className="text-2xl font-bold text-white mb-2 uppercase">{alert.title || alert.type}</h3>
                        <div className="flex items-center justify-center gap-2 text-red-200/80 font-mono text-sm mb-6">
                            <MapPin size={14} className="text-red-400"/> {alert.location}
                        </div>
                        
                        <div className={`inline-block px-6 py-2 border font-bold tracking-widest uppercase rounded-full ${
                                isCriticalSeverity(alert.severity) ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                                alert.severity === 'Medium' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' :
                                'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            }`}>
                            Severity: {alert.severity}
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose}
                        className="w-full py-4 mt-2 bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                    >
                        ACKNOWLEDGE & VIEW
                    </button>
                </div>
            </div>
        </div>
    );
}

function AlertsContent() {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryIncidentId = searchParams.get('id') || searchParams.get('selected');
    const { isSidebarOpen, addToast, alerts: liveAlerts, fetchLiveAlerts, addAlert, user, fetchResources, liveResponders } = useDashboard();
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [filterType, setFilterType] = useState('All');
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Assignment management state
    const [assignments, setAssignments] = useState([]);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [updatingAssignmentId, setUpdatingAssignmentId] = useState(null);

    // Resource allocation management state
    const [allocations, setAllocations] = useState([]);
    const [isLoadingAllocations, setIsLoadingAllocations] = useState(false);
    const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
    const [releasingAllocationId, setReleasingAllocationId] = useState(null);

    // Lightbox image viewer modal
    const [lightboxImage, setLightboxImage] = useState(null);
    
    // Popup tracking state
    const [newEmergencyPopup, setNewEmergencyPopup] = useState(null);
    const isInitialLoad = React.useRef(true);
    const prevAlertsRef = React.useRef([]);

    // Enrich each alert with resolved icon component
    const alerts = useMemo(() => (liveAlerts || []).map(a => ({
        ...a,
        Icon: resolveIcon(a.iconName),
        color: a.color || (a.severity === 'Critical' || a.severity === 'High' ? '#ef4444' : a.severity === 'Medium' ? '#f59e0b' : '#3b82f6'),
    })), [liveAlerts]);

    // Load assignments for selected alert
    const loadAssignments = async (incidentId) => {
        if (!incidentId) {
            setAssignments([]);
            return;
        }
        try {
            setIsLoadingAssignments(true);
            const numId = parseInt(String(incidentId).replace(/^AL-/i, ''), 10);
            const { data } = await api.fetchAssignments({ incident_id: numId });
            setAssignments(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load assignments:', err);
        } finally {
            setIsLoadingAssignments(false);
        }
    };

    // Load allocations for selected alert
    const loadAllocations = async (incidentId) => {
        if (!incidentId) {
            setAllocations([]);
            return;
        }
        try {
            setIsLoadingAllocations(true);
            const numId = parseInt(String(incidentId).replace(/^AL-/i, ''), 10);
            const { data } = await api.fetchAllocations({ incident_id: numId });
            setAllocations(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load allocations:', err);
        } finally {
            setIsLoadingAllocations(false);
        }
    };

    useEffect(() => {
        if (selectedAlert) {
            const numId = selectedAlert.numeric_id || selectedAlert.id;
            loadAssignments(numId);
            loadAllocations(numId);
        } else {
            setAssignments([]);
            setAllocations([]);
        }
    }, [selectedAlert?.id]);

    const handleReleaseAllocation = async (allocationId, resourceType, qty) => {
        if (!window.confirm(`Release ${qty} x ${resourceType} back to inventory stock?`)) return;
        try {
            setReleasingAllocationId(allocationId);
            await api.releaseAllocation(allocationId);
            addToast(`Released ${qty} x ${resourceType} back to inventory`, 'success');
            if (selectedAlert) {
                await loadAllocations(selectedAlert.numeric_id || selectedAlert.id);
            }
            if (typeof fetchResources === 'function') fetchResources();
        } catch (err) {
            console.error('Failed to release allocation:', err);
            const msg = err.response?.data?.error || err.message || 'Failed to release allocation.';
            addToast(msg, 'error');
        } finally {
            setReleasingAllocationId(null);
        }
    };

    const handleUpdateAssignmentStatus = async (assignmentId, nextStatus) => {
        try {
            setUpdatingAssignmentId(assignmentId);
            await api.updateAssignmentStatus(assignmentId, nextStatus);
            addToast(`Mission status updated to ${nextStatus}`, 'success');
            if (selectedAlert) {
                await loadAssignments(selectedAlert.numeric_id || selectedAlert.id);
                await fetchLiveAlerts();
            }
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Failed to update mission status';
            addToast(msg, 'error');
        } finally {
            setUpdatingAssignmentId(null);
        }
    };

    const handleRemoveAssignment = async (assignmentId) => {
        if (!window.confirm('Are you sure you want to unassign this responder?')) return;
        try {
            await api.deleteAssignment(assignmentId);
            addToast('Responder unassigned successfully', 'success');
            if (selectedAlert) {
                await loadAssignments(selectedAlert.numeric_id || selectedAlert.id);
                await fetchLiveAlerts();
            }
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Failed to unassign responder';
            addToast(msg, 'error');
        }
    };

    // Track new alerts for popup
    useEffect(() => {
        if (!liveAlerts || liveAlerts.length === 0) return;

        if (isInitialLoad.current) {
            isInitialLoad.current = false;
            prevAlertsRef.current = liveAlerts;
            return;
        }

        const prevIds = new Set(prevAlertsRef.current.map(a => a.id));
        const newlyAdded = liveAlerts.filter(a => !prevIds.has(a.id));

        if (newlyAdded.length > 0) {
            // Pick the highest severity new alert, or just the first one
            const criticals = newlyAdded.filter(a => a.severity === 'Critical' || a.severity === 'High');
            const alertToShow = criticals.length > 0 ? criticals[0] : newlyAdded[0];
            
            setNewEmergencyPopup(alertToShow);
            
            // Auto-close after 8 seconds
            const timer = setTimeout(() => setNewEmergencyPopup(null), 8000);
            prevAlertsRef.current = liveAlerts;
            return () => clearTimeout(timer);
        }

        prevAlertsRef.current = liveAlerts;
    }, [liveAlerts]);

    // Initial load + 15-second polling for live updates
    useEffect(() => {
        const load = async () => { setLoading(true); await fetchLiveAlerts(); setLoading(false); };
        load();
        const interval = setInterval(fetchLiveAlerts, 15000);
        return () => clearInterval(interval);
    }, []);

    // Select alert based on incoming query param (?id=...) or auto-select first alert
    useEffect(() => {
        if (!alerts || alerts.length === 0) return;

        if (queryIncidentId) {
            const cleanQuery = String(queryIncidentId).trim().replace(/^AL-/i, '');
            const matched = alerts.find(a => 
                String(a.id) === queryIncidentId ||
                String(a.numeric_id) === cleanQuery ||
                String(a.id).replace(/^AL-/i, '') === cleanQuery
            );
            if (matched) {
                setSelectedAlert(matched);
                return;
            }
        }

        if (!selectedAlert) {
            setSelectedAlert(alerts[0]);
        }
    }, [alerts, queryIncidentId]);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            setIsLoading(true);
            // Convert display status back to DB enum
            const dbStatus = newStatus.toLowerCase();
            await api.updateAlertStatus(id, dbStatus);
            // Update selected alert if it's the one being changed
            setSelectedAlert(prev => prev && (prev.id === id)
                ? { ...prev, status: newStatus }
                : prev);
        } catch (e) {
            addToast('Failed to update alert', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredAlerts = useMemo(() => {
        return alerts.filter(alert => {
            if (filterType !== 'All' && alert.type !== filterType) return false;
            return true;
        });
    }, [filterType, alerts]);

    const handleBroadcast = async (data) => {
        try {
            await addAlert({
                type: data.type,
                location: data.location,
                description: data.description,
                severity: data.severity,
            });
            addToast('Alert broadcast successfully', 'success');
        } catch {
            addToast('Failed to broadcast alert', 'error');
        }
    };

    return (
        <div className="flex h-screen w-full bg-[#0B1220] text-gray-200 font-inter">
            <Sidebar />
            <TopNavbar />

            <main
                className={`flex-1 overflow-x-hidden overflow-y-auto transition-all duration-300 ${isSidebarOpen ? 'ml-sidebar-open' : 'ml-sidebar-closed'}`}
                style={{
                    marginTop: SZ.navbarH,
                    height: `calc(100vh - ${SZ.navbarH}px)`,
                }}
            >
                <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">

                    {/* Unified Executive Header */}
                    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-white/10">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5 text-teal-600 dark:text-[#00FFCC]">
                                <Shield size={16} />
                                <span className="text-xs font-mono font-bold tracking-wider uppercase">Live Emergency Feed</span>
                            </div>
                            <h1 className="font-poppins text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Emergency Alerts
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time incident dispatch, severity assessment, and multi-unit coordination</p>
                        </div>
                        
                        <div className="flex items-center gap-2.5">
                            <button 
                                onClick={() => addToast('Exporting incident logs...', 'info')}
                                className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 text-xs font-semibold shadow-xs transition-all"
                            >
                                Export Logs
                            </button>
                            <button 
                                onClick={() => setIsBroadcastOpen(true)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all"
                            >
                                <Radio size={15} /> Send Alert
                            </button>
                        </div>
                    </div>

                    {/* Unified KPI Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard label="Total Alerts" value={alerts.length} icon={Bell} color="#0D9488" sub="Live Database Feed" />
                        <StatCard label="Critical Disasters" value={alerts.filter(a => a.severity === 'Critical').length} icon={ShieldAlert} color="#dc2626" sub="Urgent Response" />
                        <StatCard label="Units Responding" value={alerts.filter(a => a.status === 'Responding').length} icon={Truck} color="#2563eb" sub={`${liveResponders?.length || 0} GPS Units Online`} />
                        <StatCard label="Resolved" value={alerts.filter(a => a.status === 'Resolved').length} icon={CheckCircle2} color="#16a34a" sub="Mission Restored" />
                    </div>

                    {/* ── GLOBAL MAP ── */}
                    <div className="w-full h-80 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl overflow-hidden mb-6 relative shadow-xs">
                        <AlertsMapView 
                            alerts={filteredAlerts} 
                            onMarkerClick={(alert) => {
                                setSelectedAlert(alert);
                                setSearchParams({ id: alert.numeric_id || alert.id }, { replace: true });
                            }} 
                        />
                    </div>

                    {/* ── MAIN WORKSPACE ── */}
                    <div className="flex flex-col lg:flex-row gap-6 min-h-[500px] lg:h-[600px]">
                        
                        {/* LEFT: INCIDENT LIST */}
                        <div className="w-full lg:w-1/3 flex flex-col bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl shadow-xs overflow-hidden h-[380px] lg:h-full">
                            <div className="p-4 border-b border-slate-200 dark:border-[#1F2937] bg-slate-50/70 dark:bg-[#0B1220]/50">
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                                    <Satellite size={16} className="text-teal-500" />
                                    Ongoing Emergencies
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {/* value must match the canonical `incident.type` strings coming back
                                        from the backend (see src/lib/incidentTypes.js) — the old chips
                                        ('Medical', 'Accident') never matched real data ('Medical Emergency',
                                        'Road Accident'), so those filters silently returned zero results. */}
                                    {[
                                        { label: 'All', value: 'All' },
                                        { label: 'Fire', value: 'Fire' },
                                        { label: 'Flood', value: 'Flood' },
                                        { label: 'Medical', value: 'Medical Emergency' },
                                        { label: 'Accident', value: 'Road Accident' },
                                    ].map(({ label, value: v }) => (
                                        <button
                                            key={v}
                                            onClick={() => setFilterType(v)}
                                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${filterType === v ? 'bg-teal-600 text-white dark:bg-teal-500/20 dark:text-[#00FFCC] shadow-xs' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-white/20 gap-3">
                                        <Loader2 size={24} className="animate-spin text-teal-600 dark:text-teal-400" />
                                        <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-white/40">Loading incidents...</p>
                                    </div>
                                ) : filteredAlerts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-white/10 gap-3">
                                        <Bell size={24} className="opacity-40 text-slate-400" />
                                        <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-white/30">No alerts found</p>
                                    </div>
                                ) : (
                                    filteredAlerts.map((alert, idx) => (
                                        <div 
                                            key={alert.id}
                                            onClick={() => {
                                                setSelectedAlert(alert);
                                                setSearchParams({ id: alert.numeric_id || alert.id }, { replace: true });
                                            }}
                                            className={`
                                                p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 relative
                                                ${selectedAlert?.id === alert.id 
                                                    ? 'bg-teal-50/90 dark:bg-teal-500/15 border-teal-500 dark:border-teal-400/50 shadow-sm ring-1 ring-teal-500/20' 
                                                    : 'bg-white dark:bg-[#0B1220] border-slate-200 dark:border-[#1F2937] hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-xs'}
                                            `}
                                        >
                                            <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-white dark:border-[#1F2937] shadow-sm" style={{ backgroundColor: alert.color, color: '#fff' }}>
                                                {idx + 1}
                                            </div>
                                            <div className={`p-2 rounded-lg border flex-shrink-0 ${
                                                selectedAlert?.id === alert.id 
                                                    ? 'bg-teal-100/70 dark:bg-[#111827] border-teal-300 dark:border-teal-500/30 text-teal-700 dark:text-teal-400' 
                                                    : 'bg-slate-100 dark:bg-[#111827] border-slate-200 dark:border-[#1F2937] text-slate-600 dark:text-gray-400'
                                            }`}>
                                                {alert.Icon && <alert.Icon size={16} />}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {alert.is_major_disaster && (
                                                            <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-600/30 border border-red-300 dark:border-red-500/50 px-1.5 py-0.5 rounded animate-pulse" title="Automatic escalation: 3+ reports within 2km radius">
                                                                <ShieldAlert size={10} className="text-red-600 dark:text-red-400" /> MAJOR DISASTER
                                                            </span>
                                                        )}
                                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                                            isCriticalSeverity(alert.severity) ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20' :
                                                            alert.severity === 'Medium' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' : 
                                                            'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                                                        }`}>
                                                            {alert.severity}
                                                        </span>
                                                        {alert.image_url && (
                                                            <span className="flex items-center gap-0.5 text-[9px] font-mono text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 border border-teal-300 dark:border-teal-500/30 px-1.5 py-0.5 rounded" title="Visual evidence attached">
                                                                <Camera size={10} /> PHOTO
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-mono text-slate-500 dark:text-gray-400">{alert.time}</span>
                                                </div>
                                                <h4 className="font-poppins font-semibold text-sm text-slate-900 dark:text-white truncate">{alert.title}</h4>
                                                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-gray-400 truncate">
                                                    <MapPin size={12} className="text-slate-400 dark:text-gray-500 flex-shrink-0" />
                                                    <span className="truncate">{alert.location}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* RIGHT: TACTICAL DETAIL */}
                        <div className="w-full lg:w-2/3 flex flex-col bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl shadow-xs overflow-hidden min-h-[420px] lg:h-full">
                            {selectedAlert ? (
                                <>
                                    {/* Detail Header */}
                                    <div className="p-6 md:p-8 border-b border-slate-200 dark:border-[#1F2937] bg-slate-50/70 dark:bg-[#0B1220]/50">
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-100 dark:bg-[#1F2937] border border-slate-200 dark:border-[#374151] rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400 flex-shrink-0">
                                                    <selectedAlert.Icon size={24} />
                                                </div>
                                                <div>
                                                    <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 tracking-wider mb-1 block">ID: {selectedAlert.id}</span>
                                                    <h2 className="font-poppins text-2xl font-bold text-slate-900 dark:text-gray-100">{selectedAlert.title}</h2>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {selectedAlert.is_major_disaster && (
                                                    <div className="px-3 py-1 rounded text-xs font-mono font-black uppercase bg-red-100 dark:bg-red-600/30 text-red-700 dark:text-red-200 border border-red-300 dark:border-red-500/60 animate-pulse flex items-center gap-1.5 shadow-sm">
                                                        <ShieldAlert size={14} className="text-red-600 dark:text-red-400" />
                                                        MAJOR DISASTER CLUSTER ({selectedAlert.cluster_count || 3}+ REPORTS)
                                                    </div>
                                                )}
                                                <div className={`px-3 py-1 rounded text-xs font-bold uppercase border ${
                                                    isCriticalSeverity(selectedAlert.severity) ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20' :
                                                    selectedAlert.severity === 'Medium' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' : 
                                                    'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                                                }`}>
                                                    {selectedAlert.severity}
                                                </div>
                                                <div className="px-3 py-1 bg-slate-100 dark:bg-[#1F2937] border border-slate-200 dark:border-transparent rounded text-xs font-semibold text-slate-700 dark:text-gray-300">
                                                    {selectedAlert.status}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                { l: 'Location', v: selectedAlert.location },
                                                { l: 'Time Reported', v: selectedAlert.time },
                                                { l: 'Coordinates', v: selectedAlert.coordinates || 'Not pinned' },
                                                { l: 'Resources', v: selectedAlert.resources },
                                            ].map((stat, i) => (
                                                <div key={i} className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2937] rounded-lg p-3 shadow-2xs">
                                                    <span className="block text-xs text-slate-500 dark:text-gray-400 font-semibold mb-1">{stat.l}</span>
                                                    <span className="block text-sm text-slate-900 dark:text-gray-200 font-medium truncate">{stat.v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Detail Body */}
                                    <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                                        <div className="mb-8">
                                            <h4 className="text-sm font-semibold text-slate-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                                                <Info size={16} className="text-teal-600 dark:text-teal-400"/> Description
                                            </h4>
                                            <div className="p-4 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2937] rounded-lg">
                                                <p className="text-slate-700 dark:text-gray-300 leading-relaxed text-sm">
                                                    {selectedAlert.description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* INCIDENT VISUAL EVIDENCE / TELEMETRY */}
                                        <div className="mb-8">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-semibold text-slate-800 dark:text-gray-200 flex items-center gap-2">
                                                    <Camera size={16} className="text-teal-600 dark:text-teal-400" /> Incident Visual Evidence & Telemetry
                                                    {selectedAlert.image_url && (
                                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 border border-teal-300 dark:border-teal-500/30 text-teal-700 dark:text-teal-400">
                                                            1 FILE ATTACHED
                                                        </span>
                                                    )}
                                                </h4>
                                            </div>

                                            {selectedAlert.image_url ? (
                                                <div className="p-4 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2937] rounded-lg">
                                                    <div className="relative group overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 max-w-md bg-black/40">
                                                        <img 
                                                            src={resolveImageUrl(selectedAlert.image_url)} 
                                                            alt={`Visual evidence for ${selectedAlert.title}`}
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.style.display = 'none';
                                                                const fallback = e.target.parentElement.querySelector('.img-fallback-msg');
                                                                if (fallback) fallback.style.display = 'flex';
                                                            }}
                                                            className="w-full h-56 object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                                                            onClick={() => setLightboxImage(resolveImageUrl(selectedAlert.image_url))}
                                                        />
                                                        <div className="img-fallback-msg hidden p-8 flex-col items-center justify-center text-center text-gray-400 font-mono text-xs">
                                                            <AlertTriangle size={24} className="text-amber-400 mb-2" />
                                                            <span>Visual file preview unavailable</span>
                                                        </div>
                                                        {/* Click to expand overlay */}
                                                        <div 
                                                            onClick={() => setLightboxImage(resolveImageUrl(selectedAlert.image_url))}
                                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-mono text-xs cursor-pointer"
                                                        >
                                                            <ZoomIn size={16} className="text-teal-400" />
                                                            <span>CLICK TO EXPAND HIGH-RES</span>
                                                        </div>
                                                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/80 border border-white/10 rounded text-[9px] font-mono text-teal-300">
                                                            EVIDENCE_STREAM // VERIFIED
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2937] rounded-lg">
                                                    <p className="text-slate-500 dark:text-gray-500 font-mono text-xs uppercase tracking-wider">
                                                        No visual telemetry or image attached to this incident report.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* ASSIGNED RESPONDERS SECTION */}
                                        <div className="mb-8">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-semibold text-slate-800 dark:text-gray-200 flex items-center gap-2">
                                                    <Truck size={16} className="text-teal-600 dark:text-teal-400" /> Assigned Units & Personnel
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/50">
                                                        {assignments.length}
                                                    </span>
                                                </h4>
                                                {user?.role === 'admin' && selectedAlert.status !== 'Resolved' && (
                                                    <button
                                                        onClick={() => setIsAssignModalOpen(true)}
                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                                                    >
                                                        <UserCheck size={13} /> + Assign Unit
                                                    </button>
                                                )}
                                            </div>

                                            {isLoadingAssignments ? (
                                                <div className="p-6 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2937] rounded-lg flex items-center justify-center gap-3 text-slate-500 dark:text-white/40">
                                                    <Loader2 size={16} className="animate-spin text-teal-600 dark:text-teal-500" />
                                                    <span className="font-mono text-xs uppercase tracking-widest">Loading units...</span>
                                                </div>
                                            ) : assignments.length === 0 ? (
                                                <div className="p-6 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2937] rounded-lg text-center">
                                                    <p className="font-mono text-xs text-slate-500 dark:text-white/40 uppercase tracking-widest mb-3">
                                                        No responders dispatched yet
                                                    </p>
                                                    {user?.role === 'admin' && selectedAlert.status !== 'Resolved' && (
                                                        <button
                                                            onClick={() => setIsAssignModalOpen(true)}
                                                            className="px-4 py-2 bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-600 border border-blue-200 dark:border-blue-500/40 text-blue-700 dark:text-blue-300 hover:text-white rounded text-xs font-semibold transition-all inline-flex items-center gap-2"
                                                        >
                                                            <UserCheck size={13} /> Dispatch Available Responder
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {assignments.map(a => {
                                                        const isMyAssignment = user?.user_id === a.responder?.user_id;
                                                        const statusColors = {
                                                            'Pending': 'bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/30',
                                                            'Accepted': 'bg-blue-100 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-500/30',
                                                            'EnRoute': 'bg-purple-100 dark:bg-purple-500/10 text-purple-800 dark:text-purple-400 border-purple-300 dark:border-purple-500/30',
                                                            'Arrived': 'bg-teal-100 dark:bg-teal-500/10 text-teal-800 dark:text-teal-400 border-teal-300 dark:border-teal-500/30',
                                                            'Completed': 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30',
                                                            'Rejected': 'bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-400 border-red-300 dark:border-red-500/30'
                                                        };
                                                        return (
                                                            <div key={a.assignment_id} className="p-4 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2937] rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                                <div className="flex items-start gap-3.5">
                                                                    <div className="w-9 h-9 rounded bg-slate-200 dark:bg-[#111827] border border-slate-300 dark:border-[#1F2937] flex items-center justify-center font-bold text-teal-700 dark:text-teal-400 text-xs flex-shrink-0">
                                                                        {a.responder?.name ? a.responder.name[0] : 'R'}
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="font-poppins font-bold text-sm text-slate-900 dark:text-gray-100">
                                                                                {a.responder?.name}
                                                                            </span>
                                                                            <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-slate-200/80 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-teal-700 dark:text-teal-400">
                                                                                {a.responder?.authority_type}
                                                                            </span>
                                                                            {isMyAssignment && (
                                                                                <span className="text-[8px] font-mono uppercase px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/40 font-bold">
                                                                                    YOU
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-gray-400 mt-1 font-mono">
                                                                            <span className="flex items-center gap-1">
                                                                                <Building2 size={11} className="text-slate-400 dark:text-gray-500" /> {a.organization?.name}
                                                                            </span>
                                                                            {a.responder?.phone_number && (
                                                                                <span className="flex items-center gap-1">
                                                                                    <Phone size={11} className="text-slate-400 dark:text-gray-500" /> {a.responder.phone_number}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3 justify-between md:justify-end flex-wrap">
                                                                    <span className={`px-2.5 py-1 rounded text-xs font-mono uppercase tracking-wider border font-bold ${statusColors[a.assignment_status] || 'bg-slate-100 dark:bg-gray-500/10 text-slate-600 dark:text-gray-400 border-slate-300 dark:border-gray-500/30'}`}>
                                                                        {a.assignment_status === 'EnRoute' ? 'En Route' : a.assignment_status}
                                                                    </span>

                                                                    {/* Responder status buttons */}
                                                                    {isMyAssignment && a.assignment_status !== 'Completed' && a.assignment_status !== 'Rejected' && (
                                                                        <div className="flex items-center gap-2">
                                                                            {a.assignment_status === 'Pending' && (
                                                                                <>
                                                                                    <button
                                                                                        onClick={() => handleUpdateAssignmentStatus(a.assignment_id, 'Accepted')}
                                                                                        disabled={updatingAssignmentId === a.assignment_id}
                                                                                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
                                                                                    >
                                                                                        Accept
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleUpdateAssignmentStatus(a.assignment_id, 'Rejected')}
                                                                                        disabled={updatingAssignmentId === a.assignment_id}
                                                                                        className="px-2.5 py-1 bg-red-100 dark:bg-red-600/20 hover:bg-red-600 text-red-700 dark:text-red-400 hover:text-white rounded text-xs font-semibold transition-colors disabled:opacity-50 border border-red-200 dark:border-transparent"
                                                                                    >
                                                                                        Reject
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                            {a.assignment_status === 'Accepted' && (
                                                                                <button
                                                                                    onClick={() => handleUpdateAssignmentStatus(a.assignment_id, 'EnRoute')}
                                                                                    disabled={updatingAssignmentId === a.assignment_id}
                                                                                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
                                                                                >
                                                                                    En Route →
                                                                                </button>
                                                                            )}
                                                                            {a.assignment_status === 'EnRoute' && (
                                                                                <button
                                                                                    onClick={() => handleUpdateAssignmentStatus(a.assignment_id, 'Arrived')}
                                                                                    disabled={updatingAssignmentId === a.assignment_id}
                                                                                    className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
                                                                                >
                                                                                    Mark Arrived 📍
                                                                                </button>
                                                                            )}
                                                                            {a.assignment_status === 'Arrived' && (
                                                                                <button
                                                                                    onClick={() => handleUpdateAssignmentStatus(a.assignment_id, 'Completed')}
                                                                                    disabled={updatingAssignmentId === a.assignment_id}
                                                                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
                                                                                >
                                                                                    Complete Mission ✓
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Admin actions */}
                                                                    {user?.role === 'admin' && (
                                                                        <button
                                                                            onClick={() => handleRemoveAssignment(a.assignment_id)}
                                                                            title="Unassign responder"
                                                                            className="p-1.5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded transition-colors"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* ALLOCATED RESOURCES SECTION */}
                                        <div className="mb-8">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-semibold text-slate-800 dark:text-gray-200 flex items-center gap-2">
                                                    <Package size={16} className="text-blue-500 dark:text-blue-400" /> Allocated Resources & Supplies
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/50">
                                                        {allocations.length}
                                                    </span>
                                                </h4>
                                                {user?.role === 'admin' && selectedAlert.status !== 'Resolved' && (
                                                    <button
                                                        onClick={() => setIsAllocateModalOpen(true)}
                                                        className="px-3 py-1 bg-teal-50 dark:bg-[#00FFCC]/10 hover:bg-teal-100 dark:hover:bg-[#00FFCC]/20 text-teal-700 dark:text-[#00FFCC] border border-teal-300 dark:border-[#00FFCC]/30 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                                                    >
                                                        <Package size={13} /> + Allocate Resource
                                                    </button>
                                                )}
                                            </div>

                                            {isLoadingAllocations ? (
                                                <div className="p-6 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2937] rounded-lg flex items-center justify-center gap-3 text-slate-500 dark:text-white/40">
                                                    <Loader2 size={16} className="animate-spin text-blue-500 dark:text-blue-400" />
                                                    <span className="font-mono text-xs uppercase tracking-widest">Loading allocated resources...</span>
                                                </div>
                                            ) : allocations.length === 0 ? (
                                                <div className="p-6 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2937] rounded-lg text-center">
                                                    <p className="font-mono text-xs text-slate-500 dark:text-white/40 uppercase tracking-widest mb-3">
                                                        No equipment or supplies allocated yet
                                                    </p>
                                                    {user?.role === 'admin' && selectedAlert.status !== 'Resolved' && (
                                                        <button
                                                            onClick={() => setIsAllocateModalOpen(true)}
                                                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-50 dark:bg-[#00FFCC]/10 border border-teal-300 dark:border-[#00FFCC]/30 text-teal-700 dark:text-[#00FFCC] hover:bg-teal-100 dark:hover:bg-[#00FFCC]/20 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all"
                                                        >
                                                            <Package size={13} /> Allocate Equipment
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {allocations.map(item => {
                                                        const isReleased = item.status === 'Released' || item.released_at !== null;
                                                        const isReleasing = releasingAllocationId === item.allocation_id;

                                                        return (
                                                            <div 
                                                                key={item.allocation_id}
                                                                className={`p-3.5 bg-slate-50 dark:bg-[#0B1220] border rounded-lg transition-all ${
                                                                    isReleased ? 'border-slate-200 dark:border-[#1F2937] opacity-60' : 'border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/10'
                                                                }`}
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-9 h-9 rounded flex items-center justify-center ${
                                                                            isReleased ? 'bg-slate-200 dark:bg-white/5 text-slate-500 dark:text-gray-400' : 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                                                                        }`}>
                                                                            <Package size={18} />
                                                                        </div>
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                                                    {item.quantity_allocated} x {item.resource_type}
                                                                                </span>
                                                                                <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                                                                    isReleased 
                                                                                        ? 'bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-400 border border-slate-300 dark:border-gray-700' 
                                                                                        : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20'
                                                                                }`}>
                                                                                    {isReleased ? 'Released' : 'Active'}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-xs text-slate-600 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                                                                                <Building2 size={12} className="text-slate-400 dark:text-gray-500" />
                                                                                {item.center_name}
                                                                            </p>
                                                                            <span className="text-[10px] font-mono text-slate-500 dark:text-gray-500 block mt-1">
                                                                                Allocated {item.allocated_at ? new Date(item.allocated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                                                {isReleased && item.released_at && ` • Released ${new Date(item.released_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {user?.role === 'admin' && !isReleased && (
                                                                        <button
                                                                            onClick={() => handleReleaseAllocation(item.allocation_id, item.resource_type, item.quantity_allocated)}
                                                                            disabled={isReleasing}
                                                                            title="Release resources and restore inventory stock"
                                                                            className="px-2.5 py-1 bg-amber-100 dark:bg-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                                                        >
                                                                            {isReleasing ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                                                            Release Stock
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                                                <Clock size={16} className="text-teal-600 dark:text-teal-400"/> Timeline
                                            </h4>
                                            <div className="space-y-4">
                                                <div className="flex gap-4">
                                                    <div className="w-px bg-slate-300 dark:bg-[#374151] mt-2 relative">
                                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-teal-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800 dark:text-gray-200">Alert Registered</p>
                                                        <p className="text-xs text-slate-500 dark:text-gray-500">{selectedAlert.timestamp}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detail Actions */}
                                    {['admin', 'responder'].includes(user?.role) ? (
                                        <div className="p-4 bg-slate-50/70 dark:bg-[#0B1220] border-t border-slate-200 dark:border-[#1F2937] flex gap-3 flex-wrap">
                                            {selectedAlert.status !== 'Responding' && selectedAlert.status !== 'Resolved' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(selectedAlert.id, 'Responding')}
                                                    disabled={isLoading}
                                                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition-colors disabled:opacity-50"
                                                >
                                                    Mark Responding
                                                </button>
                                            )}
                                            {selectedAlert.status === 'Responding' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(selectedAlert.id, 'Resolved')}
                                                    disabled={isLoading}
                                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-semibold transition-colors disabled:opacity-50"
                                                >
                                                    Mark Resolved
                                                </button>
                                            )}
                                            {selectedAlert.status === 'Resolved' && (
                                                <div className="flex-1 py-2 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-500 bg-emerald-100 dark:bg-emerald-500/10 rounded border border-emerald-300 dark:border-emerald-500/20">
                                                    ✓ Resolved
                                                </div>
                                            )}
                                            {selectedAlert.status !== 'Resolved' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(selectedAlert.id, 'Resolved')}
                                                    className="px-6 py-2 bg-slate-200 dark:bg-[#1F2937] hover:bg-slate-300 dark:hover:bg-[#374151] text-slate-800 dark:text-white rounded text-sm font-semibold transition-colors border border-slate-300 dark:border-transparent"
                                                >
                                                    Force Resolve
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-slate-50/70 dark:bg-[#0B1220] border-t border-slate-200 dark:border-[#1F2937] flex items-center justify-between text-xs font-mono">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600 dark:text-gray-400">INCIDENT STATUS:</span>
                                                <span className={`font-semibold ${selectedAlert.status === 'Resolved' ? 'text-emerald-700 dark:text-emerald-400' : selectedAlert.status === 'Responding' ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                                    {selectedAlert.status?.toUpperCase() || 'REPORTED'}
                                                </span>
                                            </div>
                                            <span className="text-slate-500 dark:text-gray-500 text-[10px]">Updates authorized by dispatch teams</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 dark:text-gray-500">
                                    <Satellite size={48} className="mb-4 opacity-40 text-slate-400 dark:text-gray-500" />
                                    <p className="text-sm font-medium text-slate-600 dark:text-gray-400">Select an alert to view details</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </main>

            <BroadcastModal 
                isOpen={isBroadcastOpen} 
                onClose={() => setIsBroadcastOpen(false)}
                onBroadcast={handleBroadcast}
            />

            <NewEmergencyModal 
                alert={newEmergencyPopup} 
                onClose={() => setNewEmergencyPopup(null)} 
            />

            <AssignResponderModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                incident={selectedAlert}
                onAssigned={() => {
                    if (selectedAlert) loadAssignments(selectedAlert.numeric_id || selectedAlert.id);
                    fetchLiveAlerts();
                }}
                addToast={addToast}
            />

            <AllocateResourceModal
                isOpen={isAllocateModalOpen}
                onClose={() => setIsAllocateModalOpen(false)}
                incident={selectedAlert}
                onAllocated={() => {
                    if (selectedAlert) {
                        loadAllocations(selectedAlert.numeric_id || selectedAlert.id);
                    }
                    if (typeof fetchResources === 'function') fetchResources();
                    fetchLiveAlerts();
                }}
            />

            {/* LIGHTBOX MODAL FOR VISUAL EVIDENCE */}
            {lightboxImage && (
                <div 
                    className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 transition-opacity"
                    onClick={() => setLightboxImage(null)}
                >
                    <div 
                        className="relative max-w-4xl w-full max-h-[90vh] bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-[#1F2937] bg-[#0B1220] flex items-center justify-between">
                            <div className="flex items-center gap-2 text-teal-400 font-mono text-xs tracking-wider">
                                <Camera size={14} />
                                <span>INCIDENT_TELEMETRY // {selectedAlert?.id}</span>
                            </div>
                            <button 
                                onClick={() => setLightboxImage(null)}
                                className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-2 sm:p-4 overflow-auto flex items-center justify-center bg-black/60 max-h-[70vh]">
                            <img 
                                src={lightboxImage} 
                                alt="High-resolution evidence" 
                                className="max-w-full max-h-[68vh] object-contain rounded"
                            />
                        </div>
                        <div className="p-3 border-t border-[#1F2937] bg-[#0B1220] flex items-center justify-between text-[11px] font-mono text-gray-400">
                            <span className="truncate mr-4">{selectedAlert?.title} • {selectedAlert?.location}</span>
                            <a 
                                href={lightboxImage} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-teal-400 hover:underline flex items-center gap-1 flex-shrink-0"
                            >
                                Open Original <ExternalLink size={11} />
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Alerts() {
    return (
        <ErrorBoundary>
            <AlertsContent />
        </ErrorBoundary>
    );
}
