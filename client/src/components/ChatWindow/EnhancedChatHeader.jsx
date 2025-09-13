import React, { useState } from 'react';
import { Users, RefreshCw, MoreVertical, Settings, Info, Crown, Shield, User, CheckSquare, Square, Eye, EyeOff } from 'lucide-react';

const EnhancedChatHeader = React.memo(({
    group,
    onlineCount,
    onlineMembers,
    isRefreshingStatus,
    filteredTypingUsers,
    onRefreshMembers,
    currentUser,
    multiSelectMode,
    onToggleMultiSelect,
    messagePrivacy = null
}) => {
    const [showMembersList, setShowMembersList] = useState(false);
    const [showGroupMenu, setShowGroupMenu] = useState(false);

    const isUserManager = group.managers?.includes(currentUser._id) || group.createdBy === currentUser._id;
    const isUserAdmin = currentUser.role === 'admin';

    const getRoleIcon = (role) => {
        switch (role) {
            case 'admin':
                return <Crown className="h-3 w-3 text-yellow-400" />;
            case 'manager':
                return <Shield className="h-3 w-3 text-blue-400" />;
            default:
                return <User className="h-3 w-3 text-slate-400" />;
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'manager':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default:
                return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    return (
        <>
            {/* Header */}
            <div className="px-4 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm flex-shrink-0 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                        {/* Group Avatar */}
                        <div className="relative flex-shrink-0 group">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-white/20 dark:ring-slate-700/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                                {group.name.charAt(0).toUpperCase()}
                            </div>
                            {onlineCount > 0 && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full animate-pulse shadow-lg">
                                    <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
                                </div>
                            )}
                        </div>

                        {/* Group Info */}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate transition-colors duration-200">
                                    {group.name}
                                </h2>
                                {messagePrivacy?.messagePrivacyEnabled && (
                                    <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-800" title={messagePrivacy.note}>
                                        <EyeOff className="h-3 w-3" />
                                        <span className="hidden sm:inline">Limited</span>
                                    </div>
                                )}
                                {(isUserManager || isUserAdmin) && (
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium border transition-all duration-200 hover:scale-105 ${getRoleColor(isUserAdmin ? 'admin' : 'manager')}`}>
                                        {isUserAdmin ? 'Admin' : 'Manager'}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex items-center space-x-3 mt-1">
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    {group.region}
                                </span>
                                <div className="flex items-center space-x-1">
                                    <Users className="h-3 w-3 text-slate-400" />
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        {group.users?.length || 0}
                                    </span>
                                </div>
                                
                                {onlineCount > 0 && (
                                    <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                            {onlineCount} online
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Typing Indicator */}
                            {filteredTypingUsers.length > 0 && (
                                <div className="mt-1 flex items-center">
                                    <div className="flex space-x-1 mr-2">
                                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                        {filteredTypingUsers.length === 1
                                            ? `${filteredTypingUsers[0][1]} is typing...`
                                            : `${filteredTypingUsers.map(([id, name]) => name).join(', ')} are typing...`
                                        }
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-1">
                        {/* Refresh Button */}
                        <button
                            onClick={onRefreshMembers}
                            disabled={isRefreshingStatus}
                            className="p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 group hover:shadow-md"
                            title="Refresh members"
                        >
                            <RefreshCw className={`h-5 w-5 group-hover:scale-110 transition-transform ${isRefreshingStatus ? 'animate-spin' : ''}`} />
                        </button>

                        {/* Members Button */}
                        <button
                            onClick={() => setShowMembersList(!showMembersList)}
                            className="p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 group hover:shadow-md"
                            title="View members"
                        >
                            <Users className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        </button>

                        {/* Multi-Select Toggle */}
                        <button
                            onClick={onToggleMultiSelect}
                            className={`p-2.5 rounded-xl transition-all duration-200 group hover:shadow-md ${
                                multiSelectMode 
                                    ? 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-800' 
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                            title={multiSelectMode ? "Exit multi-select" : "Select messages"}
                        >
                            {multiSelectMode ? (
                                <CheckSquare className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            ) : (
                                <Square className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            )}
                        </button>

                        {/* Group Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowGroupMenu(!showGroupMenu)}
                                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 group"
                                title="Group options"
                            >
                                <MoreVertical className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            </button>

                            {/* Group Menu Dropdown */}
                            {showGroupMenu && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl z-50">
                                    <div className="py-1">
                                        <button className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center space-x-2">
                                            <Info className="h-4 w-4" />
                                            <span>Group Info</span>
                                        </button>
                                        {(isUserManager || isUserAdmin) && (
                                            <button className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center space-x-2">
                                                <Settings className="h-4 w-4" />
                                                <span>Group Settings</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Members List */}
            {showMembersList && (
                <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 max-h-64 overflow-y-auto">
                    <div className="p-4">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                            Members ({group.users?.length || 0})
                        </h3>
                        <div className="space-y-2">
                            {group.users?.map((user) => {
                                const isOnline = onlineMembers.some(member => member._id === user._id && member.isOnline);
                                const userRole = user.role || (group.managers?.includes(user._id) ? 'manager' : 'user');
                                
                                return (
                                    <div key={user._id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                        <div className="relative">
                                            <div className="w-8 h-8 bg-gradient-to-r from-slate-500 to-slate-600 rounded-lg flex items-center justify-center text-white text-sm font-medium">
                                                {user.username?.charAt(0).toUpperCase()}
                                            </div>
                                            {isOnline && (
                                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2">
                                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                                    {user.username}
                                                </p>
                                                <div className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(userRole)}`}>
                                                    {getRoleIcon(userRole)}
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {isOnline ? 'Online' : 'Offline'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});

EnhancedChatHeader.displayName = 'EnhancedChatHeader';

export default EnhancedChatHeader;
