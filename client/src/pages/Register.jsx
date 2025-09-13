import React from 'react';
import { AuthForm } from '../components/auth';

const Register = ({ onGoToLogin }) => {
  const handleAuthSuccess = (result, authMode) => {
    // Handle successful registration
    console.log('Registration success:', result?.success, authMode);
    if (result?.success) {
      // Redirect to dashboard or show success message
      console.log('User registered successfully');
    }
  };

  const handleSwitchMode = (newMode) => {
    if (newMode === 'login') {
      onGoToLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Ramavan Chat</h1>
          <p className="text-gray-600">Create your account to start chatting</p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <AuthForm
            type="register"
            onSuccess={handleAuthSuccess}
            onSwitchMode={handleSwitchMode}
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <button
              onClick={() => onGoToLogin()}
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
