import React, { createContext, useState, useEffect, useContext } from 'react';
import axiosLib from 'axios'; // For direct auth endpoint checks like refresh
import api, { setAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync token to API module when changed
  useEffect(() => {
    setAccessToken(token);
  }, [token]);

  // Check if user is logged in on mount (by trying to refresh first, then get profile)
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        // Silently refresh token on page load using raw axios
        const refreshRes = await axiosLib.post('/api/auth/refresh', {}, { withCredentials: true });
        const accessToken = refreshRes.data.accessToken;
        setToken(accessToken);
        setAccessToken(accessToken);

        // Fetch user data using custom api instance
        const res = await api.get('/api/auth/me');
        setUser(res.data);
      } catch (err) {
        setUser(null);
        setToken(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    };
    checkLoggedIn();
  }, []);

  // Logout function
  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error on server:', err);
    } finally {
      setUser(null);
      setToken(null);
      setAccessToken(null);
      // Clean up headers
      delete api.defaults.headers.common['Authorization'];
    }
  };

  // Listen for API-level token updates and logouts
  useEffect(() => {
    const handleTokenRefreshed = (e) => {
      setToken(e.detail);
      setAccessToken(e.detail);
    };

    const handleGlobalLogout = async () => {
      await logout();
      window.location.href = '/login';
    };

    window.addEventListener('auth:token_refreshed', handleTokenRefreshed);
    window.addEventListener('auth:logout', handleGlobalLogout);

    return () => {
      window.removeEventListener('auth:token_refreshed', handleTokenRefreshed);
      window.removeEventListener('auth:logout', handleGlobalLogout);
    };
  }, []);

  // Login
  const login = async (username, password) => {
    setError(null);
    try {
      const res = await api.post('/api/auth/login', { username, password });
      const { user: userData, accessToken } = res.data;
      
      setUser(userData);
      setToken(accessToken);
      setAccessToken(accessToken);
      
      return userData;
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to login. Please try again.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  // Register
  const register = async (userData) => {
    setError(null);
    try {
      const res = await api.post('/api/auth/register', userData);
      
      if (res.data.message === 'Awaiting admin approval') {
        return res.data;
      }
      
      const { user: newUserData, accessToken } = res.data;
      setUser(newUserData);
      setToken(accessToken);
      setAccessToken(accessToken);
      
      return newUserData;
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Registration failed.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const updateProfileState = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, register, logout, updateProfileState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
