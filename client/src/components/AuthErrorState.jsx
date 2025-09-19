import React from 'react';
import { Button } from './common';

const AuthErrorState = ({ onLogout }) => {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
          Authentication Error
        </h2>
        <p className="text-gray-500 dark:text-gray-500 mb-4">
          Please log in again to continue.
        </p>
        <Button
          onClick={onLogout}
          variant="primary"
          size="medium"
        >
          Go to Login
        </Button>
      </div>
    </div>
  );
};

export default AuthErrorState;
