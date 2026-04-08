import axios from 'axios';
import toast from 'react-hot-toast';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    toast.error(message);
    
    if (error.response?.status === 401) {
      if (window.location.hash !== '#/login' && window.location.hash !== '#/signup') {
        window.location.hash = '#/login';
      }
    }
    
    return Promise.reject(error);
  }
);
