import { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import * as api from '../api/index.js';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import { SZ } from '../constants';
import {
    Truck, Wrench, Users, ClipboardList, Plus, Trash2,
    Clock, MapPin, Search, Loader2, CheckCircle, Navigation, AlertCircle
} from 'lucide-react';
import { Badge, CrudModal } from '../components/CrudModal';

const STORAGE_KEY = 'responder_org_data';

const DEFAULT_DATA = {
    fleet: [
        { id: 1, name: 'Fire Engine Alpha', reg: 'KA-05-F-0012', type: 'Fire Engine', status: 'Available', lastService: '2026-03-10' },
        { id: 2, name: 'Rescue Van 01',     reg: 'KA-05-F-0034', type: 'Rescue Van',  status: 'Deployed',  lastService: '2026-02-20' },
    ],
    equipment: [
        { id: 1, name: 'CO2 Extinguisher', qty: 12, condition: 'Good',     location: 'Bay A', nextInspection: '2026-06-01' },
        { id: 2, name: 'SCBA Set',          qty: 6,  condition: 'Good',     location: 'Bay B', nextInspection: '2026-07-15' },
        { id: 3, name: 'Hydraulic Cutter',  qty: 2,  condition: 'Moderate', location: 'Bay A', nextInspection: '2026-05-20' },
    ],
    personnel: [
        { id: 1, name: 'Suresh Kumar',   rank: 'Station Officer', shift: 'Morning', status: 'On Duty' },
        { id: 2, name: 'Ravi Prabhu',    rank: 'Sub-Officer',     shift: 'Morning', status: 'On Duty' },
        { id: 3, name: 'Mohan Das',      rank: 'Fireman',         shift: 'Night',   status: 'Off Duty' },
    ],
    incidents: [
        { id: 1, type: 'Building Fire', location: 'Hampankatta', date: '2026-04-28', status: 'Resolved', units: 2 },
        { id: 2, type: 'Road Accident', location: 'Kadri',       date: '2026-04-22', status: 'Resolved', units: 1 },
    ],
};

const TABS = [
    { id: 'fleet',     label: 'FLEET',     icon: Truck },
    { id: 'equipment', label: 'EQUIPMENT', icon: Wrench },
    { id: 'personnel', label: 'PERSONNEL', icon: Users },
    { id: 'incidents', label: 'INCIDENTS', icon: ClipboardList },
];

export default function ResponderOrg() {
    const { isSidebarOpen, user, addToast } = useDashboard();
    const ml = isSidebarOpen ? SZ.sidebarOpen : SZ.sidebarClosed;
    const [activeTab, setActiveTab] = useState('fleet');
    const [search, setSearch] = useState('');
    const [assignments, setAssignments] = useState([]);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
    const [updatingAssignmentId, setUpdatingAssignmentId] = useState(null);
    const [data, setData] = useState(() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_DATA; }
        catch { return DEFAULT_DATA; }
    });
    const [modal, setModal] = useState(null);

    useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);

    const loadAssignments = async () => {
        try {
            setIsLoadingAssignments(true);
            const params = user?.role === 'responder' ? { my: 'true' } : {};
            const { data } = await api.fetchAssignments(params);
            setAssignments(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load assignments in ResponderOrg:', err);
        } finally {
            setIsLoadingAssignments(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'incidents') {
            loadAssignments();
        }
    }, [activeTab]);

    const handleUpdateAssignmentStatus = async (assignmentId, nextStatus) => {
        try {
            setUpdatingAssignmentId(assignmentId);
            await api.updateAssignmentStatus(assignmentId, nextStatus);
            if (addToast) addToast(`Mission status updated to ${nextStatus}`, 'success');
            await loadAssignments();
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Failed to update mission status';
            if (addToast) addToast(msg, 'error');
        } finally {
            setUpdatingAssignmentId(null);
        }
    };

    const addItem = (tab, item) => {
        const parsed = { ...item, id: Date.now() };
        if (item.qty !== undefined && item.qty !== '') parsed.qty = Number(item.qty);
        if (item.units !== undefined && item.units !== '') parsed.units = Number(item.units);
        setData(prev => ({ ...prev, [tab]: [...prev[tab], parsed] }));
        setModal(null);
    };
    const removeItem = (tab, id) => setData(prev => ({ ...prev, [tab]: prev[tab].filter(i => i.id !== id) }));

    const MODAL_FIELDS = {
        fleet: [
            { key: 'name', label: 'Vehicle Name' },
            { key: 'reg', label: 'Registration No.' },
            { key: 'type', label: 'Type', options: ['Fire Engine', 'Rescue Van', 'Ambulance', 'Command Vehicle', 'Patrol Boat', 'Helicopter'] },
            { key: 'status', label: 'Status', options: ['Available', 'Deployed', 'Maintenance'] },
            { key: 'lastService', label: 'Last Service Date', type: 'date' },
        ],
        equipment: [
            { key: 'name', label: 'Equipment Name' },
            { key: 'qty', label: 'Quantity', type: 'number', default: '1' },
            { key: 'condition', label: 'Condition', options: ['Good', 'Moderate', 'Poor'] },
            { key: 'location', label: 'Storage Location' },
            { key: 'nextInspection', label: 'Next Inspection', type: 'date' },
        ],
        personnel: [
            { key: 'name', label: 'Full Name' },
            { key: 'rank', label: 'Rank / Designation' },
            { key: 'shift', label: 'Shift', options: ['Morning', 'Afternoon', 'Night'] },
            { key: 'status', label: 'Status', options: ['On Duty', 'Off Duty', 'Leave'] },
        ],
        incidents: [
            { key: 'type', label: 'Incident Type', options: ['Building Fire', 'Road Accident', 'Flood', 'Rescue', 'Hazmat', 'Medical'] },
            { key: 'location', label: 'Location' },
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'status', label: 'Status', options: ['Active', 'Resolved'] },
            { key: 'units', label: 'Units Deployed', type: 'number', default: '1' },
        ],
    };

    const filtered = {
        fleet: data.fleet.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.type.toLowerCase().includes(search.toLowerCase())),
        equipment: data.equipment.filter(i => i.name.toLowerCase().includes(search.toLowerCase())),
        personnel: data.personnel.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.rank.toLowerCase().includes(search.toLowerCase())),
        incidents: data.incidents.filter(i => i.type.toLowerCase().includes(search.toLowerCase()) || i.location.toLowerCase().includes(search.toLowerCase())),
    };

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
                            <span className="text-[10px] font-mono tracking-[0.6em] text-[#00FFCC] uppercase">Responder_Org_Management</span>
                        </div>
                        <h1 className="font-outfit text-5xl lg:text-6xl font-black tracking-tighter uppercase leading-none">
                            ORG<br />
                            <span className="bg-gradient-to-r from-[#00FFCC] via-white to-white/40 bg-clip-text text-transparent italic">COMMAND</span>
                        </h1>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                        {[
                            { label: 'Vehicles', value: data.fleet.length, sub: `${data.fleet.filter(f => f.status === 'Available').length} available` },
                            { label: 'Equipment', value: data.equipment.reduce((a, e) => a + Number(e.qty), 0), sub: 'total items' },
                            { label: 'Personnel', value: data.personnel.length, sub: `${data.personnel.filter(p => p.status === 'On Duty').length} on duty` },
                            { label: 'Incidents', value: data.incidents.length, sub: `${data.incidents.filter(i => i.status === 'Active').length} active` },
                        ].map(s => (
                            <div key={s.label} className="bg-white/5 border border-white/5 p-6">
                                <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mb-2">{s.label}</p>
                                <p className="font-outfit font-black text-4xl text-white tracking-tighter">{s.value}</p>
                                <p className="text-[9px] font-mono text-[#00FFCC]/60 mt-1 uppercase tracking-widest">{s.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tab Bar + Search + Add */}
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
                            <button onClick={() => setModal(activeTab)}
                                className="flex items-center gap-2 px-6 py-3 bg-[#00FFCC] text-black font-outfit font-black text-xs uppercase tracking-widest hover:brightness-110">
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>
                    </div>

                    {/* ── FLEET TAB ── */}
                    {activeTab === 'fleet' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.fleet.map(v => (
                                <div key={v.id} className="bg-white/5 border border-white/5 p-6 hover:border-[#00FFCC]/20 transition-all group relative">
                                    <button onClick={() => { if (window.confirm('Remove this vehicle?')) removeItem('fleet', v.id); }} className="absolute top-4 right-4 text-white/10 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    <div className="flex items-start gap-4 mb-5">
                                        <div className="w-12 h-12 bg-white/5 border border-white/5 flex items-center justify-center text-[#00FFCC]">
                                            <Truck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-outfit font-black text-lg text-white uppercase tracking-tight">{v.name}</h3>
                                            <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">{v.reg}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-mono text-white/30 uppercase">{v.type}</span>
                                        <Badge label={v.status} />
                                    </div>
                                    <p className="text-[9px] font-mono text-white/20 mt-3 uppercase tracking-widest">Last service: {v.lastService}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── EQUIPMENT TAB ── */}
                    {activeTab === 'equipment' && (
                        <div className="bg-white/5 border border-white/5 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5 font-mono text-[9px] text-white/20 uppercase tracking-widest">
                                        {['Equipment', 'Qty', 'Condition', 'Location', 'Next Inspection', ''].map(h => (
                                            <th key={h} className="px-6 py-5 font-normal">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.equipment.map(e => (
                                        <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-all">
                                            <td className="px-6 py-5 font-outfit font-black text-white uppercase">{e.name}</td>
                                            <td className="px-6 py-5 font-outfit font-black text-2xl text-[#00FFCC]">{e.qty}</td>
                                            <td className="px-6 py-5"><Badge label={e.condition} /></td>
                                            <td className="px-6 py-5 font-mono text-xs text-white/40 uppercase"><MapPin className="w-3 h-3 inline mr-1 text-[#00FFCC]" />{e.location}</td>
                                            <td className="px-6 py-5 font-mono text-xs text-white/30">{e.nextInspection}</td>
                                            <td className="px-6 py-5"><button onClick={() => { if (window.confirm('Remove this equipment?')) removeItem('equipment', e.id); }}><Trash2 className="w-4 h-4 text-white/10 hover:text-red-500 transition-colors" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── PERSONNEL TAB ── */}
                    {activeTab === 'personnel' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.personnel.map(p => (
                                <div key={p.id} className="bg-white/5 border border-white/5 p-6 hover:border-white/10 transition-all relative group">
                                    <button onClick={() => { if (window.confirm('Remove this person?')) removeItem('personnel', p.id); }} className="absolute top-4 right-4 text-white/10 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-12 h-12 bg-black border border-white/10 flex items-center justify-center font-outfit font-black text-xl text-white">
                                            {p.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-outfit font-black text-base text-white uppercase">{p.name}</h3>
                                            <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{p.rank}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-mono text-white/20 uppercase"><Clock className="w-3 h-3 inline mr-1" />{p.shift} shift</span>
                                        <Badge label={p.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── INCIDENTS & ASSIGNMENTS TAB ── */}
                    {activeTab === 'incidents' && (
                        <div className="space-y-4">
                            {isLoadingAssignments ? (
                                <div className="p-12 text-center text-white/40 flex items-center justify-center gap-3 bg-white/5 border border-white/5">
                                    <Loader2 size={18} className="animate-spin text-[#00FFCC]" />
                                    <span className="font-mono text-xs uppercase tracking-widest">Loading mission assignments...</span>
                                </div>
                            ) : assignments.length === 0 ? (
                                <div className="p-12 text-center text-white/30 font-mono text-xs uppercase tracking-widest bg-white/5 border border-white/5">
                                    No active incident assignments found
                                </div>
                            ) : (
                                assignments
                                    .filter(a => {
                                        const query = search.toLowerCase();
                                        return (
                                            (a.incident?.title || '').toLowerCase().includes(query) ||
                                            (a.incident?.code || '').toLowerCase().includes(query) ||
                                            (a.incident?.location || '').toLowerCase().includes(query) ||
                                            (a.responder?.name || '').toLowerCase().includes(query)
                                        );
                                    })
                                    .map(a => {
                                        const isMyAssignment = user?.user_id === a.responder?.user_id;
                                        const statusColors = {
                                            'Pending': 'border-amber-500/40 text-amber-400 bg-amber-500/10',
                                            'Accepted': 'border-blue-500/40 text-blue-400 bg-blue-500/10',
                                            'EnRoute': 'border-purple-500/40 text-purple-400 bg-purple-500/10',
                                            'Arrived': 'border-teal-500/40 text-teal-400 bg-teal-500/10',
                                            'Completed': 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
                                            'Rejected': 'border-red-500/40 text-red-400 bg-red-500/10'
                                        };
                                        return (
                                            <div key={a.assignment_id} className="bg-white/5 border border-white/5 p-6 hover:border-white/10 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group">
                                                <div className="flex items-start gap-6">
                                                    <div className={`w-2 h-14 ${
                                                        a.incident?.priority === 'Critical' ? 'bg-red-500' :
                                                        a.incident?.priority === 'High' ? 'bg-amber-500' : 'bg-[#00FFCC]'
                                                    }`} />
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-mono text-[9px] px-2 py-0.5 bg-white/5 border border-white/10 text-[#00FFCC] font-black uppercase">
                                                                {a.incident?.code}
                                                            </span>
                                                            <span className="font-mono text-[9px] text-white/30 uppercase tracking-widest">
                                                                {a.incident?.type}
                                                            </span>
                                                            <span className="font-mono text-[9px] text-red-400 uppercase">
                                                                {a.incident?.priority} Priority
                                                            </span>
                                                        </div>
                                                        <h3 className="font-outfit font-black text-xl text-white uppercase tracking-tight mt-1">
                                                            {a.incident?.title}
                                                        </h3>
                                                        <div className="flex items-center gap-4 text-[10px] font-mono text-white/40 mt-1">
                                                            <span className="flex items-center gap-1">
                                                                <MapPin size={11} className="text-red-400" /> {a.incident?.location}
                                                            </span>
                                                            <span>• Assigned: {a.responder?.name} ({a.responder?.authority_type})</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 flex-wrap lg:flex-nowrap">
                                                    <span className={`px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest border ${statusColors[a.assignment_status] || 'border-white/10 text-white/50'}`}>
                                                        {a.assignment_status === 'EnRoute' ? 'En Route' : a.assignment_status}
                                                    </span>

                                                    {/* Status Controls */}
                                                    {(isMyAssignment || user?.role === 'admin') && a.assignment_status !== 'Completed' && a.assignment_status !== 'Rejected' && (
                                                        <div className="flex items-center gap-2">
                                                            {a.assignment_status === 'Pending' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleUpdateAssignmentStatus(a.assignment_id, 'Accepted')}
                                                                        disabled={updatingAssignmentId === a.assignment_id}
                                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                                                                    >
                                                                        Accept
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUpdateAssignmentStatus(a.assignment_id, 'Rejected')}
                                                                        disabled={updatingAssignmentId === a.assignment_id}
                                                                        className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-mono text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </>
                                                            )}
                                                            {a.assignment_status === 'Accepted' && (
                                                                <button
                                                                    onClick={() => handleUpdateAssignmentStatus(a.assignment_id, 'EnRoute')}
                                                                    disabled={updatingAssignmentId === a.assignment_id}
                                                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-mono text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                                                                >
                                                                    En Route →
                                                                </button>
                                                            )}
                                                            {a.assignment_status === 'EnRoute' && (
                                                                <button
                                                                    onClick={() => handleUpdateAssignmentStatus(a.assignment_id, 'Arrived')}
                                                                    disabled={updatingAssignmentId === a.assignment_id}
                                                                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-mono text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                                                                >
                                                                    Mark Arrived 📍
                                                                </button>
                                                            )}
                                                            {a.assignment_status === 'Arrived' && (
                                                                <button
                                                                    onClick={() => handleUpdateAssignmentStatus(a.assignment_id, 'Completed')}
                                                                    disabled={updatingAssignmentId === a.assignment_id}
                                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                                                                >
                                                                    Complete Mission ✓
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    )}
                </div>
            </main>

            {modal && (
                <CrudModal title={`Add ${modal}`} fields={MODAL_FIELDS[modal]}
                    onSave={form => addItem(modal, form)} onClose={() => setModal(null)} />
            )}
        </div>
    );
}
