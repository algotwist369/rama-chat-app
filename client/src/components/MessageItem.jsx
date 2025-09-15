import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Edit, Trash2, Check, CheckCheck, Smile, Reply } from 'lucide-react';
import { formatDate } from '../utils/formatDate';

const MessageItem = ({ 
  message, 
  currentUser, 
  onEdit, 
  onDelete, 
  onReact, 
  onReply,
  isSelected = false,
  onSelect,
  selectionMode = false
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const messageRef = useRef(null);

  // Add null checks to prevent errors
  if (!message || !currentUser || !message.senderId) {
    return null;
  }
  
  const isOwnMessage = message.senderId._id === currentUser.id || message.senderId._id === currentUser._id;
  const isOptimistic = message.isOptimistic;

  // Debug showReactions state
  useEffect(() => {
    console.log('MessageItem: showReactions state changed to:', showReactions, 'for message:', message._id);
  }, [showReactions, message._id]);

  // Update picker position when showing reactions
  useEffect(() => {
    if (showReactions && messageRef.current) {
      const rect = messageRef.current.getBoundingClientRect();
      setPickerPosition({
        x: isOwnMessage ? rect.right - 200 : rect.left,
        y: rect.top - 100
      });
    }
  }, [showReactions, isOwnMessage]);

  const handleEdit = () => {
    console.log('MessageItem: Editing message:', message._id);
    if (onEdit) {
      onEdit(message);
    } else {
      console.error('MessageItem: onEdit handler not provided');
    }
    setShowMenu(false);
  };

  const handleDelete = () => {
    onDelete(message._id);
    setShowMenu(false);
  };

  const handleReact = (emoji) => {
    console.log('MessageItem: Reacting with emoji:', emoji, 'to message:', message._id);
    if (onReact) {
      onReact(message._id, emoji);
    } else {
      console.error('MessageItem: onReact handler not provided');
    }
    setShowReactions(false);
  };

  const handleReply = () => {
    console.log('MessageItem: Replying to message:', message._id);
    if (onReply) {
      onReply(message);
    } else {
      console.error('MessageItem: onReply handler not provided');
    }
    setShowMenu(false);
  };

  // Common emojis for reactions
  const commonEmojis = ['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉'];

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
    <div ref={messageRef} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group w-full`}>
      {/* Selection Checkbox */}
      {selectionMode && (
        <div className="flex items-center mr-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect && onSelect(message._id)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
      )}
      
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg min-w-0 ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        {/* Message Bubble */}
        <div
          className={`relative px-4 py-2 rounded-lg min-w-0 transition-all duration-200 ${
            isOwnMessage
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
          } ${isOptimistic ? 'opacity-70' : ''} ${
            selectionMode && isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
        >
          {/* Message Content */}
          <div className="break-words overflow-wrap-anywhere">
            {message.content}
            {message.edited?.isEdited && (
              <span className="ml-2 text-xs opacity-70 italic">
                (edited)
              </span>
            )}
          </div>

          {/* Reply Context */}
          {message.replyTo && (
            <div className="mt-2 p-2 bg-white/10 rounded border-l-2 border-white/30">
              <div className="text-xs opacity-80">
                Replying to {message.replyTo.senderId?.username || 'Unknown'}:
              </div>
              <div className="text-sm truncate">
                {message.replyTo.content}
              </div>
            </div>
          )}

          {/* File Attachment */}
          {message.file && (
            <div className="mt-2 p-2 bg-white/10 rounded">
              <div className="flex items-center space-x-2">
                <span className="text-sm">📎</span>
                <span className="text-sm truncate">{message.file.name}</span>
              </div>
            </div>
          )}

          {/* Message Reactions */}
          <div className="mt-2 flex items-center justify-between">
            {/* Existing Reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(
                  message.reactions.reduce((acc, reaction) => {
                    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([emoji, count]) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className={`px-2 py-1 rounded-full text-xs flex items-center space-x-1 transition-colors ${
                      message.reactions.some(r => 
                        r.emoji === emoji && 
                        (r.user === currentUser.id || r.user === currentUser._id)
                      )
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{count}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Quick React Button */}
            <button
              onClick={() => {
                console.log('Quick react button clicked, setting showReactions to true');
                setShowReactions(true);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Add reaction"
            >
              <Smile className="h-4 w-4" />
            </button>
            
            {/* Temporary Test Button - Always Visible */}
            <button
              onClick={() => {
                console.log('Test react button clicked');
                setShowReactions(!showReactions);
              }}
              className="ml-1 p-1 text-blue-500 hover:text-blue-700"
              title="Test reaction (always visible)"
            >
              😊
            </button>
          </div>

          {/* Message Actions Menu - Available for all users */}
          {!isOptimistic && (
            <div className={`absolute top-0 ${isOwnMessage ? 'right-0 transform translate-x-full' : 'left-0 transform -translate-x-full'} opacity-0 group-hover:opacity-100 transition-opacity`}>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 bg-gray-800 text-white rounded-full hover:bg-gray-700"
                >
                  <MoreVertical className="h-3 w-3" />
                </button>

                {showMenu && (
                  <div className={`absolute ${isOwnMessage ? 'right-0' : 'left-0'} top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-32`}>
                    <button
                      onClick={handleReply}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Reply className="h-3 w-3" />
                      <span>Reply</span>
                    </button>
                    
                    <button
                      onClick={() => setShowReactions(true)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Smile className="h-3 w-3" />
                      <span>React</span>
                    </button>
                    
                    {isOwnMessage && (
                      <>
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
                      </>
                    )}
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

      {/* Reactions Picker - Portal */}
      {showReactions && createPortal(
        <div 
          className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-[9999]"
          style={{
            left: `${pickerPosition.x}px`,
            top: `${pickerPosition.y}px`
          }}
        >
          <div className="flex flex-wrap gap-2 max-w-48">
            {commonEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  console.log('Emoji clicked:', emoji);
                  handleReact(emoji);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-lg hover:scale-110 transform"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Click to react
          </div>
        </div>,
        document.body
      )}

      {/* Click outside to close menu and reactions */}
      {(showMenu || showReactions) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowMenu(false);
            setShowReactions(false);
          }}
        />
      )}
    </div>
  );
};

export default MessageItem;