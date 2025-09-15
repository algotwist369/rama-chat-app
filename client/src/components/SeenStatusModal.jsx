import React, { useState, useEffect } from 'react';
import { X, Eye, Clock } from 'lucide-react';
import { formatDate } from '../utils/formatDate';

const SeenStatusModal = ({ isVisible, onClose, message, groupMembers = [] }) => {
  const [seenMembers, setSeenMembers] = useState([]);
  const [unseenMembers, setUnseenMembers] = useState([]);

  useEffect(() => {
    if (!message || !isVisible) return;

    // Get seen members with their details
    const seen = (message.seenBy || []).map(seenEntry => {
      // Handle both string IDs and object IDs
      const userId = typeof seenEntry.user === 'string' ? seenEntry.user : seenEntry.user?._id;
      const member = groupMembers.find(m => 
        m._id === userId || m._id === seenEntry.user || m._id === seenEntry.user?._id
      );
      
      if (member) {
        return {
          ...member,
          seenAt: seenEntry.seenAt
        };
      } else {
        // If member not found in groupMembers, create a basic entry
        return {
          _id: userId,
          username: 'Unknown User',
          seenAt: seenEntry.seenAt
        };
      }
    });

    // Get unseen members
    const seenUserIds = new Set((message.seenBy || []).map(s => 
      typeof s.user === 'string' ? s.user : s.user?._id
    ));
    const unseen = groupMembers.filter(member => 
      !seenUserIds.has(member._id) && 
      member._id !== message.senderId._id // Don't include the sender
    );

    setSeenMembers(seen);
    setUnseenMembers(unseen);
  }, [message, groupMembers, isVisible]);

  if (!isVisible || !message) return null;

  const formatSeenTime = (seenAt) => {
    if (!seenAt) return 'Unknown time';
    const date = new Date(seenAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Message Seen Status
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Message Preview */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
              Message from {message.senderId?.username || 'Unknown'}
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200 truncate">
              {message.content || 'File message'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Sent {formatDate(message.createdAt)}
            </div>
          </div>

          {/* Seen Members */}
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-3">
              <Eye className="h-4 w-4 text-green-500" />
              <h4 className="font-medium text-gray-900 dark:text-white">
                Seen by ({seenMembers.length})
              </h4>
            </div>
            
            {seenMembers.length > 0 ? (
              <div className="space-y-2">
                {seenMembers
                  .sort((a, b) => new Date(b.seenAt) - new Date(a.seenAt))
                  .map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {member.username?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {member.username || 'Unknown User'}
                          </div>
                          {member.profile?.firstName && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {member.profile.firstName} {member.profile.lastName}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatSeenTime(member.seenAt)}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                No one has seen this message yet
              </div>
            )}
          </div>

          {/* Unseen Members */}
          {unseenMembers.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Not seen by ({unseenMembers.length})
                </h4>
              </div>
              
              <div className="space-y-2">
                {unseenMembers.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {member.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.username || 'Unknown User'}
                      </div>
                      {member.profile?.firstName && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {member.profile.firstName} {member.profile.lastName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeenStatusModal;
