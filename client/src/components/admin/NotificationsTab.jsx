import React, { useState, useEffect } from 'react';
import { Bell, Trash2, Eye, EyeOff, TestTube } from 'lucide-react';
import Button from '../common/Button';

const NotificationsTab = ({ actionLoading = {}, onClearNotifications, onMarkAsSeen }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load notifications
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { notificationApi } = await import('../../api/notificationApi');
      const response = await notificationApi.getNotifications();
      setNotifications(response.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create test notifications
  const createTestNotifications = async () => {
    try {
      const { notificationApi } = await import('../../api/notificationApi');
      await notificationApi.createTestNotifications();
      await loadNotifications(); // Reload after creating test notifications
    } catch (error) {
      console.error('Failed to create test notifications:', error);
    }
  };

  // Handle clear notifications
  const handleClearNotifications = async () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      try {
        await onClearNotifications();
        await loadNotifications();
      } catch (error) {
        console.error('Failed to clear notifications:', error);
      }
    }
  };

  // Handle mark as seen
  const handleMarkAsSeen = async () => {
    try {
      await onMarkAsSeen();
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark notifications as seen:', error);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'user_joined':
        return '👋';
      case 'user_left':
        return '👋';
      case 'group_invite':
        return '📨';
      case 'system':
        return '⚙️';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'message':
        return 'bg-blue-100 text-blue-800';
      case 'user_joined':
        return 'bg-green-100 text-green-800';
      case 'user_left':
        return 'bg-yellow-100 text-yellow-800';
      case 'group_invite':
        return 'bg-purple-100 text-purple-800';
      case 'system':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-[99rem] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Notifications Management</h3>
            <div className="flex items-center space-x-2">
              <Button
                onClick={createTestNotifications}
                variant="outline"
                size="sm"
                icon={<TestTube className="h-4 w-4" />}
                disabled={loading}
              >
                Create Test
              </Button>
              <Button
                onClick={handleMarkAsSeen}
                variant="outline"
                size="sm"
                icon={<Eye className="h-4 w-4" />}
                disabled={loading || notifications.length === 0}
              >
                Mark as Seen
              </Button>
              <Button
                onClick={handleClearNotifications}
                variant="outline"
                size="sm"
                icon={<Trash2 className="h-4 w-4" />}
                disabled={loading || notifications.length === 0}
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-500">There are no notifications to display.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div key={notification._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getNotificationColor(notification.type)}`}>
                          {notification.type}
                        </span>
                        {!notification.read && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            New
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                    
                    {/* Additional notification data */}
                    {notification.data && Object.keys(notification.data).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        {notification.groupName && (
                          <span>Group: {notification.groupName}</span>
                        )}
                        {notification.senderUsername && (
                          <span className="ml-2">From: {notification.senderUsername}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Statistics */}
        {notifications.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Total: {notifications.length} notifications</span>
              <span>Unread: {notifications.filter(n => !n.read).length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsTab;
