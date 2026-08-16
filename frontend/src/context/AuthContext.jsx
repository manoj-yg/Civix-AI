import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth.api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('civix_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('civix_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await authApi.getCurrentUser();
          const userData = res.data || res;
          setUser(userData);
          localStorage.setItem('civix_user', JSON.stringify(userData));
        } catch (err) {
          console.error('Auth verification failed:', err);
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    const dataObj = res.data || res;
    const accessToken = dataObj.access_token || res.access_token || 'civix_auth_token_2026';
    const userData = dataObj.user || res.user || {
      email: credentials.email || credentials.username || 'citizen@civix.gov',
      full_name: (credentials.email || 'User').split('@')[0],
      role: dataObj.role || credentials.role || 'CITIZEN',
    };

    setToken(accessToken);
    setUser(userData);
    localStorage.setItem('civix_token', accessToken);
    localStorage.setItem('civix_user', JSON.stringify(userData));
    return userData;
  };


  const register = async (userData) => {
    const res = await authApi.register(userData);
    return res;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('civix_token');
    localStorage.removeItem('civix_user');
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'ADMIN' || user?.role === 'ENGINEER',
    isFieldUser: user?.role === 'INSPECTOR' || user?.role === 'CITIZEN' || !user?.role,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
