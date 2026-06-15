import axios from 'axios';
import toast from 'react-hot-toast';

export const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:7000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 75_000,
});

export async function warmupBackend(): Promise<void> {
  try {
    const base = api.defaults.baseURL?.replace(/\/api\/?$/, "") ?? "";
    await fetch(`${base}/health`, {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
    });
  } catch {
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nebula.accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;

const doRefresh = async (): Promise<string | null> => {
  const res = await api.post('/auth/refresh');
  const token = res.data?.accessToken;
  if (token) {
    localStorage.setItem('nebula.accessToken', token);
    return token;
  }
  return null;
};

api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (
      body &&
      typeof body === 'object' &&
      body.status === 'success' &&
      'data' in body
    ) {
      response.data = body.data;
    }
    return response;
  }
);

export const sharedRefresh = (): Promise<string | null> => {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

const goToLogin = () => {
  localStorage.removeItem('nebula.accessToken');
  localStorage.setItem('nebula.auth.v1', 'false');
  if (
    window.location.hash !== '#/login' &&
    window.location.hash !== '#/signup'
  ) {
    window.location.hash = '#/login';
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/verify-otp') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
      originalRequest._retry = true;
      try {
        const newToken = await sharedRefresh();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
        goToLogin();
        return Promise.reject(error);
      } catch {
        goToLogin();
        return Promise.reject(error);
      }
    }

    const message =
      error.response?.data?.message || error.message || 'An error occurred';

    if (error.response?.status === 401) {
      const url = originalRequest?.url || '';
      if (
        url.includes('/auth/login') ||
        url.includes('/auth/verify-otp') ||
        url.includes('/auth/register')
      ) {
        toast.error(message);
      } else if (
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
