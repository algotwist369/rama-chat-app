import React, { useState, useEffect } from 'react';
import { X, Lock, Eye, EyeOff } from 'lucide-react';
import InputField from '../common/InputField';
import Button from '../common/Button';
import { usePasswordManager } from '../../hooks/auth/usePasswordManager';

const PasswordChangeModal = ({ isOpen, onClose, onSuccess }) => {
  const {
    loading,
    errors,
    changePassword,
    clearErrors,
    getError
  } = usePasswordManager();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Clear form and errors when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      clearErrors();
    }
  }, [isOpen, clearErrors]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const result = await changePassword(
      formData.currentPassword,
      formData.newPassword,
      formData.confirmPassword
    );

    if (result.success) {
      onClose();
      if (onSuccess) {
        onSuccess(result);
      }
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Lock className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Change Password</h2>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            icon={<X className="h-4 w-4" />}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Current Password"
            name="currentPassword"
            type="password"
            value={formData.currentPassword}
            onChange={handleChange}
            placeholder="Enter your current password"
            required
            error={getError('currentPassword')}
            showPasswordToggle
          />

          <InputField
            label="New Password"
            name="newPassword"
            type="password"
            value={formData.newPassword}
            onChange={handleChange}
            placeholder="Enter your new password"
            required
            error={getError('newPassword')}
            showPasswordToggle
          />

          <InputField
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your new password"
            required
            error={getError('confirmPassword')}
            showPasswordToggle
          />

          {/* Global Error Display */}
          {errors.changePassword && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
              {errors.changePassword}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading}
              className="flex-1"
            >
              Change Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
