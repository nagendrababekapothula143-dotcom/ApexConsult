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
  withCredentials: true, // Crucial for HttpOnly cookies
});

// Add a request interceptor to attach the JWT token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('apex_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
