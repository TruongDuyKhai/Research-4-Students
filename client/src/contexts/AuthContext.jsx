import React, { createContext, useState, useEffect, useContext } from 'react';
import client from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify authentication state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('r4s_token');
      const storedUser = localStorage.getItem('r4s_user');

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            setUser(null);
          }
        }

        try {
          // Verify token and fetch fresh user profile from backend
          const res = await client.get('/auth/me');
          const freshUser = res.data.data;
          setUser(freshUser);
          localStorage.setItem('r4s_user', JSON.stringify(freshUser));
        } catch (error) {
          console.error('Failed to verify session token:', error.message);
          // Token is invalid or expired, clear auth details
          localStorage.removeItem('r4s_token');
          localStorage.removeItem('r4s_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken, newUser) => {
    localStorage.setItem('r4s_token', newToken);
    localStorage.setItem('r4s_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('r4s_token');
    localStorage.removeItem('r4s_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('r4s_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
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
