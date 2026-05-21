import axios from 'axios';

const api = axios.create({
<<<<<<< HEAD
  baseURL: 'http://127.0.0.1:8000/api',
=======
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api',
>>>>>>> a192957638c1f5b99a2260992611bf3aed508ff8
  headers: {
    Accept: 'application/json',
  },
});

// AUTO TOKEN
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;