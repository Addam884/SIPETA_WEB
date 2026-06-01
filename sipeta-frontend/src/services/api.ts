import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://103.157.27.220:8000/api',
  headers: {
    Accept: 'application/json',
  },
});

// 🔥 AUTO TOKEN
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

// ─── Hook: useDefaultClustering ───────────────────────────────────────────────