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
  X
} from 'lucide-react';
import { formatLastSeen } from '../utils/formatDate';

const Sidebar = ({
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

  // Removed debug logs to prevent console spam

  const filteredGroups = useMemo(() =>
    groups.filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.region.toLowerCase().includes(searchTerm.toLowerCase())
    ), [groups, searchTerm]
  );

  const getRoleIcon = useCallback((role) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'manager':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  }, []);

  const getRoleColor = useCallback((role) => {
    switch (role) {
      case 'admin':
        return 'bg-yellow-100 text-yellow-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  return (
    <div className="w-full bg-[#343a40] backdrop-blur-sm border-r border-[#343a40] flex flex-col h-full ">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-[#343a40] bg-gradient-to-r from-[#343a40] to-[#495057]">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base sm:text-lg font-bold text-[#f8f9fa]">Ramavan</h1>
          <div className="flex items-center space-x-1">
            {/* Mobile Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-2 text-[#f8f9fa] rounded-lg touch-manipulation"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            {/* Notification Icon */}
            <button
              onClick={onNotificationClick}
              className="relative p-2 text-[#f8f9fa] rounded-lg touch-manipulation"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#34a0a4] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium min-w-[20px] ">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="p-2 text-[#f8f9fa] rounded-lg touch-manipulation"
              title="Create Group"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[#343a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34a0a4] focus:border-transparent bg-[#212529] text-sm touch-manipulation text-white"
          />
        </div>
      </div>

      {/* Groups List */}
      <div className="flex-1 bg-[#343a40] overflow-hidden">
        <div className="p-2 sm:p-3 h-full flex flex-col">
          <h2 className="text-xs font-semibold text-[#f8f9fa] uppercase tracking-wide mb-3 px-1 flex-shrink-0">
            Available Groups ({filteredGroups.length})
          </h2>

          <div className="flex-1 overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-10 w-10 text-white mx-auto mb-3" />
                <p className="text-[#f8f9fa] text-sm font-medium">
                  {searchTerm ? 'No groups found' : 'No groups available'}
                </p>
                <p className="text-xs text-[#f8f9fa] mt-1">
                  {searchTerm ? 'Try a different search term' : 'You are not a member of any groups yet. Contact an admin to join groups.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredGroups.map((group) => {
                  const isManager = group.managers?.some(m => m._id === user.id);

                  return (
                    <div
                      key={group._id}
                      onClick={() => onGroupSelect(group)}
                      className={`p-2 sm:p-3 rounded-lg touch-manipulation ${selectedGroup?._id === group._id
                        ? 'bg-[#34a0a4] border border-[#495057] cursor-pointer shadow-sm'
                        : 'bg-[#343a40] border border-[#495057] cursor-pointer'
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-sm font-semibold text-[#f8f9fa] truncate">
                              {group.name}
                            </h3>
                            {isManager && (
                              <Shield className="h-3 w-3 text-blue-500 flex-shrink-0" title="Manager" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mb-2">
                            <p className="text-xs text-[#f8f9fa] truncate">
                              <span className="hidden xs:inline">{group.region} • </span>
                              {group.users?.length || 0} members
                            </p>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-[#34a0a4] text-[#f8f9fa] flex-shrink-0">
                              Member
                            </span>
                          </div>
                        </div>

                        {/* Online indicator and notifications */}
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {/* Unread count badge */}
                          {unreadCounts[group._id] > 0 && (
                            <span className="bg-[#34a0a4] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium min-w-[20px]">
                              {unreadCounts[group._id] > 99 ? '99+' : unreadCounts[group._id]}
                            </span>
                          )}

                          {/* Online indicators */}
                          <div className="flex items-center space-x-0.5">
                            {group.users?.slice(0, 3).map((userId, index) => (
                              <div
                                key={typeof userId === 'object' ? userId._id || userId.id || index : userId}
                                className={`w-2 h-2 rounded-full ${onlineUsers.has(typeof userId === 'object' ? userId._id || userId.id : userId) ? 'bg-green-400' : 'bg-gray-300'
                                  }`}
                              />
                            ))}
                            {group.users?.length > 3 && (
                              <span className="text-xs text-[#f8f9fa] ml-1">
                                +{group.users.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Click to chat indicator */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#495057]">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-[#f8f9fa]">Click to chat</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* User Profile */}
      <div className="p-2 sm:p-3 border-t border-[#495057] bg-[#343a40] flex-shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-3">
          <div className="relative">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#34a0a4] rounded-full flex items-center justify-center text-white font-semibold shadow-sm text-sm sm:text-base">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white ${user?.isOnline ? 'bg-[#34a0a4]' : 'bg-[#495057]'
              }`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-[#f8f9fa] truncate">
                {user?.username}
              </h3>
              {getRoleIcon(user?.role)}
            </div>
            <p className="text-xs text-[#f8f9fa]">
              {user?.isOnline ? 'Online' : `Last seen ${formatLastSeen(user?.lastSeen)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user?.role)}`}>
            {user?.role}
          </span>

          <div className="flex items-center space-x-1">
            <button className="p-2 cursor-pointer text-[#f8f9fa] rounded-lg touch-manipulation">
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={onLogout}
              className="p-2 cursor-pointer text-[#f8f9fa] rounded-lg touch-manipulation"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoize the Sidebar component to prevent unnecessary re-renders
export default memo(Sidebar);
