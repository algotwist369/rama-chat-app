import React, { useState, memo, useCallback, useEffect, useRef } from 'react';
import {
  Edit,
  Trash2,
  Forward,
  Check,
  CheckCheck,
  Download,
  Image as ImageIcon,
  File,
  FileText,
  Music,
  Video,
  Archive,
  Eye,
  Smile,
  Reply
} from 'lucide-react';
import ReactionPicker from './ReactionPicker';
import { formatMessageTime } from '../utils/formatDate';
import { downloadFile, getFileIcon, formatFileSize } from '../utils/fileDownload';

const MessageItem = memo(({
  message,
  currentUser,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onForward,
  onReactToMessage,
  onReplyToMessage,
  onDeleteMessageSocket,
  onEditMessageSocket
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const messageRef = useRef(null);
  const isOwnMessage = message.senderId._id === currentUser.id;
  const isDeleted = message.deleted?.isDeleted;
  const isEdited = message.edited?.isEdited;

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (messageRef.current && !messageRef.current.contains(event.target)) {
        setShowMenu(false);
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Common emojis for reactions

  // Handle reaction click
  const handleReaction = useCallback((emoji) => {
    if (onReactToMessage) {
      onReactToMessage(message._id, emoji);
    }
    setShowEmojiPicker(false);
  }, [onReactToMessage, message._id]);

  // Handle reply click
  const handleReply = useCallback(() => {
    if (onReplyToMessage) {
      onReplyToMessage(message);
    }
    setShowMenu(false);
  }, [onReplyToMessage, message]);

  // Handle edit click
  const handleEdit = useCallback(() => {
    if (onEditMessageSocket) {
      // For now, we'll use the existing onEdit handler
      // In a full implementation, you'd show an edit modal
      onEdit(message);
    }
    setShowMenu(false);
  }, [onEditMessageSocket, onEdit, message]);

  // Handle delete click
  const handleDelete = useCallback(() => {
    if (onDeleteMessageSocket) {
      onDeleteMessageSocket(message._id);
    } else if (onDelete) {
      onDelete(message._id);
    }
    setShowMenu(false);
  }, [onDeleteMessageSocket, onDelete, message._id]);

  const getStatusIcon = () => {
    if (isOwnMessage) {
      // Check if current user has seen the message
      const isSeenByCurrentUser = message.seenBy?.some(user => user._id === currentUser.id || user === currentUser.id);
      const isDeliveredToCurrentUser = message.deliveredTo?.some(user => user._id === currentUser.id || user === currentUser.id);
      
      if (isSeenByCurrentUser) {
        return <CheckCheck className="h-4 w-4 text-[#343a40]" title="Read" />;
      } else if (isDeliveredToCurrentUser || message.deliveredTo?.length > 0) {
        return <CheckCheck className="h-4 w-4 text-[#6c757d]" title="Delivered" />;
      } else {
        return <Check className="h-4 w-4 text-gray-400" title="Sent" />;
      }
    }
    return null;
  };

  const handleFileDownload = useCallback(async (file) => {
    if (file.url) {
      const success = await downloadFile(file.url, file.originalname);
      if (!success) {
        console.error('Failed to download file');
      }
    }
  }, []);

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-green-500" />;
    } else if (fileType?.startsWith('video/')) {
      return <Video className="h-5 w-5 text-purple-500" />;
    } else if (fileType?.startsWith('audio/')) {
      return <Music className="h-5 w-5 text-pink-500" />;
    } else if (fileType?.includes('pdf') || fileType?.includes('document')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (fileType?.includes('zip') || fileType?.includes('rar')) {
      return <Archive className="h-5 w-5 text-yellow-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      ref={messageRef}
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 group relative animate-in slide-in-from-bottom-2 duration-300`}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
      onTouchStart={() => setShowMenu(true)}
    >
      {/* Multi-select checkbox */}
      {onSelect && (
        <div className={`absolute ${isOwnMessage ? 'left-2' : 'right-2'} top-2 z-10`}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect()}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
      )}
      <div className={`max-w-[90%] sm:max-w-[85%] md:max-w-xs lg:max-w-md xl:max-w-lg ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        {/* Sender info for other messages */}
        {!isOwnMessage && (
          <div className="flex items-center space-x-1.5 sm:space-x-2 mb-1">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#343a40] rounded-full flex items-center justify-center text-white text-xs font-medium">
              {message.senderId.username?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-[#adb5bd] font-medium">
              {message.senderId.username}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`relative px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
            isOwnMessage
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-md'
              : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-md border border-slate-200 dark:border-slate-600'
          } ${isDeleted ? 'opacity-70' : ''}`}
        >
          {/* Reply indicator */}
          {message.replyTo && (
            <div className={`mb-2 p-2 rounded-lg border-l-4 ${
              isOwnMessage 
                ? 'bg-white bg-opacity-20 border-white border-opacity-50' 
                : 'bg-gray-100 dark:bg-slate-600 border-blue-500'
            }`}>
              <div className="flex items-center space-x-2 mb-1">
                <Reply className={`h-3 w-3 ${
                  isOwnMessage ? 'text-white text-opacity-70' : 'text-blue-500'
                }`} />
                <span className={`text-xs font-medium ${
                  isOwnMessage ? 'text-white text-opacity-70' : 'text-blue-600 dark:text-blue-400'
                }`}>
                  Replying to {message.replyTo.senderId?.username || 
                               message.replyTo.senderId?.profile?.firstName || 
                               message.replyTo.senderId?.email?.split('@')[0] || 
                               'Unknown'}
                </span>
              </div>
              <div className={`text-xs truncate ${
                isOwnMessage ? 'text-white text-opacity-80' : 'text-gray-600 dark:text-gray-300'
              }`}>
                {message.replyTo.messageType === 'file' || message.replyTo.messageType === 'image' 
                  ? `📎 ${message.replyTo.file?.originalname || 'File'}`
                  : message.replyTo.content || 'Message'
                }
              </div>
            </div>
          )}
          {/* Deleted message */}
          {isDeleted ? (
            <div className=" flex items-center space-x-2 text-[#adb5bd] italic">
              <Trash2 className="h-4 w-4" />
              <span>
                {message.deleted?.deletedBy && 
                 (typeof message.deleted.deletedBy === 'object' 
                   ? message.deleted.deletedBy._id !== message.senderId._id
                   : message.deleted.deletedBy !== message.senderId._id)
                  ? `This message was deleted by ${typeof message.deleted.deletedBy === 'object' 
                      ? message.deleted.deletedBy.username || 'someone'
                      : 'someone'}`
                  : 'This message was deleted'
                }
              </span>
            </div>
          ) : (
            <>
              {/* Text message - show content for text messages or when no file */}
              {(message.messageType === 'text' || (!message.messageType && message.content)) && (
                <p className="text-sm sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {message.content}
                </p>
              )}

              {/* File message - show file for file/image messages */}
              {(message.messageType === 'file' || message.messageType === 'image') && message.file && (
                <div className="mt-2">
                  {/* File card */}
                  <div
                    onClick={() => handleFileDownload(message.file)}
                    className={`flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-xl cursor-pointer ${
                      isOwnMessage 
                        ? 'bg-white bg-opacity-25' 
                        : 'bg-gray-100'
                    }`}
                  >
                    {/* File icon */}
                    <div className="flex-shrink-0">
                      {getFileIcon(message.file.mimetype)}
                    </div>
                    
                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs sm:text-sm font-medium truncate ${
                          isOwnMessage ? 'text-white' : 'text-gray-900'
                        }`}>
                          {message.file.originalname || 'File'}
                        </p>
                        <div className="flex items-center space-x-1 ml-2">
                          <Eye className={`h-4 w-4 ${
                            isOwnMessage ? 'text-white text-opacity-70' : 'text-gray-500'
                          }`} />
                        </div>
                      </div>
                      {message.file.size && (
                        <p className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-white text-opacity-70' : 'text-gray-500'
                        }`}>
                          {formatFileSize(message.file.size)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Image preview */}
                  {message.file.mimetype?.startsWith('image/') && message.file.url && (
                    <div className="mt-3">
                      <div className="relative group">
                        <img
                          src={message.file.url}
                          alt="Shared image"
                          className="max-w-full h-auto rounded-xl cursor-pointer shadow-lg"
                          onClick={() => window.open(message.file.url, '_blank')}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Video preview */}
                  {message.file.mimetype?.startsWith('video/') && message.file.url && (
                    <div className="mt-3">
                      <div className="relative group">
                        <video
                          src={message.file.url}
                          className="max-w-full h-auto rounded-xl cursor-pointer shadow-lg"
                          controls
                          preload="metadata"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit indicator */}
              {isEdited && (
                <span className="text-xs opacity-75 italic">(edited)</span>
              )}
            </>
          )}

          {/* Mobile menu toggle button - always visible on mobile */}
          {!isDeleted && (
            <div className={`absolute top-1 ${isOwnMessage ? 'left-1' : 'right-1'} sm:hidden z-40`}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 opacity-60 hover:opacity-100"
                title="Message options"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          )}

          {/* Message menu */}
          {showMenu && !isDeleted && (
            <div className={`absolute top-0 ${isOwnMessage ? 'right-0' : 'left-0'} transform -translate-y-full mb-2 animate-in fade-in-0 slide-in-from-top-2 duration-200 z-50`}>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1 sm:p-2 flex items-center space-x-1 sm:space-x-2 backdrop-blur-sm">
                {/* Reaction button */}
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`cursor-pointer p-2 sm:p-2.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation ${
                    showEmojiPicker
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title="React to message"
                >
                  <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                
                {/* Reply button */}
                <button
                  onClick={handleReply}
                  className="cursor-pointer p-2 sm:p-2.5 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation"
                  title="Reply to message"
                >
                  <Reply className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                
                {isOwnMessage && (
                  <>
                    <button
                      onClick={handleEdit}
                      className="cursor-pointer p-2 sm:p-2.5 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation"
                      title="Edit message"
                    >
                      <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="cursor-pointer p-2 sm:p-2.5 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation"
                      title="Delete message"
                    >
                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => onForward && onForward(message)}
                  className="cursor-pointer p-2 sm:p-2.5 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation"
                  title="Forward message"
                >
                  <Forward className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                
                {/* Close button for mobile */}
                <button
                  onClick={() => setShowMenu(false)}
                  className="cursor-pointer p-2 sm:p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation sm:hidden"
                  title="Close menu"
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Reaction Picker */}
          {!isDeleted && (
            <ReactionPicker
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onReactionSelect={handleReaction}
              message={message}
              user={currentUser}
              position={isOwnMessage ? 'top-right' : 'top-left'}
            />
          )}

          {/* Message reactions display */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
              {Object.entries(
                message.reactions.reduce((acc, reaction) => {
                  const emoji = reaction.emoji;
                  acc[emoji] = (acc[emoji] || 0) + 1;
                  return acc;
                }, {})
              ).map(([emoji, count]) => {
                const hasUserReacted = message.reactions.some(
                  r => (r.user === currentUser._id || r.user === currentUser.id) && r.emoji === emoji
                );
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`group flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation reaction-pulse ${
                      hasUserReacted
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    <span className="text-sm sm:text-base group-hover:scale-110 transition-transform duration-200">{emoji}</span>
                    <span className={`text-xs font-semibold ${
                      hasUserReacted 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Message metadata */}
        <div className={`flex items-center space-x-1 sm:space-x-2 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-500">
            {formatMessageTime(message.createdAt)}
          </span>
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
