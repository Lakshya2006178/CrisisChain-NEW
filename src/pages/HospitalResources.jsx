import { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import * as api from '../api/index.js';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import { SZ } from '../constants';
import {
    BedDouble, Ambulance, Package, Users,
    Plus, Trash2, Search, Clock, MapPin, Edit2, RefreshCw
} from 'lucide-react';
import { Badge, CrudModal, STATUS_COLOR } from '../components/CrudModal';

const STORAGE_KEY = 'hospital_resources_data';

const DEFAULT_DATA = {
    beds: [
        { id: 1, ward: 'ICU',       total: 20, available: 5,  status: 'Near Capacity' },
        { id: 2, ward: 'General',   total: 80, available: 35, status: 'Available' },
        { id: 3, ward: 'Emergency', total: 15, available: 0,  status: 'Full' },
        { id: 4, ward: 'Pediatric', total: 20, available: 12, status: 'Available' },
    ],
    ambulances: [
        { id: 1, unit: 'AMB-KMC-01', driver: 'Rajan K.', status: 'Available', location: 'Hospital Bay' },
        { id: 2, unit: 'AMB-KMC-02', driver: 'Sunil M.', status: 'Dispatched', location: 'Kadri Road' },
        { id: 3, unit: 'AMB-KMC-03', driver: 'Vijay P.', status: 'Maintenance', location: 'Garage' },
    ],
    kits: [
        { id: 1, name: 'Trauma Kit',          qty: 25, expiry: '2026-12-01', location: 'Store A' },
        { id: 2, name: 'Cardiac Arrest Kit',  qty: 10, expiry: '2027-03-15', location: 'ICU' },
        { id: 3, name: 'First Aid Kit',        qty: 50, expiry: '2026-09-30', location: 'Emergency' },
        { id: 4, name: 'Surgical Kit',         qty: 8,  expiry: '2027-01-10', location: 'OT' },
    ],
    staff: [
        { id: 1, name: 'Dr. Anitha Rao',   role: 'Surgeon',    shift: 'Morning', status: 'On Duty',  specialization: 'Cardiothoracic' },
        { id: 2, name: 'Dr. Kiran Shetty', role: 'Physician',  shift: 'Night',   status: 'Off Duty', specialization: 'General Medicine' },
        { id: 3, name: 'Nurse Priya T.',   role: 'Nurse',      shift: 'Morning', status: 'On Duty',  specialization: 'ICU' },
        { id: 4, name: 'Para. Mohan D.',   role: 'Paramedic',  shift: 'Afternoon',status: 'On Duty', specialization: 'Emergency' },
    ],
};

const TABS = [
    { id: 'beds',       label: 'BEDS',        icon: BedDouble },
    { id: 'ambulances', label: 'AMBULANCES',  icon: Ambulance },
    { id: 'kits',       label: 'MEDICAL KITS',icon: Package },
    { id: 'staff',      label: 'STAFF',       icon: Users },
];

export default function HospitalResources() {
    const { isSidebarOpen, addToast } = useDashboard();
    const ml = isSidebarOpen ? SZ.sidebarOpen : SZ.sidebarClosed;
    const [activeTab, setActiveTab] = useState('beds');
    const [search, setSearch] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [data, setData] = useState(() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_DATA; }
        catch { return DEFAULT_DATA; }
    });
    const [modal, setModal] = useState(null);

    const loadHospitalData = async () => {
        try {
            setIsSyncing(true);
            const { data: dbData } = await api.fetchHospitalResources();
            if (dbData && (dbData.beds || dbData.ambulances || dbData.kits || dbData.staff)) {
                const merged = {
                    beds: Array.isArray(dbData.beds) ? dbData.beds : DEFAULT_DATA.beds,
                    ambulances: Array.isArray(dbData.ambulances) ? dbData.ambulances : DEFAULT_DATA.ambulances,
                    kits: Array.isArray(dbData.kits) ? dbData.kits : DEFAULT_DATA.kits,
                    staff: Array.isArray(dbData.staff) ? dbData.staff : DEFAULT_DATA.staff
                };
                setData(merged);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            }
        } catch (err) {
            console.warn('Backend hospital resources unavailable, using cached storage:', err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        loadHospitalData();
    }, []);

    const openAddModal = (tab) => {
        setEditingItem(null);
        setModal(tab);
    };

    const openEditModal = (tab, item) => {
        setEditingItem({ tab, item });
        setModal(tab);
    };

    const updateItem = async (tab, updatedItem) => {
        const parsed = { ...updatedItem };
        if (parsed.total !== undefined && parsed.total !== '') parsed.total = Number(parsed.total);
        if (parsed.available !== undefined && parsed.available !== '') parsed.available = Number(parsed.available);
        if (parsed.qty !== undefined && parsed.qty !== '') parsed.qty = Number(parsed.qty);

        const nextList = data[tab].map(item => String(item.id) === String(parsed.id) ? parsed : item);
        const nextData = { ...data, [tab]: nextList };
        setData(nextData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
        setModal(null);
        setEditingItem(null);

        try {
            await api.updateHospitalItem(tab, parsed.id, parsed);
            if (addToast) addToast(`Updated ${tab.slice(0, -1)}: ${parsed.ward || parsed.unit || parsed.name} successfully`, 'success');
        } catch (err) {
            console.warn('Backend single item update failed, attempting full sync:', err.message);
            try {
                await api.updateHospitalResources(nextData);
                if (addToast) addToast(`Updated ${tab.slice(0, -1)} successfully`, 'success');
            } catch (syncErr) {
                if (addToast) addToast('Saved to local cache. Backend sync error.', 'warning');
            }
        }
    };

    const addItem = async (tab, item) => {
        const parsed = { ...item, id: Date.now() };
        if (item.total !== undefined && item.total !== '') parsed.total = Number(item.total);
        if (item.available !== undefined && item.available !== '') parsed.available = Number(item.available);
        if (item.qty !== undefined && item.qty !== '') parsed.qty = Number(item.qty);

        const nextData = { ...data, [tab]: [...data[tab], parsed] };
        setData(nextData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
        setModal(null);
        setEditingItem(null);

        try {
            await api.updateHospitalResources(nextData);
            if (addToast) addToast(`Added new ${tab.slice(0, -1)} successfully`, 'success');
        } catch (err) {
            if (addToast) addToast('Saved to local cache', 'info');
        }
    };

    const removeItem = async (tab, id) => {
        const nextData = { ...data, [tab]: data[tab].filter(i => i.id !== id) };
        setData(nextData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));

        try {
            await api.updateHospitalResources(nextData);
            if (addToast) addToast('Resource removed successfully', 'info');
        } catch (err) {
            if (addToast) addToast('Removed from local cache', 'info');
        }
    };

    const MODAL_FIELDS = {
        beds: [
            { key: 'ward', label: 'Ward Name' },
            { key: 'total', label: 'Total Beds', type: 'number', default: '0' },
            { key: 'available', label: 'Available Beds', type: 'number', default: '0' },
            { key: 'status', label: 'Status', options: ['Available', 'Near Capacity', 'Full'] },
        ],
        ambulances: [
            { key: 'unit', label: 'Unit ID' },
            { key: 'driver', label: 'Driver Name' },
            { key: 'status', label: 'Status', options: ['Available', 'Dispatched', 'Maintenance'] },
            { key: 'location', label: 'Current Location' },
        ],
        kits: [
            { key: 'name', label: 'Kit Name' },
            { key: 'qty', label: 'Quantity', type: 'number', default: '1' },
            { key: 'expiry', label: 'Expiry Date', type: 'date' },
            { key: 'location', label: 'Storage Location' },
        ],
        staff: [
            { key: 'name', label: 'Full Name' },
            { key: 'role', label: 'Role', options: ['Surgeon', 'Physician', 'Nurse', 'Paramedic', 'Technician', 'Admin'] },
            { key: 'specialization', label: 'Specialization' },
            { key: 'shift', label: 'Shift', options: ['Morning', 'Afternoon', 'Night'] },
            { key: 'status', label: 'Status', options: ['On Duty', 'Off Duty', 'Leave'] },
        ],
    };

    const q = search.toLowerCase();
    const filtered = {
        beds:       data.beds.filter(b => b.ward.toLowerCase().includes(q) || b.status.toLowerCase().includes(q)),
        ambulances: data.ambulances.filter(a => a.unit.toLowerCase().includes(q) || a.status.toLowerCase().includes(q)),
        kits:       data.kits.filter(k => k.name.toLowerCase().includes(q) || k.location.toLowerCase().includes(q)),
        staff:      data.staff.filter(s => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q)),
    };

    // Summary stats
    const totalBeds = data.beds.reduce((a, b) => a + b.total, 0);
    const availBeds = data.beds.reduce((a, b) => a + b.available, 0);
    const ambAvail  = data.ambulances.filter(a => a.status === 'Available').length;
    const staffOnDuty = data.staff.filter(s => s.status === 'On Duty').length;

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#08080A] text-[#E5E5E7] font-inter">
            <Sidebar />
            <TopNavbar />
            <main className={`flex-1 overflow-x-hidden overflow-y-auto relative z-10 ${isSidebarOpen ? 'ml-sidebar-open' : 'ml-sidebar-closed'}`}
                style={{ marginTop: SZ.navbarH, height: `calc(100vh - ${SZ.navbarH}px)` }}>
                <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">

                    {/* Unified Executive Header */}
                    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-white/10">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5 text-teal-600 dark:text-[#00FFCC]">
                                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                                <span className="text-xs font-mono font-bold tracking-wider uppercase">Facility Operations</span>
                            </div>
                            <h1 className="font-poppins text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Hospital Resources
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time ICU ward capacity, ambulance deployment, and emergency medical kits</p>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <button onClick={loadHospitalData} disabled={isSyncing} className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 text-xs font-semibold flex items-center gap-2 shadow-xs transition-all">
                                <RefreshCw size={14} className={isSyncing ? 'animate-spin text-teal-600' : ''} />
                                Sync DB
                            </button>
                            <button onClick={() => openAddModal(activeTab)} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all">
                                <Plus size={15} /> Add Record
                            </button>
                        </div>
                    </div>

                    {/* Unified KPI Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Total Beds',    value: totalBeds, sub: `${availBeds} available`, icon: BedDouble, iconColor: 'text-teal-600 dark:text-teal-400', badgeBg: 'bg-teal-50 dark:bg-teal-500/10' },
                            { label: 'Ambulances',    value: data.ambulances.length, sub: `${ambAvail} available`, icon: Ambulance, iconColor: 'text-blue-600 dark:text-blue-400', badgeBg: 'bg-blue-50 dark:bg-blue-500/10' },
                            { label: 'Medical Kits',  value: data.kits.reduce((a, k) => a + k.qty, 0), sub: `${data.kits.length} kit types`, icon: Package, iconColor: 'text-purple-600 dark:text-purple-400', badgeBg: 'bg-purple-50 dark:bg-purple-500/10' },
                            { label: 'Staff Members', value: data.staff.length, sub: `${staffOnDuty} on duty`, icon: Users, iconColor: 'text-emerald-600 dark:text-emerald-400', badgeBg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                        ].map(s => (
                            <div key={s.label} className="p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111827] shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
                                <div>
                                    <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{s.label}</span>
                                    <span className="text-2xl sm:text-3xl font-bold font-poppins text-slate-900 dark:text-white leading-none">{s.value}</span>
                                    <span className="block text-[11px] text-teal-600 dark:text-teal-400 font-medium mt-1">{s.sub}</span>
                                </div>
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.badgeBg}`}>
                                    <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Unified Tab Capsule Bar + Search */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800/60 rounded-xl border border-slate-300/60 dark:border-white/10 w-fit">
                            {TABS.map(({ id, label, icon: Icon }) => (
                                <button key={id} onClick={() => { setActiveTab(id); setSearch(''); }}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                                        activeTab === id 
                                            ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-[#00FFCC] shadow-xs' 
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}>
                                    <Icon className="w-3.5 h-3.5" />
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${activeTab}...`}
                                className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 shadow-xs placeholder:text-slate-400" />
                        </div>
                    </div>

                    {/* ── BEDS ── */}
                    {activeTab === 'beds' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                            {filtered.beds.map(b => {
                                const pct = Math.round(((b.total - b.available) / (b.total || 1)) * 100);
                                const color = STATUS_COLOR[b.status] || '#0D9488';
                                return (
                                    <div key={b.id} onClick={() => openEditModal('beds', b)} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl p-5 relative hover:border-teal-500/50 hover:shadow-md transition-all duration-300 group cursor-pointer shadow-xs">
                                        <div className="absolute top-4 right-4 flex items-center gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); openEditModal('beds', b); }} className="p-1.5 text-slate-400 dark:text-white/30 hover:text-teal-600 dark:hover:text-[#00FFCC] transition-colors" title="Edit Ward"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Remove this bed record?')) removeItem('beds', b.id); }} className="p-1.5 text-slate-400 dark:text-white/30 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                        <div className="w-11 h-11 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-4 transition-transform group-hover:scale-105" style={{ color }}>
                                            <BedDouble className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-poppins font-bold text-lg text-slate-900 dark:text-white uppercase mb-1">{b.ward}</h3>
                                        <div className="flex items-baseline gap-2 mb-3">
                                            <span className="font-poppins font-black text-3xl text-slate-900 dark:text-white">{b.available}</span>
                                            <span className="font-mono text-xs text-slate-500 dark:text-white/40">/ {b.total} beds</span>
                                        </div>
                                        
                                        {/* Dynamic Occupancy Meter */}
                                        <div className="space-y-1 mb-4">
                                            <div className="flex justify-between items-center text-[10px] font-mono">
                                                <span className="text-slate-500 dark:text-white/40 uppercase tracking-wider">Occupancy</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{pct}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }} />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                                            <Badge label={b.status} />
                                            <span className="text-[10px] font-mono text-slate-400 dark:text-white/30 group-hover:text-teal-600 dark:group-hover:text-[#00FFCC] transition-colors uppercase tracking-wider flex items-center gap-1 font-semibold">
                                                <Edit2 className="w-2.5 h-2.5" /> Edit
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── AMBULANCES ── */}
                    {activeTab === 'ambulances' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filtered.ambulances.map(a => (
                                <div key={a.id} onClick={() => openEditModal('ambulances', a)} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl p-5 hover:border-teal-500/50 hover:shadow-md transition-all duration-300 relative group cursor-pointer shadow-xs">
                                    <div className="absolute top-4 right-4 flex items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); openEditModal('ambulances', a); }} className="p-1.5 text-slate-400 dark:text-white/30 hover:text-teal-600 dark:hover:text-[#00FFCC] transition-colors" title="Edit Ambulance"><Edit2 className="w-3.5 h-3.5" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Remove this ambulance?')) removeItem('ambulances', a.id); }} className="p-1.5 text-slate-400 dark:text-white/30 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-11 h-11 rounded-lg bg-teal-50 dark:bg-white/5 border border-teal-100 dark:border-white/10 flex items-center justify-center text-teal-600 dark:text-[#00FFCC] transition-transform group-hover:scale-105">
                                            <Ambulance className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-poppins font-bold text-base text-slate-900 dark:text-white uppercase">{a.unit}</h3>
                                            <p className="text-xs font-mono text-slate-500 dark:text-white/40 uppercase tracking-wider">Driver: {a.driver}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                                        <span className="text-xs font-mono text-slate-600 dark:text-white/50 uppercase flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-[#00FFCC]" />{a.location}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="relative flex h-2 w-2">
                                                {a.status === 'Available' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                                                <span className={`relative inline-flex rounded-full h-2 w-2 ${a.status === 'Available' ? 'bg-emerald-500' : a.status === 'Dispatched' ? 'bg-cyan-500' : 'bg-amber-500'}`}></span>
                                            </span>
                                            <Badge label={a.status} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── MEDICAL KITS ── */}
                    {activeTab === 'kits' && (
                        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl shadow-xs overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] text-xs font-semibold text-slate-600 dark:text-white/40 uppercase tracking-wider">
                                        {['Kit Type', 'Quantity', 'Expiry Date', 'Location', 'Actions'].map(h => (
                                            <th key={h} className="px-6 py-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {(() => {
                                        const threshold = new Date(Date.now() + 90 * 86400000);
                                        return filtered.kits.map(k => {
                                            const expiring = new Date(k.expiry) < threshold;
                                        return (
                                            <tr key={k.id} onClick={() => openEditModal('kits', k)} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group">
                                                <td className="px-6 py-4 font-semibold text-sm text-slate-900 dark:text-white uppercase group-hover:text-teal-600 dark:group-hover:text-[#00FFCC] transition-colors">{k.name}</td>
                                                <td className="px-6 py-4 font-poppins font-bold text-xl text-teal-700 dark:text-[#00FFCC]">{k.qty}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-mono text-xs ${expiring ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-600 dark:text-white/50'}`}>{k.expiry}</span>
                                                    {expiring && <span className="ml-2 text-[9px] font-mono text-red-600 dark:text-red-400 uppercase font-bold">⚠ Expiring Soon</span>}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-white/40">
                                                    <MapPin className="w-3.5 h-3.5 inline mr-1 text-teal-600 dark:text-[#00FFCC]" />{k.location}
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                                    <button onClick={(e) => { e.stopPropagation(); openEditModal('kits', k); }} className="mr-3 text-slate-400 hover:text-teal-600 dark:text-white/30 dark:hover:text-[#00FFCC] transition-colors p-1" title="Edit Kit"><Edit2 className="w-4 h-4 inline" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Remove this kit?')) removeItem('kits', k.id); }} className="text-slate-400 hover:text-red-600 dark:text-white/30 dark:hover:text-red-500 transition-colors p-1" title="Delete"><Trash2 className="w-4 h-4 inline" /></button>
                                                </td>
                                            </tr>
                                        );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── STAFF ── */}
                    {activeTab === 'staff' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filtered.staff.map(s => (
                                <div key={s.id} onClick={() => openEditModal('staff', s)} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl p-5 hover:border-teal-500/50 hover:shadow-md transition-all relative group cursor-pointer shadow-xs">
                                    <div className="absolute top-4 right-4 flex items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); openEditModal('staff', s); }} className="p-1.5 text-slate-400 dark:text-white/30 hover:text-teal-600 dark:hover:text-[#00FFCC] transition-colors" title="Edit Staff Member"><Edit2 className="w-3.5 h-3.5" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Remove this staff member?')) removeItem('staff', s.id); }} className="p-1.5 text-slate-400 dark:text-white/30 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-11 h-11 bg-teal-50 dark:bg-black border border-teal-100 dark:border-white/10 rounded-xl flex items-center justify-center font-poppins font-bold text-base text-teal-700 dark:text-white">
                                            {s.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-poppins font-bold text-base text-slate-900 dark:text-white uppercase">{s.name}</h3>
                                            <p className="text-xs text-slate-500 dark:text-white/40">{s.role}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                                        <p className="text-xs text-slate-600 dark:text-white/40 flex items-center gap-1 font-mono">
                                            <Clock className="w-3.5 h-3.5" />{s.shift} Shift — {s.specialization}
                                        </p>
                                        <Badge label={s.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {modal && (
                <CrudModal
                    title={editingItem ? `Edit ${editingItem.tab.slice(0, -1)}: ${editingItem.item.ward || editingItem.item.unit || editingItem.item.name}` : `Add ${modal.slice(0, -1)}`}
                    fields={MODAL_FIELDS[modal]}
                    initialData={editingItem ? editingItem.item : null}
                    submitLabel={editingItem ? "Save Changes" : "Add"}
                    onSave={form => {
                        if (editingItem) {
                            updateItem(modal, { ...editingItem.item, ...form });
                        } else {
                            addItem(modal, form);
                        }
                    }}
                    onClose={() => { setModal(null); setEditingItem(null); }}
                />
            )}
        </div>
    );
}
