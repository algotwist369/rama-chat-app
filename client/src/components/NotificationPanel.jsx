import React, { useEffect, memo, useCallback, useRef } from 'react';
import { 
  Bell, 
  X, 
  Trash2, 
  MessageCircle, 
  Users, 
  UserPlus, 
  UserMinus,
  Clock
} from 'lucide-react';
import { formatMessageTime } from '../utils/formatDate';
import { useNotifications } from '../hooks/useNotifications';

const NotificationPanel = ({ isOpen, onClose, onNotificationClick, onNotificationCountChange }) => {
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
      message: <MessageCircle className="h-4 w-4 text-[#34a0a4]" />,
      user_joined: <UserPlus className="h-4 w-4 text-green-400" />,
      user_left: <UserMinus className="h-4 w-4 text-red-400" />,
      group_update: <Users className="h-4 w-4 text-purple-400" />
    };
    return icons[type] || <Bell className="h-4 w-4 text-[#f8f9fa]/70" />;
  }, []);

  const getNotificationColor = useCallback((type) => {
    const colors = {
      message: 'bg-[#34a0a4]/10 border-[#34a0a4]/30',
      user_joined: 'bg-green-500/10 border-green-500/30',
      user_left: 'bg-red-500/10 border-red-500/30',
      group_update: 'bg-purple-500/10 border-purple-500/30'
    };
    return colors[type] || 'bg-[#495057]/20 border-[#495057]/40';
  }, []);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-30 transition-opacity duration-300 ease-in-out"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="absolute left-0 top-0 h-full w-full sm:w-96 max-w-sm bg-[#343a40] shadow-2xl transform transition-transform duration-300 ease-out border-l border-[#495057] animate-in slide-in-from-left">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-[#495057]">
          <div className="flex items-center space-x-2">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-[#f8f9fa]" />
            <h2 className="text-base sm:text-lg font-semibold text-[#f8f9fa]">Notifications</h2>
            {notifications.length > 0 && (
              <span className="bg-[#34a0a4] text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center text-xs">
                {notifications.length > 99 ? '99+' : notifications.length}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {notifications.length === 0 && (
              <button
                onClick={createTestNotifications}
                className="px-2 py-1 text-xs text-[#34a0a4] bg-[#34a0a4]/20 rounded hover:bg-[#34a0a4]/30 transition-colors touch-manipulation"
                title="Create test notifications"
              >
                Test
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="p-1 text-[#f8f9fa] hover:text-red-400 hover:bg-red-500/20 rounded transition-colors touch-manipulation"
                title="Clear all notifications"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-[#f8f9fa] hover:text-[#34a0a4] hover:bg-[#34a0a4]/20 rounded transition-colors touch-manipulation"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-h-[calc(100vh-80px)] sm:max-h-[calc(100vh-100px)] overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34a0a4]"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
              <Bell className="h-10 w-10 sm:h-12 sm:w-12 text-[#495057] mb-3" />
              <h3 className="text-base sm:text-lg font-medium text-[#f8f9fa] mb-1">No notifications</h3>
              <p className="text-sm text-[#f8f9fa]/70">You're all caught up!</p>
            </div>
          ) : (
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              {notifications.map((notification, index) => (
                <div
                  key={index}
                  onClick={() => handleClick(notification, onNotificationClick, onClose)}
                   className={`p-2 sm:p-3 rounded-lg border cursor-pointer hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 touch-manipulation ${getNotificationColor(notification.type)}`}
                >
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start sm:items-center justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-medium text-[#f8f9fa] truncate">
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-1 text-xs text-[#f8f9fa]/70 flex-shrink-0">
                          <Clock className="h-3 w-3" />
                          <span className="hidden xs:inline">{formatMessageTime(notification.createdAt)}</span>
                        </div>
                      </div>
                      {notification.message && (
                        <p className="text-xs sm:text-sm text-[#f8f9fa]/80 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      {notification.groupName && (
                        <p className="text-xs text-[#f8f9fa]/60 mt-1">
                          in {notification.groupName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Memoize the NotificationPanel component to prevent unnecessary re-renders
export default memo(NotificationPanel);
