import axios from "axios";

// Single source of truth for the backend origin. Was previously hardcoded
// as 'http://localhost:5001' in this file AND separately duplicated in
// ResourceInventory.jsx's raw fetch() call — the latter meant the "nearest
// facilities" feature would silently break on any host other than the
// original dev machine. Override with VITE_API_URL in a .env file when
// deploying anywhere else.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${base}${cleanPath}`;
};

const API = axios.create({ baseURL: `${API_BASE_URL}/api` });

// Add token to requests
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Handle expired tokens and unauthorized responses gracefully
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (typeof window !== 'undefined' && 
            window.location.pathname !== '/login' && 
            window.location.pathname !== '/admin' && 
            window.location.pathname !== '/') {
          window.location.href = '/login';
        }
      } catch (e) {
        console.error('Session cleanup error:', e);
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (formData) => API.post('/auth/login', formData);
export const register = (formData) => API.post('/auth/register', formData);

// Alerts
export const fetchAlerts = () => API.get('/alerts');
export const createAlert = (newAlert) => API.post('/alerts', newAlert);
export const updateAlertStatus = (id, status) => API.patch(`/alerts/${id}/status`, { status });
export const fetchStats = () => API.get('/alerts/stats');
export const detectNetworkLocation = () => API.get('/alerts/detect-location');

// Resources
export const fetchResources = () => API.get('/resources');
export const updateResource = (id, deployed) => API.patch(`/resources/${id}`, { deployed });
export const fetchNearbyResources = (params) => API.get('/resources/nearby', { params });

// Analytics
export const fetchAnalyticsOverview = () => API.get('/analytics/overview');
export const fetchIncidentAnalytics = (params) => API.get('/analytics/incidents', { params });
export const fetchResponderAnalytics = () => API.get('/analytics/responders');
export const fetchResourceAnalytics = () => API.get('/analytics/resources');
export const fetchActivityLogs = () => API.get('/analytics/activity-logs');
export const fetchDistribution = () => API.get('/analytics/incident-distribution');
export const fetchTrends = () => API.get('/analytics/incident-trends');
export const fetchResponseTrends = () => API.get('/analytics/response-trends');

// Organizations
export const fetchOrganizations = (params) => API.get('/organizations', { params });
export const fetchOrganizationById = (id) => API.get(`/organizations/${id}`);
export const createOrganization = (data) => API.post('/organizations', data);
export const updateOrganization = (id, data) => API.patch(`/organizations/${id}`, data);
export const deleteOrganization = (id) => API.delete(`/organizations/${id}`);

// Users
export const fetchUsers = (params) => API.get('/users', { params });
export const fetchUserById = (id) => API.get(`/users/${id}`);
export const updateUserStatus = (id, is_active) => API.patch(`/users/${id}/status`, { is_active });
export const updateUserRole = (id, role) => API.patch(`/users/${id}/role`, { role });
export const updateUser = (id, data) => API.patch(`/users/${id}`, data);

// Assignments
export const fetchAssignments = (params) => API.get('/assignments', { params });
export const fetchAssignmentById = (id) => API.get(`/assignments/${id}`);
export const createAssignment = (data) => API.post('/assignments', data);
export const updateAssignmentStatus = (id, status, notes) => API.patch(`/assignments/${id}/status`, { status, notes });
export const deleteAssignment = (id) => API.delete(`/assignments/${id}`);
export const fetchAvailableResponders = () => API.get('/assignments/available-responders');

// Resource Allocations
export const fetchAllocations = (params) => API.get('/allocations', { params });
export const fetchAllocationById = (id) => API.get(`/allocations/${id}`);
export const createAllocation = (data) => API.post('/allocations', data);
export const releaseAllocation = (id) => API.patch(`/allocations/${id}/release`);
export const deleteAllocation = (id) => API.delete(`/allocations/${id}`);
export const fetchAllocationStats = () => API.get('/allocations/stats');

// Notifications
export const fetchNotifications = (params) => API.get('/notifications', { params });
export const fetchUnreadNotificationCount = () => API.get('/notifications/unread-count');
export const markNotificationAsRead = (id) => API.patch(`/notifications/${id}/read`);
export const markAllNotificationsAsRead = () => API.patch('/notifications/mark-all-read');
export const deleteNotification = (id) => API.delete(`/notifications/${id}`);
export const createNotification = (data) => API.post('/notifications', data);

// Hospital Resources
export const fetchHospitalResources = () => API.get('/hospital/resources');
export const updateHospitalResources = (data) => API.put('/hospital/resources', data);
export const updateHospitalItem = (category, id, item) => API.patch(`/hospital/resources/${category}/${id}`, item);

export default API;
