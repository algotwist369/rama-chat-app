import React, { useEffect, memo, useCallback, useRef } from 'react';
import { 
  Bell, 
  X, 
  Trash2, 
  MessageCircle, 
  Users, 
  UserPlus, 
  UserMinus,
  Clock,
  Settings,
  Check,
  AlertCircle,
  Info
} from 'lucide-react';
import { formatMessageTime } from '../utils/formatDate';
import { useNotifications } from '../hooks/useNotifications';

const EnhancedNotificationPanel = ({ isOpen, onClose, onNotificationClick, onNotificationCountChange }) => {
  const {
    notifications,
    loading,
    notificationCount,
    loadNotifications,
    clearAllNotifications,
    createTestNotifications,
    handleNotificationClick: handleClick
  } = useNotifications();

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // Track previous notification count to prevent unnecessary updates
  const prevNotificationCount = useRef(notificationCount);
  
  useEffect(() => {
    // Only update parent if count actually changed
    if (prevNotificationCount.current !== notificationCount && onNotificationCountChange) {
      onNotificationCountChange(notificationCount);
      prevNotificationCount.current = notificationCount;
    }
  }, [notificationCount, onNotificationCountChange]);

  const getNotificationIcon = useCallback((type) => {
    const icons = {
      message: <MessageCircle className="h-5 w-5 text-blue-500" />,
      user_joined: <UserPlus className="h-5 w-5 text-green-500" />,
      user_left: <UserMinus className="h-5 w-5 text-red-500" />,
      group_update: <Users className="h-5 w-5 text-purple-500" />,
      system: <Settings className="h-5 w-5 text-slate-500" />,
      error: <AlertCircle className="h-5 w-5 text-red-500" />,
      info: <Info className="h-5 w-5 text-blue-500" />
    };
    return icons[type] || <Bell className="h-5 w-5 text-slate-500" />;
  }, []);

  const getNotificationColor = useCallback((type) => {
    const colors = {
      message: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      user_joined: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      user_left: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      group_update: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      system: 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800',
      error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    };
    return colors[type] || 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800';
  }, []);

  const handleNotificationClick = useCallback((notification) => {
    handleClick(notification);
    onNotificationClick?.(notification);
  }, [handleClick, onNotificationClick]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Notifications
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {notificationCount} unread notifications
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                title="Clear all notifications"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-slate-400" />
              </div>
              <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                No notifications
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                You're all caught up! New notifications will appear here.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md ${getNotificationColor(notification.type)}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatMessageTime(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                      {notification.message && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      {notification.groupId && (
                        <div className="flex items-center space-x-1 mt-2">
                          <Users className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Group notification
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {notifications.length} total notifications
            </div>
            <button
              onClick={createTestNotifications}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Create test notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(EnhancedNotificationPanel);
