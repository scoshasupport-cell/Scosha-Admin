import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from './auth-store';
import type { AdminUser, ApiResponse } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  try {
    await axios.post(`${API_URL}/admin/auth/refresh`, {}, { withCredentials: true });
    return true;
  } catch {
    useAuthStore.getState().logout();
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/admin/login';
    }
    return false;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      if (original.url?.includes('/admin/auth/login') || original.url?.includes('/admin/auth/refresh')) {
        return Promise.reject(error);
      }
      original._retry = true;
      refreshing = refreshing ?? refreshSession().finally(() => {
        refreshing = null;
      });
      const ok = await refreshing;
      if (ok) return api(original);
    }
    return Promise.reject(error);
  }
);

export async function bootstrapAdminSession() {
  try {
    window.localStorage.removeItem('scosha-admin-auth');
  } catch {
    /* storage unavailable */
  }
  try {
    const { data } = await api.get<ApiResponse<AdminUser>>('/admin/auth/me');
    useAuthStore.getState().setAdmin(data.data);
  } catch {
    useAuthStore.getState().setAdmin(null);
  }
}

export async function getData<T>(url: string, params?: Record<string, unknown>) {
  const { data } = await api.get<ApiResponse<T>>(url, { params });
  return data;
}

export async function postData<T>(url: string, body?: unknown) {
  const { data } = await api.post<ApiResponse<T>>(url, body);
  return data;
}

export async function putData<T>(url: string, body?: unknown) {
  const { data } = await api.put<ApiResponse<T>>(url, body);
  return data;
}

export async function patchData<T>(url: string, body?: unknown) {
  const { data } = await api.patch<ApiResponse<T>>(url, body);
  return data;
}

export async function deleteData<T>(url: string) {
  const { data } = await api.delete<ApiResponse<T>>(url);
  return data;
}
