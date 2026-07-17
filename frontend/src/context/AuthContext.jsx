import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('apex_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  // Sync user state to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('apex_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('apex_user');
    }
  }, [user]);
  


  useEffect(() => {
    const fetchUser = async () => {
      try {
        // api will use the interceptor to send the Bearer token
        const response = await api.get('/auth/me');
        setUser(response.data.data);
      } catch (error) {
        console.error('Failed to authenticate with token/cookie:', error);
        setUser(null);
        localStorage.removeItem('apex_token');
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.token) {
        localStorage.setItem('apex_token', response.data.token);
      }
      setUser(response.data.data);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Login failed. Please check your credentials.',
      };
    }
  };

  const register = async (name, email, password, role, avatarBase64 = null) => {
    try {
      const response = await api.post('/auth/register', { 
        name, 
        email, 
        password,
        role,
        avatarBase64
      });
      if (response.data.token) {
        localStorage.setItem('apex_token', response.data.token);
      }
      setUser(response.data.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Registration failed.',
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('apex_token');
    setUser(null);
  };


  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
