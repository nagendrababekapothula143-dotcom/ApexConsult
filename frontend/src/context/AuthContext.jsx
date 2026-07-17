import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Used for 2FA flow
  const [tempUserId, setTempUserId] = useState(null); 

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // api interceptor will automatically attach the token
          const response = await api.get('/auth/me');
          setUser(response.data.data);
        } catch (error) {
          console.error('Failed to authenticate with token:', error);
          localStorage.removeItem('token');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.require2FA) {
        setTempUserId(response.data.userId);
        return { success: true, require2FA: true, message: response.data.message };
      }

      localStorage.setItem('token', response.data.token);
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
      
      localStorage.setItem('token', response.data.token);
      setUser(response.data.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Registration failed.',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const verify2FA = async (otp) => {
    try {
      if (!tempUserId) throw new Error("No temporary user ID found for 2FA");

      const response = await api.post('/auth/verify-2fa', { userId: tempUserId, otp });
      
      localStorage.setItem('token', response.data.token);
      setUser(response.data.data);
      setTempUserId(null); // Clear it
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid OTP code.',
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, verify2FA }}>
      {children}
    </AuthContext.Provider>
  );
};
