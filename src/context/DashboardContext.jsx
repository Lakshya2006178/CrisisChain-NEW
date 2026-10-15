import { createContext, useContext, useState, useEffect } from 'react';
import { AlertCircle, Waves, Wind, Flame, HeartPulse, Truck, Users, MessageSquare, AlertTriangle, ClipboardCheck, Siren, HeartHandshake, Droplets, Shield, Radiation, Activity, MapPin } from 'lucide-react';
import * as api from '../api/index.js';
import { captureBestEffortLocation } from '../lib/geolocation';

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
    // --- STATE INITIALIZATION ---
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
    const [userLocation, setUserLocation] = useState(
        JSON.parse(localStorage.getItem('userLocation')) || null
    );

    const captureLocation = async () => {
        try {
            // Precise GPS first, falls back to approximate IP-based location
            // rather than just giving up (previously a single GPS attempt with
            // no retry and no fallback, so it silently did nothing whenever GPS
            // was denied/unavailable — e.g. Location Services off, or a VM/desktop
            // with no GPS hardware).
            const loc = await captureBestEffortLocation();
            setUserLocation(loc);
            localStorage.setItem('userLocation', JSON.stringify(loc));
        } catch {
            // No location available from any source — leave userLocation as-is.
        }
    };

    useEffect(() => {
        if (user) captureLocation();
    }, []);

    const [alerts, setAlerts] = useState([]);
    const [resources, setResources] = useState([]);
    const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0, avgResponseTime: 0 });
    const [actions, setActions] = useState([
        { id: 'ACT-001', title: 'Evacuation Order: Sector 7', priority: 'High', source: 'Cortex_AI', time: '10m ago' },
        { id: 'ACT-002', title: 'Medical Resupply: City Hospital', priority: 'Medium', source: 'Hospital_Alpha', time: '25m ago' }
    ]);
    const [messages, setMessages] = useState([
        { id: 1, sender: 'Command', text: 'All units standby for sector sweep.', status: 'Active', time: '12:45' },
        { id: 2, sender: 'System', text: 'Network integrity at 98%.', status: 'Secure', time: '12:48' }
    ]);
    const [workflowId, setWorkflowId] = useState(1); 
    const [toasts, setToasts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const acknowledgeAction = (id) => {
        setActions(prev => prev.filter(a => a.id !== id));
        addToast('Action Acknowledged', 'success');
    };
    
    const escalateAction = (id) => {
        setActions(prev => prev.map(a => a.id === id ? { ...a, priority: 'High' } : a));
        addToast('Action Escalated to C4', 'error');
    };

    const addMessage = (sender, text, status = 'Active') => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, { id: Date.now(), sender, text, status, time }]);
    };

    const fetchLiveAlerts = async () => {
        try {
            const { data } = await api.fetchAlerts();
            setAlerts(data);
        } catch (err) {
            console.warn('Backend alerts unavailable');
        }
    };

    const fetchStats = async () => {
        try {
            const { data } = await api.fetchStats();
            // Map avgResponseTimeMinutes to avgResponseTime
            setStats({
                total: data.total || 0,
                active: data.active || 0,
                resolved: data.resolved || 0,
                avgResponseTime: data.avgResponseTimeMinutes || 0
            });
        } catch (err) {
            console.warn('Backend stats unavailable');
        }
    };

    const fetchResources = async () => {
        try {
            const { data } = await api.fetchResources();
            setResources(Array.isArray(data) ? data : []);
        } catch (err) {
            console.warn('Backend resources unavailable');
        }
    };

    const refreshData = async () => {
        await Promise.all([fetchLiveAlerts(), fetchStats(), fetchResources()]);
    };

    const advanceWorkflow = () => {
        setWorkflowId(prev => Math.min(prev + 1, 4));
    };

    useEffect(() => {
        if (user) {
            refreshData();
            captureLocation();
        }
    }, [user]);

    const login = async (formData, isAdmin = false) => {
        try {
            // First attempt backend login
            const { data } = await api.login(formData);
            const userData = data.user;
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('token', data.token);
            setUser(userData);
            addToast('Authenticated via Backend', 'success');
            return userData;
        } catch (error) {
            // Fallback for demo admin
            const ADMIN_EMAIL = 'admin@crisischain.com';
            const VALID_PASSWORDS = ['admin123', 'admin@123', 'Admin@1234'];
            if ((formData.email === ADMIN_EMAIL || formData.name === ADMIN_EMAIL) && VALID_PASSWORDS.includes(formData.password)) {
                 const adminUser = { id: 'admin-001', name: 'Admin', email: ADMIN_EMAIL, role: 'admin' };
                 setUser(adminUser);
                 localStorage.setItem('user', JSON.stringify(adminUser));
                 addToast('Authenticated via Safe Mode', 'success');
                 return adminUser;
            }
            throw error;
        }
    };

    const signup = async (formData) => {
        const { data } = await api.register(formData);
        setUser(data.user);
        return data.user;
    };

    const addAlert = async (alertData) => {
        const { data } = await api.createAlert(alertData);
        setAlerts(prev => [data, ...prev]);
        // Also refresh stats since total incidents increased
        fetchStats();
        return data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
    const openSidebar   = () => setIsSidebarOpen(true);
    const closeSidebar  = () => setIsSidebarOpen(false);

    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    const getIcon = (name) => {
        const icons = { AlertCircle, Waves, Wind, Flame, HeartPulse, Truck, Users, Droplets, Shield, Radiation, Activity, MapPin, AlertTriangle, Siren, HeartHandshake, ClipboardCheck };
        return icons[name] || AlertCircle;
    };

    return (
        <DashboardContext.Provider value={{
            user, alerts, actions, messages, resources, stats, workflowId, toasts,
            isSidebarOpen, isMobileMenuOpen, toggleSidebar, openSidebar, closeSidebar, login, signup, logout, addAlert,
            getIcon, searchQuery, setSearchQuery, addToast, refreshData,
            userLocation, captureLocation,
            fetchLiveAlerts, fetchResources, acknowledgeAction, escalateAction, addMessage, advanceWorkflow
        }}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    return useContext(DashboardContext);
}
