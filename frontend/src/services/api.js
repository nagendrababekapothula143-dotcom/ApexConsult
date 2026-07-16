import axios from 'axios';

export const getBaseUrl = () => {
  // Try to use environment variable if explicitly set
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }
  
  // Dynamically determine the backend URL based on the environment
  const hostname = window.location.hostname;
  
  // If running locally, connect to the local backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  
  // If running in production (Vercel), connect to the live Render backend
  return 'https://apexconsult.onrender.com/api';
};

export const getAvatarSource = (avatarUrl) => {
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('S3_KEY:')) {
    const key = avatarUrl.replace('S3_KEY:', '');
    return `${getBaseUrl()}/auth/avatar/${key}`;
  }
  
  // Intercept old direct S3 URLs that throw AccessDenied
  if (avatarUrl.includes('amazonaws.com/avatars/')) {
    const key = avatarUrl.split('amazonaws.com/avatars/')[1];
    return `${getBaseUrl()}/auth/avatar/${key}`;
  }

  return avatarUrl;
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
