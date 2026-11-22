import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import { SZ } from '../constants';
import * as api from '../api/index.js';
import { captureBestEffortLocation } from '../lib/geolocation';
import {
    Search, Plus, Package, MapPin, Database, Hospital,
    AlertCircle, CheckCircle2, ChevronRight, Pill,
    Truck, Navigation, Clock, Activity, Send, HeartPulse, Wrench, Shield, Globe, Zap,
    RotateCcw, Loader2
} from 'lucide-react';
import AllocateResourceModal from '../components/AllocateResourceModal';

function Toast({ message, type }) {
    const bg = type === 'error' ? 'rgba(239, 68, 68, 0.1)' : type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 240, 255, 0.1)';
    const border = type === 'error' ? 'rgba(239, 68, 68, 0.2)' : type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 240, 255, 0.2)';
    const textColor = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#00F0FF';
    
    return (
      <div className="font-mono px-6 py-4 backdrop-blur-3xl border text-[10px] font-bold tracking-[0.2em] uppercase"
           style={{background: bg, borderColor: border, color: textColor}}>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{backgroundColor: textColor}} />
          {message}
        </div>
      </div>
    );
}

function ToastContainer({ toasts }) {
    return (
        <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-4 pointer-events-none">
            {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} />)}
        </div>
    );
}

// MiniMap visual for Hospital cards
const MiniMap = ({ isFull, isNear, name, lat, lng }) => {
    const colorClass = isFull ? "text-red-500 border-red-500" : isNear ? "text-yellow-500 border-yellow-500" : "text-[#00FFCC] border-[#00FFCC]";
    const bgColor = isFull ? "bg-red-500" : isNear ? "bg-yellow-500" : "bg-[#00FFCC]";
    const pulseColor = isFull ? "border-red-500" : isNear ? "border-yellow-500" : "border-[#00FFCC]";
    const strokeHex = isFull ? "#ef4444" : isNear ? "#eab308" : "#00FFCC";

    const mapSrc = (lat && lng) ? `https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed` : null;

    return (
        <div className="relative w-full h-24 bg-black/40 rounded-xl overflow-hidden border border-white/5 mb-5 flex items-center justify-center">
            {mapSrc ? (
                <iframe 
                    src={mapSrc} 
                    className="absolute inset-0 w-full h-full opacity-80 pointer-events-none"
                    style={{ border: 0 }} 
                    allowFullScreen="" 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                />
            ) : (
                <>
                    {/* Map Grid/Topography Mock */}
                    <svg viewBox="0 0 100 40" className="absolute w-full h-full opacity-20" preserveAspectRatio="none">
                        <path d="M0,20 Q15,5 25,20 T50,20 T75,5 T100,20" fill="none" stroke={strokeHex} strokeWidth="0.8" />
                        <path d="M-10,30 Q10,15 25,30 T50,30 T75,15 T110,30" fill="none" stroke={strokeHex} strokeWidth="0.4" />
                        <path d="M0,10 Q25,-5 50,10 T100,10" fill="none" stroke={strokeHex} strokeWidth="0.3" strokeDasharray="2 2" />
                        <line x1="30" y1="0" x2="30" y2="40" stroke={strokeHex} strokeWidth="0.5" strokeDasharray="1 2" />
                        <line x1="70" y1="0" x2="70" y2="40" stroke={strokeHex} strokeWidth="0.5" strokeDasharray="1 2" />
                    </svg>

                    {/* Pulsating Map Pin (Red if full) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className={`w-3 h-3 rounded-full ${bgColor} shadow-[0_0_8px_currentColor] ${colorClass}`} />
                        <div className={`absolute -inset-2 rounded-full border ${pulseColor} animate-ping opacity-60`} style={{ animationDuration: '1.5s' }} />
                    </div>
                </>
            )}

            {/* Label Overlay */}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-white/5 z-10 pointer-events-none">
                <span className="font-mono text-[8px] font-bold tracking-[0.2em] text-white/40 uppercase">
                    Location Data
                </span>
            </div>
        </div>
    );
};

export default function ResourceInventory() {
    const { toasts, isSidebarOpen, userLocation, captureLocation, user } = useDashboard();
    const ml = isSidebarOpen ? SZ.sidebarOpen : SZ.sidebarClosed;
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Citizen/victim only sees the hospitals tab
    const isCivilian = !user?.role || user.role === 'citizen' || user.role === 'Civilian / Victim';
    const [activeTab, setActiveTab] = useState(isCivilian ? 'hospitals' : 'supplies');

    useEffect(() => {
        const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Supplies State (Live MySQL)
    const [resources, setResources] = useState([]);
    const [loadingResources, setLoadingResources] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: 'units', location: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Live Allocations & Dispatches State
    const [allocations, setAllocations] = useState([]);
    const [allocationFilter, setAllocationFilter] = useState('all'); // all | active | released
    const [loadingAllocations, setLoadingAllocations] = useState(false);
    const [releasingAllocationId, setReleasingAllocationId] = useState(null);
    const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
    const [selectedResourceForModal, setSelectedResourceForModal] = useState(null);

    const loadResources = async () => {
        try {
            setLoadingResources(true);
            const { data } = await api.fetchResources();
            if (Array.isArray(data)) {
                setResources(data.map(r => ({
                    id: r.resource_id,
                    resource_id: r.resource_id,
                    name: r.resource_type || r.name,
                    resource_type: r.resource_type,
                    quantity: r.quantity_available !== undefined ? r.quantity_available : (r.quantity || 0),
                    quantity_available: r.quantity_available !== undefined ? r.quantity_available : (r.quantity || 0),
                    deployed: r.deployed || 0,
                    total: (r.quantity_available || 0) + (r.deployed || 0),
                    unit: 'units',
                    location: r.center_name || r.address || 'Facility',
                    center_name: r.center_name,
                    raw: r
                })));
            }
        } catch (err) {
            console.error('Failed to load resources from backend:', err);
        } finally {
            setLoadingResources(false);
        }
    };

    const loadAllocations = async () => {
        try {
            setLoadingAllocations(true);
            const params = allocationFilter !== 'all' ? { status: allocationFilter } : {};
            const { data } = await api.fetchAllocations(params);
            setAllocations(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load allocations:', err);
        } finally {
            setLoadingAllocations(false);
        }
    };

    useEffect(() => {
        loadResources();
    }, []);

    useEffect(() => {
        loadAllocations();
    }, [allocationFilter]);

    const handleReleaseDispatch = async (allocationId, resourceType, qty) => {
        if (!window.confirm(`Release ${qty} x ${resourceType} back to inventory stock?`)) return;
        try {
            setReleasingAllocationId(allocationId);
            await api.releaseAllocation(allocationId);
            if (typeof toasts === 'object') {
                // Toast notification
            }
            await Promise.all([loadResources(), loadAllocations()]);
        } catch (err) {
            console.error('Failed to release allocation:', err);
            alert(err.response?.data?.error || err.message || 'Failed to release allocation.');
        } finally {
            setReleasingAllocationId(null);
        }
    };

    // ── DYNAMIC NEARBY CENTERS ───────────────────────────────────
    const [hospitals, setHospitals] = useState([]);
    const [hospitalSearch, setHospitalSearch] = useState('');
    const [locationStatus, setLocationStatus] = useState('idle'); // idle|loading|success|error|denied
    const [userCoords, setUserCoords] = useState(null);
    const [locationError, setLocationError] = useState('');
    const [radiusKm, setRadiusKm] = useState(25);
    const [centerTypeFilter, setCenterTypeFilter] = useState('');

    const fetchNearbyCenters = async (lat, lng, radius, type) => {
        setLocationStatus('loading');
        try {
            const r = radius !== undefined ? radius : radiusKm;
            const t = type !== undefined ? type : centerTypeFilter;
            // Goes through the shared axios client (src/api/index.js) instead of a
            // raw fetch() to a hardcoded 'localhost:5001' — that hardcoded URL
            // meant this feature broke the moment the app ran anywhere other than
            // the original dev machine.
            const { data } = await api.fetchNearbyResources({ lat, lng, radius: r, ...(t ? { type: t } : {}) });
            setHospitals(data);
            setLocationStatus('success');
        } catch (err) {
            setLocationError(err.response?.data?.error || err.message || 'Failed to fetch nearby centers');
            setLocationStatus('error');
        }
    };

    const requestLocation = async () => {
        setLocationStatus('loading');
        setLocationError('');
        try {
            // Falls back to an approximate IP-based location if precise GPS is
            // denied/unavailable/times out, instead of just failing outright.
            const loc = await captureBestEffortLocation();
            setUserCoords(loc);
            if (loc.approx) {
                setLocationError('Using an approximate location (precise GPS unavailable) — results may not be exact.');
            }
            fetchNearbyCenters(loc.lat, loc.lng, radiusKm, centerTypeFilter);
        } catch (err) {
            setLocationError(err.message || 'Unable to retrieve your location.');
            setLocationStatus('denied');
        }
    };

    useEffect(() => {
        if (userCoords) fetchNearbyCenters(userCoords.lat, userCoords.lng, radiusKm, centerTypeFilter);
    }, [radiusKm, centerTypeFilter]);

    // Auto-fetch on mount if we already have the user's location from login
    useEffect(() => {
        if (userLocation && locationStatus === 'idle') {
            setUserCoords(userLocation);
            fetchNearbyCenters(userLocation.lat, userLocation.lng, radiusKm, centerTypeFilter);
        }
    }, [userLocation]);

    // Fleet & Logistics State
    const [fleet] = useState([
        { id: 1, unit: 'AMB-01', type: 'Ambulance', status: 'En Route', location: 'Sector B - Evac', eta: '5 mins' },
        { id: 2, unit: 'TRK-05', type: 'Supply Truck', status: 'Available', location: 'Main Warehouse', eta: '-' },
        { id: 3, unit: 'HELI-A', type: 'Air Support', status: 'Deployed', location: 'North Mountains', eta: 'Arrived' },
        { id: 4, unit: 'AMB-02', type: 'Ambulance', status: 'Maintenance', location: 'City Garage', eta: '-' },
        { id: 5, unit: 'TRK-08', type: 'Command Vehicle', status: 'Available', location: 'HQ Base', eta: '-' },
    ]);
    const [fleetSearch, setFleetSearch] = useState('');

    // Recent Dispatches
    const [dispatches] = useState([
        { id: 101, item: 'Medical Kits', qty: 50, to: 'St. Jude Emergency', time: '10 mins ago', status: 'In Transit' },
        { id: 102, item: 'Bottled Water', qty: 200, to: 'Sector B Evac', time: '25 mins ago', status: 'Delivered' },
        { id: 103, item: 'Blankets', qty: 100, to: 'Field Care Unit A', time: '1 hour ago', status: 'Delivered' },
        { id: 104, item: 'Emergency Rations', qty: 500, to: 'Camp B Supply', time: '2 hours ago', status: 'Delivered' },
    ]);

    const handleAddStock = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setTimeout(() => {
            const addedItem = {
                id: Date.now(),
                name: newItem.name,
                quantity: Number(newItem.quantity),
                unit: newItem.unit,
                location: newItem.location
            };
            setResources([...resources, addedItem]);
            setIsSubmitting(false);
            setIsSpaceModalOpen(false);
            setNewItem({ name: '', quantity: '', unit: 'kg', location: '' });
        }, 600);
    };

    const filteredResources = resources.filter(res => res.name.toLowerCase().includes(searchQuery.toLowerCase()) || res.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredHospitals = hospitals.filter(h => h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) || (h.center_type || '').toLowerCase().includes(hospitalSearch.toLowerCase()));
    const filteredFleet = fleet.filter(f => f.unit.toLowerCase().includes(fleetSearch.toLowerCase()) || f.type.toLowerCase().includes(fleetSearch.toLowerCase()) || f.status.toLowerCase().includes(fleetSearch.toLowerCase()));

    const getFleetIcon = (type) => {
        switch (type) {
            case 'Ambulance': return <HeartPulse className="w-5 h-5" />;
            case 'Supply Truck': return <Truck className="w-5 h-5" />;
            case 'Air Support': return <Navigation className="w-5 h-5" />;
            default: return <Activity className="w-5 h-5" />;
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-slate-100 dark:bg-[#08080A] text-slate-900 dark:text-[#E5E5E7] font-inter">
            
            {/* ── AMBIENT MESH BACKGROUND ── */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div 
                  className="absolute w-[1000px] h-[1000px] rounded-full blur-[200px] opacity-[0.05] bg-blue-600 transition-transform duration-1000 ease-out"
                  style={{ transform: `translate(${mousePos.x - 500}px, ${mousePos.y - 500}px)` }}
                />
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full blur-[180px] opacity-[0.03] bg-cyan-500 animate-pulse" />
                <div className="absolute inset-0 opacity-[0.02] contrast-150 brightness-150 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            <Sidebar />
            <TopNavbar />

            <main
                className={`flex-1 overflow-x-hidden overflow-y-auto transition-all duration-500 relative z-10 custom-scrollbar ${isSidebarOpen ? 'ml-sidebar-open' : 'ml-sidebar-closed'}`}
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
                                <Package size={16} />
                                <span className="text-xs font-mono font-bold tracking-wider uppercase">Supply Chain & Logistics</span>
                            </div>
                            <h1 className="font-poppins text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Resource Hub
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Inventory monitoring, medical supply distribution, and emergency fleet logistics</p>
                        </div>
                        
                        {!isCivilian && activeTab === 'supplies' && (
                            <div className="flex items-center gap-2.5 flex-wrap">
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={() => {
                                            setSelectedResourceForModal(null);
                                            setIsAllocateModalOpen(true);
                                        }}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-all"
                                    >
                                        <Package className="w-4 h-4" /> Allocate Resource
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsSpaceModalOpen(true)}
                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-all"
                                >
                                    <Plus className="w-4 h-4" /> Add Stock
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Unified Tab Capsule Bar */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800/60 rounded-xl border border-slate-300/60 dark:border-white/10 w-fit mb-6">
                        {[
                            !isCivilian && { id: 'supplies', label: 'STOCK OVERVIEW',    icon: Package },
                                           { id: 'hospitals', label: 'NEAREST FACILITIES', icon: Hospital },
                            !isCivilian && { id: 'fleet',    label: 'LOGISTICS FLEET',   icon: Truck },
                        ].filter(Boolean).map((tab) => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                                        isActive 
                                            ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-[#00FFCC] shadow-xs' 
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Area - Supplies */}
                    {activeTab === 'supplies' && (
                        <div className="grid grid-cols-12 gap-8 animate-slide-up">

                            {/* Left: Inventory Table */}
                            <div className="col-span-12 lg:col-span-8 space-y-6">
                                <div className="relative group">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-white/20 group-focus-within:text-teal-600 dark:group-focus-within:text-[#00FFCC] transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="SEARCH INVENTORY..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-16 py-4 font-mono text-xs tracking-wider focus:outline-none focus:border-teal-500/50 dark:focus:border-[#00FFCC]/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 uppercase shadow-xs"
                                    />
                                </div>

                                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl shadow-xs overflow-hidden overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-white/5 font-mono text-slate-500 dark:text-white/40 text-[10px] tracking-[0.3em] uppercase bg-slate-50/70 dark:bg-white/[0.01]">
                                                <th className="px-6 py-4 font-semibold">ITEM_NAME / ID</th>
                                                <th className="px-6 py-4 font-semibold">QUANTITY</th>
                                                <th className="px-6 py-4 font-semibold">LOCATION</th>
                                                <th className="px-6 py-4 font-semibold text-right">STATUS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredResources.length > 0 ? filteredResources.map((item) => (
                                                <tr key={item.id} className="border-b border-slate-100 dark:border-white/[0.02] hover:bg-slate-50/80 dark:hover:bg-white/[0.04] transition-all cursor-pointer group">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg flex items-center justify-center text-teal-600 dark:text-[#00FFCC] group-hover:border-teal-500/40 transition-all">
                                                                <Package className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex flex-col leading-tight">
                                                                <span className="font-outfit font-black text-base text-slate-900 dark:text-white uppercase tracking-tight">{item.name}</span>
                                                                <span className="font-mono text-[9px] text-slate-400 dark:text-white/30 uppercase tracking-widest mt-0.5">ID: {item.id}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 font-mono">
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="font-outfit font-black text-2xl text-slate-900 dark:text-white tracking-tight">{item.quantity.toLocaleString()}</span>
                                                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">
                                                                {item.unit}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-2.5 text-slate-600 dark:text-white/60">
                                                            <MapPin className="w-4 h-4 text-teal-600 dark:text-[#00FFCC]" />
                                                            <span className="font-mono text-xs uppercase tracking-wider truncate max-w-[180px]">{item.location}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className="flex items-center justify-end gap-3">
                                                            {item.quantity > 0 ? (
                                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 rounded-md font-mono text-[10px] font-bold tracking-wider uppercase">
                                                                    <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" /> {item.quantity} Avail
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-md font-mono text-[10px] font-bold tracking-wider uppercase">
                                                                    <AlertCircle className="w-3.5 h-3.5" /> Depleted
                                                                </span>
                                                            )}
                                                            {user?.role === 'admin' && item.quantity > 0 && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedResourceForModal(item.raw || item);
                                                                        setIsAllocateModalOpen(true);
                                                                    }}
                                                                    className="px-3 py-1.5 bg-teal-50 dark:bg-[#00FFCC]/10 hover:bg-teal-100 dark:hover:bg-[#00FFCC]/20 text-teal-700 dark:text-[#00FFCC] border border-teal-300 dark:border-[#00FFCC]/40 rounded-md font-mono text-[10px] font-bold tracking-wider uppercase transition-all"
                                                                >
                                                                    + ALLOCATE
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="4" className="px-8 py-20 text-center text-slate-400 dark:text-white/20 font-mono text-xs tracking-widest uppercase">
                                                        No supplies found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Right Panel: Recent Dispatches & Live Allocations */}
                            <div className="col-span-12 lg:col-span-4">
                                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl shadow-xs p-6 h-full">
                                    <div className="flex items-center justify-between gap-3 mb-6">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-2.5 h-2.5 bg-teal-500 dark:bg-[#00FFCC] rounded-full animate-pulse shadow-[0_0_8px_#00FFCC]" />
                                            <h3 className="font-outfit font-black text-lg tracking-tight text-slate-900 dark:text-white uppercase">Live Dispatches</h3>
                                        </div>
                                        {/* Filter pills */}
                                        <div className="flex gap-1 bg-slate-100 dark:bg-black/40 p-1 border border-slate-200 dark:border-white/10 rounded-lg">
                                            {['all', 'active', 'released'].map(f => (
                                                <button
                                                    key={f}
                                                    onClick={() => setAllocationFilter(f)}
                                                    className={`px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider transition-all rounded ${
                                                        allocationFilter === f ? 'bg-teal-600 dark:bg-[#00FFCC] text-white dark:text-black font-bold shadow-xs' : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                                >
                                                    {f}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {loadingAllocations ? (
                                        <div className="p-8 text-center text-slate-400 dark:text-white/40 font-mono text-xs flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-teal-600 dark:text-[#00FFCC]" />
                                            SYNCING DISPATCHES...
                                        </div>
                                    ) : allocations.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 dark:text-white/20 font-mono text-xs uppercase tracking-widest">
                                            No {allocationFilter !== 'all' ? allocationFilter : ''} dispatches recorded
                                        </div>
                                    ) : (
                                        <div className="space-y-3.5 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                                            {allocations.map(dispatch => {
                                                const isReleased = dispatch.status === 'Released' || dispatch.released_at !== null;
                                                const isReleasing = releasingAllocationId === dispatch.allocation_id;

                                                return (
                                                    <div key={dispatch.allocation_id} className="relative pl-5 border-l-2 border-slate-200 dark:border-white/10 last:border-transparent">
                                                        <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${
                                                            isReleased ? 'bg-slate-400 dark:bg-gray-600' : 'bg-teal-500 dark:bg-[#00FFCC] shadow-[0_0_8px_#00FFCC]'
                                                        }`} />
                                                        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-teal-500/30 dark:hover:border-[#00FFCC]/30 rounded-lg transition-all p-4 space-y-2.5">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <span className="font-outfit font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                                                                    {dispatch.resource_type}
                                                                </span>
                                                                <span className="font-mono text-xs font-black text-teal-600 dark:text-[#00FFCC] tracking-wider">
                                                                    x{dispatch.quantity_allocated}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600 dark:text-white/70 uppercase tracking-wider truncate">
                                                                    <Globe className="w-3 h-3 text-blue-500 dark:text-blue-400 flex-shrink-0" /> 
                                                                    TO: {dispatch.incident_display_id} // {dispatch.incident_title}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500 dark:text-white/50 uppercase tracking-wider truncate">
                                                                    <MapPin className="w-3 h-3 text-teal-600 dark:text-teal-400 flex-shrink-0" /> 
                                                                    FROM: {dispatch.center_name}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider font-bold pt-2.5 border-t border-slate-200 dark:border-white/[0.04]">
                                                                <span className="text-slate-400 dark:text-white/40 flex items-center gap-1.5">
                                                                    <Clock className="w-3 h-3" /> 
                                                                    {dispatch.allocated_at ? new Date(dispatch.allocated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                                </span>
                                                                <span className={isReleased ? "text-slate-400 dark:text-gray-500" : "text-teal-600 dark:text-[#00FFCC]"}>
                                                                    {isReleased ? "Released" : "Active"}
                                                                </span>
                                                            </div>
                                                            {user?.role === 'admin' && !isReleased && (
                                                                <button
                                                                    onClick={() => handleReleaseDispatch(dispatch.allocation_id, dispatch.resource_type, dispatch.quantity_allocated)}
                                                                    disabled={isReleasing}
                                                                    className="w-full mt-2 py-1.5 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 rounded text-[10px] font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                                                                >
                                                                    {isReleasing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
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
                            </div>
                        </div>
                    )}

                    {/* Content Area - Hospitals (Dynamic) */}
                    {activeTab === 'hospitals' && (
                        <div className="animate-slide-up">

                            {/* Controls Row */}
                            <div className="flex flex-wrap gap-4 mb-8 items-center">
                                <div className="relative group flex-1 min-w-[240px]">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/20 group-focus-within:text-teal-600 dark:group-focus-within:text-[#00FFCC] transition-colors" />
                                    <input type="text" placeholder="SEARCH FACILITIES..." value={hospitalSearch}
                                        onChange={(e) => setHospitalSearch(e.target.value)}
                                        className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-14 py-3.5 font-mono text-xs tracking-wider focus:outline-none focus:border-teal-500/50 dark:focus:border-[#00FFCC]/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 uppercase shadow-xs" />
                                </div>
                                <select value={centerTypeFilter} onChange={(e) => setCenterTypeFilter(e.target.value)}
                                    className="bg-white dark:bg-[#0E1015] border border-slate-300 dark:border-white/10 rounded-xl px-5 py-3.5 font-mono text-xs tracking-wider text-slate-700 dark:text-white/70 focus:outline-none focus:border-teal-500/50 uppercase cursor-pointer shadow-xs">
                                    <option value="" className="bg-white dark:bg-[#08080A] text-slate-900 dark:text-white">ALL TYPES</option>
                                    <option value="Hospital" className="bg-white dark:bg-[#08080A] text-slate-900 dark:text-white">HOSPITAL</option>
                                    <option value="FireStation" className="bg-white dark:bg-[#08080A] text-slate-900 dark:text-white">FIRE STATION</option>
                                    <option value="Police" className="bg-white dark:bg-[#08080A] text-slate-900 dark:text-white">POLICE</option>
                                    <option value="NGO" className="bg-white dark:bg-[#08080A] text-slate-900 dark:text-white">NGO</option>
                                </select>
                                <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}
                                    className="bg-white dark:bg-[#0E1015] border border-slate-300 dark:border-white/10 rounded-xl px-5 py-3.5 font-mono text-xs tracking-wider text-slate-700 dark:text-white/70 focus:outline-none focus:border-teal-500/50 uppercase cursor-pointer shadow-xs">
                                    <option value={5}  className="bg-white dark:bg-[#08080A] text-slate-900 dark:text-white">5 KM</option>
                                    <option value={10} className="bg-white dark:bg-[#08080A] text-slate-900 dark:text-white">10 KM</option>
                                    <option value={25} className="bg-white dark:bg-[#08080A] text-slate-900 dark:text-white">25 KM</option>
                                    <option value={50} className="bg-white dark:bg-[#08080A] text-slate-900 dark:text-white">50 KM</option>
                                </select>
                                <button onClick={requestLocation} disabled={locationStatus === 'loading'}
                                    className="flex items-center gap-2.5 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 dark:bg-[#00FFCC] dark:hover:bg-[#00FFCC]/90 text-white dark:text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 shadow-xs">
                                    <Navigation className="w-4 h-4" />
                                    {locationStatus === 'loading' ? 'SCANNING...' : locationStatus === 'success' ? 'REFRESH' : 'USE MY LOCATION'}
                                </button>
                            </div>

                            {/* Location Error */}
                            {locationError && (
                                <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0" />
                                    <p className="font-mono text-xs text-red-700 dark:text-red-400 uppercase">{locationError}</p>
                                </div>
                            )}

                            {/* Idle State */}
                            {locationStatus === 'idle' && (
                                <div className="py-24 flex flex-col items-center justify-center gap-6 text-center">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center shadow-xs">
                                        <MapPin className="w-7 h-7 text-teal-600 dark:text-white/40" />
                                    </div>
                                    <div>
                                        <p className="font-outfit font-black text-xl text-slate-800 dark:text-white/40 uppercase tracking-tight">Location Not Shared</p>
                                        <p className="font-mono text-xs text-slate-500 dark:text-white/20 mt-1">Click the button above to discover verified emergency facilities near you</p>
                                    </div>
                                </div>
                            )}

                            {/* Results */}
                            {(locationStatus === 'success' || locationStatus === 'loading') && (
                                <>
                                    {locationStatus === 'success' && userCoords && (
                                        <div className="mb-6 flex items-center gap-2.5">
                                            <div className="w-2 h-2 rounded-full bg-teal-500 dark:bg-[#00FFCC] animate-pulse" />
                                            <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-white/50 uppercase tracking-wider">
                                                {filteredHospitals.length} facilities within {radiusKm} km — {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredHospitals.length > 0 ? filteredHospitals.map(center => {
                                            const resources = Array.isArray(center.resources) ? center.resources.filter(r => r && r.resource_type) : [];
                                            const typeColor = center.center_type === 'Hospital' ? '#0d9488' : center.center_type === 'FireStation' ? '#ea580c' : center.center_type === 'Police' ? '#2563eb' : '#7c3aed';
                                            return (
                                                <div key={center.center_id} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl shadow-xs p-6 hover:border-teal-500/40 dark:hover:border-[#00FFCC]/20 transition-all relative overflow-hidden group">
                                                    
                                                    {/* Type + Distance Badge */}
                                                    <div className="flex justify-between items-start mb-5">
                                                        <span className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded-md border" style={{ borderColor: `${typeColor}40`, color: typeColor, background: `${typeColor}15` }}>
                                                            {center.center_type}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-500 dark:text-white/50 uppercase">
                                                            <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-[#00FFCC]" /> {center.distance_km} KM
                                                        </span>
                                                    </div>
                                                    
                                                    <MiniMap name={center.name} isFull={false} isNear={center.distance_km < 5} lat={center.latitude} lng={center.longitude} />

                                                    {/* Name */}
                                                    <div className="flex items-start gap-4 mb-6">
                                                        <div className="w-10 h-10 rounded-lg border flex-shrink-0 flex items-center justify-center bg-slate-50 dark:bg-transparent" style={{ borderColor: `${typeColor}40`, color: typeColor }}>
                                                            <Hospital className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-outfit font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{center.name}</h3>
                                                            <p className="font-mono text-[10px] text-slate-500 dark:text-white/40 mt-1 uppercase tracking-wider">{center.address}</p>
                                                        </div>
                                                    </div>

                                                    {/* Resources */}
                                                    {resources.length > 0 ? (
                                                        <div className="space-y-2 mb-6 bg-slate-50 dark:bg-white/[0.02] p-3.5 rounded-lg border border-slate-100 dark:border-white/5">
                                                            <p className="text-[9px] font-mono text-slate-400 dark:text-white/40 uppercase tracking-widest font-bold mb-1">Available Resources</p>
                                                            {resources.map((r, i) => (
                                                                <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-200/60 dark:border-white/[0.03] last:border-0">
                                                                    <span className="font-mono text-[11px] text-slate-700 dark:text-white/70 uppercase">{r.resource_type}</span>
                                                                    <span className={`font-outfit font-black text-sm leading-none ${r.quantity_available > 0 ? 'text-teal-600 dark:text-[#00FFCC]' : 'text-red-600 dark:text-red-400'}`}>
                                                                        {r.quantity_available > 0 ? r.quantity_available : 'FULL'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="font-mono text-[10px] text-slate-400 dark:text-white/20 uppercase tracking-wider mb-6">No resource data reported</p>
                                                    )}

                                                    {/* Contact + Directions */}
                                                    <div className="flex gap-3">
                                                        {center.contact_number && (
                                                            <a href={`tel:${center.contact_number}`}
                                                                className="flex-1 py-3 border border-slate-200 dark:border-white/10 hover:border-teal-500/30 text-center font-mono text-[10px] text-slate-700 dark:text-white/60 hover:text-teal-700 dark:hover:text-[#00FFCC] uppercase tracking-wider rounded-lg transition-all bg-slate-50 dark:bg-transparent">
                                                                📞 CALL
                                                            </a>
                                                        )}
                                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${center.latitude},${center.longitude}`}
                                                            target="_blank" rel="noreferrer"
                                                            className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 dark:bg-[#00FFCC] dark:hover:bg-[#00FFCC]/90 text-white dark:text-black font-bold text-[11px] uppercase tracking-wider text-center rounded-lg shadow-xs transition-all">
                                                            NAVIGATE
                                                        </a>
                                                    </div>
                                                </div>
                                            );
                                        }) : (
                                            <div className="col-span-full py-16 text-center">
                                                <p className="font-mono text-slate-400 dark:text-white/30 tracking-widest uppercase text-xs">No facilities found within {radiusKm} km</p>
                                                <p className="font-mono text-slate-400 dark:text-white/20 text-xs mt-1">Try increasing the search radius</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Content Area - Fleet */}
                    {activeTab === 'fleet' && (
                        <div className="animate-slide-up">
                            <div className="mb-8 relative max-w-xl group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/20 group-focus-within:text-teal-600 dark:group-focus-within:text-[#00FFCC] transition-colors" />
                                <input
                                    type="text"
                                    placeholder="SEARCH FLEET UNITS..."
                                    value={fleetSearch}
                                    onChange={(e) => setFleetSearch(e.target.value)}
                                    className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-14 py-3.5 font-mono text-xs tracking-wider focus:outline-none focus:border-teal-500/50 dark:focus:border-[#00FFCC]/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 uppercase shadow-xs"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredFleet.length > 0 ? filteredFleet.map(unit => {
                                    const isEnRoute = unit.status === 'En Route' || unit.status === 'Deployed';
                                    const isMaint = unit.status === 'Maintenance';
                                    const statusColor = isEnRoute ? '#2563eb' : isMaint ? '#dc2626' : '#059669';

                                    return (
                                        <div key={unit.id} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl shadow-xs p-6 hover:border-slate-300 dark:hover:border-white/20 transition-all group">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-white/5 border flex items-center justify-center transition-all group-hover:scale-105"
                                                        style={{ borderColor: `${statusColor}40`, color: statusColor }}>
                                                        {isMaint ? <Wrench className="w-5 h-5" /> : getFleetIcon(unit.type)}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <h3 className="font-outfit font-black text-xl tracking-tight text-slate-900 dark:text-white uppercase leading-none">{unit.unit}</h3>
                                                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">{unit.type}</span>
                                                    </div>
                                                </div>
                                                <span className="px-3 py-1 rounded-md border text-[10px] font-mono font-bold uppercase tracking-wider"
                                                    style={{ borderColor: `${statusColor}40`, color: statusColor, background: `${statusColor}10` }}>
                                                    {unit.status}
                                                </span>
                                            </div>

                                            <div className="space-y-4 p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-lg" style={{ minHeight: 140 }}>
                                                <div>
                                                    <p className="text-[9px] font-mono text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1.5 font-bold flex items-center gap-2">
                                                        <MapPin className="w-3.5 h-3.5 text-blue-500" /> Current Location
                                                    </p>
                                                    <p className="font-mono text-xs font-bold tracking-wider text-slate-900 dark:text-white uppercase">{unit.location}</p>
                                                </div>

                                                <div className="pt-3 border-t border-slate-200 dark:border-white/[0.03] flex justify-between items-end">
                                                    <div className="flex flex-col gap-1">
                                                       <span className="text-[8px] font-mono text-slate-400 dark:text-white/30 uppercase tracking-wider font-bold">Status</span>
                                                       <div className="flex items-center gap-1.5">
                                                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                                          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 uppercase font-bold">{isEnRoute ? 'Moving' : 'Idle'}</span>
                                                       </div>
                                                    </div>
                                                    {isEnRoute ? (
                                                       <div className="flex flex-col items-end gap-0.5">
                                                          <span className="text-[8px] font-mono text-slate-400 dark:text-white/30 uppercase font-bold pr-1">ETA</span>
                                                          <span className="font-outfit font-black text-2xl tracking-tight text-blue-600 dark:text-blue-400 leading-none">{unit.eta}</span>
                                                       </div>
                                                    ) : (
                                                       <span className="font-mono text-[10px] text-slate-500 dark:text-white/30 font-bold uppercase tracking-wider italic">{isMaint ? 'Maintenance' : 'Available'}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {!isMaint && !isEnRoute && (
                                                <button className="w-full mt-5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white py-3.5 rounded-lg font-outfit font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2.5">
                                                    <Send className="w-4 h-4 text-teal-600 dark:text-[#00FFCC]" /> Dispatch Unit
                                                </button>
                                            )}
                                        </div>
                                    );
                                }) : (
                                    <div className="col-span-full py-16 text-center text-slate-400 dark:text-white/20 font-mono tracking-widest uppercase text-xs">
                                        FLEET_SIG_NOT_FOUND // SCANNING...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </main>

            {/* Add Stock Modal */}
            {isSpaceModalOpen && (
                <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white dark:bg-[#08080A] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden relative">
                        
                        <div className="relative px-8 py-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-mono text-teal-600 dark:text-[#00FFCC] uppercase tracking-wider font-bold">Inventory Provisioning</span>
                                <h2 className="font-outfit text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                                  NEW STOCK INTAKE
                                </h2>
                            </div>
                            <button onClick={() => setIsSpaceModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-all text-xl">
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleAddStock} className="relative p-8 space-y-6 bg-white dark:bg-black/40">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-mono text-slate-600 dark:text-white/40 uppercase tracking-wider font-bold">ITEM IDENTIFIER*</label>
                                <input
                                    required
                                    type="text"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-3 font-mono text-xs tracking-wider focus:outline-none focus:border-teal-500/50 dark:focus:border-[#00FFCC]/40 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 uppercase"
                                    placeholder="e.g. Oxygen Cylinders (40L)"
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-[10px] font-mono text-slate-600 dark:text-white/40 uppercase tracking-wider font-bold">QUANTITY*</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        value={newItem.quantity}
                                        onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-3 font-mono text-xs tracking-wider focus:outline-none focus:border-teal-500/50 dark:focus:border-[#00FFCC]/40 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="w-[40%] space-y-1.5">
                                    <label className="text-[10px] font-mono text-slate-600 dark:text-white/40 uppercase tracking-wider font-bold">UNIT*</label>
                                    <select
                                        value={newItem.unit}
                                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-3 font-mono text-xs tracking-wider focus:outline-none focus:border-teal-500/50 dark:focus:border-[#00FFCC]/40 transition-all text-slate-900 dark:text-white cursor-pointer uppercase"
                                    >
                                        <option value="kg" className="bg-white dark:bg-[#08080A]">KG</option>
                                        <option value="liters" className="bg-white dark:bg-[#08080A]">LITERS</option>
                                        <option value="kits" className="bg-white dark:bg-[#08080A]">KITS</option>
                                        <option value="units" className="bg-white dark:bg-[#08080A]">UNITS</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-mono text-slate-600 dark:text-white/40 uppercase tracking-wider font-bold">LOCATION / WAREHOUSE*</label>
                                <input
                                    required
                                    type="text"
                                    value={newItem.location}
                                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-3 font-mono text-xs tracking-wider focus:outline-none focus:border-teal-500/50 dark:focus:border-[#00FFCC]/40 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 uppercase"
                                    placeholder="e.g. Central Depot, Sector 4"
                                />
                            </div>
                            <div className="pt-6 border-t border-slate-200 dark:border-white/5 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsSpaceModalOpen(false)}
                                    className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 font-mono text-xs tracking-wider text-slate-700 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/10 transition-all uppercase"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-teal-600 hover:bg-teal-700 dark:bg-[#00FFCC] dark:hover:bg-[#00FFCC]/90 text-white dark:text-black px-8 py-2.5 rounded-lg font-outfit font-black text-xs tracking-wider transition-all disabled:opacity-50 uppercase shadow-xs"
                                >
                                    {isSubmitting ? 'PROVISIONING...' : 'AUTHORIZE STOCK'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <AllocateResourceModal
                isOpen={isAllocateModalOpen}
                onClose={() => {
                    setIsAllocateModalOpen(false);
                    setSelectedResourceForModal(null);
                }}
                preselectedResource={selectedResourceForModal}
                onAllocated={() => {
                    loadResources();
                    loadAllocations();
                }}
            />

            <ToastContainer toasts={toasts} />
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 240, 255, 0.1); }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 240, 255, 0.2); }
                .stroke-text {
                  -webkit-text-stroke: 1px rgba(255,255,255,0.2);
                  text-stroke: 1px rgba(255,255,255,0.2);
                  color: transparent;
                }
            `}} />
        </div>
    );
}
