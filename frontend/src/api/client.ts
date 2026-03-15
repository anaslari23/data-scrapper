import axios from 'axios';
import toast from '../components/shared/toast';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: can attach auth token later
apiClient.interceptors.request.use((config) => config);

// Response interceptor: surface user-friendly errors
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const message: string =
      err?.response?.data?.detail ??
      err?.response?.data?.message ??
      err?.message ??
      'An unexpected error occurred';

    // Only show toast for non-404s (404 handled per-component)
    if (err?.response?.status !== 404) {
      toast.error(message);
    }

    return Promise.reject(err);
  }
);
