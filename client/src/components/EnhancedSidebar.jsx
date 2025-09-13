import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import {
  Users,
  LogOut,
  Settings,
  Plus,
  Search,
  Crown,
  Shield,
  User,
  Bell,
  X,
  MessageCircle,
  Hash,
  Wifi,
  WifiOff
} from 'lucide-react';
import { formatLastSeen } from '../utils/formatDate';

const EnhancedSidebar = ({
  user,
  groups,
  selectedGroup,
  onlineUsers,
  unreadCounts,
  totalUnreadCount,
  notificationCount,
  onGroupSelect,
  onLogout,
  onNotificationClick,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const filteredGroups = useMemo(() =>
    groups.filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.region.toLowerCase().includes(searchTerm.toLowerCase())
    ), [groups, searchTerm]
  );

  const getRoleIcon = useCallback((role) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-400" />;
      case 'manager':
        return <Shield className="h-4 w-4 text-blue-400" />;
      default:
        return <User className="h-4 w-4 text-slate-400" />;
    }
  }, []);

  const getRoleColor = useCallback((role) => {
    switch (role) {
      case 'admin':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'manager':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  }, []);

  const getOnlineCount = useCallback((group) => {
    if (!group.users || !onlineUsers) return 0;
    return group.users.filter(userId => onlineUsers.has(userId)).length;
  }, [onlineUsers]);

  return (
    <div className="w-full bg-gradient-to-b from-slate-800 to-slate-900 backdrop-blur-sm border-r border-slate-700/50 flex flex-col h-full shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-lg font-bold text-white">
                  {user.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Ramavan Chat</h1>
              <div className="flex items-center space-x-2">
                {getRoleIcon(user.role)}
                <span className="text-xs text-slate-300 capitalize font-medium">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {/* Notification Button */}
            <button
              onClick={onNotificationClick}
              className="relative p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700/50 transition-all duration-200 group"
              title="Notifications"
            >
              <Bell className="h-5 w-5 group-hover:scale-110 transition-transform" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium min-w-[20px] animate-pulse shadow-lg">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            
            {/* Create Group Button */}
            <button
              onClick={() => setShowCreateGroup(true)}
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700/50 transition-all duration-200 group"
              title="Create Group"
            >
              <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </button>

            {/* Close button for mobile */}
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700/50 transition-all duration-200"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {searchTerm ? 'No groups found' : 'No groups available'}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isSelected = selectedGroup?._id === group._id;
            const unreadCount = unreadCounts[group._id] || 0;
            const onlineCount = getOnlineCount(group);
            const isUserManager = group.managers?.includes(user._id) || group.createdBy === user._id;
            const isUserAdmin = user.role === 'admin';

            return (
              <div
                key={group._id}
                onClick={() => onGroupSelect(group)}
                className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 shadow-lg'
                    : 'hover:bg-slate-700/50 border border-transparent hover:border-slate-600/30'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Group Icon */}
                  <div className={`relative flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-blue-500/20' : 'bg-slate-700/50'
                  }`}>
                    <Hash className={`h-5 w-5 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                    {onlineCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full"></div>
                    )}
                  </div>

                  {/* Group Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium truncate ${
                        isSelected ? 'text-white' : 'text-slate-200'
                      }`}>
                        {group.name}
                      </h3>
                      {unreadCount > 0 && (
                        <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium min-w-[20px] animate-pulse">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-slate-400 truncate">
                        {group.region}
                      </span>
                      <div className="flex items-center space-x-1">
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3 text-slate-500" />
                          <span className="text-xs text-slate-500">
                            {group.users?.length || 0}
                          </span>
                        </div>
                        {onlineCount > 0 && (
                          <div className="flex items-center space-x-1">
                            <Wifi className="h-3 w-3 text-green-500" />
                            <span className="text-xs text-green-500">
                              {onlineCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role Badge */}
                {(isUserManager || isUserAdmin) && (
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium border ${
                    isUserAdmin ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  }`}>
                    {isUserAdmin ? 'Admin' : 'Manager'}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {user.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user.username}</p>
              <p className="text-xs text-slate-400">Online</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-slate-300 hover:text-red-400 rounded-lg hover:bg-slate-700/50 transition-all duration-200 group"
            title="Logout"
          >
            <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(EnhancedSidebar);
