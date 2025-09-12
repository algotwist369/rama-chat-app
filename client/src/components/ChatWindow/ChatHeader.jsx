import React, { useState } from 'react';
import { Users } from 'lucide-react';

const ChatHeader = React.memo(({
    group,
    onlineCount,
    onlineMembers,
    isRefreshingStatus,
    filteredTypingUsers,
    onRefreshMembers,
    currentUser
}) => {
    const [showMembersList, setShowMembersList] = useState(false);

    return (
        <>
            {/* Header */}
            <div className="px-3 sm:px-4 py-3 border-b border-[#495057] bg-[#343a40] text-white flex-shrink-0 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#495057] rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
                            {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-[#e9ecef] sm:text-lg font-semibold text-white truncate">{group.name}</h2>
                            <div className="text-xs sm:text-sm text-[#6c757d] flex items-center flex-wrap gap-1">
                                <span className="hidden xs:inline">{group.region} • </span>
                                <span>{group.users?.length || 0} members</span>
                                {onlineCount > 0 && (
                                    <span
                                        className="text-[#28a745] ml-1 sm:ml-2 font-medium flex items-center cursor-pointer touch-manipulation"
                                        title={`Online: ${onlineMembers.filter(m => m.isOnline).map(m => m.username).join(', ')}`}
                                    >
                                        <div className={`w-2 h-2 bg-green-500 rounded-full mr-1 ${isRefreshingStatus ? '' : 'animate-pulse'
                                            }`}></div>
                                        <span className="hidden sm:inline">{onlineCount} online</span>
                                        <span className="sm:hidden">{onlineCount}</span>
                                        {isRefreshingStatus && (
                                            <div className="ml-1 w-2 h-2 border border-green-500 border-t-transparent rounded-full "></div>
                                        )}
                                    </span>
                                )}
                                {filteredTypingUsers.length > 0 && (
                                    <span className="text-[#007bff] ml-1 sm:ml-2 font-medium text-xs sm:text-sm truncate">
                                        {filteredTypingUsers.length === 1
                                            ? `${filteredTypingUsers[0][1]} is typing...`
                                            : `${filteredTypingUsers.map(([id, name]) => name).join(', ')} are typing...`
                                        }
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowMembersList(!showMembersList)}
                        className="p-2 text-[#e9ecef] cursor-pointer rounded-lg touch-manipulation flex-shrink-0"
                        title="View members"
                    >
                        <Users className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Members List Dropdown */}
            {showMembersList && (
                <div className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-medium text-gray-900">Group Members</h3>
                            <p className="text-xs text-gray-500">
                                {onlineCount} of {onlineMembers.length} online
                            </p>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                            <button
                                onClick={onRefreshMembers}
                                className="text-gray-400 cursor-pointer p-1 touch-manipulation"
                                title="Refresh status"
                                disabled={isRefreshingStatus}
                            >
                                <div className={`w-4 h-4 ${isRefreshingStatus ? '' : ''}`}>
                                    ↻
                                </div>
                            </button>
                            <button
                                onClick={() => setShowMembersList(false)}
                                className="text-gray-400 touch-manipulation"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                        {onlineMembers.map((member) => (
                            <div key={member._id} className="flex items-center justify-between p-2 bg-gray-50 rounded touch-manipulation">
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                    <div className="relative flex-shrink-0">
                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                            {member.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div
                                            className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-white ${member.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                                                }`}
                                        />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-sm text-gray-800 font-medium truncate">{member.username}</span>
                                        {member._id === currentUser?.id && (
                                            <span className="text-xs text-blue-600">(You)</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                    <span className={`text-xs font-medium ${member.isOnline ? 'text-green-600' : 'text-gray-500'
                                        }`}>
                                        {member.isOnline ? 'Online' : 'Offline'}
                                    </span>
                                    {!member.isOnline && member.lastSeen && (
                                        <p className="text-xs text-gray-400">
                                            {new Date(member.lastSeen).toLocaleTimeString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
});

ChatHeader.displayName = 'ChatHeader';

export default ChatHeader;
