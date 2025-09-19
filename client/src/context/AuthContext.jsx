import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear invalid data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    try {
      let response;
      
      if (credentials.pin) {
        // PIN login
        response = await authApi.loginWithPin({
          email: credentials.email,
          pin: credentials.pin
        });
      } else if (credentials.username) {
        // Registration
        response = await authApi.register({
          username: credentials.username,
          email: credentials.email,
          password: credentials.password
        });
      } else {
        // Password login
        response = await authApi.login({
          email: credentials.email,
          password: credentials.password
        });
      }
      
      // Store token and user data
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('userRole', response.user.role);
      
      setUser(response.user);
      
      if (credentials.username) {
        toast.success('Registration successful!');
      } else {
        toast.success('Login successful!');
      }
      
      return { success: true, user: response.user };
    } catch (error) {
      console.error('Auth error:', error);
      let errorMessage = 'Authentication failed';
      
      if (error.response?.data?.error) {
        if (typeof error.response.data.error === 'object') {
          errorMessage = error.response.data.error.message || 'Authentication failed';
        } else {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      if (localStorage.getItem('token')) {
        await authApi.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      toast.success('Logged out successfully');
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};