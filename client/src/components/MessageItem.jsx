import React, { useState } from 'react';
import { MoreVertical, Edit, Trash2, Check, CheckCheck } from 'lucide-react';
import { formatDate } from '../utils/formatDate';

const MessageItem = ({ message, currentUser, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  // Add null checks to prevent errors
  if (!message || !currentUser || !message.senderId) {
    return null;
  }
  
  const isOwnMessage = message.senderId._id === currentUser.id || message.senderId._id === currentUser._id;
  const isOptimistic = message.isOptimistic;

  const handleEdit = () => {
    onEdit(message);
    setShowMenu(false);
  };

  const handleDelete = () => {
    onDelete(message._id);
    setShowMenu(false);
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDeliveryStatus = () => {
    if (isOptimistic || !currentUser) return null;
    
    if (message.seenBy?.some(s => s.user === currentUser.id || s.user === currentUser._id)) {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    } else if (message.deliveredTo?.some(d => d.user === currentUser.id || d.user === currentUser._id)) {
      return <CheckCheck className="h-3 w-3 text-gray-400" />;
    } else {
      return <Check className="h-3 w-3 text-gray-400" />;
    }
  };

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group w-full`}>
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg min-w-0 ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        {/* Message Bubble */}
        <div
          className={`relative px-4 py-2 rounded-lg min-w-0 ${
            isOwnMessage
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
          } ${isOptimistic ? 'opacity-70' : ''}`}
        >
          {/* Message Content */}
          <div className="break-words overflow-wrap-anywhere">
            {message.content}
          </div>

          {/* File Attachment */}
          {message.file && (
            <div className="mt-2 p-2 bg-white/10 rounded">
              <div className="flex items-center space-x-2">
                <span className="text-sm">📎</span>
                <span className="text-sm truncate">{message.file.name}</span>
              </div>
            </div>
          )}

          {/* Message Actions Menu */}
          {isOwnMessage && !isOptimistic && (
            <div className="absolute top-0 right-0 transform translate-x-full opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 bg-gray-800 text-white rounded-full hover:bg-gray-700"
                >
                  <MoreVertical className="h-3 w-3" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                    <button
                      onClick={handleEdit}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Message Info */}
        <div className={`flex items-center space-x-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(message.createdAt)}
          </span>
          
          {/* Delivery Status */}
          {isOwnMessage && getDeliveryStatus()}
          
          {/* Edited Indicator */}
          {message.edited?.isEdited && (
            <span className="text-xs text-gray-500 dark:text-gray-400 italic">
              (edited)
            </span>
          )}
        </div>

        {/* Sender Name (for other users' messages) */}
        {!isOwnMessage && message.senderId?.username && (
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {message.senderId.username}
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default MessageItem;