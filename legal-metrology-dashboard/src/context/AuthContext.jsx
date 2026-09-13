import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lmpc_user'));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('lmpc_access_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('lmpc_access_token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const res = await authService.getCurrentUser();
          const currentUser = res?.data || res;
          if (currentUser) {
            setUser(currentUser);
            localStorage.setItem('lmpc_user', JSON.stringify(currentUser));
          }
        } catch (err) {
          // Keep stored user if network error
        }
      }
      setIsLoading(false);
    };

    initAuth();

    // Listen for unauthorized 401 events dispatched by API client
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      setError('Session expired. Please log in again.');
    };

    window.addEventListener('lmpc:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('lmpc:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (identifier, password) => {
    setError(null);
    try {
      const isEmail = identifier.includes('@');
      const payload = {
        [isEmail ? 'email' : 'username']: identifier.trim(),
        password,
      };
      
      const result = await authService.login(payload);
      const { user: userData, accessToken } = result.data || result;
      
      setUser(userData);
      setToken(accessToken);
      
      if (userData) localStorage.setItem('lmpc_user', JSON.stringify(userData));
      if (accessToken) localStorage.setItem('lmpc_access_token', accessToken);
      
      return { success: true, user: userData, token: accessToken };
    } catch (err) {
      const msg = err.message || 'Authentication failed. Please check your credentials.';
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout().catch(() => {});
    } finally {
      setUser(null);
      setToken(null);
      setError(null);
      localStorage.removeItem('lmpc_user');
      localStorage.removeItem('lmpc_access_token');
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token),
    isLoading,
    error,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
