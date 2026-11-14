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
                <div className="p-4 sm:p-8 lg:p-12 max-w-[1400px] mx-auto">

                    {/* Header */}
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-[1px] w-8 bg-[#00FFCC]/40" />
                            <span className="text-[10px] font-mono tracking-[0.6em] text-[#00FFCC] uppercase">Hospital_Resource_Management</span>
                        </div>
                        <h1 className="font-outfit text-5xl lg:text-6xl font-black tracking-tighter uppercase leading-none">
                            HOSPITAL<br />
                            <span className="bg-gradient-to-r from-[#00FFCC] via-white to-white/40 bg-clip-text text-transparent italic">RESOURCES</span>
                        </h1>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                        {[
                            { label: 'Total Beds',      value: totalBeds, sub: `${availBeds} available` },
                            { label: 'Ambulances',      value: data.ambulances.length, sub: `${ambAvail} available` },
                            { label: 'Medical Kits',    value: data.kits.reduce((a, k) => a + k.qty, 0), sub: `${data.kits.length} types` },
                            { label: 'Staff Members',   value: data.staff.length, sub: `${staffOnDuty} on duty` },
                        ].map(s => (
                            <div key={s.label} className="bg-white/5 border border-white/5 p-6">
                                <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mb-2">{s.label}</p>
                                <p className="font-outfit font-black text-4xl text-white tracking-tighter">{s.value}</p>
                                <p className="text-[9px] font-mono text-[#00FFCC]/60 mt-1 uppercase tracking-widest">{s.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tabs + Search + Add */}
                    <div className="flex flex-wrap items-center gap-4 mb-8">
                        <div className="flex gap-2 flex-wrap">
                            {TABS.map(({ id, label, icon: Icon }) => (
                                <button key={id} onClick={() => { setActiveTab(id); setSearch(''); }}
                                    className={`flex items-center gap-3 px-6 py-3 font-mono text-[10px] font-black uppercase tracking-widest border transition-all ${activeTab === id ? 'bg-[#00FFCC] text-black border-transparent' : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/10'}`}>
                                    <Icon className="w-4 h-4" />{label}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 flex gap-4 min-w-[200px]">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                                    className="w-full bg-white/5 border border-white/5 pl-10 pr-4 py-3 font-mono text-xs text-white focus:outline-none focus:border-[#00FFCC]/30 uppercase placeholder:text-white/10" />
                            </div>
                            <button onClick={loadHospitalData} disabled={isSyncing} className="px-4 py-3 bg-white/5 border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all flex items-center justify-center" title="Sync with Database">
                                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#00FFCC]' : ''}`} />
                            </button>
                            <button onClick={() => openAddModal(activeTab)}
                                className="flex items-center gap-2 px-6 py-3 bg-[#00FFCC] text-black font-outfit font-black text-xs uppercase tracking-widest hover:brightness-110">
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>
                    </div>

                    {/* ── BEDS ── */}
                    {activeTab === 'beds' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {filtered.beds.map(b => {
                                const pct = Math.round(((b.total - b.available) / b.total) * 100);
                                const color = STATUS_COLOR[b.status] || '#00FFCC';
                                return (
                                    <div key={b.id} onClick={() => openEditModal('beds', b)} className="bg-white/5 border border-white/5 p-6 relative hover:border-[#00FFCC]/40 hover:bg-white/[0.08] transition-all group cursor-pointer">
                                        <div className="absolute top-4 right-4 flex items-center gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); openEditModal('beds', b); }} className="p-1.5 text-white/20 hover:text-[#00FFCC] transition-colors" title="Edit Ward"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Remove this bed record?')) removeItem('beds', b.id); }} className="p-1.5 text-white/20 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                        <div className="w-12 h-12 border border-white/5 flex items-center justify-center mb-4" style={{ color }}>
                                            <BedDouble className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-outfit font-black text-xl text-white uppercase mb-1">{b.ward}</h3>
                                        <div className="flex items-baseline gap-2 mb-4">
                                            <span className="font-outfit font-black text-4xl" style={{ color }}>{b.available}</span>
                                            <span className="font-mono text-xs text-white/20">/ {b.total} beds</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/5 overflow-hidden mb-3">
                                            <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Badge label={b.status} />
                                            <span className="text-[8px] font-mono text-white/20 group-hover:text-[#00FFCC]/80 transition-colors uppercase tracking-widest flex items-center gap-1">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.ambulances.map(a => (
                                <div key={a.id} onClick={() => openEditModal('ambulances', a)} className="bg-white/5 border border-white/5 p-6 hover:border-[#00FFCC]/40 hover:bg-white/[0.08] transition-all relative group cursor-pointer">
                                    <div className="absolute top-4 right-4 flex items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); openEditModal('ambulances', a); }} className="p-1.5 text-white/20 hover:text-[#00FFCC] transition-colors" title="Edit Ambulance"><Edit2 className="w-3.5 h-3.5" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Remove this ambulance?')) removeItem('ambulances', a.id); }} className="p-1.5 text-white/20 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-12 h-12 bg-white/5 border border-white/5 flex items-center justify-center text-[#00FFCC]">
                                            <Ambulance className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-outfit font-black text-lg text-white uppercase">{a.unit}</h3>
                                            <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">Driver: {a.driver}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-mono text-white/30 uppercase flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-[#00FFCC]" />{a.location}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Badge label={a.status} />
                                            <span className="text-[8px] font-mono text-white/20 group-hover:text-[#00FFCC]/80 transition-colors uppercase tracking-widest">
                                                <Edit2 className="w-2.5 h-2.5 inline" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── MEDICAL KITS ── */}
                    {activeTab === 'kits' && (
                        <div className="bg-white/5 border border-white/5 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5 font-mono text-[9px] text-white/20 uppercase tracking-widest">
                                        {['Kit Type', 'Quantity', 'Expiry Date', 'Location', 'Actions'].map(h => (
                                            <th key={h} className="px-6 py-5 font-normal">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const threshold = new Date(Date.now() + 90 * 86400000);
                                        return filtered.kits.map(k => {
                                            const expiring = new Date(k.expiry) < threshold;
                                        return (
                                            <tr key={k.id} onClick={() => openEditModal('kits', k)} className="border-b border-white/[0.03] hover:bg-white/[0.06] transition-all cursor-pointer group">
                                                <td className="px-6 py-5 font-outfit font-black text-white uppercase group-hover:text-[#00FFCC] transition-colors">{k.name}</td>
                                                <td className="px-6 py-5 font-outfit font-black text-2xl text-[#00FFCC]">{k.qty}</td>
                                                <td className="px-6 py-5">
                                                    <span className={`font-mono text-xs ${expiring ? 'text-red-400' : 'text-white/40'}`}>{k.expiry}</span>
                                                    {expiring && <span className="ml-2 text-[8px] font-mono text-red-500 uppercase">⚠ Expiring Soon</span>}
                                                </td>
                                                <td className="px-6 py-5 font-mono text-xs text-white/30 uppercase"><MapPin className="w-3 h-3 inline mr-1 text-[#00FFCC]" />{k.location}</td>
                                                <td className="px-6 py-5 text-right whitespace-nowrap">
                                                    <button onClick={(e) => { e.stopPropagation(); openEditModal('kits', k); }} className="mr-3 text-white/20 hover:text-[#00FFCC] transition-colors p-1" title="Edit Kit"><Edit2 className="w-4 h-4 inline" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Remove this kit?')) removeItem('kits', k.id); }} className="text-white/20 hover:text-red-500 transition-colors p-1" title="Delete"><Trash2 className="w-4 h-4 inline" /></button>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.staff.map(s => (
                                <div key={s.id} onClick={() => openEditModal('staff', s)} className="bg-white/5 border border-white/5 p-6 hover:border-[#00FFCC]/40 hover:bg-white/[0.08] transition-all relative group cursor-pointer">
                                    <div className="absolute top-4 right-4 flex items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); openEditModal('staff', s); }} className="p-1.5 text-white/20 hover:text-[#00FFCC] transition-colors" title="Edit Staff Member"><Edit2 className="w-3.5 h-3.5" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Remove this staff member?')) removeItem('staff', s.id); }} className="p-1.5 text-white/20 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-12 h-12 bg-black border border-white/10 flex items-center justify-center font-outfit font-black text-xl text-white">
                                            {s.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-outfit font-black text-base text-white uppercase">{s.name}</h3>
                                            <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{s.role}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
                                            <Clock className="w-3 h-3 inline mr-1" />{s.shift} Shift — {s.specialization}
                                        </p>
                                        <span className="text-[8px] font-mono text-white/20 group-hover:text-[#00FFCC]/80 transition-colors uppercase tracking-widest">
                                            <Edit2 className="w-2.5 h-2.5 inline" />
                                        </span>
                                    </div>
                                    <Badge label={s.status} />
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
