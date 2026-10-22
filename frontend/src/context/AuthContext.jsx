import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('markaz_admin_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('markaz_admin_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/profile');
        if (res.data.success) {
          setUser(res.data.admin);
          localStorage.setItem('markaz_admin_user', JSON.stringify(res.data.admin));
        }
      } catch (err) {
        console.error('Session verification failed:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();
  }, [token]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.admin);
      localStorage.setItem('markaz_admin_token', res.data.token);
      localStorage.setItem('markaz_admin_user', JSON.stringify(res.data.admin));
      return res.data;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('markaz_admin_token');
      localStorage.removeItem('markaz_admin_user');
    }
  };

  const updateProfile = async ({ fullName, currentPassword, newPassword }) => {
    const res = await api.put('/auth/profile', { fullName, currentPassword, newPassword });
    if (res.data.success) {
      if (res.data.token) {
        setToken(res.data.token);
        localStorage.setItem('markaz_admin_token', res.data.token);
      }
      if (res.data.admin) {
        setUser(res.data.admin);
        localStorage.setItem('markaz_admin_user', JSON.stringify(res.data.admin));
      }
      return res.data;
    }
    throw new Error(res.data.message || 'Profile update failed');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
