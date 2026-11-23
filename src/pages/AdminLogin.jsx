import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';
import { 
  ShieldAlert, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  ChevronLeft
} from 'lucide-react';

export default function AdminLogin() {
  const nav = useNavigate();
  const { login } = useDashboard();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) { setError('Email and password required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setError('Valid email address required.'); return; }
    setLoading(true);
    try {
      const user = await login({ email: trimmedEmail, password });
      setLoading(false); 
      if (user.role !== 'admin') {
        setError('Access denied: Administrator privileges required.');
        return;
      }
      nav('/dashboard');
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || err.message || 'Admin Authentication Failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF2F6] dark:bg-[#08080A] text-slate-900 dark:text-[#E5E5E7] font-inter flex items-center justify-center p-6 selection:bg-red-500 selection:text-white">
      <div className="max-w-[480px] w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-red-500/20 shadow-2xl backdrop-blur-xl p-8 sm:p-12 relative animate-slide-up rounded-xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-600" />
        
        <div className="mb-8 text-center">
          <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <span className="text-[10px] font-mono text-red-600 tracking-[0.4em] uppercase block mb-2 font-bold">Restricted Access</span>
          <h1 className="font-outfit text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 dark:text-white">ADMIN PORTAL</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400 dark:text-white/20 group-focus-within:text-red-600 transition-colors" />
              </div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ADMIN_EMAIL"
                className="w-full bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded-lg pl-12 pr-4 py-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono text-sm tracking-wider"
              />
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400 dark:text-white/20 group-focus-within:text-red-600 transition-colors" />
              </div>
              <input 
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ADMIN_PASSWORD"
                className="w-full bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded-lg pl-12 pr-12 py-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono text-sm tracking-wider"
              />
              <button 
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute inset-y-0 right-4 flex items-center text-slate-400 dark:text-white/20 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-xs font-mono text-red-600 dark:text-red-400 uppercase tracking-wider">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full relative overflow-hidden py-4 bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-300 disabled:opacity-50 shadow-sm"
          >
            <span className="text-lg font-outfit font-black uppercase tracking-widest text-white">
              {loading ? 'AUTHENTICATING...' : 'AUTHORIZE_ACCESS'}
            </span>
          </button>
        </form>
        
        <div className="mt-6 text-center">
            <Link to="/" className="text-[10px] font-mono text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white uppercase tracking-widest transition-colors inline-flex items-center gap-1.5 font-bold">
                <ChevronLeft size={14} /> BACK TO PUBLIC SITE
            </Link>
        </div>
      </div>
    </div>
  );
}
