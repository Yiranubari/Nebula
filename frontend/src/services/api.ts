import axios from 'axios';
import toast from 'react-hot-toast';

export const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:7000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the stored access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nebula.accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Auto-refresh on 401 (token expired) — attempt once
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const res = await api.post('/auth/refresh');
        if (res.data.accessToken) {
          localStorage.setItem('nebula.accessToken', res.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return api(originalRequest);
        }
      } catch {
        // Refresh failed — force logout
        localStorage.removeItem('nebula.accessToken');
        localStorage.setItem('nebula.auth.v1', 'false');
        if (
          window.location.hash !== '#/login' &&
          window.location.hash !== '#/signup'
        ) {
          window.location.hash = '#/login';
        }
        return Promise.reject(error);
      }
    }

    const message =
      error.response?.data?.message || error.message || 'An error occurred';

    // Suppress 401 redirect noise on auth pages themselves
    if (error.response?.status === 401) {
      if (
        window.location.hash !== '#/login' &&
        window.location.hash !== '#/signup'
      ) {
        window.location.hash = '#/login';
      }
    } else {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);
