import React from 'react';
import { AuthForm } from '../components/auth';

const Login = ({ onGoToRegister }) => {
  const handleAuthSuccess = (result, authMode) => {
    // Handle successful authentication
    console.log('Auth success:', result?.success, authMode);
    if (result?.success) {
      // Redirect to dashboard or show success message
      console.log('User logged in successfully');
    }
  };

  const handleSwitchMode = (newMode) => {
    if (newMode === 'register') {
      onGoToRegister();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your Ramavan Chat account</p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <AuthForm
            type="login"
            onSuccess={handleAuthSuccess}
            onSwitchMode={handleSwitchMode}
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <button
              onClick={() => onGoToRegister()}
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Sign up here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
