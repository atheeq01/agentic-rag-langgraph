import axios from 'axios';
import { useAuthStore } from '@/store/useStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
  xsrfCookieName: 'csrf_token',
  xsrfHeaderName: 'X-CSRF-Token',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => {
    const csrfToken = response.headers['x-csrf-token'];
    if (csrfToken) {
      api.defaults.headers.common['X-CSRF-Token'] = csrfToken;
    }
    return response;
  },
  (error) => {
    const csrfToken = error.response?.headers?.['x-csrf-token'];
    if (csrfToken) {
      api.defaults.headers.common['X-CSRF-Token'] = csrfToken;
    }
    const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/';
    
    // Only auto-logout if the error is 401 AND we aren't already trying to login
    if (error.response?.status === 401 && !isLoginPage) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
