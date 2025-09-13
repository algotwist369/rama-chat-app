import { useState, useCallback } from 'react';
import { authApi } from '../../api/authApi';
import toast from 'react-hot-toast';

export const usePasswordManager = () => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Change password
  const changePassword = useCallback(async (currentPassword, newPassword, confirmPassword) => {
    setLoading(true);
    clearErrors();
    
    const newErrors = {};

    // Validation
    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'New password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (currentPassword === newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return { success: false, errors: newErrors };
    }

    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to change password';
      setErrors({ changePassword: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [clearErrors]);

  // Reset password request
  const requestPasswordReset = useCallback(async (email) => {
    setLoading(true);
    clearErrors();
    
    if (!email) {
      setErrors({ email: 'Email is required' });
      setLoading(false);
      return { success: false, errors: { email: 'Email is required' } };
    }

    try {
      await authApi.resetPassword({ email });
      toast.success('Password reset email sent');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send reset email';
      setErrors({ resetPassword: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [clearErrors]);

  // Reset password with token
  const resetPasswordWithToken = useCallback(async (token, newPassword, confirmPassword) => {
    setLoading(true);
    clearErrors();
    
    const newErrors = {};

    if (!token) {
      newErrors.token = 'Reset token is required';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'New password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return { success: false, errors: newErrors };
    }

    try {
      await authApi.resetPasswordWithToken({ token, newPassword });
      toast.success('Password reset successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to reset password';
      setErrors({ resetPassword: errorMessage });
      toast.error(errorMessage);
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
    changePassword,
    requestPasswordReset,
    resetPasswordWithToken,
    clearErrors,
    
    // Computed
    hasErrors: Object.keys(errors).length > 0,
    getError: (field) => errors[field] || null
  };
};

export default usePasswordManager;
