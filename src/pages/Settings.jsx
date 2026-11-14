import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';
import * as api from '../api/index.js';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import ErrorBoundary from '../components/ErrorBoundary';
import { SZ } from '../constants';
import {
    Settings as SettingsIcon, Users, Building2, Bell, Shield,
    Server, Cpu, Activity,
    Search, Edit2,
    Clock, AlertCircle,
    Smartphone, LogOut, ChevronDown, Filter, Trash2,
    Zap, Lock, Loader2, RefreshCw, Power
} from 'lucide-react';

const SETTINGS_ERROR_FALLBACK = (
    <div className="h-screen w-full bg-[#08080A] flex flex-col items-center justify-center p-10 text-center">
        <div className="w-16 h-16 border border-red-500/20 flex items-center justify-center mb-6">
            <AlertCircle className="text-red-500" size={32} />
        </div>
        <h2 className="font-outfit font-black text-2xl text-white uppercase tracking-tighter mb-2">SYSTEM ERROR</h2>
        <p className="font-mono text-[9px] text-white/20 uppercase tracking-[0.4em] mb-8">Connection lost // Refresh to retry</p>
        <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-red-600 text-white font-mono text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
        >
            RETRY CONNECTION
        </button>
    </div>
);

// ── CUSTOM COMPONENTS ──

function SettingCard({ title, description, icon: Icon, children, accent = "#00FFCC", badge }) {
    return (
        <div className="bg-[#0E1015]/95 border border-white/5 p-6 lg:p-8 flex flex-col h-full group hover:border-white/10 transition-all duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-[0.02] pointer-events-none group-hover:opacity-[0.04] transition-opacity" style={{ backgroundColor: accent }} />
            
            <div className="flex items-center justify-between mb-4 relative z-20">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-white/5 border border-white/5 text-white/40 group-hover:text-white transition-colors">
                        {Icon && <Icon size={18} />}
                    </div>
                    <div>
                        <h3 className="font-outfit font-black text-xl text-white uppercase tracking-tight leading-none">{title}</h3>
                    </div>
                </div>
                {badge && (
                    <span className="px-3 py-1 bg-white/5 border border-white/5 font-mono text-[8px] text-white/40 uppercase tracking-widest">{badge}</span>
                )}
            </div>

            {description && (
                <p className="font-mono text-[9px] text-white/20 uppercase tracking-[0.2em] mb-8 relative z-20 border-b border-white/5 pb-4">
                    {description}
                </p>
            )}
            
            <div className="flex-1 relative z-10 w-full overflow-hidden">
                {children}
            </div>
        </div>
    );
}

function Toggle({ enabled, onChange, label, subLabel }) {
    return (
        <div className="flex items-center justify-between py-3 group/toggle cursor-pointer border-b border-white/[0.02] last:border-0" onClick={() => onChange(!enabled)}>
            <div className="flex flex-col">
                <span className="font-mono text-[10px] text-white/40 group-hover/toggle:text-white transition-colors uppercase tracking-widest">{label}</span>
                {subLabel && <span className="text-[8px] font-mono text-white/10 uppercase mt-1">{subLabel}</span>}
            </div>
            <div className={`w-10 h-5 relative flex items-center transition-all ${enabled ? 'bg-red-500/20' : 'bg-white/5'} border border-white/10 p-0.5`}>
                <div className={`w-3.5 h-3.5 transition-all ${enabled ? 'translate-x-5 bg-red-500 shadow-[0_0_10px_#ef4444]' : 'translate-x-0 bg-white/20'}`} />
            </div>
        </div>
    );
}

function TableHeader({ columns }) {
    return (
        <thead>
            <tr className="border-b border-white/5 text-[9px] font-mono text-white/20 uppercase tracking-[0.4em] text-left">
                {columns.map((c, i) => (
                    <th key={i} className="px-6 py-4 font-normal">{c}</th>
                ))}
                <th className="px-6 py-4 font-normal text-right">ACTIONS</th>
            </tr>
        </thead>
    );
}

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-[#0E1015] border border-white/10 p-10 space-y-8 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                <div className="space-y-4">
                    <h3 className="font-outfit font-black text-2xl text-white uppercase tracking-tighter">{title}</h3>
                    <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
                        {message}
                    </p>
                </div>
                <div className="flex gap-4">
                    <button onClick={onCancel} className="flex-1 py-4 bg-white/5 border border-white/10 text-white font-mono text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                    <button onClick={onConfirm} className="flex-1 py-4 bg-red-600 text-white font-mono text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all">Confirm</button>
                </div>
            </div>
        </div>
    );
};

const OrgModal = ({ isOpen, isEditing, formData, onChange, onSubmit, onCancel, isSubmitting }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-lg bg-[#0E1015] border border-white/10 p-8 space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.15)] relative">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <h3 className="font-outfit font-black text-2xl text-white uppercase tracking-tight">
                        {isEditing ? 'Edit Organization' : 'Add Organization'}
                    </h3>
                    <button onClick={onCancel} className="text-white/40 hover:text-white transition-colors">✕</button>
                </div>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">Organization Name*</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => onChange({ ...formData, name: e.target.value })}
                            placeholder="e.g. Mangaluru Central Hospital"
                            className="w-full bg-white/5 border border-white/10 px-4 py-2.5 font-mono text-[11px] text-white outline-none focus:border-red-500/50"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">Type*</label>
                            <select
                                value={formData.org_type}
                                onChange={e => onChange({ ...formData, org_type: e.target.value })}
                                className="w-full bg-[#111318] border border-white/10 px-4 py-2.5 font-mono text-[11px] text-white outline-none focus:border-red-500/50"
                            >
                                <option value="Hospital">Hospital</option>
                                <option value="FireDept">Fire Dept</option>
                                <option value="Police">Police</option>
                                <option value="Military">Military</option>
                                <option value="NGO">NGO</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">Status*</label>
                            <select
                                value={formData.status}
                                onChange={e => onChange({ ...formData, status: e.target.value })}
                                className="w-full bg-[#111318] border border-white/10 px-4 py-2.5 font-mono text-[11px] text-white outline-none focus:border-red-500/50"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">Contact Number</label>
                            <input
                                type="text"
                                value={formData.contact_number}
                                onChange={e => onChange({ ...formData, contact_number: e.target.value })}
                                placeholder="e.g. 08242225533"
                                className="w-full bg-white/5 border border-white/10 px-4 py-2.5 font-mono text-[11px] text-white outline-none focus:border-red-500/50"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">Capacity Note</label>
                            <input
                                type="text"
                                value={formData.capacity_note}
                                onChange={e => onChange({ ...formData, capacity_note: e.target.value })}
                                placeholder="e.g. 150 Beds"
                                className="w-full bg-white/5 border border-white/10 px-4 py-2.5 font-mono text-[11px] text-white outline-none focus:border-red-500/50"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">Address / Location</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={e => onChange({ ...formData, address: e.target.value })}
                            placeholder="e.g. Hampankatta, Mangaluru"
                            className="w-full bg-white/5 border border-white/10 px-4 py-2.5 font-mono text-[11px] text-white outline-none focus:border-red-500/50"
                        />
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-3 bg-white/5 border border-white/10 text-white font-mono text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-red-600 text-white font-mono text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : isEditing ? 'Update Organization' : 'Create Organization'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UserEditModal = ({ isOpen, user, role, is_active, onChangeRole, onChangeActive, onSubmit, onCancel, isSubmitting, isSelf }) => {
    if (!isOpen || !user) return null;
    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-[#0E1015] border border-white/10 p-8 space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                        <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#f59e0b]">USER MANAGEMENT</span>
                        <h3 className="font-outfit font-black text-2xl text-white uppercase tracking-tight mt-1">
                            Edit User & Role
                        </h3>
                    </div>
                    <button onClick={onCancel} className="text-white/40 hover:text-white transition-colors">✕</button>
                </div>
                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="p-4 bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest">User Profile</div>
                        <div className="font-bold text-white text-sm">{user.name || user.full_name}</div>
                        <div className="font-mono text-[10px] text-white/40">{user.email} • {user.phone_number}</div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">Role*</label>
                        <select
                            value={role}
                            disabled={isSelf}
                            onChange={e => onChangeRole(e.target.value)}
                            className="w-full bg-[#111318] border border-white/10 px-4 py-3 font-mono text-[11px] text-white outline-none focus:border-amber-500/50 disabled:opacity-50"
                        >
                            <option value="admin">Admin</option>
                            <option value="responder">Responder</option>
                            <option value="hospital">Hospital Representative</option>
                            <option value="citizen">Citizen</option>
                        </select>
                        {isSelf && (
                            <p className="text-[8px] font-mono text-amber-500/80 mt-1 uppercase">Cannot change your own admin role</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">Account Status*</label>
                        <select
                            value={is_active ? '1' : '0'}
                            disabled={isSelf}
                            onChange={e => onChangeActive(e.target.value === '1')}
                            className="w-full bg-[#111318] border border-white/10 px-4 py-3 font-mono text-[11px] text-white outline-none focus:border-amber-500/50 disabled:opacity-50"
                        >
                            <option value="1">Active</option>
                            <option value="0">Deactivated</option>
                        </select>
                        {isSelf && (
                            <p className="text-[8px] font-mono text-amber-500/80 mt-1 uppercase">Cannot deactivate your own account</p>
                        )}
                    </div>

                    <div className="flex gap-4 pt-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-3 bg-white/5 border border-white/10 text-white font-mono text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-amber-500 text-black font-mono text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── MAIN CONTENT ──

function SettingsContent() {
    const { isSidebarOpen, addToast, logout, user: currentUser } = useDashboard();
    const navigate = useNavigate();
    
    // States
    const [notifs, setNotifs] = useState({ alerts: true, email: false, sms: true });
    const [config, setConfig] = useState({ respTime: '15', threshold: 'Critical', autoDispatch: true });
    const [tfa, setTfa] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Organizations state
    const [orgs, setOrgs] = useState([]);
    const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
    const [orgError, setOrgError] = useState(null);
    const [orgSearch, setOrgSearch] = useState('');

    // Users state
    const [users, setUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [userError, setUserError] = useState(null);
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [userEditModal, setUserEditModal] = useState({ open: false, user: null, role: 'citizen', is_active: true });
    const [isUpdatingUser, setIsUpdatingUser] = useState(false);

    // Modal controls
    const [modal, setModal] = useState({ open: false, type: '', data: null });
    const [orgModal, setOrgModal] = useState({ open: false, isEditing: false, data: null });
    const [orgForm, setOrgForm] = useState({
        name: '',
        org_type: 'Hospital',
        contact_number: '',
        address: '',
        capacity_note: '',
        status: 'Active'
    });
    const [isSubmittingOrg, setIsSubmittingOrg] = useState(false);

    const loadOrgs = async () => {
        try {
            setIsLoadingOrgs(true);
            setOrgError(null);
            const { data } = await api.fetchOrganizations();
            setOrgs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load organizations:', err);
            setOrgError(err.response?.data?.error || 'Failed to load organizations from database');
        } finally {
            setIsLoadingOrgs(false);
        }
    };

    const loadUsers = async () => {
        try {
            setIsLoadingUsers(true);
            setUserError(null);
            const params = {};
            if (roleFilter !== 'All') params.role = roleFilter;
            const { data } = await api.fetchUsers(params);
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load users:', err);
            setUserError(err.response?.data?.error || 'Failed to load users from database');
        } finally {
            setIsLoadingUsers(false);
        }
    };

    useEffect(() => {
        loadOrgs();
    }, []);

    useEffect(() => {
        loadUsers();
    }, [roleFilter]);

    const filteredOrgs = orgs.filter(o => (o.name || '').toLowerCase().includes(orgSearch.toLowerCase()));
    const filteredUsers = users.filter(u => {
        const query = userSearch.toLowerCase();
        const nameMatch = (u.name || u.full_name || '').toLowerCase().includes(query);
        const emailMatch = (u.email || '').toLowerCase().includes(query);
        const phoneMatch = (u.phone_number || '').toLowerCase().includes(query);
        const orgMatch = (u.org || u.org_name || '').toLowerCase().includes(query);
        return nameMatch || emailMatch || phoneMatch || orgMatch;
    });

    useEffect(() => {
        const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const openConfirm = (type, data) => setModal({ open: true, type, data });
    const closeConfirm = () => setModal({ open: false, type: '', data: null });

    const handleOpenAddOrg = () => {
        setOrgForm({
            name: '',
            org_type: 'Hospital',
            contact_number: '',
            address: '',
            capacity_note: '',
            status: 'Active'
        });
        setOrgModal({ open: true, isEditing: false, data: null });
    };

    const handleOpenEditOrg = (org) => {
        setOrgForm({
            name: org.name || '',
            org_type: org.org_type || org.type || 'Hospital',
            contact_number: org.contact_number || (org.contact !== 'N/A' ? org.contact : '') || '',
            address: org.address || (org.location !== 'N/A' ? org.location : '') || '',
            capacity_note: org.capacity_note || '',
            status: org.status || 'Active'
        });
        setOrgModal({ open: true, isEditing: true, data: org });
    };

    const handleSaveOrg = async (e) => {
        e.preventDefault();
        try {
            setIsSubmittingOrg(true);
            if (orgModal.isEditing && orgModal.data) {
                const targetId = orgModal.data.id || orgModal.data.org_id;
                const { data } = await api.updateOrganization(targetId, orgForm);
                setOrgs(prev => prev.map(o => (o.id || o.org_id) === targetId ? data : o));
                addToast('Organization updated successfully', 'success');
            } else {
                const { data } = await api.createOrganization(orgForm);
                setOrgs(prev => [...prev, data]);
                addToast('Organization created successfully', 'success');
            }
            setOrgModal({ open: false, isEditing: false, data: null });
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Failed to save organization';
            addToast(msg, 'error');
        } finally {
            setIsSubmittingOrg(false);
        }
    };

    const handleToggleUserStatus = async (targetUser) => {
        const targetId = targetUser.id || targetUser.user_id;
        const myId = currentUser?.user_id || currentUser?.id;

        if (myId === targetId && targetUser.is_active) {
            addToast('You cannot deactivate your own admin account.', 'error');
            return;
        }

        try {
            const nextStatus = !targetUser.is_active;
            await api.updateUserStatus(targetId, nextStatus);
            setUsers(prev => prev.map(u => (u.id || u.user_id) === targetId ? { ...u, is_active: nextStatus, status: nextStatus ? 'Active' : 'Deactivated' } : u));
            addToast(`User ${targetUser.name || targetUser.full_name} is now ${nextStatus ? 'active' : 'deactivated'}.`, 'success');
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Failed to update user status';
            addToast(msg, 'error');
        }
    };

    const handleOpenEditUser = (targetUser) => {
        setUserEditModal({
            open: true,
            user: targetUser,
            role: targetUser.role || 'citizen',
            is_active: Boolean(targetUser.is_active)
        });
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        if (!userEditModal.user) return;
        const targetId = userEditModal.user.id || userEditModal.user.user_id;
        const myId = currentUser?.user_id || currentUser?.id;

        if (myId === targetId && !userEditModal.is_active) {
            addToast('You cannot deactivate your own admin account.', 'error');
            return;
        }
        if (myId === targetId && userEditModal.role !== 'admin') {
            addToast('You cannot remove your own admin privileges.', 'error');
            return;
        }

        try {
            setIsUpdatingUser(true);
            const { data } = await api.updateUser(targetId, {
                role: userEditModal.role,
                is_active: userEditModal.is_active
            });
            setUsers(prev => prev.map(u => (u.id || u.user_id) === targetId ? data : u));
            addToast(`Updated ${data.name || data.full_name} successfully`, 'success');
            setUserEditModal({ open: false, user: null, role: 'citizen', is_active: true });
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Failed to update user';
            addToast(msg, 'error');
        } finally {
            setIsUpdatingUser(false);
        }
    };

    const handleConfirm = async () => {
        if (modal.type === 'delete_org' && modal.data) {
            try {
                const targetId = modal.data.id || modal.data.org_id;
                await api.deleteOrganization(targetId);
                setOrgs(prev => prev.filter(o => (o.id || o.org_id) !== targetId));
                addToast('Organization removed', 'success');
            } catch (err) {
                const msg = err.response?.data?.error || err.message || 'Failed to delete organization';
                addToast(msg, 'error');
            }
        } else if (modal.type === 'delete_user' && modal.data) {
            await handleToggleUserStatus(modal.data);
        } else if (modal.type === 'logout_all') {
            addToast('All other sessions terminated', 'info');
        }
        closeConfirm();
    };

    const handleLogout = () => {
        addToast('Terminating session...', 'info');
        logout();
        setTimeout(() => {
            navigate('/');
        }, 800);
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#08080A] text-[#E5E5E7] font-inter">
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.03]">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,204,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,204,0.01)_1px,transparent_1px)] bg-[size:100px_100px]" />
                <div 
                  className="absolute w-[800px] h-[800px] rounded-full blur-[200px] bg-red-600 transition-transform duration-1000"
                  style={{ transform: `translate(${mousePos.x - 400}px, ${mousePos.y - 400}px)` }}
                />
            </div>

            <Sidebar />
            <TopNavbar />

            <main
                className={`flex-1 overflow-x-hidden overflow-y-auto transition-all duration-500 relative z-10 custom-scrollbar will-change-transform ${isSidebarOpen ? 'ml-sidebar-open' : 'ml-sidebar-closed'}`}
                style={{
                    marginTop: SZ.navbarH,
                    height: `calc(100vh - ${SZ.navbarH}px)`,
                }}
            >
                <div className="max-w-[1700px] mx-auto fluid-p">

                    <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 pb-8">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <SettingsIcon size={14} className="text-red-500" />
                                <span className="text-[10px] font-mono font-bold tracking-[0.4em] text-red-500 uppercase">SYSTEM SETTINGS</span>
                            </div>
                            <h1 className="font-outfit text-4xl lg:text-5xl font-black tracking-tighter uppercase text-white leading-none">
                                SETTINGS<span className="text-white/20">://</span>PANEL
                            </h1>
                        </div>
                        <div className="flex items-center gap-4 mt-6 md:mt-0 px-4 py-2 bg-white/5 border border-white/10 font-mono text-[9px] uppercase tracking-widest text-white/40">
                           <Activity size={12} className="text-blue-500" /> STATUS: OPERATIONAL
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-8 mb-14">
                        
                        {/* 1. ORGANIZATIONS */}
                        <div className="col-span-12 lg:col-span-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <SettingCard 
                                title="Organizations" 
                                description="Manage emergency units, hospitals, and logistical partners participating in crisis response."
                                icon={Building2} 
                                accent="#3b82f6"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <div className="relative group flex-1 max-w-xs">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-red-500 transition-colors" size={12} />
                                        <input type="text" placeholder="Search entries..." value={orgSearch} onChange={e => setOrgSearch(e.target.value)} className="w-full bg-white/5 border border-white/5 px-10 py-2.5 font-mono text-[10px] uppercase tracking-widest outline-none focus:border-red-500/30 transition-all text-white" />
                                    </div>
                                    <button
                                        onClick={handleOpenAddOrg}
                                        className="px-6 py-2.5 bg-red-600 text-white font-mono text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
                                    >
                                        Add Organization
                                    </button>
                                </div>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full min-w-[900px]">
                                        <TableHeader columns={['NAME', 'TYPE', 'CONTACT', 'CAPACITY', 'STATUS']} />
                                        <tbody className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                                            {isLoadingOrgs ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-white/40">
                                                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-red-500" />
                                                        <span className="font-mono text-[9px] uppercase tracking-widest">Loading organizations from database...</span>
                                                    </td>
                                                </tr>
                                            ) : orgError ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-red-400">
                                                        <AlertCircle className="w-5 h-5 mx-auto mb-2 text-red-500" />
                                                        <p className="font-mono text-[10px] uppercase tracking-widest mb-3">{orgError}</p>
                                                        <button onClick={loadOrgs} className="px-4 py-1.5 bg-white/5 border border-white/10 text-white font-mono text-[8px] uppercase tracking-widest hover:bg-white/10">Retry</button>
                                                    </td>
                                                </tr>
                                            ) : filteredOrgs.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-white/20 font-mono text-[10px] uppercase tracking-widest">
                                                        No organizations found matching "{orgSearch}"
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredOrgs.map((org) => (
                                                    <tr key={org.id || org.org_id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-6 py-5 font-black text-white">{org.name}</td>
                                                        <td className="px-6 py-5">{org.type || org.org_type}</td>
                                                        <td className="px-6 py-5 text-[9px]">{org.contact || org.contact_number || 'N/A'}</td>
                                                        <td className="px-6 py-5 text-blue-400 font-bold">{org.capacity || org.capacity_note || 'N/A'}</td>
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${org.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                                <span className={org.status === 'Active' ? 'text-emerald-500' : 'text-red-500/60'}>
                                                                    {org.status}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            <div className="flex justify-end gap-4">
                                                                <button
                                                                    onClick={() => handleOpenEditOrg(org)}
                                                                    className="text-white/20 hover:text-white transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Edit2 size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={() => openConfirm('delete_org', org)}
                                                                    className="text-white/20 hover:text-red-500 transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </SettingCard>
                        </div>

                        {/* 2. SYSTEM STATUS */}
                        <div className="col-span-12 lg:col-span-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                            <SettingCard 
                                title="System Status" 
                                description="Live monitoring of server infrastructure and global response reliability indices."
                                icon={Server} 
                                accent="#a855f7" 
                                badge="LIVE"
                            >
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[8px] font-mono text-white/30 tracking-widest uppercase">Global Health</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                                                <span className="font-outfit font-black text-xl text-white uppercase tracking-tight">OPERATIONAL</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-[8px] font-mono text-white/30 tracking-widest uppercase">Last Sync</span>
                                            <span className="font-mono text-[10px] text-white/60 uppercase">Just now</span>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between items-end mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Cpu size={12} className="text-blue-400" />
                                                    <span className="font-mono text-[9px] text-white/40 uppercase tracking-widest">Server Load</span>
                                                </div>
                                                <span className="font-outfit font-black text-sm text-white">42%</span>
                                            </div>
                                            <div className="h-1 bg-white/5 w-full relative">
                                                <div className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_10px_#3b82f640]" style={{ width: '42%' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-end mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Activity size={12} className="text-purple-400" />
                                                    <span className="font-mono text-[9px] text-white/40 uppercase tracking-widest">Network Speed</span>
                                                </div>
                                                <span className="font-outfit font-black text-sm text-white">892 Mbps</span>
                                            </div>
                                            <div className="h-1 bg-white/5 w-full relative">
                                                <div className="h-full bg-purple-500 transition-all duration-1000 shadow-[0_0_10px_#a855f740]" style={{ width: '78%' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 flex items-center justify-between font-mono text-[8px] text-white/20 uppercase tracking-[0.2em] font-black">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10">UPTIME: 142 Days</div>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10">HEALTH: 100%</div>
                                    </div>
                                </div>
                            </SettingCard>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-8 mb-14">
                        
                        {/* 3. USERS & ROLES */}
                        <div className="col-span-12 lg:col-span-7 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                            <SettingCard 
                                title="Users & Roles" 
                                description="Manage system administrators, field responders, and organization operators."
                                icon={Users} 
                                accent="#f59e0b"
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="relative group max-w-xs flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500 transition-colors" size={12} />
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={userSearch}
                                            onChange={e => setUserSearch(e.target.value)}
                                            className="w-full bg-white/5 border border-white/5 px-10 py-2.5 font-mono text-[10px] uppercase tracking-widest outline-none focus:border-amber-500/30 transition-all text-white"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10">
                                         <Filter size={12} className="text-white/20" />
                                         <select
                                            value={roleFilter}
                                            onChange={e => setRoleFilter(e.target.value)}
                                            className="bg-transparent font-mono text-[8px] text-white/70 uppercase tracking-widest outline-none cursor-pointer"
                                         >
                                            <option value="All" className="bg-[#0b0d13] text-white">All Roles</option>
                                            <option value="admin" className="bg-[#0b0d13] text-white">Admin</option>
                                            <option value="responder" className="bg-[#0b0d13] text-white">Responder</option>
                                            <option value="hospital" className="bg-[#0b0d13] text-white">Hospital</option>
                                            <option value="citizen" className="bg-[#0b0d13] text-white">Citizen</option>
                                         </select>
                                    </div>
                                </div>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full min-w-[700px]">
                                        <TableHeader columns={['NAME / CONTACT', 'ROLE', 'ORGANIZATION', 'STATUS', 'REGISTERED', 'ACTIONS']} />
                                        <tbody className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                                            {isLoadingUsers ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-white/40">
                                                        <Loader2 className="animate-spin inline-block mr-2" size={16} /> Loading users from database...
                                                    </td>
                                                </tr>
                                            ) : userError ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-red-400">
                                                        {userError}
                                                    </td>
                                                </tr>
                                            ) : filteredUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-white/30">
                                                        No users found matching query
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredUsers.map((user) => {
                                                    const userId = user.id || user.user_id;
                                                    const isSelf = (currentUser?.user_id || currentUser?.id) === userId;
                                                    const roleColor =
                                                        user.role === 'admin' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                                                        user.role === 'responder' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                                                        user.role === 'hospital' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                                                        'text-white/60 border-white/10 bg-white/5';
                                                    return (
                                                        <tr key={userId} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors group/row">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                   <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 text-[9px] font-black">
                                                                       {(user.name || user.full_name || 'U')[0].toUpperCase()}
                                                                   </div>
                                                                   <div>
                                                                       <div className="font-black text-white flex items-center gap-2">
                                                                           {user.name || user.full_name}
                                                                           {isSelf && (
                                                                               <span className="text-[7px] px-1.5 py-0.2 bg-red-500/20 text-red-400 border border-red-500/30 font-mono tracking-tighter">YOU</span>
                                                                           )}
                                                                       </div>
                                                                       <div className="text-[9px] text-white/40 font-mono lowercase">{user.email}</div>
                                                                   </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2 py-0.5 rounded-sm border uppercase text-[8px] font-bold ${roleColor}`}>
                                                                    {user.role}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-white/50">{user.org_name || user.org || '—'}</td>
                                                            <td className="px-6 py-4">
                                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[8px] font-mono ${
                                                                    user.is_active
                                                                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                                                                        : 'text-red-400 border-red-500/30 bg-red-500/10'
                                                                }`}>
                                                                    <div className={`w-1 h-1 rounded-full ${user.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                                                    {user.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-white/40 font-mono text-[9px]">
                                                                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-2 opacity-80 group-hover/row:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleOpenEditUser(user)}
                                                                        title="Edit Role / Status"
                                                                        className="p-1.5 bg-white/5 hover:bg-amber-500/20 text-white/70 hover:text-amber-400 border border-white/10 transition-all"
                                                                    >
                                                                        <Edit2 size={11} />
                                                                    </button>
                                                                    <button
                                                                        disabled={isSelf}
                                                                        onClick={() => handleToggleUserStatus(user)}
                                                                        title={isSelf ? 'Cannot deactivate self' : user.is_active ? 'Deactivate User' : 'Activate User'}
                                                                        className={`p-1.5 border transition-all ${
                                                                            isSelf
                                                                                ? 'opacity-20 cursor-not-allowed bg-white/5 border-white/10'
                                                                                : user.is_active
                                                                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border-red-500/20'
                                                                                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border-emerald-500/20'
                                                                        }`}
                                                                    >
                                                                        <Power size={11} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </SettingCard>
                        </div>

                        {/* 4 & 5. NOTIFS & SYS SETTINGS */}
                        <div className="col-span-12 lg:col-span-5 flex flex-col gap-8">
                             
                             {/* NOTIFICATIONS */}
                             <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
                                <SettingCard 
                                    title="Notifications" 
                                    description="Configure how alerts and system updates are delivered to your devices."
                                    icon={Bell} 
                                    accent="#eab308"
                                >
                                    <div className="space-y-2">
                                        <Toggle label="Emergency Alerts" subLabel="Visual pulse on critical alert detection" enabled={notifs.alerts} onChange={v => setNotifs({...notifs, alerts: v})} />
                                        <Toggle label="Email Notifications" subLabel="Daily summaries and priority reports" enabled={notifs.email} onChange={v => setNotifs({...notifs, email: v})} />
                                        <Toggle label="SMS Delivery" subLabel="Immediate text delivery for emergency events" enabled={notifs.sms} onChange={v => setNotifs({...notifs, sms: v})} />
                                    </div>
                                </SettingCard>
                             </div>

                             {/* SYSTEM SETTINGS */}
                             <div className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
                                <SettingCard 
                                    title="System Settings" 
                                    description="Adjust core response logic and automation thresholds."
                                    icon={Zap} 
                                    accent="#10b981"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-2">
                                            <label className="font-mono text-[8px] text-white/20 uppercase tracking-widest pl-1">Target Response Time (minutes)</label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={12} />
                                                <input type="number" value={config.respTime} onChange={e => setConfig({...config, respTime: e.target.value})} className="w-full bg-[#0A0B0E] border border-white/5 py-3 pl-10 pr-4 font-mono text-[11px] text-white focus:border-red-500/30 outline-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="font-mono text-[8px] text-white/20 uppercase tracking-widest pl-1">Alert Sensitivity</label>
                                            <div className="relative">
                                                <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={12} />
                                                <select value={config.threshold} onChange={e => setConfig({...config, threshold: e.target.value})} className="w-full bg-[#0A0B0E] border border-white/5 py-3 pl-10 pr-4 font-mono text-[11px] text-white focus:border-red-500/30 outline-none cursor-pointer appearance-none">
                                                    <option>High Priority</option>
                                                    <option>Moderate</option>
                                                    <option>All Signals</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={12} />
                                            </div>
                                        </div>
                                    </div>
                                    <Toggle label="Automated Dispatch" subLabel="Enable AI-assisted help for regional events" enabled={config.autoDispatch} onChange={v => setConfig({...config, autoDispatch: v})} />
                                </SettingCard>
                             </div>

                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-8 mb-20">
                        
                        {/* SECURITY */}
                        <div className="col-span-12 lg:col-span-8 animate-slide-up" style={{ animationDelay: '0.6s' }}>
                            <SettingCard 
                                title="Security" 
                                description="Secure your account with multi-factor authentication and password management."
                                icon={Shield} 
                                accent="#ef4444"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-8">
                                        <h4 className="font-mono text-[10px] font-black text-white uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                                            <Lock size={12} className="text-red-500" /> CHANGE PASSWORD
                                        </h4>
                                        <div className="space-y-4">
                                            <input type="password" placeholder="Current Password" className="w-full bg-white/5 border border-white/5 px-6 py-4 font-mono text-xs text-white outline-none focus:border-red-500/30 transition-all" />
                                            <input type="password" placeholder="New Password" className="w-full bg-white/5 border border-white/5 px-6 py-4 font-mono text-xs text-white outline-none focus:border-red-500/30 transition-all" />
                                            <button className="w-full py-4 bg-white/5 border border-white/10 text-white font-mono text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Update Password</button>
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        <h4 className="font-mono text-[10px] font-black text-white uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                                            <Smartphone size={12} className="text-blue-500" /> 2FA SETTINGS
                                        </h4>
                                        <div className="p-6 bg-white/[0.02] border border-white/5 relative group">
                                            <p className="text-[10px] font-mono text-white/40 mb-6 leading-relaxed uppercase tracking-widest">Two-factor authentication adds an extra layer of security to your account.</p>
                                            <Toggle label="Enable 2FA" enabled={tfa} onChange={setTfa} />
                                        </div>
                                        <div className="pt-2">
                                            <button className="font-mono text-[9px] text-blue-400 hover:text-blue-300 uppercase underline tracking-widest">View Recent Logins</button>
                                        </div>
                                    </div>
                                </div>
                            </SettingCard>
                        </div>

                        {/* LOGOUT */}
                        <div className="col-span-12 lg:col-span-4 animate-slide-up" style={{ animationDelay: '0.7s' }}>
                            <div className="bg-red-500/5 border border-red-500/20 p-10 h-full flex flex-col justify-between group overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div>
                                    <h4 className="font-outfit font-black text-2xl text-white uppercase tracking-tight mb-4">Logout All Sessions</h4>
                                    <p className="font-mono text-[10px] text-red-500/60 uppercase tracking-widest leading-relaxed mb-8">
                                        Log out of all devices and active sessions for this account.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <button 
                                        onClick={() => openConfirm('logout_all', 'Log out of all devices?')}
                                        className="w-full py-5 bg-white/5 border border-red-500/20 text-red-500 font-mono text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-4"
                                    >
                                       LOG OUT OTHER DEVICES
                                    </button>
                                    <button 
                                        onClick={handleLogout}
                                        className="w-full py-5 bg-red-600 text-white font-mono text-[10px] font-black uppercase tracking-widest shadow-[0_0_40px_rgba(239,68,68,0.3)] transition-all active:scale-95 flex items-center justify-center gap-4"
                                    >
                                       <LogOut size={16} /> LOGOUT
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-20 border-t border-white/5 pt-10 pb-10 flex flex-col md:flex-row justify-between items-center gap-8 text-[11px] font-mono text-white/10 uppercase tracking-[0.5em] font-black">
                         <div className="flex gap-10">
                            <span className="flex items-center gap-3"><div className="w-1 h-1 bg-emerald-500 rounded-full" />UPTIME: 99.98%</span>
                            <span className="flex items-center gap-3"><Shield size={12} />SECURE CONNECTION</span>
                         </div>
                         <div className="text-white/5 tracking-[0.8em]">CRISISCHAIN // ADMIN CONSOLE // V5.4.1</div>
                    </div>
                </div>
            </main>

            <OrgModal
                isOpen={orgModal.open}
                isEditing={orgModal.isEditing}
                formData={orgForm}
                onChange={setOrgForm}
                onSubmit={handleSaveOrg}
                onCancel={() => setOrgModal({ open: false, isEditing: false, data: null })}
                isSubmitting={isSubmittingOrg}
            />

            <UserEditModal
                isOpen={userEditModal.open}
                user={userEditModal.user}
                role={userEditModal.role}
                is_active={userEditModal.is_active}
                onChangeRole={r => setUserEditModal(prev => ({ ...prev, role: r }))}
                onChangeActive={a => setUserEditModal(prev => ({ ...prev, is_active: a }))}
                onSubmit={handleSaveUser}
                onCancel={() => setUserEditModal({ open: false, user: null, role: 'citizen', is_active: true })}
                isSubmitting={isUpdatingUser}
                isSelf={(currentUser?.user_id || currentUser?.id) === (userEditModal.user?.id || userEditModal.user?.user_id)}
            />

            <ConfirmationModal
                isOpen={modal.open}
                title={modal.type === 'delete_org' ? 'Delete Organization?' : modal.type === 'delete_user' ? 'Remove User?' : 'Security Action'}
                message={
                    modal.type === 'delete_org' ? `Are you sure you want to remove ${modal.data?.name}? This action cannot be undone.` :
                    modal.type === 'delete_user' ? `Are you sure you want to remove ${modal.data?.name}? This action cannot be undone.` :
                    modal.data
                }
                onConfirm={handleConfirm}
                onCancel={closeConfirm}
            />

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
                .animate-slide-up { animation: slide-up 0.8s ease-out forwards; opacity: 0; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            `}} />
        </div>
    );
}

export default function Settings() {
    return (
        <ErrorBoundary fallback={SETTINGS_ERROR_FALLBACK}>
            <SettingsContent />
        </ErrorBoundary>
    );
}
