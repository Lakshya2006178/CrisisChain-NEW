import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';
import {
    LayoutDashboard, AlertTriangle, Activity,
    Database, Settings, Shield, PlusSquare,
    Terminal, Lock, Radio, ChevronRight, Zap, LogOut,
    Truck, Building2, ClipboardList, X
} from 'lucide-react';

import { SZ } from '../constants';

const W_CLOSED = SZ.sidebarClosed;
const W_OPEN   = SZ.sidebarOpen;
const H_TOP    = SZ.navbarH;

const ALL_NAV = [
    { id: 'alerts',             icon: AlertTriangle, label: 'Emergency Alerts',    path: '/alerts',             roles: ['citizen','responder','hospital','admin'] },
    { id: 'resources',          icon: PlusSquare,    label: 'Resource Hub',         path: '/resources',          roles: ['citizen','responder','hospital','admin'] },
    { id: 'report',             icon: ClipboardList, label: 'Report Incident',      path: '/report',             roles: ['citizen','responder','hospital','admin'] },
    { id: 'org',                icon: Truck,         label: 'Org Management',       path: '/org',                roles: ['responder','admin'] },
    { id: 'hospital-resources', icon: Building2,     label: 'Hospital Resources',   path: '/hospital-resources', roles: ['hospital','admin'] },
    { id: 'analytics',          icon: Activity,      label: 'Analytics',            path: '/analytics',          roles: ['admin', 'responder', 'hospital'] },
    { id: 'dashboard',          icon: LayoutDashboard,label: 'Admin Dashboard',     path: '/dashboard',          roles: ['admin'] },
    { id: 'settings',           icon: Settings,      label: 'Control Settings',     path: '/settings',           roles: ['citizen','responder','hospital','admin'] },
];

const getRoleKey = (role) => {
    if (!role) return 'citizen';
    const r = role.toLowerCase();
    if (r.includes('admin')) return 'admin';
    if (r.includes('hospital')) return 'hospital';
    if (r.includes('responder')) return 'responder';
    return 'citizen';
};

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isSidebarOpen, toggleSidebar, addToast, user, logout } = useDashboard();
    const w = isSidebarOpen ? W_OPEN : W_CLOSED;

    const roleKey = getRoleKey(user?.role);
    const NAV = ALL_NAV.filter(n => n.roles.includes(roleKey));

    const handleLogout = () => {
        addToast('Logging out...', 'info');
        logout();
        setTimeout(() => {
            navigate('/');
        }, 800);
    };

    return (
        <>
            {/* Mobile Backdrop Overlay */}
            {isSidebarOpen && (
                <div 
                    onClick={() => toggleSidebar()}
                    className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
                    aria-hidden="true"
                />
            )}
            <aside
                className={`fixed top-0 h-screen flex flex-col z-50 transition-all duration-500 overflow-hidden bg-white dark:bg-[#08080A] border-r border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none backdrop-blur-md group/aside will-change-transform ${isSidebarOpen ? 'w-sidebar-open left-0' : 'w-sidebar-closed left-[-100%] lg:left-0'}`}
            >
                {/* ── LOGO CLUSTER ── */}
                <div className="flex items-center flex-shrink-0 relative overflow-hidden group/logo"
                    style={{ height: H_TOP }}>
                    <Link to="/" className={`flex items-center gap-6 px-8 transition-all duration-700 ${!isSidebarOpen && 'justify-center w-full px-0'}`}>
                        <div className="relative">
                            <div className="w-11 h-11 bg-teal-500/10 dark:bg-white/5 border border-teal-500/20 dark:border-white/10 rounded-lg flex items-center justify-center group-hover/logo:border-[#00FFCC]/60 transition-all duration-300">
                                <Shield className="w-6 h-6 text-teal-600 dark:text-[#00FFCC] group-hover/logo:scale-110 transition-transform" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00FFCC] rounded-full shadow-[0_0_10px_#00FFCC] animate-pulse" />
                        </div>
                        {isSidebarOpen && (
                            <div className="flex flex-col gap-0.5 leading-none">
                                <span className="font-outfit font-black text-2xl tracking-tighter uppercase text-slate-900 dark:text-white whitespace-nowrap">CRISISCHAIN</span>
                                <span className="text-[10px] font-mono font-bold text-teal-700 dark:text-teal-400 tracking-[0.3em] uppercase">COMMAND NETWORK</span>
                            </div>
                        )}
                    </Link>

                    {/* Mobile Close Button */}
                    {isSidebarOpen && (
                        <button
                            onClick={() => toggleSidebar()}
                            className="lg:hidden ml-auto mr-6 w-10 h-10 flex items-center justify-center border border-white/10 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors"
                            aria-label="Close Sidebar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}

                    {/* Visual Blade Accent */}
                    <div className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-transparent via-[#00FFCC]/20 to-transparent" />
                </div>

                {/* ── NAVIGATION BLADE ── */}
                <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
                    {NAV.map(({ id, icon: Icon, label, path }) => {
                        const isActive = location.pathname === path;
                        return (
                            <button
                                key={id}
                                onClick={() => {
                                    navigate(path);
                                    if (window.innerWidth < 1024 && isSidebarOpen) {
                                        toggleSidebar();
                                    }
                                }}
                                className={`
                                    group relative flex items-center w-full transition-all duration-150 rounded-lg
                                    ${isSidebarOpen ? 'px-3.5 py-2.5' : 'justify-center py-2.5'}
                                    ${isActive 
                                        ? 'bg-teal-50 dark:bg-teal-500/15 text-teal-800 dark:text-[#00FFCC] font-bold border-l-4 border-teal-600 dark:border-[#00FFCC] shadow-xs' 
                                        : 'text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white font-medium'}
                                `}
                            >
                            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                                <Icon className={`transition-all duration-150 ${isActive ? 'text-teal-600 dark:text-[#00FFCC]' : 'text-slate-600 dark:text-slate-400 group-hover:text-teal-600 dark:group-hover:text-white'}`}
                                    size={18} />
                            </div>

                            {isSidebarOpen && (
                                <div className="ml-3 flex flex-col items-start min-w-0 flex-1">
                                    <span className={`text-xs font-bold tracking-wide uppercase truncate transition-colors duration-150 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                                        {label}
                                    </span>
                                </div>
                            )}

                            {isActive && isSidebarOpen && (
                                <ChevronRight size={14} className="ml-auto text-teal-600 dark:text-[#00FFCC]/70" />
                            )}

                            {/* Floating Metadata Tooltip (Closed Mode) */}
                            {!isSidebarOpen && (
                                <div className="absolute left-[72px] px-3 py-1.5 bg-slate-900 dark:bg-black text-white text-xs font-medium rounded-md shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 translate-x-1 group-hover:translate-x-0 z-[100] whitespace-nowrap">
                                    {label}
                                </div>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* ── SECURITY / IDENT / STATUS ── */}
            <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-2 bg-slate-100/50 dark:bg-white/[0.01]">
                {/* Status Beacon */}
                <div className={`flex items-center gap-2.5 ${isSidebarOpen ? 'px-2 py-1' : 'justify-center py-1'}`}>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                    {isSidebarOpen && (
                        <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] font-mono text-slate-500 dark:text-white/40 uppercase tracking-wider">System Grid</span>
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-bold">Online</span>
                        </div>
                    )}
                </div>

                {/* User Profile Card */}
                <div className={`p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-xs relative group/user ${!isSidebarOpen && 'flex justify-center'}`}>
                    <div className="flex items-center gap-2.5 relative z-10 w-full">
                        <div className="w-8 h-8 rounded-md bg-teal-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        {isSidebarOpen ? (
                            <div className="flex items-center justify-between flex-1 min-w-0">
                                <div className="flex flex-col min-w-0 leading-tight">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || 'User'}</span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize truncate">{user?.role || 'Responder'}</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors ml-1"
                                    title="Logout"
                                >
                                    <LogOut size={14} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleLogout}
                                className="absolute inset-0 z-20 flex items-center justify-center opacity-0 hover:opacity-100 bg-red-600/10 rounded transition-opacity"
                                title="Logout"
                            >
                                <LogOut size={14} className="text-red-500" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
              aside { scrollbar-width: none; }
              aside::-webkit-scrollbar { display: none; }
              @keyframes width-reveal {
                from { width: 0%; }
                to { width: 100%; }
              }
              .animate-width-reveal { animation: width-reveal 1s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
            `}} />
        </aside>
        </>
    );
}
