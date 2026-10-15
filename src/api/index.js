import axios from "axios";

// Single source of truth for the backend origin. Was previously hardcoded
// as 'http://localhost:5001' in this file AND separately duplicated in
// ResourceInventory.jsx's raw fetch() call — the latter meant the "nearest
// facilities" feature would silently break on any host other than the
// original dev machine. Override with VITE_API_URL in a .env file when
// deploying anywhere else.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const API = axios.create({ baseURL: `${API_BASE_URL}/api` });

// Add token to requests
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Auth
export const login = (formData) => API.post('/auth/login', formData);
export const register = (formData) => API.post('/auth/register', formData);

// Alerts
export const fetchAlerts = () => API.get('/alerts');
export const createAlert = (newAlert) => API.post('/alerts', newAlert);
export const updateAlertStatus = (id, status) => API.patch(`/alerts/${id}/status`, { status });
export const fetchStats = () => API.get('/alerts/stats');

// Resources
export const fetchResources = () => API.get('/resources');
export const updateResource = (id, deployed) => API.patch(`/resources/${id}`, { deployed });
export const fetchNearbyResources = (params) => API.get('/resources/nearby', { params });

// Analytics
export const fetchDistribution = () => API.get('/analytics/distribution');
export const fetchTrends = () => API.get('/analytics/incident-trends');
export const fetchResponseTrends = () => API.get('/analytics/response-trends');

export default API;
