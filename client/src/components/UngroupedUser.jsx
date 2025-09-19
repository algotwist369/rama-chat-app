import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, FormContainer, ErrorDisplay } from './common';

const UngroupedUser = () => {
  const { user, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState(null);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      // Add a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.reload();
    } catch (err) {
      setError('Failed to refresh page. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setError(null);
      await logout();
    } catch (err) {
      setError('Failed to logout. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <FormContainer 
      title="No Group Access"
      subtitle="You are not assigned to any groups yet"
    >
      <div className="space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-2xl">👤</span>
          </div>
        </div>

        {/* Description */}
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Please contact an administrator to get access to chat groups.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <ErrorDisplay error={error} />
        )}

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            What you can do:
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Contact your administrator</li>
            <li>• Request group access</li>
            <li>• Wait for group assignment</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            size="medium"
            onClick={handleRefresh}
            loading={isRefreshing}
            className="flex-1"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Page'}
          </Button>
          <Button
            variant="danger"
            size="medium"
            onClick={handleLogout}
            loading={isLoggingOut}
            className="flex-1"
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Button>
        </div>

        {/* User Info */}
        {user && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Logged in as: <span className="font-medium text-gray-700 dark:text-gray-300">{user.username}</span>
            </p>
          </div>
        )}
      </div>
    </FormContainer>
  );
};

export default UngroupedUser;