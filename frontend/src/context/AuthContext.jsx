import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get('/auth/me');
      setUser(data.customer);
      return data.customer;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('quickbite:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('quickbite:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await api.post('/auth/login', credentials);
    setUser(data.customer);
    return data.customer;
  }, []);

  const register = useCallback(async (details) => {
    const data = await api.post('/auth/register', details);
    setUser(data.customer);
    return data.customer;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (details) => {
    const data = await api.patch('/profile', details);
    setUser(data.customer);
    return data.customer;
  }, []);

  const changePassword = useCallback(async (details) => {
    await api.post('/profile/change-password', details);
    // The backend clears the cookie and invalidates older token versions.
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      refreshUser,
    }),
    [user, loading, login, register, logout, updateProfile, changePassword, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
