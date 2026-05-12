import axios from 'axios';
import { useAuthStore } from '@/store/useStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/';
    
    // Only auto-logout if the error is 401 AND we aren't already trying to login
    if (error.response?.status === 401 && !isLoginPage) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
