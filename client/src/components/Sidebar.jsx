import React from 'react';
import { Link } from 'react-router-dom';
import { Users, LogOut, Plus, X, Settings } from 'lucide-react';

const Sidebar = ({ groups, selectedGroup, onGroupSelect, onLogout, user, onClose }) => {
  return (
    <div className="w-64 sm:w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0 overflow-hidden h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Groups
          </h2>
          <div className="flex items-center space-x-2">
            <button className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Plus className="h-4 w-4" />
            </button>
            {/* Close button for mobile */}
            <button 
              onClick={onClose}
              className="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm sm:text-base font-medium">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">
              {user?.username}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {groups.length === 0 ? (
          <div className="p-4 text-center">
            <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No groups available
            </p>
          </div>
        ) : (
          <div className="p-2">
            {groups.map((group) => (
              <button
                key={group._id}
                onClick={() => onGroupSelect(group)}
                className={`w-full text-left p-2 sm:p-3 rounded-lg mb-1 transition-colors ${
                  selectedGroup?._id === group._id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-medium truncate">
                      {group.name}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                      {group.region || 'No region'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Admin Panel Link (for admin users) */}
      {user?.role === 'admin' && (
        <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
          <Link
            to="/admin"
            className="w-full flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm sm:text-base font-medium">Admin Panel</span>
          </Link>
        </div>
      )}

      {/* Logout Button */}
      <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm sm:text-base font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;