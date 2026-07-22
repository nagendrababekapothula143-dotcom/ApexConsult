import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, getIdToken } from 'firebase/auth';

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await getIdToken(firebaseUser, true);
          localStorage.setItem('apex_token', token);
          
          // Fetch user profile from our backend
          const response = await api.get('/auth/me');
          setUser(response.data.data);
        } catch (error) {
          console.error('Failed to authenticate with backend:', error);
          setUser(null);
          localStorage.removeItem('apex_token');
        }
      } else {
        setUser(null);
        localStorage.removeItem('apex_token');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await getIdToken(userCredential.user, true);
      localStorage.setItem('apex_token', token);
      
      const response = await api.get('/auth/me');
      setUser(response.data.data);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.message || 'Login failed. Please check your credentials.',
      };
    }
  };

  const register = async (name, email, password, role, avatarBase64 = null) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const token = await getIdToken(userCredential.user, true);
      localStorage.setItem('apex_token', token);
      
      // Call backend to create the user profile in Firestore
      const response = await api.post('/auth/register', { 
        name, 
        email, 
        password, // Backend might still expect this for legacy reasons, even if not used by Firebase
        role,
        avatarBase64,
        firebaseUid: userCredential.user.uid
      });
      
      setUser(response.data.data);
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Registration failed.',
      };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Optional: still call backend logout to revoke session if implemented
      try {
        await api.post('/auth/logout');
      } catch (e) {
        // Ignore backend logout errors if it fails
      }
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
