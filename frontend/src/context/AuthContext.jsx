import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  


  useEffect(() => {
    const fetchUser = async () => {
      try {
        // api will automatically send the HttpOnly cookie
        const response = await api.get('/auth/me');
        setUser(response.data.data);
      } catch (error) {
        console.error('Failed to authenticate with cookie:', error);
        setUser(null);
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      // No need to save token manually, cookie is set automatically
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
      // No need to save token manually, cookie is set automatically
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
    setUser(null);
  };


  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
