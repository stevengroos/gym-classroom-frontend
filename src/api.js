import axios from 'axios';

// Creamos una instancia de axios con la URL de tu .env o Render
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://gym-classroom-api.onrender.com',
});

// Este interceptor pegará automáticamente el token JWT en cada petición si existe
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;