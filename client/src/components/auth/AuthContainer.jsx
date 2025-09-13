import React, { useState } from 'react';
import AuthForm from './AuthForm';

const AuthContainer = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'reset'

  const handleSwitchMode = (newMode) => {
    setAuthMode(newMode || (authMode === 'login' ? 'register' : 'login'));
  };

  const handleAuthSuccess = (result) => {
    if (onAuthSuccess) {
      onAuthSuccess(result, authMode);
    }
  };

  return (
    <AuthForm
      type={authMode}
      onSuccess={handleAuthSuccess}
      onSwitchMode={handleSwitchMode}
    />
  );
};

export default AuthContainer;
