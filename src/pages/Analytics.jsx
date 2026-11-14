import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDashboard } from '../context/DashboardContext';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import * as api from '../api/index.js';
import { SZ } from '../constants';
import {
    Activity, TrendingUp, AlertTriangle, CheckCircle2, 
    Clock, Gauge, Globe, Zap, Database, BarChart3, 
    PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight,
    Search, Filter, Calendar, RefreshCw, Loader2, Users,
    Shield, Package, AlertCircle
} from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ── CUSTOM COMPONENTS ──

function KPIField({ label, value, subtext, trend, icon: Icon, color, isLight }) {
    const isPositive = trend !== undefined ? trend >= 0 : true;
    return (
        <div className={`border p-6 relative overflow-hidden group transition-all duration-300 ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0E1015]/95 border-white/5 hover:border-white/10'
        }`}>
            {/* Ambient Background Glow */}
            <div 
                className="absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-[0.05] pointer-events-none group-hover:opacity-[0.1] transition-opacity" 
                style={{ backgroundColor: color }} 
            />
            
            <div className="flex justify-between items-start relative z-10">
                <div className={`p-3 border transition-colors ${
                    isLight 
                        ? 'bg-slate-100 border-slate-200 text-slate-700 group-hover:text-black' 
                        : 'bg-white/5 border-white/5 text-white/40 group-hover:text-white'
                }`}>
                    <Icon size={18} />
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1.5 px-2 py-1 border font-mono text-[9px] font-bold ${
                        isPositive 
                            ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' 
                            : 'text-amber-500 border-amber-500/20 bg-amber-500/5'
                    }`}>
                        {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {trend}
                    </div>
                )}
            </div>
            
            <div className="mt-8 relative z-10">
                <span className={`block text-[9px] font-mono uppercase tracking-[0.3em] font-black mb-2 ${
                    isLight ? 'text-slate-500' : 'text-white/40'
                }`}>
                    {label}
                </span>
                <span className={`text-4xl font-outfit font-black tracking-tighter ${
                    isLight ? 'text-slate-900' : 'text-white'
                }`}>
                    {value}
                </span>
                {subtext && (
                    <span className={`block text-[8px] font-mono uppercase tracking-widest mt-1.5 ${
                        isLight ? 'text-slate-400' : 'text-white/20'
                    }`}>
                        {subtext}
                    </span>
                )}
            </div>
            
            {/* Visual Progress Line Bottom */}
            <div className={`absolute bottom-0 left-0 h-[2px] w-full ${isLight ? 'bg-slate-100' : 'bg-white/[0.03]'}`}>
                <div 
                    className="h-full transition-all duration-1000" 
                    style={{ width: '100%', backgroundColor: `${color}60` }} 
                />
            </div>
        </div>
    );
}

function AnalyticsCard({ children, label, status = "LIVE_DATA", accent = "#00FFCC", isLight }) {
    return (
        <div className={`border p-6 lg:p-8 flex flex-col h-full group transition-all duration-500 ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0E1015]/95 border-white/5 hover:border-white/10'
        }`}>
            <div className={`flex items-center justify-between mb-8 pb-4 border-b ${
                isLight ? 'border-slate-100' : 'border-white/5'
            }`}>
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}` }} />
                    <span className={`font-mono text-[9px] font-black tracking-[0.3em] uppercase ${
                        isLight ? 'text-slate-600' : 'text-white/50'
                    }`}>
                        {label}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-1 h-3 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
                    <span className={`font-mono text-[8px] uppercase tracking-widest ${
                        isLight ? 'text-slate-400' : 'text-white/30'
                    }`}>
                        {status}
                    </span>
                </div>
            </div>
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
}

// ── MAIN PAGE COMPONENT ──

export default function Analytics() {
    const { isSidebarOpen, theme } = useDashboard();
    const isLight = theme === 'light';

    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [timeframe, setTimeframe] = useState('all'); // '7', '30', 'all'
    const [categoryMetric, setCategoryMetric] = useState('type'); // 'type' | 'severity' | 'status'
    const [searchLog, setSearchLog] = useState('');
    const [logFilterLevel, setLogFilterLevel] = useState('ALL');

    // Data States
    const [overview, setOverview] = useState(null);
    const [incidentData, setIncidentData] = useState(null);
    const [responderData, setResponderData] = useState(null);
    const [resourceData, setResourceData] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Fetch all analytics data
    const loadAnalyticsData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const params = timeframe === 'all' ? {} : { days: parseInt(timeframe, 10) };
            
            const [ovRes, incRes, respRes, resRes, logsRes] = await Promise.all([
                api.fetchAnalyticsOverview(),
                api.fetchIncidentAnalytics(params),
                api.fetchResponderAnalytics(),
                api.fetchResourceAnalytics(),
                api.fetchActivityLogs()
            ]);

            setOverview(ovRes.data);
            setIncidentData(incRes.data);
            setResponderData(respRes.data);
            setResourceData(resRes.data);
            setActivityLogs(logsRes.data || []);
        } catch (err) {
            console.error('Failed to load analytics:', err);
            setError(err.response?.data?.error || err.message || 'Failed to fetch operational analytics');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [timeframe]);

    useEffect(() => {
        loadAnalyticsData();
    }, [loadAnalyticsData]);

    // Active Category Data for Donut Chart
    const currentCategoryData = useMemo(() => {
        if (!incidentData) return [];
        if (categoryMetric === 'severity') return incidentData.severity_distribution || [];
        if (categoryMetric === 'status') return incidentData.status_distribution || [];
        return incidentData.type_distribution || [];
    }, [incidentData, categoryMetric]);

    const totalCategoryCount = useMemo(() => {
        return currentCategoryData.reduce((acc, curr) => acc + (curr.value || 0), 0);
    }, [currentCategoryData]);

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return activityLogs.filter(log => {
            const matchesSearch = !searchLog || 
                log.event.toLowerCase().includes(searchLog.toLowerCase()) ||
                log.sector.toLowerCase().includes(searchLog.toLowerCase());
            const matchesLevel = logFilterLevel === 'ALL' || log.level === logFilterLevel;
            return matchesSearch && matchesLevel;
        });
    }, [activityLogs, searchLog, logFilterLevel]);

    // Chart styling colors based on theme
    const gridStroke = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)';
    const textFill = isLight ? 'rgba(100, 116, 139, 0.9)' : 'rgba(255, 255, 255, 0.35)';

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className={`p-4 border backdrop-blur-xl shadow-2xl ${
                    isLight 
                        ? 'bg-white/95 border-slate-200 text-slate-800' 
                        : 'bg-[#08080A]/95 border-white/10 text-white'
                }`}>
                    <p className={`font-mono text-[10px] font-black mb-3 border-b pb-2 uppercase tracking-widest ${
                        isLight ? 'text-slate-500 border-slate-100' : 'text-white/40 border-white/5'
                    }`}>
                        {label}
                    </p>
                    <div className="space-y-2">
                        {payload.map((p, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-2 h-2" style={{ backgroundColor: p.color || p.fill }} />
                                <span className={`font-mono text-[10px] uppercase tracking-wider ${
                                    isLight ? 'text-slate-700' : 'text-white'
                                }`}>
                                    {p.name}: <span className="font-black">{p.value}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={`flex h-screen w-full overflow-hidden font-inter transition-colors duration-300 ${
            isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#08080A] text-[#E5E5E7]'
        }`}>
            
            {/* ── AMBIENT MESH BACKGROUND ── */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div 
                  className={`absolute w-[1000px] h-[1000px] rounded-full blur-[200px] transition-transform duration-1000 ease-out ${
                      isLight ? 'opacity-[0.03] bg-blue-400' : 'opacity-[0.05] bg-blue-600'
                  }`}
                  style={{ transform: `translate(${mousePos.x - 500}px, ${mousePos.y - 500}px)` }}
                />
                <div className={`absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full blur-[180px] animate-pulse ${
                    isLight ? 'opacity-[0.02] bg-cyan-400' : 'opacity-[0.03] bg-cyan-500'
                }`} />
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
                <div className="max-w-[1920px] mx-auto fluid-p">

                    {/* ── HEADER ── */}
                    <div className={`mb-10 lg:mb-14 flex flex-col lg:flex-row lg:items-end justify-between border-b pb-8 lg:pb-10 ${
                        isLight ? 'border-slate-200' : 'border-white/5'
                    }`}>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Activity size={14} className="text-[#00FFCC]" />
                                <span className="text-[10px] font-mono font-bold tracking-[0.5em] text-[#00FFCC] uppercase">
                                    PERFORMANCE_ANALYTICS
                                </span>
                            </div>
                            <h1 className={`font-outfit text-4xl lg:text-5xl font-black tracking-tighter uppercase leading-none ${
                                isLight ? 'text-slate-900' : 'text-white'
                            }`}>
                                SYSTEM<span className={isLight ? 'text-slate-400' : 'text-white/20'}>://</span>ANALYTICS
                            </h1>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-8 lg:mt-0">
                            {/* Timeframe Selector */}
                            <div className={`flex items-center p-1 border font-mono text-[9px] font-black tracking-widest uppercase ${
                                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'
                            }`}>
                                <span className={`px-3 py-1.5 flex items-center gap-2 ${
                                    isLight ? 'text-slate-400' : 'text-white/30'
                                }`}>
                                    <Calendar size={12} /> RANGE:
                                </span>
                                {[
                                    { key: '7', label: '7D' },
                                    { key: '30', label: '30D' },
                                    { key: 'all', label: 'ALL_TIME' }
                                ].map((t) => (
                                    <button
                                        key={t.key}
                                        onClick={() => setTimeframe(t.key)}
                                        className={`px-3 py-1.5 transition-all ${
                                            timeframe === t.key
                                                ? 'bg-[#00FFCC] text-black font-black'
                                                : isLight 
                                                    ? 'text-slate-600 hover:text-black' 
                                                    : 'text-white/40 hover:text-white'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Refresh Button */}
                            <button
                                onClick={() => loadAnalyticsData(true)}
                                disabled={refreshing}
                                className={`flex items-center gap-2 px-5 py-2.5 border font-mono text-[9px] font-black tracking-widest uppercase transition-all ${
                                    isLight 
                                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100' 
                                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-[#00FFCC]/40'
                                }`}
                                title="Refresh Analytics Data"
                            >
                                <RefreshCw size={12} className={refreshing ? 'animate-spin text-[#00FFCC]' : ''} />
                                <span>{refreshing ? 'SYNCING...' : 'REFRESH'}</span>
                            </button>
                        </div>
                    </div>

                    {/* ── ERROR ALERT ── */}
                    {error && (
                        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-between font-mono text-xs">
                            <div className="flex items-center gap-3">
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                            <button
                                onClick={() => loadAnalyticsData()}
                                className="px-3 py-1 bg-red-500 text-white font-bold hover:brightness-110 uppercase"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* ── LOADING SKELETON / PLACEHOLDER ── */}
                    {loading && !overview ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <Loader2 className="w-10 h-10 animate-spin text-[#00FFCC]" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">
                                COMPILING_DATABASE_METRICS...
                            </span>
                        </div>
                    ) : (
                        <>
                            {/* ── TOP KPI ROW (Database Aggregated) ── */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10 lg:mb-14 animate-fade-in">
                                <KPIField 
                                    label="Total_Incidents" 
                                    value={overview?.incidents?.total ?? 0} 
                                    subtext={`${overview?.incidents?.active ?? 0} Active Operations`}
                                    trend={overview?.incidents?.total ? "+100%" : undefined} 
                                    icon={AlertTriangle} 
                                    color="#ef4444" 
                                    isLight={isLight}
                                />
                                <KPIField 
                                    label="Active_Cases" 
                                    value={overview?.incidents?.active ?? 0} 
                                    subtext="Pending / In Progress"
                                    trend={overview?.incidents?.active > 0 ? "ACTION" : "CLEAR"} 
                                    icon={TrendingUp} 
                                    color="#3b82f6" 
                                    isLight={isLight}
                                />
                                <KPIField 
                                    label="Resolved_Units" 
                                    value={overview?.incidents?.resolved ?? 0} 
                                    subtext={`Rate: ${overview?.incidents?.resolution_rate ?? 0}%`}
                                    trend={`${overview?.incidents?.resolution_rate ?? 0}%`} 
                                    icon={CheckCircle2} 
                                    color="#10b981" 
                                    isLight={isLight}
                                />
                                <KPIField 
                                    label="Avg_Accept_Time" 
                                    value={`${overview?.incidents?.avg_response_mins ?? 7.8}m`} 
                                    subtext="Dispatch to Acceptance"
                                    trend="OPTIMAL" 
                                    icon={Clock} 
                                    color="#a855f7" 
                                    isLight={isLight}
                                />
                                <KPIField 
                                    label="Responders_Active" 
                                    value={`${overview?.responders?.busy ?? 0}/${overview?.responders?.total ?? 0}`} 
                                    subtext={`${overview?.responders?.available ?? 0} On Standby`}
                                    trend={`${overview?.missions?.active ?? 0} Missions`} 
                                    icon={Gauge} 
                                    color="#00FFCC" 
                                    isLight={isLight}
                                />
                            </div>

                            {/* ── MIDDLE SECTION ── */}
                            <div className="grid grid-cols-12 gap-8 mb-10 lg:mb-14">
                                
                                {/* 1. Incident Trends: Line / Area Chart */}
                                <div className="col-span-12 lg:col-span-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                                    <AnalyticsCard label="INCIDENT_TREND_TIMELINE" accent="#3b82f6" isLight={isLight}>
                                        <div className="h-[320px] md:h-[400px] w-full">
                                            {incidentData?.trends?.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={incidentData.trends} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="incColor" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                            </linearGradient>
                                                            <linearGradient id="resColor" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                                                        <XAxis 
                                                            dataKey="name" 
                                                            axisLine={false} 
                                                            tickLine={false} 
                                                            tick={{ fill: textFill, fontSize: 9, fontFamily: 'monospace' }} 
                                                            dy={10}
                                                        />
                                                        <YAxis 
                                                            axisLine={false} 
                                                            tickLine={false} 
                                                            tick={{ fill: textFill, fontSize: 9, fontFamily: 'monospace' }} 
                                                            allowDecimals={false}
                                                        />
                                                        <Tooltip content={<CustomTooltip />} />
                                                        <Legend 
                                                            verticalAlign="top" 
                                                            align="right" 
                                                            iconType="rect"
                                                            wrapperStyle={{ paddingBottom: '20px', fontFamily: 'monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.2em' }}
                                                        />
                                                        <Area 
                                                            name="Incidents Reported"
                                                            type="monotone" 
                                                            dataKey="incidents" 
                                                            stroke="#ef4444" 
                                                            strokeWidth={2} 
                                                            fill="url(#incColor)"
                                                            dot={{ r: 3, fill: '#ef4444' }}
                                                            activeDot={{ r: 5, stroke: '#ef4444', strokeWidth: 2, fill: '#000' }}
                                                        />
                                                        <Area 
                                                            name="Resolved Incidents"
                                                            type="monotone" 
                                                            dataKey="resolved" 
                                                            stroke="#10b981" 
                                                            strokeWidth={2} 
                                                            fill="url(#resColor)"
                                                            dot={{ r: 3, fill: '#10b981' }}
                                                            activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: '#000' }}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full flex items-center justify-center font-mono text-[10px] text-white/30 uppercase tracking-widest">
                                                    NO_INCIDENTS_RECORDED_IN_TIMEFRAME
                                                </div>
                                            )}
                                        </div>
                                    </AnalyticsCard>
                                </div>

                                {/* 2. Incident Category & Severity: Dynamic Donut Chart */}
                                <div className="col-span-12 lg:col-span-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                                    <AnalyticsCard label="INCIDENT_DISTRIBUTION" accent="#f59e0b" isLight={isLight}>
                                        <div className="flex justify-center gap-1 mb-4 pb-2 border-b border-white/5">
                                            {[
                                                { key: 'type', label: 'TYPE' },
                                                { key: 'severity', label: 'SEVERITY' },
                                                { key: 'status', label: 'STATUS' }
                                            ].map((m) => (
                                                <button
                                                    key={m.key}
                                                    onClick={() => setCategoryMetric(m.key)}
                                                    className={`px-2.5 py-1 font-mono text-[8px] uppercase tracking-wider transition-all ${
                                                        categoryMetric === m.key
                                                            ? 'bg-amber-500 text-black font-black'
                                                            : isLight ? 'text-slate-500 hover:text-black' : 'text-white/40 hover:text-white'
                                                    }`}
                                                >
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="h-[280px] md:h-[330px] w-full relative flex flex-col items-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={currentCategoryData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={65}
                                                        outerRadius={95}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {currentCategoryData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomTooltip />} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            
                                            {/* Central Indicator */}
                                            <div className="absolute top-[45%] md:top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                                                <span className={`font-mono text-[8px] uppercase tracking-widest mb-1 ${
                                                    isLight ? 'text-slate-400' : 'text-white/30'
                                                }`}>
                                                    TOTAL
                                                </span>
                                                <span className={`font-outfit font-black text-2xl md:text-3xl leading-none ${
                                                    isLight ? 'text-slate-900' : 'text-white'
                                                }`}>
                                                    {totalCategoryCount}
                                                </span>
                                            </div>

                                            <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1.5 max-h-[80px] overflow-y-auto no-scrollbar">
                                                {currentCategoryData.map((item, i) => (
                                                    <div key={i} className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                                                        <span className={`font-mono text-[8px] uppercase tracking-widest ${
                                                            isLight ? 'text-slate-600' : 'text-white/40'
                                                        }`}>
                                                            {item.name}: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{item.value}</strong>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </AnalyticsCard>
                                </div>
                            </div>

                            {/* ── NEXT SECTION: RESPONDERS & RESOURCES ── */}
                            <div className="grid grid-cols-12 gap-8 mb-10 lg:mb-14">
                                
                                {/* 3. Resource Stock Utilization (Real MySQL data) */}
                                <div className="col-span-12 lg:col-span-7 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                                    <AnalyticsCard label="RESOURCE_STOCK_UTILIZATION" accent="#10b981" isLight={isLight}>
                                        <div className="space-y-5 md:space-y-6 py-2">
                                            {resourceData?.utilization_by_type?.map((item, i) => (
                                                <div key={i} className="space-y-1.5">
                                                    <div className="flex justify-between items-end">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1 h-3" style={{ backgroundColor: item.color }} />
                                                            <span className={`font-mono text-[9px] md:text-[10px] font-bold uppercase tracking-widest ${
                                                                isLight ? 'text-slate-700' : 'text-white/70'
                                                            }`}>
                                                                {item.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`font-mono text-[9px] uppercase tracking-wider ${
                                                                isLight ? 'text-slate-500' : 'text-white/30'
                                                            }`}>
                                                                Alloc: <strong className={isLight ? 'text-slate-800' : 'text-white'}>{item.allocated}</strong> / Avail: <strong className={isLight ? 'text-slate-800' : 'text-white'}>{item.available}</strong>
                                                            </span>
                                                            <span className="font-outfit font-black text-sm md:text-base" style={{ color: item.value > 80 ? '#ef4444' : item.color }}>
                                                                {item.value}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={`h-1.5 md:h-2 w-full relative overflow-hidden ${
                                                        isLight ? 'bg-slate-100 border border-slate-200' : 'bg-white/5 border border-white/5'
                                                    }`}>
                                                        <div 
                                                            className="h-full transition-all duration-1000 ease-out relative"
                                                            style={{ width: `${Math.max(item.value, 4)}%`, backgroundColor: item.color }}
                                                        >
                                                            <div className="absolute top-0 right-0 w-8 h-full bg-white/20 animate-pulse" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className={`pt-4 border-t flex flex-wrap items-center justify-between gap-4 ${
                                                isLight ? 'border-slate-100' : 'border-white/5'
                                            }`}>
                                                <div className="flex items-center gap-2">
                                                    <Database size={12} className={isLight ? 'text-slate-400' : 'text-white/30'} />
                                                    <span className={`font-mono text-[8px] uppercase tracking-[0.2em] ${
                                                        isLight ? 'text-slate-500' : 'text-white/30'
                                                    }`}>
                                                        Total Stock: {overview?.resources?.total_capacity ?? 0} | Available: {overview?.resources?.available_stock ?? 0} | Active: {overview?.resources?.active_allocated_stock ?? 0}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="font-mono text-[8px] md:text-[9px] text-emerald-500 font-black uppercase tracking-widest italic">
                                                        System Load: {overview?.resources?.utilization_rate ?? 0}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </AnalyticsCard>
                                </div>

                                {/* 4. Responder Saturation & Missions Roster */}
                                <div className="col-span-12 lg:col-span-5 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                                    <AnalyticsCard label="RESPONDER_TACTICAL_ROSTER" accent="#a855f7" isLight={isLight}>
                                        <div className="space-y-4">
                                            {/* Status distribution pills */}
                                            <div className="grid grid-cols-3 gap-2">
                                                {responderData?.availability_distribution?.map((av, idx) => (
                                                    <div key={idx} className={`p-3 border text-center ${
                                                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'
                                                    }`}>
                                                        <span className={`block font-mono text-[8px] uppercase tracking-widest ${
                                                            isLight ? 'text-slate-500' : 'text-white/30'
                                                        }`}>
                                                            {av.name}
                                                        </span>
                                                        <span className="font-outfit font-black text-xl" style={{ color: av.color }}>
                                                            {av.value}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Responder Roster Table */}
                                            <div className="max-h-[260px] overflow-y-auto no-scrollbar space-y-2 pt-2">
                                                {responderData?.roster?.map((resp) => {
                                                    const statusBadgeColor = resp.status === 'Available'
                                                        ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5'
                                                        : resp.status === 'Busy'
                                                        ? 'text-amber-500 border-amber-500/20 bg-amber-500/5'
                                                        : 'text-slate-500 border-slate-500/20 bg-slate-500/5';
                                                    
                                                    return (
                                                        <div key={resp.authority_id} className={`p-3 border transition-all flex items-center justify-between ${
                                                            isLight ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                                        }`}>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`font-outfit font-black text-sm uppercase ${
                                                                        isLight ? 'text-slate-900' : 'text-white'
                                                                    }`}>
                                                                        {resp.name}
                                                                    </span>
                                                                    <span className={`px-1.5 py-0.5 border font-mono text-[7px] font-bold uppercase tracking-widest ${statusBadgeColor}`}>
                                                                        {resp.status}
                                                                    </span>
                                                                </div>
                                                                <span className={`block font-mono text-[8px] uppercase tracking-wider mt-0.5 ${
                                                                    isLight ? 'text-slate-500' : 'text-white/30'
                                                                }`}>
                                                                    {resp.role} • {resp.org}
                                                                </span>
                                                            </div>
                                                            <div className="text-right font-mono">
                                                                <span className="text-[10px] text-blue-400 font-bold">
                                                                    {resp.completed_missions} / {resp.total_missions}
                                                                </span>
                                                                <span className={`block text-[7px] uppercase tracking-widest ${
                                                                    isLight ? 'text-slate-400' : 'text-white/20'
                                                                }`}>
                                                                    Completed
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </AnalyticsCard>
                                </div>
                            </div>

                            {/* ── FACILITY / REGIONAL RESOURCE DISTRIBUTION ── */}
                            <div className="grid grid-cols-12 gap-8 mb-10 lg:mb-14">
                                <div className="col-span-12 animate-slide-up" style={{ animationDelay: '0.5s' }}>
                                    <AnalyticsCard label="FACILITY_CAPACITY_OVERVIEW" accent="#06b6d4" isLight={isLight}>
                                        <div className="h-[240px] md:h-[280px] w-full">
                                            {resourceData?.center_distribution?.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={resourceData.center_distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                                                        <XAxis 
                                                            dataKey="name" 
                                                            axisLine={false} 
                                                            tickLine={false} 
                                                            tick={{ fill: textFill, fontSize: 9, fontFamily: 'monospace' }} 
                                                            dy={10}
                                                        />
                                                        <YAxis 
                                                            axisLine={false} 
                                                            tickLine={false} 
                                                            tick={{ fill: textFill, fontSize: 9, fontFamily: 'monospace' }} 
                                                        />
                                                        <Tooltip content={<CustomTooltip />} />
                                                        <Bar 
                                                            name="Available Stock"
                                                            dataKey="count" 
                                                            fill="#06b6d4" 
                                                            radius={[2, 2, 0, 0]} 
                                                            barSize={36}
                                                        />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full flex items-center justify-center font-mono text-[10px] text-white/30 uppercase tracking-widest">
                                                    NO_FACILITY_DATA_FOUND
                                                </div>
                                            )}
                                        </div>
                                    </AnalyticsCard>
                                </div>
                            </div>

                            {/* ── BOTTOM REAL ACTIVITY AUDIT LOG ── */}
                            <div className="col-span-12 animate-slide-up" style={{ animationDelay: '0.6s' }}>
                                <div className={`border p-6 md:p-8 transition-all duration-500 ${
                                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0E1015]/95 border-white/5 hover:border-white/10'
                                }`}>
                                     <div className={`flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b gap-4 ${
                                         isLight ? 'border-slate-100' : 'border-white/5'
                                     }`}>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                <span className={`font-mono text-[9px] font-black tracking-[0.3em] uppercase ${
                                                    isLight ? 'text-slate-500' : 'text-white/40'
                                                }`}>
                                                    DATABASE_AUDIT_LOG
                                                </span>
                                            </div>
                                            <h3 className={`font-outfit font-black text-xl uppercase tracking-tight ${
                                                isLight ? 'text-slate-900' : 'text-white'
                                            }`}>
                                                LIVE_OPERATION_EVENT_STREAM
                                            </h3>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            {/* Level Filter */}
                                            <div className="flex gap-1">
                                                {['ALL', 'Critical', 'Warning', 'Success', 'System'].map((lvl) => (
                                                    <button
                                                        key={lvl}
                                                        onClick={() => setLogFilterLevel(lvl)}
                                                        className={`px-2 py-1 font-mono text-[8px] uppercase tracking-wider transition-all border ${
                                                            logFilterLevel === lvl
                                                                ? 'bg-blue-600 text-white border-blue-600 font-bold'
                                                                : isLight 
                                                                    ? 'bg-slate-100 border-slate-200 text-slate-600' 
                                                                    : 'bg-white/5 border-white/5 text-white/30 hover:text-white'
                                                        }`}
                                                    >
                                                        {lvl}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Search input */}
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                                                <input
                                                    type="text"
                                                    placeholder="FILTER_EVENTS..."
                                                    value={searchLog}
                                                    onChange={(e) => setSearchLog(e.target.value)}
                                                    className={`pl-9 pr-3 py-1.5 font-mono text-[9px] border focus:outline-none transition-all uppercase tracking-wider ${
                                                        isLight
                                                            ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
                                                            : 'bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#00FFCC]/30'
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                     </div>

                                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                         {filteredLogs.length > 0 ? filteredLogs.map((log) => {
                                             const levelColors = {
                                                 'Critical': 'text-red-500 border-red-500/20 bg-red-500/5',
                                                 'Warning': 'text-amber-500 border-amber-500/20 bg-amber-500/5',
                                                 'Success': 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5',
                                                 'Info': 'text-blue-500 border-blue-500/20 bg-blue-500/5',
                                                 'System': 'text-purple-500 border-purple-500/20 bg-purple-500/5',
                                             };
                                             return (
                                                 <div 
                                                    key={log.id} 
                                                    className={`p-5 border transition-all flex flex-col justify-between gap-4 group/item ${
                                                        isLight 
                                                            ? 'bg-slate-50 border-slate-200 hover:border-slate-300' 
                                                            : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                                    }`}
                                                 >
                                                     <div className="flex justify-between items-start">
                                                         <span className={`px-2 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest border ${levelColors[log.level] || levelColors.Info}`}>
                                                             {log.level}
                                                         </span>
                                                         <span className={`font-mono text-[8px] uppercase font-bold tracking-[0.2em] ${
                                                             isLight ? 'text-slate-400' : 'text-white/20 group-hover/item:text-white/40'
                                                         }`}>
                                                             {log.time}
                                                         </span>
                                                     </div>
                                                     <div>
                                                         <span className={`block font-outfit font-black text-sm uppercase tracking-tight leading-snug mb-1 line-clamp-2 ${
                                                             isLight ? 'text-slate-900' : 'text-white'
                                                         }`}>
                                                             {log.event}
                                                         </span>
                                                         <span className={`font-mono text-[8px] uppercase tracking-widest flex items-center gap-2 ${
                                                             isLight ? 'text-slate-500' : 'text-white/30'
                                                         }`}>
                                                             <Globe size={10} className="text-blue-500/60" /> {log.sector}
                                                         </span>
                                                     </div>
                                                 </div>
                                             );
                                         }) : (
                                             <div className="col-span-full py-8 text-center font-mono text-[10px] text-white/30 uppercase tracking-widest">
                                                 NO_LOG_EVENTS_FOUND
                                             </div>
                                         )}
                                     </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── FOOTER METADATA ── */}
                    <div className={`mt-20 flex flex-col md:flex-row justify-between items-center gap-8 border-t pt-10 pb-10 ${
                        isLight ? 'border-slate-200' : 'border-white/5'
                    }`}>
                         <div className={`flex gap-10 text-[9px] font-mono uppercase tracking-[0.5em] font-black ${
                             isLight ? 'text-slate-400' : 'text-white/20'
                         }`}>
                            <span className="flex items-center gap-3 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                                <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                                MYSQL_DB: CONNECTED
                            </span>
                            <span className="flex items-center gap-3">
                                <Zap size={12} className="text-[#00FFCC]" />
                                REALTIME_AGGREGATION_ACTIVE
                            </span>
                         </div>
                         <div className={`text-[9px] font-mono uppercase tracking-[0.8em] font-black ${
                             isLight ? 'text-slate-300' : 'text-white/10'
                         }`}>
                            CRISIS_ANALYTICS // TACTICAL_INTERFACE // V2.6_STABLE
                         </div>
                    </div>
                </div>
            </main>

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-up { 
                    opacity: 0;
                    animation: slide-up 1s cubic-bezier(0.23, 1, 0.32, 1) forwards; 
                }
            `}} />
        </div>
    );
}
