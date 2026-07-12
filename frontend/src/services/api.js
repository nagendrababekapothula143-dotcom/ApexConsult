import axios from 'axios';

const getBaseUrl = () => {
  // Try to use environment variable if explicitly set (and not just pointing to localhost)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl;
  }
  
  // Dynamically determine the backend URL based on the browser's current address.
  // This allows it to work seamlessly on local network IPs (e.g., testing on mobile).
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:5000/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
});

import { auth } from '../config/firebase';

// Automatically inject JWT token into header of every request
api.interceptors.request.use(
  async (config) => {
    // Check if we have a firebase user logged in
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (e) {
        console.error('Error getting Firebase token:', e);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
