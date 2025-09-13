import React, { useState, useEffect, useRef } from 'react';
import { Crown, Plus, Users, User, LogOut, MessageSquare, Bell } from 'lucide-react';
import Button from '../common/Button';
import socketService from '../../sockets/socket';

const AdminHeader = ({
  onCreateUser,
  onCreateGroup,
  onLogout,
  notificationCount = 0,
  onNotificationClick
}) => {
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const audioRef = useRef(null);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Create a more pleasant notification sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create a simple melody for notification
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      const duration = 0.2;
      
      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + (index * duration));
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + (index * duration));
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + (index * duration) + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + (index * duration) + duration);
        
        oscillator.start(audioContext.currentTime + (index * duration));
        oscillator.stop(audioContext.currentTime + (index * duration) + duration);
      });
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  // Set up socket listeners for real-time notifications
  useEffect(() => {
    const handleNewNotification = (notification) => {
      console.log('🔔 Admin Panel: New notification received:', notification);
      playNotificationSound();
    };

    // Listen for new notifications
    socketService.on('notification:new', handleNewNotification);

    return () => {
      socketService.off('notification:new', handleNewNotification);
    };
  }, []);

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-500">Manage users and groups</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotificationPanel(!showNotificationPanel);
                  if (onNotificationClick) {
                    onNotificationClick();
                  }
                }}
                className={`relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 ${
                  notificationCount > 0 ? 'animate-pulse' : ''
                }`}
                title={`Notifications${notificationCount > 0 ? ` (${notificationCount} new)` : ''}`}
              >
                <Bell className={`h-5 w-5 transition-colors ${notificationCount > 0 ? 'text-blue-600' : ''}`} />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-bounce shadow-lg">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
                {/* Notification indicator ring */}
                {notificationCount > 0 && (
                  <div className="absolute inset-0 rounded-lg border-2 border-red-400 animate-ping opacity-75"></div>
                )}
              </button>
            </div>

            <div className="h-6 w-px bg-gray-300"></div>
            <Button
              onClick={onLogout}
              variant="outline"
              size="sm"
              icon={<LogOut className="h-4 w-4" />}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;
