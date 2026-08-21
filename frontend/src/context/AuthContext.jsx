import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth.api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('civix_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('civix_token') || null);
  const [loading, setLoading] = useState(true);

  // Run token verification ONCE on initial mount, NOT on every state update
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      const storedToken = localStorage.getItem('civix_token');
      if (storedToken) {
        try {
          const res = await authApi.getCurrentUser();
          const userData = res.data || res;
          if (isMounted && userData && userData.email) {
            setUser(userData);
            localStorage.setItem('civix_user', JSON.stringify(userData));
          }
        } catch (err) {
          // If token explicitly expired (401), clear session; otherwise retain local cache
          if (err?.message?.includes('401') || err?.message?.includes('Unauthorized') || err?.message?.includes('Invalid token')) {
            console.warn('Session expired, logging out:', err.message);
            if (isMounted) {
              setToken(null);
              setUser(null);
              localStorage.removeItem('civix_token');
              localStorage.removeItem('civix_user');
            }
          }
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    const dataObj = res.data || res;
    const accessToken = dataObj.access_token || res.access_token;
    
    if (!accessToken) {
      throw new Error('Authentication failed: No access token returned from server.');
    }

    const userData = dataObj.user || res.user || {
      email: credentials.email || 'citizen@civix.gov',
      full_name: (credentials.email || 'User').split('@')[0].replace('.', ' '),
      role: dataObj.role || credentials.role || 'CITIZEN',
    };

    // Atomic session persistence
    localStorage.setItem('civix_token', accessToken);
    localStorage.setItem('civix_user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (userData) => {
    const res = await authApi.register(userData);
    return res;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('civix_token');
    localStorage.removeItem('civix_user');
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: Boolean(token && user),
    isAdmin: user?.role === 'ADMIN' || user?.role === 'ENGINEER',
    isInspector: user?.role === 'INSPECTOR',
    isCitizen: user?.role === 'CITIZEN' || !user?.role,
    isFieldUser: user?.role === 'INSPECTOR' || user?.role === 'CITIZEN' || !user?.role,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

