import axios from 'axios';

// Create Axios instance with base URL proxying to backend (or directly in production)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true, // Required to send/receive HTTP-only cookies
});

// Request interceptor to attach JWT token if it exists in local storage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lmpc_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for generic error handling
api.interceptors.response.use(
  (response) => {
    // Our backend sends standardized ApiResponse with `data` inside the root object.
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('lmpc_access_token');
      localStorage.removeItem('lmpc_user');
      if (!window.location.pathname.includes('/login')) {
        window.dispatchEvent(new CustomEvent('lmpc:unauthorized'));
      }
    }

    const customError = {
      message: error.response?.data?.message || 'An unexpected error occurred',
      statusCode: error.response?.data?.statusCode || error.response?.status || 500,
      errors: error.response?.data?.errors || [],
      success: false,
    };
    return Promise.reject(customError);
  }
);

// Users / Auth Service
export const authService = {
  login: (credentials) => api.post('/users/login', credentials),
  logout: () => api.post('/users/logout'),
  getCurrentUser: () => api.get('/users/current-user'),
};

// Analytics Service
export const analyticsService = {
  getComplianceRate: () => api.get('/analytics/compliance-rate'),
  getComplianceTrend: () => api.get('/analytics/compliance-trend'),
  getTopViolations: () => api.get('/analytics/top-violations'),
  getInspectorLeaderboard: (limit = 50) => api.get(`/analytics/inspector-leaderboard?limit=${limit}`),
};

// Inspections Service
export const inspectionService = {
  getInspections: (page = 1, limit = 50) => api.get(`/inspections/?page=${page}&limit=${limit}`),
  getInspectionById: (id) => api.get(`/inspections/${id}`),
  updateInspection: (id, data) => api.patch(`/inspections/${id}`, data),
};

// Notices Service
export const noticeService = {
  getNotices: (page = 1, limit = 50) => api.get(`/notices/?page=${page}&limit=${limit}`),
  getNoticesByInspection: (inspectionId) => api.get(`/notices/inspection/${inspectionId}`),
  generateNotice: (inspectionId, data = {}) => api.post(`/notices/generate/${inspectionId}`, data),
  downloadNotice: (id) => api.get(`/notices/${id}/download`, { responseType: 'blob' }),
};

export default api;