import React, { useState, useEffect } from 'react';
import { X, Mail, Lock } from 'lucide-react';
import InputField from '../common/InputField';
import Button from '../common/Button';
import { usePasswordManager } from '../../hooks/auth/usePasswordManager';

const PasswordResetModal = ({ isOpen, onClose, onSuccess }) => {
  const {
    loading,
    errors,
    requestPasswordReset,
    clearErrors,
    getError
  } = usePasswordManager();

  const [email, setEmail] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);

  // Clear form and errors when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setIsEmailSent(false);
      clearErrors();
    }
  }, [isOpen, clearErrors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const result = await requestPasswordReset(email);

    if (result.success) {
      setIsEmailSent(true);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleBackToLogin = () => {
    onClose();
    if (onSuccess) {
      onSuccess({ action: 'backToLogin' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              {isEmailSent ? 'Check Your Email' : 'Reset Password'}
            </h2>
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

        {!isEmailSent ? (
          <>
            <p className="text-gray-600 mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField
                label="Email Address"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                error={getError('email')}
              />

              {/* Global Error Display */}
              {errors.resetPassword && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                  {errors.resetPassword}
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
                  Send Reset Email
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Email Sent!</h3>
            <p className="text-gray-600 mb-6">
              We've sent a password reset link to <strong>{email}</strong>. 
              Please check your email and follow the instructions to reset your password.
            </p>
            <div className="space-y-3">
              <Button
                onClick={handleBackToLogin}
                variant="primary"
                fullWidth
              >
                Back to Login
              </Button>
              <Button
                onClick={() => setIsEmailSent(false)}
                variant="outline"
                fullWidth
              >
                Try Different Email
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordResetModal;
