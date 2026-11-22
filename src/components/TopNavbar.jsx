import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';
import { Search, Bell, Menu, User, ChevronDown, Shield, Zap, Globe, Terminal, Clock, Activity, Settings, AlertTriangle, CheckCircle2, Info, LogOut, Sun, Moon, Truck, Package, Trash2, Check, X } from 'lucide-react';

import { SZ } from '../constants';
import { isCriticalSeverity } from '../lib/incidentTypes';

const W_CLOSED = SZ.sidebarClosed;
const W_OPEN   = SZ.sidebarOpen;
const H_NAV    = SZ.navbarH;

export default function TopNavbar({ fullWidth }) {
    const [time, setTime] = useState(new Date());
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isUserOpen, setIsUserOpen] = useState(false);
    const { 
        isSidebarOpen, toggleSidebar, addToast, alerts, user, logout, theme, toggleTheme,
        notifications = [], unreadNotifCount = 0, markNotificationRead, markAllNotificationsRead, deleteNotificationItem
    } = useDashboard();
    const navigate = useNavigate();
    const notifRef = useRef(null);
    const userRef = useRef(null);

    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setIsNotifOpen(false);
            }
            if (userRef.current && !userRef.current.contains(event.target)) {
                setIsUserOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    const ml = isSidebarOpen ? W_OPEN : W_CLOSED;

    const timeStr = time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

    const unreadCount = unreadNotifCount;

    const formatTimeAgo = (date) => {
        if (!date) return '';
        const diff = Math.floor((new Date() - new Date(date)) / 1000);
        if (diff < 60) return `${Math.max(1, diff)}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const getNotifIcon = (type) => {
        switch (type) {
            case 'Assignment': return <Truck size={14} className="text-teal-400" />;
            case 'Alert': return <AlertTriangle size={14} className="text-red-500" />;
            case 'System': return <Package size={14} className="text-blue-400" />;
            case 'StatusUpdate': return <Activity size={14} className="text-amber-400" />;
            default: return <Bell size={14} className="text-[#00FFCC]" />;
        }
    };

    const handleLogout = () => {
        addToast('Logging out...', 'info');
        logout(); // Actual logout that wipes cookies & localStorage
        setTimeout(() => {
            navigate('/');
        }, 800);
    };

    const toggleNotif = () => {
        setIsNotifOpen(prev => !prev);
        setIsUserOpen(false);
    };

    const toggleUser = () => {
        setIsUserOpen(prev => !prev);
        setIsNotifOpen(false);
    };

    return (
        <header
            className={`fixed top-0 right-0 z-50 flex items-center transition-all duration-500 border-b border-slate-200 dark:border-white/5 px-2.5 sm:px-4 md:px-10 gap-2 sm:gap-4 md:gap-8 bg-white/95 dark:bg-[#08080A]/95 backdrop-blur-md will-change-transform ${fullWidth ? 'left-0' : (isSidebarOpen ? 'left-sidebar-open' : 'left-sidebar-closed')}`}
            style={{
                height: H_NAV,
            }}
        >
            {/* Command Trigger Toggle */}
            {!fullWidth && (
            <button
                onClick={toggleSidebar}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-all duration-200 flex-shrink-0 shadow-xs"
                aria-label="Toggle Navigation"
                title="Toggle Sidebar"
            >
                <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </button>
            )}

            {/* Omni-Search */}
            <div className="hidden md:flex flex-1 max-w-2xl relative group/search">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-4">
                   <Search className="w-4 h-4 text-slate-400 group-focus-within/search:text-teal-600 dark:group-focus-within/search:text-[#00FFCC] transition-colors" />
                </div>
                <input
                    type="text"
                    placeholder="Search resources, alerts, or facilities..."
                    className="w-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg focus:border-teal-500/50 focus:bg-white dark:focus:bg-white/[0.08] px-12 py-2.5 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition-all duration-200"
                />
            </div>

            {/* Strategic Feed (Header) */}
            <div className="hidden xl:flex items-center gap-12 font-mono text-[9px] tracking-[0.3em] text-slate-500 dark:text-white/40 uppercase border-r border-slate-200 dark:border-white/10 pr-10 py-2">
               <div className="flex flex-col items-start gap-1.5">
                    <div className="flex items-center gap-2.5">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                       <span className="text-slate-800 dark:text-white/80 font-bold">SYSTEM ACTIVE</span>
                    </div>
                   <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Grid: 99.8% Online</span>
                   </div>
               </div>
               
               <div className="flex flex-col items-center gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-outfit font-black text-slate-900 dark:text-white tracking-wider leading-none">{timeStr}</span>
                    <span className="text-[10px] text-teal-600 dark:text-[#00FFCC] font-bold">IST</span>
                  </div>
                  <span className="text-[8px] text-slate-500 dark:text-white/40 font-bold tracking-widest">{dateStr}</span>
               </div>
            </div>

            {/* Action Cluster */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 ml-auto relative">
                
                {/* THEME TOGGLE BUTTON */}
                <button
                    onClick={toggleTheme}
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    className="relative w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center transition-all duration-300 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] hover:border-teal-500/40 hover:bg-teal-500/10 flex-shrink-0"
                    aria-label="Toggle Theme"
                >
                    {theme === 'light' ? (
                        <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 group-hover:scale-110 transition-all" />
                    ) : (
                        <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:scale-110 transition-all" />
                    )}
                </button>

                {/* NOTIFICATIONS PANEL WRAPPER */}
                <div className="relative" ref={notifRef}>
                    <button 
                        onClick={toggleNotif}
                        title="Notifications Feed"
                        className={`relative w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center transition-all duration-300 rounded-lg border flex-shrink-0 ${isNotifOpen ? 'bg-teal-600 text-white border-transparent' : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] hover:border-teal-500/40 hover:bg-teal-500/10'}`}
                    >
                        <Bell className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${isNotifOpen ? 'text-white' : (unreadCount > 0 ? 'text-teal-600 dark:text-[#00FFCC]' : 'text-slate-600 dark:text-slate-300 hover:text-teal-600')}`} />
                        {unreadCount > 0 && !isNotifOpen && (
                            <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] px-1 bg-red-500 shadow-[0_0_10px_#ef4444] text-[8px] sm:text-[9px] font-mono font-black text-white rounded-full flex items-center justify-center animate-pulse">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* BACKDROP OVERLAY FOR NOTIFICATIONS */}
                    {isNotifOpen && (
                        <div 
                            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[200] transition-opacity animate-fade-in"
                            onClick={() => setIsNotifOpen(false)}
                            aria-hidden="true"
                        />
                    )}

                    {/* DROPDOWN / MOBILE DRAWER PANEL */}
                    {isNotifOpen && (
                        <div className="fixed inset-x-3 top-20 max-h-[calc(100vh-6rem)] sm:inset-auto sm:right-4 sm:top-20 sm:w-[420px] sm:max-h-[520px] bg-white dark:bg-[#0E1015] border border-slate-200 dark:border-white/10 shadow-2xl z-[210] animate-fade-in overflow-hidden flex flex-col rounded-xl">
                            <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02] flex-shrink-0">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                    <Bell size={15} className="text-red-500 flex-shrink-0" />
                                    <span className="font-outfit font-black text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider truncate">Tactical Notifications</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-white/50 uppercase tracking-widest whitespace-nowrap">
                                        {unreadCount} Unread
                                    </span>
                                    {unreadCount > 0 && (
                                        <button 
                                            onClick={markAllNotificationsRead}
                                            title="Mark all notifications as read"
                                            className="font-mono text-[8px] sm:text-[9px] text-teal-600 dark:text-[#00FFCC] hover:underline uppercase tracking-wider whitespace-nowrap"
                                        >
                                            Mark All Read
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setIsNotifOpen(false)}
                                        className="sm:hidden p-1 text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white transition-colors"
                                        title="Close notifications"
                                        aria-label="Close"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                                {notifications.length > 0 ? (
                                    notifications.map((n) => {
                                        const isUnread = !n.is_read;
                                        const notifId = n.id || n.notification_id;

                                        return (
                                            <div 
                                                key={notifId} 
                                                onClick={() => {
                                                    if (isUnread) markNotificationRead(notifId);
                                                    setIsNotifOpen(false);
                                                    if (n.incident_id) navigate(`/alerts?id=${encodeURIComponent(n.incident_id)}`);
                                                }}
                                                className={`p-3.5 sm:p-4 border-b border-slate-100 dark:border-white/[0.03] transition-colors group/notif cursor-pointer flex gap-3 relative ${
                                                    isUnread ? 'bg-red-50/50 dark:bg-white/[0.03] hover:bg-red-50 dark:hover:bg-white/[0.05] border-l-2 border-l-red-500' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02] opacity-80'
                                                }`}
                                            >
                                                <div className={`mt-0.5 w-8 h-8 flex-shrink-0 flex items-center justify-center border rounded ${
                                                    isUnread ? 'border-red-500/30 bg-red-500/10' : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5'
                                                }`}>
                                                    {getNotifIcon(n.type || n.notification_type)}
                                                </div>

                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="flex justify-between items-baseline gap-2">
                                                        <span className="font-outfit font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight truncate">
                                                            {n.title || n.type}
                                                        </span>
                                                        <span className="font-mono text-[8px] text-slate-400 dark:text-white/30 uppercase flex-shrink-0 whitespace-nowrap">
                                                            {formatTimeAgo(n.created_at)}
                                                        </span>
                                                    </div>
                                                    
                                                    <p className="font-mono text-[10px] text-slate-600 dark:text-white/60 leading-relaxed break-words">
                                                        {n.message}
                                                    </p>

                                                    {n.incident_display_id && (
                                                        <span className="inline-block font-mono text-[8px] text-teal-700 dark:text-[#00FFCC] bg-teal-500/10 px-1.5 py-0.5 mt-1 tracking-wider uppercase rounded">
                                                            {n.incident_display_id}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 self-center opacity-100 sm:opacity-0 sm:group-hover/notif:opacity-100 transition-opacity flex-shrink-0">
                                                    {isUnread && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                markNotificationRead(notifId);
                                                            }}
                                                            title="Mark as read"
                                                            className="p-1 sm:p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-500 dark:text-white/50 hover:text-teal-600 dark:hover:text-[#00FFCC] transition-colors"
                                                        >
                                                            <Check size={13} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteNotificationItem(notifId);
                                                        }}
                                                        title="Delete notification"
                                                        className="p-1 sm:p-1 hover:bg-red-500/20 rounded text-slate-400 dark:text-white/40 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-12 text-center text-[10px] font-mono text-slate-400 dark:text-white/20 uppercase tracking-[0.5em]">
                                        NO NOTIFICATIONS
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-white/[0.01] border-t border-slate-200 dark:border-white/5 flex gap-2 flex-shrink-0">
                                {unreadCount > 0 && (
                                    <button 
                                        onClick={markAllNotificationsRead} 
                                        className="flex-1 py-2 sm:py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-all font-mono text-[8px] font-bold text-slate-700 dark:text-white/60 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest rounded"
                                    >
                                        Mark All Read
                                    </button>
                                )}
                                <Link 
                                    to="/alerts" 
                                    onClick={() => setIsNotifOpen(false)} 
                                    className="flex-1 py-2 sm:py-2.5 bg-red-600 hover:bg-red-500 text-white font-mono text-[8px] font-bold uppercase tracking-widest text-center transition-all flex items-center justify-center rounded"
                                >
                                    Emergency Feed
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-6 w-[2px] bg-white/5 hidden sm:block" />

                <div className="relative" ref={userRef}>
                    <button 
                        onClick={toggleUser}
                        className={`flex items-center gap-2 sm:gap-4 md:gap-6 border transition-all duration-700 px-2 sm:px-4 md:px-6 py-1.5 sm:py-2.5 md:py-3 group relative overflow-hidden flex-shrink-0 ${isUserOpen ? 'bg-red-600 border-transparent' : 'bg-white/[0.03] border-white/5 hover:border-white/20'}`}
                    >
                        {!isUserOpen && <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />}
                        <div className={`w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-black border flex items-center justify-center transition-all duration-500 ${isUserOpen ? 'border-white/40' : 'border-white/10 group-hover:border-red-500/40'}`}>
                            <User className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 transition-colors ${isUserOpen ? 'text-white font-black' : 'text-white/20 group-hover:text-red-500'}`} />
                        </div>
                         <div className="hidden sm:flex flex-col items-start leading-tight">
                            <span className={`text-[11px] font-outfit font-black uppercase tracking-wider transition-colors ${isUserOpen ? 'text-white' : 'text-white'}`}>{user?.name || 'Unknown User'}</span>
                            <div className="flex items-center gap-3 mt-1">
                                <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_#10b981] ${isUserOpen ? 'bg-white' : 'bg-emerald-500'}`} />
                                <span className={`text-[9px] font-mono font-bold tracking-[0.3em] uppercase transition-colors ${isUserOpen ? 'text-white/60' : 'text-emerald-500'}`}>Authenticated</span>
                            </div>
                        </div>
                        <ChevronDown size={14} className={`transition-transform duration-500 ${isUserOpen ? 'rotate-180 text-white' : 'text-white/10 group-hover:text-white'}`} />
                    </button>

                    {/* USER DROPDOWN */}
                    {isUserOpen && (
                        <div className="absolute right-0 top-16 w-full min-w-[200px] bg-white dark:bg-[#0E1015] border border-slate-200 dark:border-white/10 shadow-2xl rounded-xl z-[210] animate-fade-in overflow-hidden">
                             <Link to="/settings" onClick={() => setIsUserOpen(false)} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5 group/link">
                                <Settings size={14} className="text-slate-400 dark:text-white/20 group-hover/link:text-slate-900 dark:group-hover/link:text-white transition-colors" />
                                <span className="font-mono text-[9px] font-bold text-slate-700 dark:text-white/60 group-hover/link:text-slate-900 dark:group-hover/link:text-white uppercase tracking-widest">Settings</span>
                             </Link>
                             <button
                                onClick={toggleTheme}
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5 group/theme text-left"
                             >
                                <div className="flex items-center gap-4">
                                    {theme === 'light' ? (
                                        <Moon size={14} className="text-blue-500" />
                                    ) : (
                                        <Sun size={14} className="text-amber-400" />
                                    )}
                                    <span className="font-mono text-[9px] font-bold text-slate-700 dark:text-white/60 group-hover/theme:text-slate-900 dark:group-hover/theme:text-white uppercase tracking-widest">Theme</span>
                                </div>
                                <span className="font-mono text-[8px] px-2 py-0.5 border border-slate-200 dark:border-white/10 rounded uppercase tracking-widest text-slate-600 dark:text-white/60 bg-slate-50 dark:bg-transparent">
                                    {theme === 'light' ? 'Light' : 'Dark'}
                                </span>
                             </button>
                             <button 
                                onClick={handleLogout}
                                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-red-500/10 transition-colors group/logout"
                             >
                                 <LogOut size={14} className="text-red-500" />
                                <span className="font-mono text-[9px] font-bold text-red-600 uppercase tracking-widest">Logout</span>
                             </button>
                        </div>
                    )}
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                header {
                    box-shadow: 0 4px 20px -5px rgba(0,0,0,0.5);
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
                @keyframes fade-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
            `}} />
        </header>
    );
}
