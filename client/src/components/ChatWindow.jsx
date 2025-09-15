import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Smile, CheckSquare, Square } from 'lucide-react';
import MessageItem from './MessageItem';
import MessageSelector from './MessageSelector';
import LoadingSpinner from './common/LoadingSpinner';
import socketService from '../sockets/socket';
import toast from 'react-hot-toast';

const ChatWindow = ({ 
  group, 
  messages, 
  currentUser, 
  onSendMessage, 
  onEditMessage, 
  onDeleteMessage, 
  onReactToMessage,
  onReplyToMessage,
  replyToMessage,
  onClearReply,
  loading 
}) => {
  const [messageText, setMessageText] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
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
      // Call the parent's delete function for each message
      for (const messageId of messageIds) {
        await onDeleteMessage(messageId);
      }
      toast.success(`${messageIds.length} message(s) deleted successfully`);
      handleClearSelection();
    } catch (error) {
      console.error('Failed to delete messages:', error);
      toast.error('Failed to delete messages');
    }
  }, [onDeleteMessage]);

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
    setEditingMessage(message);
    setMessageText(message.content);
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingMessage(null);
    setMessageText('');
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 min-h-0 min-w-0 overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-h-0">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <LoadingSpinner size="large" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
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
              />
            ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0 min-w-0">
        {editingMessage && (
          <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                Editing: {editingMessage.content.substring(0, 50)}...
              </span>
              <button
                onClick={cancelEdit}
                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Reply Indicator */}
        {replyToMessage && (
          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  Replying to {replyToMessage.senderId?.username || 'Unknown'}:
                </span>
                <p className="text-sm text-blue-700 dark:text-blue-300 truncate">
                  {replyToMessage.content.substring(0, 100)}...
                </p>
              </div>
              <button
                onClick={onClearReply}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
            {typingUsers.length === 1 ? (
              `${typingUsers[0].username} is typing...`
            ) : typingUsers.length === 2 ? (
              `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
            ) : (
              `${typingUsers[0].username} and ${typingUsers.length - 1} others are typing...`
            )}
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2 min-w-0">
          <div className="flex-1 min-w-0">
            <textarea
              value={messageText}
              onChange={(e) => {
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none min-h-[40px] max-h-32"
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
            {/* Selection Mode Toggle */}
            <button
              type="button"
              onClick={() => setSelectionMode(!selectionMode)}
              className={`p-2 rounded-lg transition-colors ${
                selectionMode 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Select messages"
            >
              {selectionMode ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
            </button>

            {/* File Upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Attach file"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            />

            {/* Emoji Button */}
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Add emoji"
            >
              <Smile className="h-5 w-5" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!messageText.trim() && !editingMessage}
              className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              title="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Message Selector */}
      <MessageSelector
        selectedMessages={Array.from(selectedMessages)}
        onClearSelection={handleClearSelection}
        onDeleteSelected={handleDeleteSelected}
        currentUser={currentUser}
      />
    </div>
  );
};

export default ChatWindow;