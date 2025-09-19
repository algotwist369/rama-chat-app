import React from 'react';
import { Bell, Wifi, WifiOff, Settings as SettingsIcon, Menu } from 'lucide-react';

const DashboardHeader = ({
  selectedGroup,
  socketConnected,
  sidebarOpen,
  setSidebarOpen,
  showNotificationPanel,
  setShowNotificationPanel,
  showSettings,
  setShowSettings,
  unreadNotificationCount
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
            {selectedGroup?.name || 'RAMA Chat'}
          </h1>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {socketConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
              {socketConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Settings"
          >
            <SettingsIcon className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <button
            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
            className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;