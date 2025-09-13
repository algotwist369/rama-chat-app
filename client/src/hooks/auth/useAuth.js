import { useState, useCallback } from 'react';
import { useAuth as useAuthContext } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const { login, register } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Login with email and password
  const loginWithPassword = useCallback(async (email, password) => {
    setLoading(true);
    clearErrors();
    
    try {
      await login({ email, password });
      return { success: true };
    } catch (error) {
      const errorData = error.response?.data;
      let errorMessage = errorData?.error || error.message || 'Login failed';
      
      // Handle detailed validation errors from backend
      if (errorData?.details && Array.isArray(errorData.details)) {
        const fieldErrors = {};
        errorData.details.forEach(detail => {
          if (detail.field && detail.message && typeof detail.message === 'string') {
            fieldErrors[detail.field] = detail.message;
          }
        });
        
        // Set field-specific errors (ensure all values are strings)
        const allErrors = { ...fieldErrors, login: errorMessage };
        setErrors(allErrors);
        
        // Don't show toast - errors will be displayed in form fields
      } else {
        setErrors({ login: errorMessage });
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [login, clearErrors]);

  // Login with PIN
  const loginWithPin = useCallback(async (email, pin) => {
    setLoading(true);
    clearErrors();
    
    try {
      const response = await authApi.loginWithPin({ email, pin });
      
      // Store the token and user data
      localStorage.setItem('token', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'PIN login failed';
      setErrors({ pinLogin: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [clearErrors]);

  // Register new user
  const registerUser = useCallback(async (userData) => {
    setLoading(true);
    clearErrors();
    
    try {
      await register(userData);
      return { success: true };
    } catch (error) {
      const errorData = error.response?.data;
      let errorMessage = errorData?.error || error.message || 'Registration failed';
      
      // Handle detailed validation errors from backend
      if (errorData?.details && Array.isArray(errorData.details)) {
        const fieldErrors = {};
        errorData.details.forEach(detail => {
          if (detail.field && detail.message && typeof detail.message === 'string') {
            fieldErrors[detail.field] = detail.message;
          }
        });
        
        // Set field-specific errors (ensure all values are strings)
        const allErrors = { ...fieldErrors, register: errorMessage };
        setErrors(allErrors);
        
        // Don't show toast - errors will be displayed in form fields
      } else {
        setErrors({ register: errorMessage });
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [register, clearErrors]);

  // Validate form data
  const validateForm = useCallback((formData, type = 'login') => {
    const newErrors = {};

    if (type === 'login' || type === 'register') {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
    }

    if (type === 'login' && formData.password !== undefined) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      }
    }

    if (type === 'register') {
      if (!formData.username) {
        newErrors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      }

      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (type === 'pin') {
      if (!formData.pin) {
        newErrors.pin = 'PIN is required';
      } else if (formData.pin.length < 4 || formData.pin.length > 6) {
        newErrors.pin = 'PIN must be 4-6 digits';
      } else if (!/^\d+$/.test(formData.pin)) {
        newErrors.pin = 'PIN must contain only numbers';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email) => {
    setLoading(true);
    clearErrors();
    
    try {
      await authApi.resetPassword({ email });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send reset email';
      setErrors({ resetPassword: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [clearErrors]);

  // Change password
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    setLoading(true);
    clearErrors();
    
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      return { success: true };
    } catch (error) {
      const errorData = error.response?.data;
      let errorMessage = errorData?.error || error.message || 'Failed to change password';
      
      // Handle detailed validation errors from backend
      if (errorData?.details && Array.isArray(errorData.details)) {
        const fieldErrors = {};
        errorData.details.forEach(detail => {
          if (detail.field && detail.message && typeof detail.message === 'string') {
            fieldErrors[detail.field] = detail.message;
          }
        });
        
        // Set field-specific errors (ensure all values are strings)
        const allErrors = { ...fieldErrors, changePassword: errorMessage };
        setErrors(allErrors);
        
        // Don't show toast - errors will be displayed in form fields
      } else {
        setErrors({ changePassword: errorMessage });
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [clearErrors]);

  return {
    // State
    loading,
    errors,
    
    // Actions
    loginWithPassword,
    loginWithPin,
    registerUser,
    resetPassword,
    changePassword,
    validateForm,
    clearErrors,
    
    // Computed
    hasErrors: Object.keys(errors).length > 0,
    getError: (field) => errors[field] || null
  };
};

export default useAuth;
