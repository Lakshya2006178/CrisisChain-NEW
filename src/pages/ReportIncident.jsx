import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  MapPin,
  Phone,
  User,
  MessageSquare,
  Upload,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Activity,
  Zap,
  Terminal,
  Radiation,
  Flame,
  Droplets,
  Wind,
  HeartPulse,
  Info,
  Globe,
  Navigation,
  Compass,
  Crosshair,
  RefreshCw
} from 'lucide-react';
import * as api from '../api/index.js';
import { useDashboard } from '../context/DashboardContext';
import { INCIDENT_TYPES, SEVERITIES } from '../lib/incidentTypes';
import {
  getDeviceLocation,
  checkGeolocationPermission,
  classifyAccuracy,
  reverseGeocode,
  parseCoordinates,
  getApproximateLocationByIP
} from '../lib/geolocation';
import IncidentLocationMap from '../components/IncidentLocationMap';

// Local icon-component lookup for the type picker (INCIDENT_TYPES only stores
// the string iconName so it can be shared with plain JS/backend code).
const TYPE_ICON_COMPONENTS = { Flame, Droplets, HeartPulse, AlertTriangle, Wind, Shield, Radiation };
const DISASTER_TYPES = INCIDENT_TYPES.map(t => ({ ...t, icon: TYPE_ICON_COMPONENTS[t.iconName] || AlertTriangle }));

export default function ReportIncident() {
  const nav = useNavigate();
  const fileRef = useRef();
  const [form, setForm] = useState({ location: '', disasterType: '', severity: '', description: '' });
  const [files, setFiles] = useState([]);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  
  // Geolocation states
  const [locLoading, setLocLoading] = useState(false);
  const [locStatusMessage, setLocStatusMessage] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt'); // 'granted', 'prompt', 'denied', 'unsupported'
  const [coords, setCoords] = useState(null);
  const [locationSource, setLocationSource] = useState(null); // 'device', 'approximate-ip', 'map-pin', 'manual-coords'
  
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { addAlert, addToast, user } = useDashboard();

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Automatic location detection on mount
  useEffect(() => {
    let isMounted = true;

    async function initAutoLocation() {
      const perm = await checkGeolocationPermission();
      if (!isMounted) return;
      setPermissionState(perm);

      // Attempt automatic location detection if permission is granted or promptable
      if (perm === 'granted' || perm === 'prompt') {
        fetchDeviceLocation({ isAuto: true });
      }
      // If permission is already denied, do NOT repeatedly prompt or show aggressive popups
    }

    initAutoLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Handle manual typing in location field
  const handleLocationChange = (val) => {
    set('location', val);
    const parsed = parseCoordinates(val);
    if (parsed) {
      setCoords({ lat: parsed.lat, lng: parsed.lng, accuracy: null });
      setLocationSource('manual-coords');
    } else if (coords && !val.includes(coords.lat.toFixed(3))) {
      // User replaced or cleared coordinates with custom text
      setCoords(null);
      setLocationSource(null);
    }
  };

  const handleFiles = (fl) => {
    const arr = Array.from(fl).slice(0, 5);
    setFiles(prev => [...prev, ...arr].slice(0, 5));
  };

  // High-accuracy device geolocation with controlled retry
  const fetchDeviceLocation = async ({ isAuto = false } = {}) => {
    setLocLoading(true);
    setLocStatusMessage('Acquiring high-accuracy position...');
    setErrors(e => ({ ...e, location: undefined }));

    try {
      const loc = await getDeviceLocation((msg) => setLocStatusMessage(msg));
      
      // If the device's Wi-Fi database reported an anomalous location thousands of miles away from system timezone
      if (loc.isAnomalous) {
        addToast(
          `Wi-Fi database reported anomalous location (${loc.hoursDiff}h timezone difference from system clock). Auto-switching to verified network location...`,
          'warning'
        );
        await fetchApproximateIpLocation();
        return;
      }

      const lat = loc.lat;
      const lng = loc.lng;
      const accuracy = loc.accuracy;

      setCoords({ lat, lng, accuracy });
      setLocationSource('device');
      setPermissionState('granted');

      setLocStatusMessage('Resolving place address...');
      const placeName = await reverseGeocode(lat, lng);
      const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      const finalLocString = placeName
        ? `${placeName} (${coordStr})`
        : coordStr;

      set('location', finalLocString);
      setLocLoading(false);
      setLocStatusMessage(null);

      const accData = classifyAccuracy(accuracy);
      if (accData.isPoor) {
        addToast(`Device location reading has low accuracy (±${Math.round(accuracy)}m). Please verify or drag pin on map.`, 'warning');
      } else {
        addToast(`Device Location Acquired (±${Math.round(accuracy)}m)`, 'success');
      }
    } catch (err) {
      setLocLoading(false);
      setLocStatusMessage(null);
      if (err.isDenied) {
        setPermissionState('denied');
        if (!isAuto) {
          addToast('Location access was denied in browser permissions.', 'error');
        }
      } else if (!isAuto) {
        addToast(err?.message || 'Unable to retrieve device position.', 'error');
      }
    }
  };

  // Explicit approximate IP network location fallback (clearly labeled)
  const fetchApproximateIpLocation = async () => {
    setLocLoading(true);
    setLocStatusMessage('Detecting approximate network location...');
    setErrors(e => ({ ...e, location: undefined }));

    try {
      const ipLoc = await getApproximateLocationByIP();
      const lat = ipLoc.lat;
      const lng = ipLoc.lng;

      setCoords({ lat, lng, accuracy: ipLoc.accuracy });
      setLocationSource('approximate-ip');

      const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      const label = ipLoc.label || `${ipLoc.city || 'Regional Hub'}, ${ipLoc.country || ''}`;
      const finalLocString = `${label} (${coordStr}) [Approximate Network]`;

      set('location', finalLocString);
      addToast(`Approximate Network Location: ${label}. This reflects your ISP hub; please adjust pin on map if displaced.`, 'info');
    } catch (err) {
      addToast('Unable to detect network location. Please select your position on the map.', 'error');
    } finally {
      setLocLoading(false);
      setLocStatusMessage(null);
    }
  };

  // User clicked or dragged pin on the interactive map
  const handleMapLocationSelect = async ({ lat, lng }) => {
    const cleanLat = Number(lat);
    const cleanLng = Number(lng);
    if (isNaN(cleanLat) || isNaN(cleanLng)) return;

    setCoords({ lat: cleanLat, lng: cleanLng, accuracy: 15 }); // Precise manual pin placement
    setLocationSource('map-pin');

    const coordStr = `${cleanLat.toFixed(6)}, ${cleanLng.toFixed(6)}`;
    set('location', coordStr);

    const placeName = await reverseGeocode(cleanLat, cleanLng);
    if (placeName) {
      set('location', `${placeName} (${coordStr})`);
    }
    addToast(`Position pinned on map (${cleanLat.toFixed(4)}, ${cleanLng.toFixed(4)})`, 'info');
  };

  const validate = () => {
    const e = {};
    if (!form.location.trim()) e.location = 'Location / address is required';
    if (!form.disasterType) e.disasterType = 'Please select a disaster type';
    if (!form.severity) e.severity = 'Please select severity level';
    if (!form.description.trim() || form.description.length < 20) e.description = 'Please provide at least 20 characters of detail';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    
    try {
      // Resolve coordinates: use pinned coords or parse from location text
      const resolvedCoords = coords || parseCoordinates(form.location);
      
      let payload;
      if (files.length > 0) {
        // Build FormData when an image file is attached
        const formData = new FormData();
        formData.append('type', form.disasterType);
        formData.append('location', form.location);
        formData.append('severity', form.severity);
        formData.append('description', form.description);
        if (resolvedCoords?.lat != null) formData.append('latitude', resolvedCoords.lat);
        if (resolvedCoords?.lng != null) formData.append('longitude', resolvedCoords.lng);
        formData.append('image', files[0]);
        payload = formData;
      } else {
        payload = {
          type: form.disasterType,
          location: form.location,
          severity: form.severity,
          description: form.description,
          latitude: resolvedCoords?.lat ?? null,
          longitude: resolvedCoords?.lng ?? null
        };
      }
      
      console.log('Submitting emergency report payload');
      const res = await addAlert(payload);
      console.log('Report confirmed by backend:', res);
      
      setLoading(false); 
      setSuccess(true); 
    } catch (e) {
      console.error('FAILED TO DELIVER REPORT:', e);
      setLoading(false);
      addToast(`Uplink Failed: ${e.response?.data?.error || e.message}`, 'error');
    }
  };

  const reportId = useMemo(() => `#RI-${Math.random().toString(36).substr(2, 6).toUpperCase()}`, []);

  if (success) return (
    <div className="min-h-screen bg-[#08080A] text-[#E5E5E7] font-inter flex items-center justify-center p-8 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none bg-green-500/5 blur-[160px]" />
      <div className="max-w-[600px] w-full bg-white/5 border border-green-500/20 backdrop-blur-3xl p-16 text-center animate-slide-up relative z-10">
        <div className="w-24 h-24 bg-green-500/10 border border-green-500/40 flex items-center justify-center mx-auto mb-10">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
       <span className="text-[10px] font-mono text-green-500 tracking-[0.5em] uppercase block mb-6">HELP IS ON THE WAY</span>
        <h2 className="font-outfit text-5xl font-black tracking-tighter uppercase mb-8">REPORT RECEIVED</h2>
        <p className="text-white/40 font-light text-lg mb-12">
          Your emergency report has been sent to the nearest rescue teams. They are being notified right now.
          Report ID: <span className="text-[#00FFCC] font-mono">{reportId}</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <button onClick={() => nav(user?.role === 'admin' ? '/dashboard' : '/alerts')} className="px-10 py-5 bg-[#00FFCC] text-black font-outfit font-black uppercase tracking-widest hover:brightness-110 transition-all">
            View Updates
          </button>
          <button onClick={() => { setSuccess(false); setForm({ location: '', disasterType: '', severity: '', description: '' }); setFiles([]); setCoords(null); }} className="px-10 py-5 bg-white/5 border border-white/10 text-white font-outfit font-black uppercase tracking-widest hover:bg-white/10 transition-all">
            Report Another Emergency
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#08080A] text-slate-900 dark:text-[#E5E5E7] font-inter selection:bg-[#ef4444] selection:text-white">
      
      {/* ── AMBIENT MESH BACKGROUND ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className="absolute w-[800px] h-[800px] rounded-full blur-[160px] opacity-[0.06] bg-red-600 transition-transform duration-1000 ease-out"
          style={{ transform: `translate(${mousePos.x - 400}px, ${mousePos.y - 400}px)` }}
        />
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[140px] opacity-[0.06] bg-red-700 animate-pulse" />
      </div>

      {/* ── TACTICAL NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-black/40 backdrop-blur-3xl border-b border-slate-200 dark:border-white/5 py-4 sm:py-5 px-4 sm:px-8">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
           <Link to="/" className="flex items-center gap-3 sm:gap-4 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-100 dark:bg-white/5 border border-red-500/30 rounded-lg flex items-center justify-center group-hover:border-red-500/50 transition-all flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-500" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-outfit font-black text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white uppercase">CRISISCHAIN</span>
              <span className="text-[9px] font-mono text-red-600 dark:text-red-400 tracking-wider font-bold uppercase">Emergency Help Portal</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-lg">
                <div className="w-1.5 h-1.5 bg-red-600 dark:bg-red-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-mono tracking-wider uppercase font-bold">Priority Line Active</span>
             </div>
             <button onClick={() => nav('/')} className="px-4 sm:px-5 py-1.5 border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-white/60">
               ← CANCEL
             </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-24 sm:pt-32 pb-40 px-4 sm:px-8">
        <div className="max-w-[1000px] mx-auto">
          
          <div className="mb-10 sm:mb-16 text-center">
             <span className="text-[10px] font-mono text-red-600 dark:text-red-500 tracking-widest uppercase font-bold block mb-4 animate-pulse">Emergency Report Mode</span>
             <h1 className="font-outfit text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white uppercase mb-4">
               REPORT AN EMERGENCY
             </h1>
             <p className="text-slate-600 dark:text-white/50 text-sm sm:text-base md:text-lg max-w-2xl mx-auto uppercase tracking-wide">
               Your report will be sent directly to local emergency responders.
             </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            
            {/* Section 1: Geo-location */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-teal-700 dark:text-[#00FFCC] uppercase tracking-wider font-bold">01_INCIDENT_LOCATION</span>
                <div className="h-[1px] flex-1 bg-slate-200 dark:bg-white/10" />
              </div>
              <div className="space-y-4">
                {/* Location Input & Action Controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 group">
                    <MapPin className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/20 group-focus-within:text-red-500 transition-colors" />
                    <input
                      className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-red-500/50 rounded-xl px-12 sm:px-14 py-3.5 sm:py-4 font-mono text-xs tracking-wider focus:outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 shadow-xs"
                      placeholder="ENTER ADDRESS OR COORDINATES (OR USE DEVICE LOCATION)"
                      value={form.location}
                      onChange={e => handleLocationChange(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fetchDeviceLocation({ isAuto: false })}
                      disabled={locLoading}
                      title="Acquire high-accuracy device location"
                      className="flex-1 sm:flex-none py-3 sm:py-0 px-4 sm:px-6 bg-white dark:bg-white/5 border border-red-300 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all font-outfit font-bold text-xs uppercase tracking-wider text-red-600 dark:text-red-400 whitespace-nowrap flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Compass size={14} className={locLoading && locationSource !== 'approximate-ip' ? 'animate-spin' : ''} />
                      {locLoading ? (locStatusMessage || 'LOCATING...') : 'USE DEVICE GPS'}
                    </button>
                    <button
                      type="button"
                      onClick={fetchApproximateIpLocation}
                      disabled={locLoading}
                      title="Fallback to approximate ISP network location"
                      className="flex-1 sm:flex-none py-3 sm:py-0 px-4 sm:px-5 bg-teal-50 dark:bg-teal-500/10 border border-teal-300 dark:border-teal-500/30 hover:bg-teal-100 dark:hover:bg-teal-500/20 rounded-xl transition-all font-outfit font-bold text-xs uppercase tracking-wider text-teal-700 dark:text-[#00FFCC] whitespace-nowrap flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Globe size={14} />
                      <span className="hidden md:inline">APPROX</span> IP FALLBACK
                    </button>
                  </div>
                </div>

                {/* REAL-TIME PERMISSION ADVISORY IF BLOCKED */}
                {permissionState === 'denied' && (
                  <div className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-mono text-slate-700 dark:text-gray-300 flex items-center gap-2 shadow-xs">
                    <Info size={14} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
                    <span>Browser location access is blocked. You can type an address or tap directly on the map below to pinpoint the incident.</span>
                  </div>
                )}

                {/* PINNED LOCATION BADGE & SOURCE/ACCURACY METRICS */}
                {coords && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-white/10 px-4 py-2.5 rounded-xl shadow-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CheckCircle2 size={14} className="text-teal-600 dark:text-[#00FFCC]" />
                        <span className="text-slate-900 dark:text-white font-bold">COORDINATES:</span>
                        <span className="text-teal-700 dark:text-[#00FFCC] tracking-wider font-bold">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
                        
                        {/* Reported accuracy tolerance tag */}
                        {coords.accuracy != null && (
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${classifyAccuracy(coords.accuracy).badgeColor}`}>
                            {classifyAccuracy(coords.accuracy).label}
                          </span>
                        )}
                      </div>

                      {/* Explicit location source label */}
                      <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300">
                        SOURCE: {
                          locationSource === 'device' ? 'DEVICE GEOLOCATION' :
                          locationSource === 'approximate-ip' ? 'APPROXIMATE NETWORK (IP)' :
                          locationSource === 'map-pin' ? 'MAP PIN (MANUAL)' :
                          locationSource === 'manual-coords' ? 'MANUAL COORDS ENTRY' : 'USER SPECIFIED'
                        }
                      </span>
                    </div>

                    {/* POOR ACCURACY WARNING BANNER */}
                    {coords.accuracy != null && classifyAccuracy(coords.accuracy).isPoor && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/40 rounded-xl flex items-start gap-2.5 text-xs font-mono text-amber-800 dark:text-amber-300 shadow-xs">
                        <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold uppercase tracking-wider block mb-0.5">LOW POSITIONING ACCURACY (±{Math.round(coords.accuracy)}m)</span>
                          <span>Your device reported coarse positioning (typical of laptop Wi-Fi triangulation). Please tap or drag the red pin on the map below to confirm your exact location.</span>
                        </div>
                      </div>
                    )}

                    {/* APPROXIMATE IP DISCLAIMER */}
                    {locationSource === 'approximate-ip' && (
                      <div className="p-3 bg-teal-50 dark:bg-teal-500/10 border border-teal-300 dark:border-teal-500/30 rounded-xl flex items-start gap-2.5 text-xs font-mono text-teal-800 dark:text-teal-300 shadow-xs">
                        <Globe size={15} className="text-teal-600 dark:text-[#00FFCC] flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold uppercase tracking-wider block mb-0.5">APPROXIMATE REGIONAL NETWORK ESTIMATE</span>
                          <span>These coordinates represent your internet service provider's routing gateway and may be displaced from your actual street address. Please drag the pin on the map to adjust.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* INTERACTIVE LEAFLET TACTICAL MAP PICKER */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-600 dark:text-gray-400">
                    <span className="flex items-center gap-1.5 text-teal-700 dark:text-[#00FFCC] font-bold">
                      <MapPin size={13} /> INTERACTIVE TACTICAL PIN MAP
                    </span>
                    <span className="text-slate-500 dark:text-white/40 text-[10px]">
                      Tap map or drag pin to choose exact incident spot
                    </span>
                  </div>

                  <IncidentLocationMap
                    coords={coords}
                    onLocationSelect={handleMapLocationSelect}
                    defaultCenter={coords ? [coords.lat, coords.lng] : [12.8245, 74.8763]}
                    height="300px"
                  />
                </div>

                {errors.location && <p className="text-[10px] font-mono text-red-600 uppercase tracking-wider font-bold ml-1">{errors.location}</p>}
              </div>
            </div>

            {/* Section 2: Event Intel */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-teal-700 dark:text-[#00FFCC] uppercase tracking-wider font-bold">02_EVENT_DETAILS</span>
                <div className="h-[1px] flex-1 bg-slate-200 dark:bg-white/10" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-600 dark:text-white/40 uppercase tracking-wider font-bold ml-1">What is happening?*</label>
                  <div className="relative group">
                    <select className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-red-500/50 rounded-xl px-5 py-3.5 font-mono text-xs tracking-wider focus:outline-none transition-all text-slate-900 dark:text-white appearance-none cursor-pointer shadow-xs" value={form.disasterType} onChange={e => set('disasterType', e.target.value)}>
                       <option value="" className="bg-white dark:bg-[#08080A]">SELECT TYPE</option>
                       {DISASTER_TYPES.map(type => <option key={type.value} value={type.value} className="bg-white dark:bg-[#08080A] uppercase">{type.label}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">▼</div>
                  </div>
                  {errors.disasterType && <p className="text-[10px] font-mono text-red-600 uppercase tracking-wider font-bold ml-1">{errors.disasterType}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-600 dark:text-white/40 uppercase tracking-wider font-bold ml-1">Threat Level*</label>
                  <div className="grid grid-cols-4 gap-2">
                    {SEVERITIES.map(sev => (
                      <button key={sev.id} type="button" onClick={() => set('severity', sev.id)} className={`py-3.5 rounded-xl border font-mono text-[9px] font-bold tracking-wider transition-all shadow-xs ${form.severity === sev.id ? 'bg-red-600 border-red-500 text-white' : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-white/40 hover:border-slate-400'}`}>
                        {sev.label}
                      </button>
                    ))}
                  </div>
                  {errors.severity && <p className="text-[10px] font-mono text-red-600 uppercase tracking-wider font-bold ml-1">{errors.severity}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-600 dark:text-white/40 uppercase tracking-wider font-bold ml-1 flex justify-between">
                  <span>Describe what happened*</span>
                  <span>{form.description.length}_chars</span>
                </label>
                <div className="relative group">
                  <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-slate-400 dark:text-white/20 group-focus-within:text-red-500 transition-colors" />
                  <textarea rows={4} className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-red-500/50 rounded-xl px-12 py-3.5 font-mono text-xs tracking-wider focus:outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 resize-none shadow-xs" placeholder="DESCRIBE THE SITUATION IN DETAIL..." value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
                {errors.description && <p className="text-[10px] font-mono text-red-600 uppercase tracking-wider font-bold ml-1">{errors.description}</p>}
              </div>
            </div>

            {/* Section 3: Visuals */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-teal-700 dark:text-[#00FFCC] uppercase tracking-wider font-bold">03_EVIDENCE_UPLOAD</span>
                <div className="h-[1px] flex-1 bg-slate-200 dark:bg-white/10" />
              </div>
              <div className={`relative p-8 bg-white dark:bg-white/5 border-2 border-dashed rounded-xl transition-all group shadow-xs ${drag ? 'border-red-500 bg-red-50 dark:bg-red-500/5' : 'border-slate-300 dark:border-white/10 hover:border-slate-400'}`}>
                <input type="file" accept="image/*,video/*" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFiles(e.target.files)} />
                <div className="text-center space-y-3">
                  <Camera className={`w-10 h-10 mx-auto transition-colors ${drag ? 'text-red-500' : 'text-slate-400 dark:text-white/20 group-hover:text-red-500'}`} />
                  <p className="text-xs font-mono text-slate-700 dark:text-white/40 uppercase tracking-wider font-bold">
                    Drag Evidence Here OR <span className="text-red-600 dark:text-red-500">Attach Files</span>
                  </p>
                  <p className="text-[9px] font-mono text-slate-400 dark:text-white/20 uppercase">JPG, PNG, MP4 // LIMIT 5 FILES</p>
                </div>
              </div>
              {files.length > 0 && (
                <div className="grid grid-cols-5 gap-3">
                  {files.map((f, i) => (
                    <div key={i} className="aspect-square bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden relative group">
                       <img src={URL.createObjectURL(f)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="preview" />
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40">
                          <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-white text-[9px] font-mono bg-red-600 px-2 py-1 rounded">PURGE</button>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 bg-red-50 dark:bg-red-600/5 border border-red-200 dark:border-red-600/20 rounded-xl flex gap-4 items-start shadow-xs">
               <Info className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
               <p className="text-xs font-mono text-red-700 dark:text-red-400 uppercase tracking-wider leading-relaxed">
                 PLEASE NOTE: Only report real emergencies. Accurate information helps rescue teams save lives faster.
               </p>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full group relative overflow-hidden py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-outfit font-black text-lg uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <Zap className={`w-6 h-6 text-white ${loading ? 'animate-pulse' : ''}`} />
              <span>{loading ? 'SENDING REPORT...' : 'SEND REPORT NOW'}</span>
            </button>
          </form>

          <footer className="mt-20 pt-20 border-t border-white/5 flex flex-col items-center gap-6">
             <div className="flex gap-12 text-[9px] font-mono text-white/20 tracking-[0.4em]">
                <span>ENCRYPT_STRENGTH: 256-BIT</span>
                <span>SECURE_UPLINK</span>
                <span>AUTH: COMMAND_SYSTEM</span>
             </div>
             <p className="text-[8px] font-mono text-white/10 uppercase tracking-[0.8em]">
               © 2026 CrisisChain // THE_SOVEREIGN_OBSERVER
             </p>
          </footer>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .stroke-text {
          -webkit-text-stroke: 1px rgba(255,255,255,0.4);
          text-stroke: 1px rgba(255,255,255,0.4);
          color: transparent;
        }
      `}} />
    </div>
  );
}
