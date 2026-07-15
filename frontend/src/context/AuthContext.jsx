import React, { createContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../config/firebase';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          // Fetch user profile from backend (sync)
          const response = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data.data);
        } catch (error) {
          console.error('Failed to sync user with backend:', error);
          if (error.response?.status === 403) {
            await signOut(auth); // Force firebase signout if deactivated
          }
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      // Sync with backend
      const response = await api.post('/auth/login', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.require2FA) {
        return { success: true, require2FA: true, message: response.data.message };
      }

      setUser(response.data.data);
      return { success: true };
    } catch (error) {
      if (error.response?.status === 403) {
        await signOut(auth); // Ensure Firebase doesn't keep them logged in
      }
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Login failed. Please check your credentials.',
      };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      // Sync new user with backend
      const response = await api.post('/auth/register', { name, email, role }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Registration failed.',
      };
    }
  };

  const loginWithGoogle = async (role = 'student', customName = null) => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const token = await userCredential.user.getIdToken();
      
      // Try to login
      try {
        const response = await api.post('/auth/login', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.require2FA) {
          return { success: true, require2FA: true, message: response.data.message };
        }

        setUser(response.data.data);
        return { success: true, isNewUser: false };
      } catch (loginError) {
        // If 404, user is new, so register them
        if (loginError.response?.status === 404) {
          const nameToUse = customName || userCredential.user.displayName || 'Google User';
          
          const registerResponse = await api.post('/auth/register', { 
            name: nameToUse, 
            email: userCredential.user.email, 
            role 
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setUser(registerResponse.data.data);
          return { success: true, isNewUser: true };
        }
        throw loginError;
      }
    } catch (error) {
      console.error("Google auth error:", error);
      return {
        success: false,
        message: error.message || 'Google authentication failed.',
      };
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const verify2FA = async (otp) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated with Firebase.");

      const response = await api.post('/auth/verify-2fa', { otp }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid OTP code.',
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, verify2FA }}>
      {children}
    </AuthContext.Provider>
  );
};
