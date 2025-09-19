import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import socketService from '../sockets/socket';
import { messageApi, groupApi } from '../api';
import toast from 'react-hot-toast';

// Components
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import LoadingSpinner from '../components/common/LoadingSpinner';
import NotificationPanel from '../components/NotificationPanel';
import Settings from '../components/Settings';
import DashboardHeader from '../components/DashboardHeader';
import EmptyGroupState from '../components/EmptyGroupState';
import AuthErrorState from '../components/AuthErrorState';
import UngroupedUser from '../components/UngroupedUser';

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
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      setLoading(true);
      const response = await groupApi.getGroups();
      setGroups(response.groups || []);
      if (response.groups?.length > 0 && !selectedGroup) {
        setSelectedGroup(response.groups[0]);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load groups';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
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
      // Only set loading if we have a group to load messages for
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
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load messages';
      toast.error(errorMessage);
      setMessages([]); // Clear messages on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle new message
  const handleNewMessage = useCallback((message) => {
    if (!message || !message._id) {
      return;
    }

    const messageId = message._id;

    // Prevent duplicates
    if (processedMessageIds.current.has(messageId)) {
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

    // If no group is selected but we have groups, try to select the group this message belongs to
    if (!currentSelectedGroup && currentGroups.length > 0) {
      const messageGroup = currentGroups.find(g => g._id === messageGroupId);
      if (messageGroup) {
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
      processedMessageIds.current.add(messageId);
      currentSetMessages(prev => {
        // Check again for duplicates in state
        const exists = prev.some(msg => msg._id === messageId);
        if (exists) {
          return prev;
        }
        return [...prev, message];
      });
      currentScrollToBottom();
    }
  }, [setSelectedGroup]);

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
    const currentSetMessages = setMessagesRef.current;
    currentSetMessages(prev =>
      prev.map(msg => {
        if (messageIds.includes(msg._id)) {
          // Add user to seenBy if not already present
          const alreadySeen = msg.seenBy?.some(s => s.user === userId);
          if (!alreadySeen) {
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
      senderId: { _id: user._id || user.id, username: user.username },
      groupId: selectedGroup._id,
      createdAt: new Date(),
      messageType: messageData.messageType || 'text',
      file: messageData.file,
      isOptimistic: true
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      if (socketService.isConnected()) {
        socketService.sendMessage(messagePayload, async (response) => {
          if (response?.error) {
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
    try {
      if (socketService.isConnected()) {
        socketService.editMessage(messageId, content, selectedGroup._id);
      } else {
        await messageApi.editMessage(messageId, content);
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
      const response = await messageApi.toggleReaction(messageId, emoji);
      toast.success('Reaction added!');
    } catch (error) {
      console.error('Failed to react to message:', error);
      toast.error('Failed to react to message: ' + (error.response?.data?.error || error.message));
    }
  }, []);

  // Reply to message
  const handleReplyToMessage = useCallback((message) => {
    // Set the reply message in state so ChatWindow can handle it
    setReplyToMessage(message);
  }, []);

  // Handle user profile update
  const handleUserUpdate = useCallback((updatedUser) => {
    // Update the user context or local state
    toast.success('Profile updated successfully');
  }, []);

  // Handle group leave
  const handleGroupLeave = useCallback((groupId) => {
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
      setSocketConnected(true);
      // Rejoin current group if we have one
      const currentSelectedGroup = selectedGroupRef.current;
      if (currentSelectedGroup) {
        socketService.joinGroup(currentSelectedGroup._id);
      }
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleReconnect = () => {
      setSocketConnected(true);
      // Rejoin current group if we have one
      const currentSelectedGroup = selectedGroupRef.current;
      if (currentSelectedGroup) {
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
    socketService.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'Socket error occurred');
    });

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
      socketService.off('error');
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
    } else {
      // If no group is selected, clear messages and ensure loading is false
      setMessages([]);
      setLoading(false);
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
        socketService.leaveGroup(previousGroupRef.current._id);
      }

      socketService.joinGroup(selectedGroup._id);
      previousGroupRef.current = selectedGroup;
    } else if (selectedGroup && !socketService.isConnected()) {
      // Try to reconnect
      const token = localStorage.getItem('token');
      if (token) {
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
          const currentUserId = user._id || user.id;
          const isOwnMessage = msg.senderId._id === currentUserId;
          const alreadySeen = msg.seenBy?.some(s => s.user === currentUserId);
          const isOptimistic = msg.isOptimistic;


          return !isOwnMessage && !isOptimistic && !alreadySeen;
        })
        .map(msg => msg._id);

      if (messageIds.length > 0) {
        socketService.emit('message:seen', {
          messageIds,
          groupId: selectedGroup._id
        });
      }
    };

    // Mark messages as seen after a short delay to ensure they're visible
    const timeoutId = setTimeout(markMessagesAsSeen, 1000);

    return () => clearTimeout(timeoutId);
  }, [messages, selectedGroup, user._id, user.id]);



  // Safety check for user
  if (!user) {
    return <AuthErrorState onLogout={logout} />;
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }


  return (
    <>
      {selectedGroup ? (
        <div className="h-screen flex bg-gray-50 dark:bg-gray-900 overflow-hidden">
          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
            <Sidebar
              groups={groups}
              selectedGroup={selectedGroup}
              onGroupSelect={(group) => {
                setSelectedGroup(group);
                setSidebarOpen(false); // Close sidebar on mobile after selection
              }}
              onLogout={logout}
              user={user}
              onClose={() => setSidebarOpen(false)}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden lg:ml-0">
            {/* Header */}
            <DashboardHeader
              selectedGroup={selectedGroup}
              socketConnected={socketConnected}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              showNotificationPanel={showNotificationPanel}
              setShowNotificationPanel={setShowNotificationPanel}
              showSettings={showSettings}
              setShowSettings={setShowSettings}
              unreadNotificationCount={unreadNotificationCount}
            />

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
              <EmptyGroupState onOpenSidebar={() => setSidebarOpen(true)} />
            )}
          </div>

          {/* Notification Panel */}
          <NotificationPanel
            isVisible={showNotificationPanel}
            onClose={() => setShowNotificationPanel(false)}
            notifications={notifications}
            onMarkAsRead={handleMarkNotificationAsRead}
            onClearAll={handleClearAllNotifications}
          />

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
      ) : (
        <UngroupedUser />
      )}

    </>
  );
};

export default Dashboard;
