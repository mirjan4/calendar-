import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('markaz_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized and currently in admin panel, clear token and redirect to login
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        localStorage.removeItem('markaz_admin_token');
        localStorage.removeItem('markaz_admin_user');
        window.location.href = '/admin/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
