import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import WorkflowPanel from './components/panels/WorkflowPanel';
import LiveAlertsPanel from './components/panels/LiveAlertsPanel';
import MapPanel from './components/panels/MapPanel';
import CommunicationPanel from './components/panels/CommunicationPanel';
import ResourceTrackingPanel from './components/panels/ResourceTrackingPanel';
import AnalyticsPanel from './components/panels/AnalyticsPanel';
import IncidentActionPanel from './components/panels/IncidentActionPanel';
import { useDashboard } from './context/DashboardContext';
import { Shield, Zap, Globe, Cpu, Radio, Terminal, Target, Square, Lock, Activity, Radar, Database, BarChart3, ListFilter, AlertTriangle, Clock } from 'lucide-react';

import { SZ } from './constants';

function SystemGridOverlay({ mousePos }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* ── UNIQUE ADMIN SPECTRUM BACKGROUND ── */}
      
      {/* Primary Brand Glow (Cyan) - Follows Mouse closely */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-[0.08] bg-[#00FFCC] transition-transform duration-700 ease-out"
        style={{ transform: `translate(${mousePos.x - 300}px, ${mousePos.y - 300}px)` }}
      />

      {/* Secondary Depth Blob (Purple) - Drifts slightly */}
      <div 
        className="absolute w-[800px] h-[800px] rounded-full blur-[150px] opacity-[0.04] bg-purple-600 transition-transform duration-1000 ease-out"
        style={{ transform: `translate(${(mousePos.x * 0.5) - 400}px, ${(mousePos.y * 0.5) - 400}px)` }}
      />

      {/* Tertiary Accent (Deep Blue) - Fixed subtle pulse */}
      <div className="absolute -bottom-20 -left-20 w-[600px] h-[600px] rounded-full blur-[180px] opacity-[0.03] bg-blue-700 animate-pulse" />
      
      {/* Grainy Texture for Premium Look */}
      <div className="absolute inset-0 opacity-[0.03] contrast-125 brightness-125 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(rgba(0,255,204,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,204,0.05)_1px,transparent_1px)] bg-[size:80px_80px]" />
      
      {/* Scanning Laser Line */}
      <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#00FFCC]/20 to-transparent shadow-[0_0_15px_rgba(0,255,204,0.1)] animate-scan-y top-0 blur-[0.5px] will-change-transform" />
    </div>
  );
}

function PanelContainer({ children, label = "LIVE DATA", status = "STABLE", accent = "#00FFCC" }) {
  return (
    <div className="group relative h-full bg-white dark:bg-[#0E1015]/95 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 shadow-xs transition-all duration-300 overflow-hidden flex flex-col rounded-xl will-change-transform">
      <div className="px-4 md:px-6 py-4 flex items-center justify-between bg-slate-50/80 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/5 relative z-20">
         <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }} />
            <span className="font-mono text-[10px] font-black text-slate-700 dark:text-white/60 tracking-[0.3em] uppercase">{label}</span>
         </div>
         <div className="hidden sm:flex items-center gap-3">
            <span className="font-mono text-[8px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-widest">{status}</span>
         </div>
      </div>
      <div className="flex-1 relative z-10 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-[#14171F] border border-slate-200 dark:border-white/5 p-6 flex flex-col gap-3 group hover:border-slate-300 dark:hover:border-white/10 rounded-xl shadow-xs transition-all">
       <div className="flex justify-between items-start">
          <div 
            className="p-2.5 rounded-lg border transition-colors"
            style={{ 
              backgroundColor: `${color}15`,
              borderColor: `${color}30`,
              color: color
            }}
          >
             <Icon size={18} />
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${trend > 0 ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
       </div>
       <div className="mt-2">
          <span className="block text-[10px] font-mono font-bold text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] mb-1">{label}</span>
          <span className="text-3xl font-outfit font-black text-slate-900 dark:text-white tracking-tight">{value}</span>
       </div>
    </div>
  );
}

export default function DashboardMain() {
  const { toasts, isSidebarOpen, closeSidebar, stats } = useDashboard();
  const ml = isSidebarOpen ? SZ.sidebarOpen : SZ.sidebarClosed;
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const injected = document.getElementById('cc-v5');
    if (injected) injected.remove();
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#EEF2F6] dark:bg-[#08080A] text-slate-900 dark:text-[#E5E5E7] font-inter">
      
      <SystemGridOverlay mousePos={mousePos} />

      <Sidebar />
      <TopNavbar />

      {/* ── PROPER DASHBOARD GRID ── */}
      <main
        className={`flex-1 overflow-y-auto overflow-x-hidden transition-all duration-500 relative z-10 custom-scrollbar will-change-transform w-full ${isSidebarOpen ? 'ml-sidebar-open' : 'ml-sidebar-closed'}`}
        style={{
          marginTop: SZ.navbarH,
          height: `calc(100vh - ${SZ.navbarH}px)`,
        }}
      >
        <div className="max-w-[1920px] mx-auto fluid-p">
          
          {/* Functional Dashboard Header */}
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 dark:border-white/5 pb-8">
             <div className="space-y-2">
                 <div className="flex items-center gap-3">
                  <Shield size={14} className="text-teal-600 dark:text-[#00FFCC]" />
                  <span className="text-[10px] font-mono font-bold tracking-[0.4em] text-teal-600 dark:text-[#00FFCC] uppercase">OVERVIEW</span>
                </div>
                <h1 className="font-outfit text-4xl font-black tracking-tight uppercase text-slate-900 dark:text-white">ADMIN DASHBOARD</h1>
             </div>
             
             <div className="flex gap-4 mt-6 md:mt-0">
                 <button className="px-6 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-all font-mono text-[10px] font-bold tracking-widest uppercase rounded shadow-xs">
                    Export
                 </button>
                 <Link to="/report" className="px-6 py-2.5 bg-teal-600 dark:bg-[#00FFCC] text-white dark:text-black font-semibold hover:brightness-110 transition-all font-mono text-[10px] tracking-widest uppercase shadow-sm dark:shadow-[0_0_20px_rgba(0,255,204,0.2)] text-center rounded">
                    Report Incident
                 </Link>
             </div>
          </div>

          {/* Quick Stats Grid */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 animate-fade-in">
             <StatCard label="Total Reports" value={stats?.total || 0} trend={12} icon={AlertTriangle} color="#ef4444" />
             <StatCard label="Active Alerts" value={stats?.active || 0} trend={-4} icon={Database} color="#3b82f6" />
             <StatCard label="Avg Response" value={`${(stats?.avgResponseTime || 0).toFixed(1)}m`} trend={3} icon={Activity} color="#10b981" />
             <StatCard label="Resolved" value={stats?.resolved || 0} trend={2} icon={Radio} color="#a855f7" />
          </div>

          {/* ── Main Workspace Grid ── */}
          <div className="grid grid-cols-12 gap-6 lg:gap-14">

            {/* Workflow: Sticky Top Strip */}
             <div className="col-span-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <PanelContainer label="RESPONSE STATUS" accent="#00FFCC">
                <WorkflowPanel />
              </PanelContainer>
            </div>

            {/* Left Column: Alerts & Comms */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
                <div className="h-[550px] animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <PanelContainer label="LIVE ALERTS" accent="#ef4444" status="MONITORING">
                    <LiveAlertsPanel />
                  </PanelContainer>
               </div>
               <div className="h-[430px] animate-slide-up" style={{ animationDelay: '0.4s' }}>
                  <PanelContainer label="TEAM CHAT" accent="#a855f7">
                    <CommunicationPanel />
                  </PanelContainer>
               </div>
            </div>

            {/* Right Column: Map & Analytics */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 lg:gap-14">
                <div className="h-[600px] animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <PanelContainer label="LIVE MAP VIEW" accent="#3b82f6" status="LIVE">
                    <MapPanel />
                  </PanelContainer>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
                   <div className="h-[450px] md:h-[400px] animate-slide-up" style={{ animationDelay: '0.5s' }}>
                      <PanelContainer label="DATA TRENDS" accent="#f59e0b">
                         <AnalyticsPanel />
                      </PanelContainer>
                   </div>
                   <div className="h-[450px] md:h-[400px] animate-slide-up" style={{ animationDelay: '0.6s' }}>
                      <PanelContainer label="TASKS & ACTIONS" accent="#ef4444">
                         <IncidentActionPanel />
                      </PanelContainer>
                   </div>
               </div>
            </div>

            {/* Bottom: Resource Tracking (Full Width) */}
             <div className="col-span-12 animate-slide-up" style={{ animationDelay: '0.7s' }}>
                <PanelContainer label="RESOURCE TRACKING" accent="#10b981">
                   <ResourceTrackingPanel />
                </PanelContainer>
             </div>
          </div>

          {/* Footer Metadata */}
          <div className="mt-20 flex flex-col md:flex-row justify-between items-center gap-8 border-t border-slate-200 dark:border-white/5 pt-10 pb-10">
              <div className="flex gap-10 text-[9px] font-mono text-slate-400 dark:text-white/20 uppercase tracking-[0.5em] font-black">
                 <span className="flex items-center gap-3"><Clock size={12} />NETWORK STATUS: 99.9%</span>
                 <span className="flex items-center gap-3"><Lock size={12} />SECURE CONNECTION</span>
              </div>
              <div className="text-[9px] font-mono text-slate-400 dark:text-white/20 uppercase tracking-[0.8em] font-black">
                 CRISISCHAIN // DISASTER RESPONSE // V5.0
              </div>
          </div>
        </div>
      </main>

      {toasts && toasts.length > 0 && (
        <div className="fixed bottom-10 right-10 z-[200] flex flex-col gap-4 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="font-mono px-6 py-4 backdrop-blur-3xl border border-white/5 bg-black/80 text-[10px] font-black tracking-widest uppercase shadow-2xl animate-slide-in-right"
                 style={{ color: t.type === 'error' ? '#ef4444' : '#00FFCC' }}>
                {t.message}
            </div>
          ))}
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-y {
          0% { transform: translateY(0); }
          50% { transform: translateY(100vh); }
          100% { transform: translateY(0); }
        }
        .animate-scan-y { animation: scan-y 8s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right { animation: slide-in-right 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
      `}} />
    </div>
  );
}
