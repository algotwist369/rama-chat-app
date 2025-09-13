import React, { useState } from 'react';
import { Lock, Key, User, Shield } from 'lucide-react';
import Button from '../common/Button';
import { PasswordChangeModal, PasswordResetModal } from './index';

const AuthSettings = ({ user }) => {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const handlePasswordChangeSuccess = (result) => {
    console.log('Password changed successfully:', result);
    // You can add additional logic here, like showing a success message
  };

  const handlePasswordResetSuccess = (result) => {
    console.log('Password reset action:', result);
    if (result.action === 'backToLogin') {
      // Handle navigation back to login
      console.log('Navigate back to login');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
      </div>

      <div className="space-y-4">
        {/* User Info */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <User className="h-5 w-5 text-gray-500" />
          <div>
            <p className="font-medium text-gray-900">{user?.username || 'User'}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Password Management */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Password Management</h3>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">Change Password</p>
                <p className="text-sm text-gray-500">Update your current password</p>
              </div>
            </div>
            <Button
              onClick={() => setShowPasswordChange(true)}
              variant="outline"
              size="sm"
            >
              Change
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">Reset Password</p>
                <p className="text-sm text-gray-500">Send reset link to your email</p>
              </div>
            </div>
            <Button
              onClick={() => setShowPasswordReset(true)}
              variant="outline"
              size="sm"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* PIN Management (if user has PIN) */}
        {user?.pin && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">PIN Management</h3>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">Update PIN</p>
                  <p className="text-sm text-gray-500">Change your 4-6 digit PIN</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled
              >
                Coming Soon
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <PasswordChangeModal
        isOpen={showPasswordChange}
        onClose={() => setShowPasswordChange(false)}
        onSuccess={handlePasswordChangeSuccess}
      />

      <PasswordResetModal
        isOpen={showPasswordReset}
        onClose={() => setShowPasswordReset(false)}
        onSuccess={handlePasswordResetSuccess}
      />
    </div>
  );
};

export default AuthSettings;
