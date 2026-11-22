import { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import * as api from '../api/index.js';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import { SZ } from '../constants';
import {
    Truck, Wrench, Users, ClipboardList, Plus, Trash2,
    Clock, MapPin, Search, Loader2, CheckCircle, Navigation, AlertCircle,
    Shield, ShieldAlert, Activity
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
        <div className="flex h-screen w-full overflow-hidden bg-[#EEF2F6] dark:bg-[#08080A] text-slate-800 dark:text-[#E5E5E7] font-inter">
            <Sidebar />
            <TopNavbar />
            <main className={`flex-1 overflow-x-hidden overflow-y-auto relative z-10 ${isSidebarOpen ? 'ml-sidebar-open' : 'ml-sidebar-closed'}`}
                style={{ marginTop: SZ.navbarH, height: `calc(100vh - ${SZ.navbarH}px)` }}>
                <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">

                    {/* Executive Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                                <span className="text-[11px] font-mono tracking-widest text-teal-600 dark:text-[#00FFCC] font-bold uppercase">
                                    TACTICAL COMMAND & FLEET LOGISTICS
                                </span>
                            </div>
                            <h1 className="font-poppins text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Responder & Fleet Management
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400 mt-1">
                                Real-time dispatch telemetry, vehicle readiness status, supply caches, and duty personnel rosters.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setModal(activeTab)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm transition-all"
                            >
                                <Plus size={15} /> Add {activeTab === 'fleet' ? 'Vehicle' : activeTab === 'equipment' ? 'Equipment' : activeTab === 'personnel' ? 'Personnel' : 'Incident'}
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Vehicles', value: data.fleet.length, sub: `${data.fleet.filter(f => f.status === 'Available').length} available`, icon: Truck, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-500/10' },
                            { label: 'Equipment Items', value: data.equipment.reduce((a, e) => a + Number(e.qty), 0), sub: 'total inventory count', icon: Wrench, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/10' },
                            { label: 'Active Personnel', value: data.personnel.length, sub: `${data.personnel.filter(p => p.status === 'On Duty').length} on active duty`, icon: Users, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-500/10' },
                            { label: 'Logged Missions', value: data.incidents.length, sub: `${data.incidents.filter(i => i.status === 'Active').length} currently active`, icon: ClipboardList, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/10' },
                        ].map(s => (
                            <div key={s.label} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl p-5 shadow-xs flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">{s.label}</p>
                                    <p className="font-poppins font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white mt-1">{s.value}</p>
                                    <p className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-medium mt-1">{s.sub}</p>
                                </div>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.bg} ${s.color}`}>
                                    <s.icon size={22} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tab Navigation & Search */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-white/5 border border-slate-300 dark:border-white/10 gap-1 overflow-x-auto">
                            {TABS.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => { setActiveTab(id); setSearch(''); }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                        activeTab === id
                                            ? 'bg-teal-600 text-white dark:bg-teal-500/20 dark:text-[#00FFCC] shadow-xs'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <Icon size={14} /> {label}
                                </button>
                            ))}
                        </div>

                        <div className="relative min-w-[240px] sm:w-72">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search vehicles, equipment..."
                                className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] pl-10 pr-4 py-2 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-teal-500 shadow-2xs"
                            />
                        </div>
                    </div>

                    {/* ── FLEET TAB ── */}
                    {activeTab === 'fleet' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filtered.fleet.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-slate-400 dark:text-gray-500 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl">
                                    No fleet vehicles matched your search.
                                </div>
                            ) : (
                                filtered.fleet.map(v => (
                                    <div key={v.id} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all relative group">
                                        <button
                                            onClick={() => { if (window.confirm('Remove this vehicle?')) removeItem('fleet', v.id); }}
                                            className="absolute top-4 right-4 text-slate-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors p-1"
                                            title="Delete vehicle"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-11 h-11 bg-teal-50 dark:bg-white/5 border border-teal-100 dark:border-white/10 rounded-xl flex items-center justify-center text-teal-600 dark:text-[#00FFCC] flex-shrink-0">
                                                <Truck size={20} />
                                            </div>
                                            <div className="pr-6">
                                                <h3 className="font-poppins font-bold text-base text-slate-900 dark:text-white truncate">{v.name}</h3>
                                                <p className="text-xs font-mono text-slate-500 dark:text-gray-400 uppercase tracking-wider">{v.reg}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                                            <span className="text-xs font-medium text-slate-600 dark:text-gray-400">{v.type}</span>
                                            <Badge label={v.status} />
                                        </div>
                                        <p className="text-[11px] font-mono text-slate-500 dark:text-gray-500 mt-2.5">Last service: {v.lastService}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ── EQUIPMENT TAB ── */}
                    {activeTab === 'equipment' && (
                        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl shadow-xs overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-[#1F2937] bg-slate-50/70 dark:bg-white/[0.02] text-xs font-semibold text-slate-600 dark:text-gray-400">
                                        {['Equipment Name', 'Quantity', 'Condition', 'Storage Location', 'Next Inspection', 'Actions'].map(h => (
                                            <th key={h} className="px-6 py-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {filtered.equipment.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-slate-400 dark:text-gray-500 text-sm">
                                                No equipment matched your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.equipment.map(e => (
                                            <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 font-semibold text-sm text-slate-900 dark:text-white">{e.name}</td>
                                                <td className="px-6 py-4 font-poppins font-bold text-lg text-teal-700 dark:text-[#00FFCC]">{e.qty}</td>
                                                <td className="px-6 py-4"><Badge label={e.condition} /></td>
                                                <td className="px-6 py-4 text-xs font-mono text-slate-600 dark:text-gray-400">
                                                    <MapPin className="w-3.5 h-3.5 inline mr-1 text-teal-600 dark:text-[#00FFCC]" />{e.location}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-mono text-slate-500 dark:text-gray-500">{e.nextInspection}</td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => { if (window.confirm('Remove this equipment item?')) removeItem('equipment', e.id); }}
                                                        className="text-slate-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors p-1"
                                                        title="Delete equipment"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── PERSONNEL TAB ── */}
                    {activeTab === 'personnel' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filtered.personnel.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-slate-400 dark:text-gray-500 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl">
                                    No personnel matched your search.
                                </div>
                            ) : (
                                filtered.personnel.map(p => (
                                    <div key={p.id} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all relative group">
                                        <button
                                            onClick={() => { if (window.confirm('Remove this person?')) removeItem('personnel', p.id); }}
                                            className="absolute top-4 right-4 text-slate-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors p-1"
                                            title="Delete personnel"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-11 h-11 bg-teal-50 dark:bg-white/5 border border-teal-100 dark:border-white/10 rounded-xl flex items-center justify-center font-poppins font-bold text-base text-teal-700 dark:text-white flex-shrink-0">
                                                {p.name.charAt(0)}
                                            </div>
                                            <div className="pr-6">
                                                <h3 className="font-poppins font-bold text-base text-slate-900 dark:text-white truncate">{p.name}</h3>
                                                <p className="text-xs text-slate-500 dark:text-gray-400">{p.rank}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                                            <span className="text-xs text-slate-600 dark:text-gray-400 flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" /> {p.shift} shift
                                            </span>
                                            <Badge label={p.status} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ── INCIDENTS & ASSIGNMENTS TAB ── */}
                    {activeTab === 'incidents' && (
                        <div className="space-y-4">
                            {isLoadingAssignments ? (
                                <div className="p-12 text-center text-slate-400 dark:text-gray-500 flex items-center justify-center gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl">
                                    <Loader2 size={18} className="animate-spin text-teal-600 dark:text-[#00FFCC]" />
                                    <span className="font-mono text-xs uppercase tracking-widest">Loading mission assignments...</span>
                                </div>
                            ) : assignments.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 dark:text-gray-500 font-mono text-xs uppercase tracking-widest bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl">
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
                                            'Pending': 'border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
                                            'Accepted': 'border-blue-300 dark:border-blue-500/40 text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10',
                                            'EnRoute': 'border-purple-300 dark:border-purple-500/40 text-purple-800 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10',
                                            'Arrived': 'border-teal-300 dark:border-teal-500/40 text-teal-800 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10',
                                            'Completed': 'border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
                                            'Rejected': 'border-red-300 dark:border-red-500/40 text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-500/10'
                                        };
                                        return (
                                            <div key={a.assignment_id} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group">
                                                <div className="flex items-start gap-4">
                                                    <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${
                                                        a.incident?.priority === 'Critical' ? 'bg-red-500' :
                                                        a.incident?.priority === 'High' ? 'bg-amber-500' : 'bg-teal-500'
                                                    }`} />
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-mono text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-teal-700 dark:text-[#00FFCC] font-bold rounded">
                                                                {a.incident?.code}
                                                            </span>
                                                            <span className="text-[11px] font-mono text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                                                                {a.incident?.type}
                                                            </span>
                                                            <span className="text-[11px] font-bold text-red-600 dark:text-red-400">
                                                                {a.incident?.priority} Priority
                                                            </span>
                                                        </div>
                                                        <h3 className="font-poppins font-bold text-lg text-slate-900 dark:text-white mt-1">
                                                            {a.incident?.title}
                                                        </h3>
                                                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-gray-400 mt-1">
                                                            <span className="flex items-center gap-1">
                                                                <MapPin size={12} className="text-red-500" /> {a.incident?.location}
                                                            </span>
                                                            <span>• Assigned: <strong className="text-slate-800 dark:text-gray-200">{a.responder?.name}</strong> ({a.responder?.authority_type})</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
                                                    <span className={`px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider rounded border ${statusColors[a.assignment_status] || 'border-slate-200 text-slate-600 dark:border-white/10 dark:text-white/50'}`}>
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
                                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                                                                    >
                                                                        Accept
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUpdateAssignmentStatus(a.assignment_id, 'Rejected')}
                                                                        disabled={updatingAssignmentId === a.assignment_id}
                                                                        className="px-3 py-1.5 bg-red-100 hover:bg-red-600 text-red-700 hover:text-white dark:bg-red-600/20 dark:hover:bg-red-600 dark:text-red-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 border border-red-200 dark:border-transparent"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </>
                                                            )}
                                                            {a.assignment_status === 'Accepted' && (
                                                                <button
                                                                    onClick={() => handleUpdateAssignmentStatus(a.assignment_id, 'EnRoute')}
                                                                    disabled={updatingAssignmentId === a.assignment_id}
                                                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                                                                >
                                                                    En Route →
                                                                </button>
                                                            )}
                                                            {a.assignment_status === 'EnRoute' && (
                                                                <button
                                                                    onClick={() => handleUpdateAssignmentStatus(a.assignment_id, 'Arrived')}
                                                                    disabled={updatingAssignmentId === a.assignment_id}
                                                                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                                                                >
                                                                    Mark Arrived 📍
                                                                </button>
                                                            )}
                                                            {a.assignment_status === 'Arrived' && (
                                                                <button
                                                                    onClick={() => handleUpdateAssignmentStatus(a.assignment_id, 'Completed')}
                                                                    disabled={updatingAssignmentId === a.assignment_id}
                                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
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
