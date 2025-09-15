import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import socketService from '../sockets/socket';
import { messageApi, groupApi } from '../api';
import toast from 'react-hot-toast';

// Components
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import LoadingSpinner from '../components/common/LoadingSpinner';
import SocketDebugger from '../components/SocketDebugger';
import NotificationPanel from '../components/NotificationPanel';
import DebugPanel from '../components/DebugPanel';
import EmojiPickerTest from '../components/EmojiPickerTest';
import Settings from '../components/Settings';

// Icons
import { Bell, Wifi, WifiOff, Settings as SettingsIcon } from 'lucide-react';

const Dashboard = () => {
  // Auth
  const { user, logout } = useAuth();

  // State
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showSocketDebugger, setShowSocketDebugger] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showEmojiTest, setShowEmojiTest] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const processedMessageIds = useRef(new Set());
  const selectedGroupRef = useRef(selectedGroup);
  const groupsRef = useRef(groups);
  const setMessagesRef = useRef(setMessages);
  const previousGroupRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToBottomRef = useRef(scrollToBottom);

  // Update refs when state changes
  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  useEffect(() => {
    setMessagesRef.current = setMessages;
  }, [setMessages]);

  useEffect(() => {
    scrollToBottomRef.current = scrollToBottom;
  }, [scrollToBottom]);

  // Load groups
  const loadGroups = useCallback(async () => {
    try {
      const response = await groupApi.getGroups();
      setGroups(response.groups || []);
      if (response.groups?.length > 0 && !selectedGroup) {
        setSelectedGroup(response.groups[0]);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
      toast.error('Failed to load groups');
    }
  }, [selectedGroup]);

  // Load group members
  const loadGroupMembers = useCallback(async (groupId) => {
    if (!groupId) return;
    
    try {
      const response = await groupApi.getGroupMembers(groupId);
      // Combine users and managers into a single array
      const allMembers = [
        ...(response.users || []),
        ...(response.managers || [])
      ];
      setGroupMembers(allMembers);
    } catch (error) {
      console.error('Failed to load group members:', error);
      // Don't show error toast for this as it's not critical
    }
  }, []);

  // Load messages for selected group
  const loadMessages = useCallback(async (groupId) => {
    if (!groupId) return;
    
    try {
      setLoading(true);
      // Include metadata to get seenBy and deliveredTo data
      const response = await messageApi.getMessages(groupId, { includeMetadata: true });
      const newMessages = response.messages || [];
      
      setMessages(newMessages);
      processedMessageIds.current.clear();
      
      // Add all loaded message IDs to processed set to prevent duplicates
      newMessages.forEach(msg => {
        if (msg._id) {
          processedMessageIds.current.add(msg._id);
        }
      });
      
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle new message
  const handleNewMessage = useCallback((message) => {
    console.log('📨 New message received:', message);
    
    if (!message || !message._id) {
      console.warn('Invalid message received:', message);
      return;
    }
    
    const messageId = message._id;
    
    // Prevent duplicates
    if (processedMessageIds.current.has(messageId)) {
      console.log('Duplicate message ignored:', messageId);
      return;
    }
    
    // Handle both populated and non-populated groupId formats
    const messageGroupId = typeof message.groupId === 'object' 
      ? message.groupId._id 
      : message.groupId;
    
    const currentSelectedGroup = selectedGroupRef.current;
    const currentGroups = groupsRef.current;
    const currentSetMessages = setMessagesRef.current;
    const currentScrollToBottom = scrollToBottomRef.current;
    
    console.log('Message group ID:', messageGroupId, 'Selected group ID:', currentSelectedGroup?._id);
    
    // If no group is selected but we have groups, try to select the group this message belongs to
    if (!currentSelectedGroup && currentGroups.length > 0) {
      const messageGroup = currentGroups.find(g => g._id === messageGroupId);
      if (messageGroup) {
        console.log('Auto-selecting group for new message:', messageGroup.name);
        setSelectedGroup(messageGroup);
        // Add the message after setting the group
        setTimeout(() => {
          processedMessageIds.current.add(messageId);
          currentSetMessages(prev => [...prev, message]);
          currentScrollToBottom();
        }, 100);
        return;
      }
    }
    
    // Only add if for current group
    if (currentSelectedGroup && messageGroupId === currentSelectedGroup._id) {
      console.log('Adding message to current group:', messageGroupId);
      processedMessageIds.current.add(messageId);
      currentSetMessages(prev => {
        // Check again for duplicates in state
        const exists = prev.some(msg => msg._id === messageId);
        if (exists) {
          console.log('Message already exists in state, skipping');
          return prev;
        }
        return [...prev, message];
      });
      currentScrollToBottom();
    } else {
      console.log('Message not for current group, ignoring');
    }
  }, []); // Remove all dependencies since we're using refs

  // Handle message edited
  const handleMessageEdited = useCallback(({ messageId, message: editedMessage }) => {
    // Handle both populated and non-populated groupId formats
    const messageGroupId = typeof editedMessage.groupId === 'object'
      ? editedMessage.groupId._id
      : editedMessage.groupId;

    const currentSelectedGroup = selectedGroupRef.current;
    const currentSetMessages = setMessagesRef.current;

    if (currentSelectedGroup && messageGroupId === currentSelectedGroup._id) {
      currentSetMessages(prev =>
        prev.map(msg => msg._id === messageId ? editedMessage : msg)
      );
    }
  }, []);

  // Handle message deleted
  const handleMessageDeleted = useCallback(({ messageId }) => {
    const currentSetMessages = setMessagesRef.current;
    currentSetMessages(prev => 
      prev.map(msg => 
        msg._id === messageId 
          ? { 
              ...msg, 
              content: 'This message has been deleted', 
              isDeleted: true,
              deletedAt: new Date().toISOString()
            }
          : msg
      )
    );
  }, []);

  // Handle message reaction
  const handleMessageReaction = useCallback(({ messageId, reactions, userId, emoji, action }) => {
    const currentSetMessages = setMessagesRef.current;
    currentSetMessages(prev =>
      prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, reactions: reactions }
          : msg
      )
    );
  }, []);

  // Handle message seen status
  const handleMessageSeen = useCallback(({ messageId, seenBy, userId }) => {
    const currentSetMessages = setMessagesRef.current;
    currentSetMessages(prev =>
      prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, seenBy: seenBy }
          : msg
      )
    );
  }, []);

  // Handle bulk messages seen
  const handleMessagesSeen = useCallback(({ messageIds, userId }) => {
    console.log('Handling bulk messages seen:', { messageIds, userId });
    const currentSetMessages = setMessagesRef.current;
    currentSetMessages(prev =>
      prev.map(msg => {
        if (messageIds.includes(msg._id)) {
          // Add user to seenBy if not already present
          const alreadySeen = msg.seenBy?.some(s => s.user === userId);
          if (!alreadySeen) {
            console.log('Adding seen status to message:', msg._id, 'for user:', userId);
            return {
              ...msg,
              seenBy: [
                ...(msg.seenBy || []),
                { user: userId, seenAt: new Date() }
              ]
            };
          }
        }
        return msg;
      })
    );
  }, []);

  // Handle notification
  const handleNotification = useCallback((notification) => {
    console.log('📢 Notification received:', notification);
    
    // Add notification to state
    const newNotification = {
      id: Date.now().toString(),
      ...notification,
      read: false,
      createdAt: new Date(notification.createdAt || Date.now())
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50 notifications
    
    // Show toast notification
    toast.success(notification.message || 'New notification');
  }, []);

  // Notification management functions
  const handleMarkNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const handleClearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Calculate unread notification count
  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  // Send message
  const handleSendMessage = useCallback(async (messageData, callback) => {
    if (!selectedGroup) return;

    const messagePayload = {
      ...messageData,
      groupId: selectedGroup._id
    };

    // Add optimistic message
    const optimisticMessage = {
      _id: `temp_${Date.now()}`,
      content: messageData.content,
      senderId: { _id: user.id, username: user.username },
      groupId: selectedGroup._id,
      createdAt: new Date(),
      messageType: messageData.messageType || 'text',
      file: messageData.file,
      isOptimistic: true
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      if (socketService.isConnected()) {
        console.log('Sending message via socket:', messagePayload);
        socketService.sendMessage(messagePayload, async (response) => {
          console.log('Socket response:', response);
          if (response?.error) {
            console.log('Socket error, falling back to API:', response.error);
            // Remove optimistic message and try API fallback
            setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
            try {
              const apiResponse = await messageApi.sendMessage(messagePayload);
              if (callback) callback(apiResponse);
            } catch (apiError) {
              console.error('API fallback failed:', apiError);
              toast.error('Failed to send message');
              if (callback) callback({ error: apiError.message });
            }
          } else {
            // Remove optimistic message (real message will come via socket)
            setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
            if (callback) callback(response);
          }
        });
      } else {
        console.log('Socket not connected, using API');
        // Remove optimistic message and use API
        setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
        const response = await messageApi.sendMessage(messagePayload);
        if (callback) callback(response);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
      toast.error('Failed to send message');
      if (callback) callback({ error: error.message });
    }
  }, [selectedGroup, user]);

  // Edit message
  const handleEditMessage = useCallback(async (messageId, content) => {
    console.log('Dashboard: handleEditMessage called with:', { messageId, content, selectedGroup: selectedGroup?._id });
    try {
      if (socketService.isConnected()) {
        console.log('Dashboard: Using socket to edit message');
        socketService.editMessage(messageId, content, selectedGroup._id);
      } else {
        console.log('Dashboard: Using API to edit message');
        await messageApi.editMessage(messageId, { content });
      }
      toast.success('Message updated');
    } catch (error) {
      console.error('Dashboard: Error editing message:', error);
      toast.error('Failed to update message');
    }
  }, [selectedGroup]);

  // Delete message
  const handleDeleteMessage = useCallback(async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      if (socketService.isConnected()) {
        socketService.emit('message:delete', { messageId, groupId: selectedGroup._id });
      } else {
        await messageApi.deleteMessage(messageId);
      }
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  }, [selectedGroup]);

  // Bulk delete messages without individual confirmations
  const handleBulkDeleteMessages = useCallback(async (messageIds) => {
    try {
      for (const messageId of messageIds) {
        if (socketService.isConnected()) {
          socketService.emit('message:delete', { messageId, groupId: selectedGroup._id });
        } else {
          await messageApi.deleteMessage(messageId);
        }
      }
      toast.success(`${messageIds.length} message(s) deleted successfully`);
    } catch (error) {
      toast.error('Failed to delete messages');
    }
  }, [selectedGroup]);

  // React to message
  const handleReactToMessage = useCallback(async (messageId, emoji) => {
    try {
      console.log('Reacting to message:', { messageId, emoji });
      const response = await messageApi.toggleReaction(messageId, emoji);
      console.log('Reaction sent successfully:', response);
      toast.success('Reaction added!');
    } catch (error) {
      console.error('Failed to react to message:', error);
      toast.error('Failed to react to message: ' + (error.response?.data?.error || error.message));
    }
  }, []);

  // Reply to message
  const handleReplyToMessage = useCallback((message) => {
    console.log('Replying to message:', message);
    // Set the reply message in state so ChatWindow can handle it
    setReplyToMessage(message);
  }, []);

  // Handle user profile update
  const handleUserUpdate = useCallback((updatedUser) => {
    // Update the user context or local state
    console.log('User profile updated:', updatedUser);
    toast.success('Profile updated successfully');
  }, []);

  // Handle group leave
  const handleGroupLeave = useCallback((groupId) => {
    console.log('User left group:', groupId);
    // Remove the group from the groups list
    setGroups(prev => prev.filter(group => group._id !== groupId));
    
    // If the left group was selected, select the first available group
    if (selectedGroup?._id === groupId) {
      const remainingGroups = groups.filter(group => group._id !== groupId);
      if (remainingGroups.length > 0) {
        setSelectedGroup(remainingGroups[0]);
      } else {
        setSelectedGroup(null);
      }
    }
    
    toast.success('Left group successfully');
  }, [selectedGroup, groups]);

  // State for reply functionality
  const [replyToMessage, setReplyToMessage] = useState(null);

  // Socket connection management
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);
    }

    const handleConnect = () => {
      console.log('Socket connected in Dashboard');
      setSocketConnected(true);
      // Rejoin current group if we have one
      const currentSelectedGroup = selectedGroupRef.current;
      if (currentSelectedGroup) {
        console.log('Rejoining group on connect:', currentSelectedGroup._id);
        socketService.joinGroup(currentSelectedGroup._id);
      }
    };
    
    const handleDisconnect = () => {
      console.log('Socket disconnected in Dashboard');
      setSocketConnected(false);
    };

    const handleReconnect = () => {
      console.log('Socket reconnected in Dashboard');
      setSocketConnected(true);
      // Rejoin current group if we have one
      const currentSelectedGroup = selectedGroupRef.current;
      if (currentSelectedGroup) {
        console.log('Rejoining group on reconnect:', currentSelectedGroup._id);
        socketService.joinGroup(currentSelectedGroup._id);
      }
    };

    // Set up socket event listeners
    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('reconnect', handleReconnect);
    socketService.on('message:new', handleNewMessage);
    socketService.on('message:edited', handleMessageEdited);
    socketService.on('message:deleted', handleMessageDeleted);
    socketService.on('message:reaction', handleMessageReaction);
    socketService.on('message:seen', handleMessageSeen);
    socketService.on('messages:seen', handleMessagesSeen);
    socketService.on('notification:new', handleNotification);

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('reconnect', handleReconnect);
      socketService.off('message:new', handleNewMessage);
      socketService.off('message:edited', handleMessageEdited);
      socketService.off('message:deleted', handleMessageDeleted);
      socketService.off('message:reaction', handleMessageReaction);
      socketService.off('message:seen', handleMessageSeen);
      socketService.off('messages:seen', handleMessagesSeen);
      socketService.off('notification:new', handleNotification);
    };
  }, []); // Remove dependencies to prevent recreation of event listeners

  // Load initial data
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Load messages when group changes
  useEffect(() => {
    if (selectedGroup) {
      // Clear messages first to prevent stuck messages
      setMessages([]);
      loadMessages(selectedGroup._id);
      loadGroupMembers(selectedGroup._id);
    }
  }, [selectedGroup, loadMessages, loadGroupMembers]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Join group when selected
  useEffect(() => {
    if (selectedGroup && socketService.isConnected()) {
      // Leave previous group if it exists
      if (previousGroupRef.current && previousGroupRef.current._id !== selectedGroup._id) {
        console.log('Dashboard: Leaving previous group:', previousGroupRef.current._id);
        socketService.leaveGroup(previousGroupRef.current._id);
      }
      
      console.log('Dashboard: Joining group:', selectedGroup._id);
      socketService.joinGroup(selectedGroup._id);
      previousGroupRef.current = selectedGroup;
    } else if (selectedGroup && !socketService.isConnected()) {
      // Try to reconnect
      const token = localStorage.getItem('token');
      if (token) {
        console.log('Dashboard: Reconnecting socket for group:', selectedGroup._id);
        socketService.connect(token);
      }
    }
  }, [selectedGroup]);

  // Join group when socket connects (if we have a selected group)
  useEffect(() => {
    if (socketConnected && selectedGroup) {
      socketService.joinGroup(selectedGroup._id);
    }
  }, [socketConnected, selectedGroup]);

  // Mark messages as seen when they come into view
  useEffect(() => {
    if (!selectedGroup || !socketService.isConnected()) return;

    const markMessagesAsSeen = () => {
      const messageIds = messages
        .filter(msg => {
          // Only mark messages as seen if:
          // 1. Not our own message
          // 2. Not already seen by us
          // 3. Not optimistic message
          const isOwnMessage = msg.senderId._id === user.id || msg.senderId._id === user._id;
          const alreadySeen = msg.seenBy?.some(s => s.user === user.id || s.user === user._id);
          const isOptimistic = msg.isOptimistic;
          
          console.log('Checking message for seen status:', {
            messageId: msg._id,
            isOwnMessage,
            alreadySeen,
            isOptimistic,
            seenBy: msg.seenBy,
            currentUserId: user.id
          });
          
          return !isOwnMessage && !isOptimistic && !alreadySeen;
        })
        .map(msg => msg._id);

      if (messageIds.length > 0) {
        console.log('Marking messages as seen:', messageIds);
        socketService.emit('message:seen', {
          messageIds,
          groupId: selectedGroup._id
        });
      }
    };

    // Mark messages as seen after a short delay to ensure they're visible
    const timeoutId = setTimeout(markMessagesAsSeen, 1000);

    return () => clearTimeout(timeoutId);
  }, [messages, selectedGroup, user.id, user._id]);


  if (loading && !selectedGroup) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        groups={groups}
        selectedGroup={selectedGroup}
        onGroupSelect={setSelectedGroup}
        onLogout={logout}
        user={user}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                {selectedGroup?.name || 'RAMA Chat'}
              </h1>
              <div className="flex items-center space-x-2 flex-shrink-0">
                {socketConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                  {socketConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Socket Debugger Toggle */}
              <button
                onClick={() => setShowSocketDebugger(!showSocketDebugger)}
                className={`p-2 rounded-lg transition-colors ${
                  showSocketDebugger 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Socket Debugger"
              >
                🔧
              </button>

              {/* Debug Panel Toggle */}
              <button
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className={`p-2 rounded-lg transition-colors ${
                  showDebugPanel 
                    ? 'bg-green-500 text-white' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Debug Panel"
              >
                🐛
              </button>

              {/* Emoji Test Toggle */}
              <button
                onClick={() => setShowEmojiTest(!showEmojiTest)}
                className={`p-2 rounded-lg transition-colors ${
                  showEmojiTest 
                    ? 'bg-purple-500 text-white' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Emoji Test"
              >
                😊
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Settings"
              >
                <SettingsIcon className="h-5 w-5" />
              </button>

              {/* Notifications */}
              <button
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </button>

            </div>
          </div>
        </div>

        {/* Chat Window */}
        {selectedGroup ? (
          <ChatWindow
            group={selectedGroup}
            messages={messages}
            currentUser={user}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onBulkDeleteMessages={handleBulkDeleteMessages}
            onReactToMessage={handleReactToMessage}
            onReplyToMessage={handleReplyToMessage}
            replyToMessage={replyToMessage}
            onClearReply={() => setReplyToMessage(null)}
            loading={loading}
            groupMembers={groupMembers}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Select a group to start chatting
              </h2>
              <p className="text-gray-500 dark:text-gray-500">
                Choose a group from the sidebar to begin your conversation
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Socket Debugger */}
      <SocketDebugger isVisible={showSocketDebugger} />

      {/* Notification Panel */}
      <NotificationPanel
        isVisible={showNotificationPanel}
        onClose={() => setShowNotificationPanel(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onClearAll={handleClearAllNotifications}
      />

      {/* Debug Panel */}
      <DebugPanel
        isVisible={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />

      {/* Emoji Test */}
      {showEmojiTest && (
        <div className="fixed top-16 right-4 z-50">
          <EmojiPickerTest />
        </div>
      )}

      {/* Settings Modal */}
      <Settings
        isVisible={showSettings}
        onClose={() => setShowSettings(false)}
        currentUser={user}
        selectedGroup={selectedGroup}
        onUserUpdate={handleUserUpdate}
        onGroupLeave={handleGroupLeave}
      />

    </div>
  );
};

export default Dashboard;
