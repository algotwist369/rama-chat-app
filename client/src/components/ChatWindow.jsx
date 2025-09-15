import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Smile, CheckSquare, Square } from 'lucide-react';
import MessageItem from './MessageItem';
import MessageSelector from './MessageSelector';
import LoadingSpinner from './common/LoadingSpinner';
import SeenStatusModal from './SeenStatusModal';
import socketService from '../sockets/socket';
import toast from 'react-hot-toast';

const ChatWindow = ({ 
  group, 
  messages, 
  currentUser, 
  onSendMessage, 
  onEditMessage, 
  onDeleteMessage, 
  onBulkDeleteMessages,
  onReactToMessage,
  onReplyToMessage,
  replyToMessage,
  onClearReply,
  loading,
  groupMembers = []
}) => {
  const [messageText, setMessageText] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [showSeenStatusModal, setShowSeenStatusModal] = useState(false);
  const [selectedMessageForSeenStatus, setSelectedMessageForSeenStatus] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing indicator handlers
  const handleTypingStart = useCallback((data) => {
    console.log('⌨️ Typing start received:', data, 'Current group:', group?._id);
    if (data.userId !== currentUser.id && data.groupId === group._id) {
      setTypingUsers(prev => {
        const exists = prev.some(user => user.userId === data.userId);
        if (!exists) {
          console.log('Adding typing user:', data.username);
          return [...prev, { userId: data.userId, username: data.username }];
        }
        return prev;
      });
    }
  }, [group, currentUser.id]);

  const handleTypingStop = useCallback((data) => {
    console.log('⌨️ Typing stop received:', data, 'Current group:', group?._id);
    if (data.userId !== currentUser.id && data.groupId === group._id) {
      setTypingUsers(prev => {
        const filtered = prev.filter(user => user.userId !== data.userId);
        console.log('Removing typing user:', data.username, 'Remaining:', filtered.length);
        return filtered;
      });
    }
  }, [group, currentUser.id]);

  // Socket event listeners for typing indicators
  useEffect(() => {
    if (!group) return;

    console.log('Setting up typing listeners for group:', group._id);
    socketService.on('typing:start', handleTypingStart);
    socketService.on('typing:stop', handleTypingStop);

    return () => {
      console.log('Cleaning up typing listeners for group:', group._id);
      socketService.off('typing:start', handleTypingStart);
      socketService.off('typing:stop', handleTypingStop);
    };
  }, [group, handleTypingStart, handleTypingStop]);

  // Handle typing events
  const handleTyping = () => {
    if (!group || !socketService.isConnected()) {
      console.log('Cannot send typing - group:', !!group, 'socket connected:', socketService.isConnected());
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      console.log('Starting typing in group:', group._id);
      socketService.startTyping(group._id);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        console.log('Stopping typing in group:', group._id);
        socketService.stopTyping(group._id);
      }
    }, 1000);
  };

  // Clear typing users when group changes
  useEffect(() => {
    setTypingUsers([]);
  }, [group]);

  // Clear all state when group changes to prevent stuck states
  useEffect(() => {
    console.log('ChatWindow: Group changed, clearing state');
    setMessageText('');
    setEditingMessage(null);
    setTypingUsers([]);
    setSelectionMode(false);
    setSelectedMessages(new Set());
    setShowSeenStatusModal(false);
    setSelectedMessageForSeenStatus(null);
  }, [group]);

  // Debug: Monitor editingMessage state changes
  useEffect(() => {
    console.log('ChatWindow: editingMessage state changed to:', editingMessage);
  }, [editingMessage]);

  // Debug: Monitor messageText state changes
  useEffect(() => {
    console.log('ChatWindow: messageText state changed to:', messageText);
  }, [messageText]);

  // Selection handlers
  const handleSelectMessage = useCallback((messageId) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedMessages(new Set());
    setSelectionMode(false);
  }, []);

  const handleDeleteSelected = useCallback(async (messageIds) => {
    try {
      console.log('Deleting messages:', messageIds);
      // Use the bulk delete function instead of individual deletes
      await onBulkDeleteMessages(messageIds);
      handleClearSelection();
    } catch (error) {
      console.error('Failed to delete messages:', error);
      toast.error('Failed to delete messages');
    }
  }, [onBulkDeleteMessages]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current && group) {
        socketService.stopTyping(group._id);
      }
    };
  }, [group]);

  // Handle send message
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!messageText.trim() && !editingMessage) return;

    // Stop typing indicator
    if (isTypingRef.current && group) {
      isTypingRef.current = false;
      socketService.stopTyping(group._id);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const messageData = {
      content: messageText.trim(),
      messageType: 'text',
      replyTo: replyToMessage?._id || null
    };

    if (editingMessage) {
      onEditMessage(editingMessage._id, messageText.trim());
      setEditingMessage(null);
    } else {
      onSendMessage(messageData);
      // Clear reply state after sending
      if (replyToMessage) {
        onClearReply();
      }
    }
    
    setMessageText('');
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // For now, just show file name - you can implement actual upload later
    const messageData = {
      content: `📎 ${file.name}`,
      messageType: 'file',
      file: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    };

    onSendMessage(messageData);
  };

  // Handle edit message
  const handleEditMessage = (message) => {
    console.log('ChatWindow: handleEditMessage called with:', message);
    console.log('ChatWindow: Setting editingMessage to:', message);
    console.log('ChatWindow: Setting messageText to:', message.content);
    setEditingMessage(message);
    setMessageText(message.content);
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingMessage(null);
    setMessageText('');
  };

  // Handle show seen status
  const handleShowSeenStatus = (message) => {
    setSelectedMessageForSeenStatus(message);
    setShowSeenStatusModal(true);
  };

  // Handle close seen status modal
  const handleCloseSeenStatusModal = () => {
    setShowSeenStatusModal(false);
    setSelectedMessageForSeenStatus(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 min-h-0 min-w-0 overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 space-y-2 sm:space-y-4 min-h-0">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <LoadingSpinner size="large" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full p-4">
            <div className="text-center max-w-sm">
              <h3 className="text-base sm:text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
                No messages yet
              </h3>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Start the conversation by sending a message
              </p>
            </div>
          </div>
        ) : (
          messages
            .filter(message => message && message._id && message.senderId) // Filter out invalid messages
            .map((message) => (
              <MessageItem
                key={message._id}
                message={message}
                currentUser={currentUser}
                onEdit={handleEditMessage}
                onDelete={onDeleteMessage}
                onReact={onReactToMessage}
                onReply={onReplyToMessage}
                isSelected={selectedMessages.has(message._id)}
                onSelect={handleSelectMessage}
                selectionMode={selectionMode}
                onShowSeenStatus={handleShowSeenStatus}
              />
            ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 sm:p-4 flex-shrink-0 min-w-0">
        {editingMessage && (
          <div className="mb-2 sm:mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200 truncate">
                Editing: {editingMessage.content.substring(0, 30)}...
              </span>
              <button
                onClick={cancelEdit}
                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 flex-shrink-0 ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Reply Indicator */}
        {replyToMessage && (
          <div className="mb-2 sm:mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 font-medium">
                  Replying to {replyToMessage.senderId?.username || 'Unknown'}:
                </span>
                <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 truncate">
                  {replyToMessage.content.substring(0, 50)}...
                </p>
              </div>
              <button
                onClick={onClearReply}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 ml-2 flex-shrink-0"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic">
            {typingUsers.length === 1 ? (
              `${typingUsers[0].username} is typing...`
            ) : typingUsers.length === 2 ? (
              `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
            ) : (
              `${typingUsers[0].username} and ${typingUsers.length - 1} others are typing...`
            )}
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-end space-x-1 sm:space-x-2 min-w-0">
          <div className="flex-1 min-w-0">
            <textarea
              value={messageText}
              onChange={(e) => {
                console.log('ChatWindow: Input value changed to:', e.target.value);
                setMessageText(e.target.value);
                handleTyping();
              }}
              placeholder={
                editingMessage 
                  ? "Edit your message..." 
                  : replyToMessage 
                    ? `Reply to ${replyToMessage.senderId?.username || 'Unknown'}...` 
                    : "Type a message..."
              }
              className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none min-h-[36px] sm:min-h-[40px] max-h-32"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              onInput={(e) => {
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />
          </div>
          
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Selection Mode Toggle - Hidden on mobile */}
            <button
              type="button"
              onClick={() => setSelectionMode(!selectionMode)}
              className={`hidden sm:block p-1.5 sm:p-2 rounded-lg transition-colors ${
                selectionMode 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Select messages"
            >
              {selectionMode ? <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5" /> : <Square className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>

            {/* File Upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Attach file"
            >
              <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            />

            {/* Emoji Button - Hidden on mobile */}
            <button
              type="button"
              className="hidden sm:block p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Add emoji"
            >
              <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!messageText.trim() && !editingMessage}
              className="p-1.5 sm:p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              title="Send message"
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Message Selector */}
      <MessageSelector
        selectedMessages={Array.from(selectedMessages).map(id => messages.find(msg => msg._id === id)).filter(Boolean)}
        onClearSelection={handleClearSelection}
        onDeleteSelected={handleDeleteSelected}
        currentUser={currentUser}
      />

      {/* Seen Status Modal */}
      <SeenStatusModal
        isVisible={showSeenStatusModal}
        onClose={handleCloseSeenStatusModal}
        message={selectedMessageForSeenStatus}
        groupMembers={groupMembers}
      />
    </div>
  );
};

export default ChatWindow;