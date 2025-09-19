import axios from 'axios';
import toast from 'react-hot-toast';
import envConfig from '../config/environment';

const axiosInstance = axios.create({
  baseURL: envConfig.getApiUrl(),
  timeout: envConfig.get('API_TIMEOUT', 30000),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorData = error.response?.data;
    
    // Only handle 401 for non-login requests to prevent page reload on login errors
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      // Use React Router navigation instead of window.location
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      toast.error('Session expired. Please login again.');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (errorData?.error) {
      // Handle new backend error format
      if (typeof errorData.error === 'object') {
        toast.error(errorData.error.message || 'An error occurred');
      } else {
        toast.error(String(errorData.error));
      }
    } else if (error.message) {
      toast.error(String(error.message));
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
