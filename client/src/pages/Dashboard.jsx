
import React, { useState, useEffect, useRef, useCallback, useReducer, useMemo, Suspense, lazy, memo } from 'react'
import { useAuth } from '../context/AuthContext'
import { groupApi } from '../api/groupApi'
import { messageApi } from '../api/messageApi'
import { notificationApi } from '../api/notificationApi'
import socketService from '../sockets/socket'
import { Menu, X, Bell, Wifi, WifiOff, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import soundManager from '../utils/soundManager'
import { usePerformanceMonitor, useMemoryMonitor, useNetworkMonitor } from '../hooks/usePerformanceMonitor'

// Lazy load components for better performance
const Sidebar = lazy(() => import('../components/EnhancedSidebar'))
const ChatWindow = lazy(() => import('../components/ChatWindow'))
const NotificationPanel = lazy(() => import('../components/EnhancedNotificationPanel'))
const ErrorBoundary = lazy(() => import('../components/ErrorBoundary'))

// Optimized debounce utility function with immediate execution option
const debounce = (func, wait, immediate = false) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
};

// Throttle utility for high-frequency events
const throttle = (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// Reducer for managing complex state
const dashboardReducer = (state, action) => {
    switch (action.type) {
        case 'SET_GROUPS':
            return { ...state, groups: action.payload };
        case 'SET_SELECTED_GROUP':
            return { ...state, selectedGroup: action.payload };
        case 'SET_MESSAGES':
            return {
                ...state,
                messages: typeof action.payload === 'function' ? action.payload(state.messages) : action.payload
            };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_LOADING_MORE':
            return { ...state, loadingMore: action.payload };
        case 'SET_HAS_MORE_MESSAGES':
            return { ...state, hasMoreMessages: action.payload };
        case 'SET_CURRENT_PAGE':
            return { ...state, currentPage: action.payload };
        case 'SET_ONLINE_USERS':
            return { ...state, onlineUsers: action.payload };
        case 'SET_UNREAD_COUNTS':
            return { ...state, unreadCounts: action.payload };
        case 'UPDATE_UNREAD_COUNT':
            return {
                ...state,
                unreadCounts: {
                    ...state.unreadCounts,
                    [action.payload.groupId]: action.payload.count
                }
            };
        case 'SET_NOTIFICATION_COUNT':
            return { ...state, notificationCount: action.payload };
        case 'SET_SOCKET_STATUS':
            return { ...state, socketStatus: action.payload };
        case 'SET_MESSAGE_CACHE':
            return { ...state, messageCache: action.payload };
        case 'UPDATE_MESSAGE_CACHE':
            return {
                ...state,
                messageCache: {
                    ...state.messageCache,
                    [action.payload.groupId]: typeof action.payload.cache === 'function'
                        ? action.payload.cache(state.messageCache[action.payload.groupId] || {})
                        : action.payload.cache
                }
            };
        case 'RESET_STATE':
            return {
                ...state,
                selectedGroup: null,
                messages: [],
                messageCache: {},
                groups: [],
                unreadCounts: {},
                notificationCount: 0
            };
        default:
            return state;
    }
};

const Dashboard = memo(() => {
    const { user, token, logout } = useAuth()

    // Performance monitoring
    const { measureOperation, markMilestone } = usePerformanceMonitor('Dashboard')
    useMemoryMonitor()
    useNetworkMonitor()

    // Refs for performance optimization
    const resizeObserverRef = useRef(null)
    const intersectionObserverRef = useRef(null)

    // Use reducer for complex state management
    const [state, dispatch] = useReducer(dashboardReducer, {
        groups: [],
        selectedGroup: null,
        messages: [],
        loading: false,
        loadingMore: false,
        hasMoreMessages: true,
        currentPage: 1,
        onlineUsers: new Set(),
        unreadCounts: {},
        notificationCount: 0,
        socketStatus: 'disconnected',
        messageCache: {}
    })

    // Destructure state for easier access
    const {
        groups,
        selectedGroup,
        messages,
        loading,
        loadingMore,
        hasMoreMessages,
        currentPage,
        onlineUsers,
        unreadCounts,
        notificationCount,
        socketStatus,
        messageCache
    } = state

    // Local state for UI interactions
    const [editingMessage, setEditingMessage] = useState(null)
    const [replyingMessage, setReplyingMessage] = useState(null)
    const [messagePrivacy, setMessagePrivacy] = useState(null)
    const [processedMessageIds, setProcessedMessageIds] = useState(new Set())
    const [notificationPermission, setNotificationPermission] = useState('default')
    const [showNotificationPanel, setShowNotificationPanel] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    // Helper function to get cached messages for a group
    const getCachedMessages = useCallback((groupId) => {
        return messageCache[groupId]?.messages || []
    }, [messageCache])

    // Helper function to check if group has cached messages
    const hasCachedMessages = useCallback((groupId) => {
        return messageCache[groupId] && messageCache[groupId].messages && messageCache[groupId].messages.length > 0
    }, [messageCache])

    // Memoized total unread count calculation
    const totalUnreadCount = useMemo(() => {
        return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)
    }, [unreadCounts])

    // Memory management for message cache - limit cache size
    const MAX_CACHE_SIZE = 5; // Maximum number of groups to cache
    const MAX_MESSAGES_PER_GROUP = 1000; // Maximum messages per group in cache

    const optimizeMessageCache = useCallback(() => {
        const cacheEntries = Object.entries(messageCache);

        if (cacheEntries.length > MAX_CACHE_SIZE) {
            // Remove oldest cache entries (keep most recent)
            const sortedEntries = cacheEntries.sort((a, b) => {
                const aTime = a[1].lastAccessed || 0;
                const bTime = b[1].lastAccessed || 0;
                return bTime - aTime;
            });

            const optimizedCache = {};
            sortedEntries.slice(0, MAX_CACHE_SIZE).forEach(([groupId, cache]) => {
                // Also limit messages per group
                if (cache.messages && cache.messages.length > MAX_MESSAGES_PER_GROUP) {
                    cache.messages = cache.messages.slice(-MAX_MESSAGES_PER_GROUP);
                }
                optimizedCache[groupId] = cache;
            });

            dispatch({ type: 'SET_MESSAGE_CACHE', payload: optimizedCache });
        }
    }, [messageCache]);

    // Optimized resize handler for responsive behavior
    const handleResize = useCallback(
        throttle(() => {
            // Handle responsive layout changes
            if (window.innerWidth >= 1024) {
                setIsSidebarOpen(false); // Close mobile sidebar on desktop
            }
        }, 250),
        []
    );

    // Setup resize observer for better performance
    useEffect(() => {
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserverRef.current = new ResizeObserver(
                throttle((entries) => {
                    // Handle container resize events
                    entries.forEach((entry) => {
                        // Optimize layout based on container size
                        if (entry.contentRect.width < 768) {
                            // Mobile optimizations
                        } else if (entry.contentRect.width < 1024) {
                            // Tablet optimizations
                        } else {
                            // Desktop optimizations
                        }
                    });
                }, 100)
            );
        }

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
            }
        };
    }, [handleResize]);

    // Run cache optimization periodically
    useEffect(() => {
        const interval = setInterval(optimizeMessageCache, 60000); // Every minute
        return () => clearInterval(interval);
    }, [optimizeMessageCache]);

    const messagesEndRef = useRef(null)

    // Save selected group to localStorage
    const saveSelectedGroup = (group) => {
        if (group) {
            localStorage.setItem('selectedGroup', JSON.stringify({
                _id: group._id,
                name: group.name,
                region: group.region
            }))
        } else {
            localStorage.removeItem('selectedGroup')
        }
    }

    // Restore selected group from localStorage
    const restoreSelectedGroup = (groups) => {
        try {
            const savedGroup = localStorage.getItem('selectedGroup')
            if (savedGroup) {
                const groupData = JSON.parse(savedGroup)
                // Find the group in the current groups list
                const foundGroup = groups.find(g => g._id === groupData._id)
                if (foundGroup) {
                    dispatch({ type: 'SET_SELECTED_GROUP', payload: foundGroup })
                    return foundGroup
                }
            }
        } catch (error) {
            console.error('Error restoring selected group:', error)
            localStorage.removeItem('selectedGroup')
        }
        return null
    }

    useEffect(() => {
        if (token) {
            // Clean up any existing listeners first
            socketService.removeAllListeners()

            const socket = socketService.connect(token)
            loadGroups()
            loadNotificationCount()
            requestNotificationPermission()


            // Set up socket event listeners (only once)
            const setupSocketListeners = () => {
                // Remove existing listeners first to prevent duplicates
                socketService.removeAllListeners()
                
                socketService.on('message:new', handleNewMessage)
                socketService.on('message:edited', handleMessageEdited)
                socketService.on('message:deleted', handleMessageDeleted)
                socketService.on('messages:deleted', handleMultipleMessagesDeleted)
                socketService.on('message:delivered', handleMessageDelivered)
                socketService.on('message:seen', handleMessageSeen)
                socketService.on('message:reaction', handleMessageReaction)
                socketService.on('messages:delivered', handleBulkMessagesDelivered)
                socketService.on('messages:seen', handleBulkMessagesSeen)
                // Typing indicators are now handled in ChatWindow component
                // Online status is handled by individual components (ChatWindow, AdminPanel)
                socketService.on('user:joined', handleUserJoined)
                socketService.on('user:left', handleUserLeft)
                socketService.on('notification:new', handleNewNotification)
                socketService.on('group:updated', handleGroupUpdated)
                socketService.on('group:joined', handleGroupJoined)
                socketService.on('group:left', handleGroupLeft)
                socketService.on('role:updated', handleRoleUpdated)
            }

            // Set up listeners only once when socket connects
            socketService.on('connect', () => {
                console.log('🔌 Socket connected, setting up listeners');
                dispatch({ type: 'SET_SOCKET_STATUS', payload: 'connected' })
                setupSocketListeners()
            })
            
            // Add socket disconnect handler
            socketService.on('disconnect', () => {
                console.log('🔌 Socket disconnected');
                dispatch({ type: 'SET_SOCKET_STATUS', payload: 'disconnected' })
            })
            
            // Set initial status
            if (socketService.getSocket()?.connected) {
                dispatch({ type: 'SET_SOCKET_STATUS', payload: 'connected' })
                setupSocketListeners()
            } else {
                dispatch({ type: 'SET_SOCKET_STATUS', payload: 'connecting' })
            }

            socketService.on('disconnect', () => {
                dispatch({ type: 'SET_SOCKET_STATUS', payload: 'disconnected' })
            })

            socketService.on('connect_error', (error) => {
                console.error('Socket connection error in Dashboard:', error);
                dispatch({ type: 'SET_SOCKET_STATUS', payload: 'error' });

                // Handle authentication errors
                if (error.message === 'unauth') {
                    console.error('Socket authentication failed, logging out user');
                    logout();
                }
            })

            return () => {
                // Clean up all listeners
                socketService.removeAllListeners()
                socketService.disconnect()

                // Clear state on unmount
                dispatch({ type: 'RESET_STATE' })
            }
        }
    }, [token])

    useEffect(() => {
        if (selectedGroup) {
            console.log('Selected group changed:', selectedGroup._id, 'Messages count:', messages.length)

            // Check if we have cached messages for this group
            const hasCache = hasCachedMessages(selectedGroup._id)
            const cachedMessages = getCachedMessages(selectedGroup._id)

            if (hasCache && cachedMessages.length > 0) {
                // If we have cache with messages, restore from cache immediately
                console.log('Restoring messages from cache for group:', selectedGroup._id, 'Cached messages:', cachedMessages.length)
                dispatch({ type: 'SET_MESSAGES', payload: cachedMessages })
                dispatch({ type: 'SET_HAS_MORE_MESSAGES', payload: messageCache[selectedGroup._id]?.hasMoreMessages || false })
                dispatch({ type: 'SET_CURRENT_PAGE', payload: messageCache[selectedGroup._id]?.currentPage || 1 })
            } else {
                // No cache or empty cache - load messages normally
                console.log('Loading messages for group:', selectedGroup._id, 'Has cache:', hasCache, 'Cached messages:', cachedMessages.length)
                loadMessages(selectedGroup._id, 1, true, false)
            }

            // Join the group room for real-time updates
            console.log('🔗 Joining group room for real-time updates:', selectedGroup._id);
            socketService.joinGroup(selectedGroup._id)
        }
    }, [selectedGroup])

    const loadMoreMessages = async () => {
        if (selectedGroup && hasMoreMessages && !loadingMore) {
            const nextChunk = currentPage + 1
            await loadMessages(selectedGroup._id, nextChunk, false)
        }
    }

    // Mark messages as seen when group is selected
    useEffect(() => {
        if (selectedGroup && messages.length > 0) {
            const unreadMessageIds = messages
                .filter(msg =>
                    msg.groupId === selectedGroup._id &&
                    msg.senderId._id !== user.id && msg.senderId._id !== user._id &&
                    !msg.seenBy?.some(seenUser =>
                        seenUser._id === user.id || seenUser._id === user._id ||
                        seenUser === user.id || seenUser === user._id
                    )
                )
                .map(msg => msg._id)

            if (unreadMessageIds.length > 0) {
                // Use socket instead of HTTP API to avoid rate limiting
                socketService.markAsSeen(null, selectedGroup._id, unreadMessageIds)
            }

            // Clear unread count for selected group
            dispatch({
                type: 'UPDATE_UNREAD_COUNT', payload: {
                    groupId: selectedGroup._id,
                    count: 0
                }
            })
        }
    }, [selectedGroup, messages, user.id])

    // Update total unread count - now handled by useMemo

    const loadGroups = useCallback(async () => {
        markMilestone('loadGroups-start')

        const result = await measureOperation('loadGroups', async () => {
            try {
                const response = await groupApi.getGroups()
                const groupsList = response.groups || []
                dispatch({ type: 'SET_GROUPS', payload: groupsList })

                // First try to restore from localStorage
                const restoredGroup = restoreSelectedGroup(groupsList)

                // If no group was restored, try to set user's default group
                if (!restoredGroup && user.groupId && groupsList.length > 0) {
                    const userGroup = groupsList.find(g =>
                        g._id === user.groupId ||
                        g.users?.includes(user.id) ||
                        g.managers?.some(m => m._id === user.id)
                    )
                    if (userGroup) {
                        dispatch({ type: 'SET_SELECTED_GROUP', payload: userGroup })
                        saveSelectedGroup(userGroup)
                    }
                }
                return groupsList
            } catch (error) {
                toast.error('Failed to load groups')
                throw error
            } finally {
                dispatch({ type: 'SET_LOADING', payload: false })
            }
        })

        markMilestone('loadGroups-complete')
        return result
    }, [user.groupId, user.id, measureOperation, markMilestone])

    const loadMessages = useCallback(async (groupId, chunkNumber = 1, resetMessages = true, backgroundLoad = false, retryCount = 0) => {
        const maxRetries = 2;

        try {
            // Validate group membership before attempting to load messages
            const selectedGroup = groups.find(g => g._id === groupId);
            if (!selectedGroup) {
                console.warn('Group not found in user groups, skipping message load');
                return;
            }
            // Only show loading states for initial load, not for cache restoration or background loads
            if (chunkNumber === 1 && !backgroundLoad && !hasCachedMessages(groupId)) {
                dispatch({ type: 'SET_LOADING', payload: true })
                dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 })
                dispatch({ type: 'SET_HAS_MORE_MESSAGES', payload: true })
            } else if (chunkNumber > 1 && !backgroundLoad) {
                dispatch({ type: 'SET_LOADING_MORE', payload: true })
            }

            // Use new chunking API parameters
            const params = {
                chunkSize: 50, // Optimized chunk size for better performance
                before: chunkNumber > 1 ? messageCache[groupId]?.nextCursor : undefined,
                includeMetadata: false // Only include essential data for better performance
            };

            const response = await messageApi.getMessages(groupId, params)
            const newMessages = response.messages || []
            const chunk = response.chunk || {}
            const privacy = response.privacy || {}

            if (chunkNumber === 1 || resetMessages) {
                // Always update cache for first chunk or reset
                dispatch({
                    type: 'UPDATE_MESSAGE_CACHE', payload: {
                        groupId,
                        cache: {
                            messages: newMessages,
                            currentPage: chunkNumber,
                            hasMoreMessages: chunk.hasMore || false,
                            nextCursor: chunk.nextCursor,
                            prevCursor: chunk.prevCursor,
                            total: chunk.total,
                            isEstimated: chunk.isEstimated || false,
                            lastAccessed: Date.now()
                        }
                    }
                })

                if (backgroundLoad) {
                    // Background load - only update messages if this is the currently selected group
                    // and if we don't already have messages (to avoid overwriting cache)
                    if (selectedGroup?._id === groupId && messages.length === 0) {
                        console.log('Background load updating messages for group:', groupId, 'New messages:', newMessages.length)
                        dispatch({ 
                            type: 'SET_MESSAGES', 
                            payload: prev => {
                                // Merge with existing messages to prevent duplicates
                                const existingIds = new Set(prev.map(msg => msg._id.toString()));
                                const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg._id.toString()));
                                
                                if (uniqueNewMessages.length > 0) {
                                    console.log(`📥 Background loading ${uniqueNewMessages.length} new messages from database`);
                                    // Mark these messages as processed
                                    const newIds = uniqueNewMessages.map(msg => msg._id.toString());
                                    setProcessedMessageIds(prev => new Set([...prev, ...newIds]));
                                    return [...prev, ...uniqueNewMessages];
                                }
                                
                                return prev;
                            }
                        })
                        
                        // Show privacy notification for new users even in background load
                        if (privacy.messagePrivacyEnabled && privacy.note) {
                            toast.info(privacy.note, {
                                duration: 5000,
                                position: 'top-center'
                            })
                        }
                        
                        // Store privacy information for UI display
                        setMessagePrivacy(privacy)
                    }
                } else {
                    // Regular load - merge with existing messages to prevent duplicates
                    console.log('Regular load updating messages for group:', groupId, 'New messages:', newMessages.length)
                    dispatch({ 
                        type: 'SET_MESSAGES', 
                        payload: prev => {
                            // Merge new messages with existing ones, avoiding duplicates
                            const existingIds = new Set(prev.map(msg => msg._id.toString()));
                            const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg._id.toString()));
                            
                            if (uniqueNewMessages.length > 0) {
                                console.log(`📥 Loading ${uniqueNewMessages.length} new messages from database`);
                                // Mark these messages as processed
                                const newIds = uniqueNewMessages.map(msg => msg._id.toString());
                                setProcessedMessageIds(prev => new Set([...prev, ...newIds]));
                                return [...prev, ...uniqueNewMessages];
                            }
                            
                            return prev;
                        }
                    })
                    
                    // Show privacy notification for new users
                    if (privacy.messagePrivacyEnabled && privacy.note) {
                        toast.info(privacy.note, {
                            duration: 5000,
                            position: 'top-center'
                        })
                    }
                    
                    // Store privacy information for UI display
                    setMessagePrivacy(privacy)
                }
            } else {
                // For chunking, add older messages to the beginning, avoiding duplicates
                dispatch({ 
                    type: 'SET_MESSAGES', 
                    payload: prev => {
                        const existingIds = new Set(prev.map(msg => msg._id.toString()));
                        const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg._id.toString()));
                        
                        if (uniqueNewMessages.length > 0) {
                            console.log(`📥 Loading ${uniqueNewMessages.length} older messages from database`);
                            // Mark these messages as processed
                            const newIds = uniqueNewMessages.map(msg => msg._id.toString());
                            setProcessedMessageIds(prev => new Set([...prev, ...newIds]));
                            return [...uniqueNewMessages, ...prev];
                        }
                        
                        return prev;
                    }
                })

                // Update cache with new messages
                dispatch({
                    type: 'UPDATE_MESSAGE_CACHE', payload: {
                        groupId,
                        cache: prev => ({
                            ...prev,
                            messages: [...newMessages, ...(prev?.messages || [])],
                            currentPage: chunkNumber,
                            hasMoreMessages: chunk.hasMore || false,
                            nextCursor: chunk.nextCursor,
                            prevCursor: chunk.prevCursor,
                            total: chunk.total,
                            isEstimated: chunk.isEstimated || false
                        })
                    }
                })
            }

            // Update pagination state
            dispatch({ type: 'SET_HAS_MORE_MESSAGES', payload: chunk.hasMore || false })
            dispatch({ type: 'SET_CURRENT_PAGE', payload: chunkNumber })

            console.log(`📨 Loaded ${newMessages.length} messages for group ${groupId}, chunk ${chunkNumber}, cache updated:`, !!messageCache[groupId])

        } catch (error) {
            console.error('Error loading messages:', error)

            // Retry logic for network errors
            if (retryCount < maxRetries && (error.code === 'NETWORK_ERROR' || error.response?.status >= 500)) {
                console.log(`Retrying message load (attempt ${retryCount + 1}/${maxRetries})`)
                setTimeout(() => {
                    loadMessages(groupId, chunkNumber, resetMessages, backgroundLoad, retryCount + 1)
                }, 1000 * (retryCount + 1)) // Exponential backoff
                return
            }

            // Only show error toasts for non-background loads and actual errors
            if (!backgroundLoad && error.response?.status !== 200) {
                // Provide more specific error messages
                if (error.response?.status === 500) {
                    toast.error('Server error. Please try again later.')
                } else if (error.response?.status === 403) {
                    // Handle authorization errors specifically
                    const errorMessage = typeof error.response.data.error === 'string' 
                        ? error.response.data.error 
                        : error.response.data.error.message || 'Not authorized to view messages';
                    
                    toast.error('Access denied: You are not a member of this group');
                    
                    // Clear the selected group and refresh groups list
                    dispatch({ type: 'SET_SELECTED_GROUP', payload: null });
                    saveSelectedGroup(null);
                    
                    // Refresh groups to get updated membership
                    setTimeout(() => {
                        loadGroups();
                    }, 1000);
                } else if (error.response?.data?.error) {
                    // Handle both string and object error formats
                    const errorMessage = typeof error.response.data.error === 'string' 
                        ? error.response.data.error 
                        : error.response.data.error.message || 'Failed to load messages';
                    toast.error(errorMessage);
                } else if (error.response?.status >= 400) {
                    // Only show generic error for actual HTTP errors
                    toast.error('Failed to load messages')
                }
            }
        } finally {
            if (!backgroundLoad) {
                dispatch({ type: 'SET_LOADING', payload: false })
            }
            if (!backgroundLoad) {
                dispatch({ type: 'SET_LOADING_MORE', payload: false })
            }
        }
    }, [selectedGroup, hasCachedMessages])

    // Optimized socket event handlers with better debouncing
    const debouncedHandleNewMessage = useCallback(
        debounce((message) => {
            const messageId = message._id.toString();
            
            // Check if we've already processed this message
            if (processedMessageIds.has(messageId)) {
                console.log('🚫 Message already processed, skipping:', messageId);
                return;
            }
            
            // Mark message as processed
            setProcessedMessageIds(prev => {
                const newSet = new Set([...prev, messageId]);
                // Keep only the last 1000 message IDs to prevent memory issues
                if (newSet.size > 1000) {
                    const array = Array.from(newSet);
                    return new Set(array.slice(-1000));
                }
                return newSet;
            });
            
            // Check if this message is already in the messages array to prevent duplicates
            dispatch({
                type: 'SET_MESSAGES', payload: prev => {
                    const messageExists = prev.some(msg =>
                        msg._id === message._id || msg._id.toString() === message._id.toString()
                    );
                    if (messageExists) {
                        console.log('🚫 Duplicate message detected, skipping:', messageId);
                        return prev;
                    }
                    
                    // Add message if it's for the currently selected group OR if it's from the current user
                    const isCurrentUserMessage = message.senderId._id === user.id || message.senderId._id === user._id;
                    const isCurrentGroupMessage = selectedGroup && message.groupId === selectedGroup._id;
                    
                    console.log('🔍 Message filtering details:', {
                        messageId,
                        senderId: message.senderId._id,
                        currentUserId: user.id,
                        messageGroupId: message.groupId,
                        selectedGroupId: selectedGroup?._id,
                        isCurrentUserMessage,
                        isCurrentGroupMessage,
                        shouldAdd: isCurrentGroupMessage || isCurrentUserMessage
                    });
                    
                    if (isCurrentGroupMessage || isCurrentUserMessage) {
                        console.log('✅ Adding new message via socket:', messageId, 'isCurrentUser:', isCurrentUserMessage, 'isCurrentGroup:', isCurrentGroupMessage);
                        
                        // If this is a message from the current user, remove any optimistic messages
                        if (isCurrentUserMessage) {
                            const filteredPrev = prev.filter(msg => !msg.isOptimistic);
                            return [...filteredPrev, message];
                        }
                        
                        return [...prev, message];
                    }
                    
                    console.log('🚫 Message not for current group or user, skipping:', messageId);
                    return prev;
                }
            });

            // Update cache for this group
            dispatch({
                type: 'UPDATE_MESSAGE_CACHE', payload: {
                    groupId: message.groupId,
                    cache: prev => {
                        const groupCache = prev[message.groupId];
                        if (groupCache && groupCache.messages && Array.isArray(groupCache.messages)) {
                            const messageExists = groupCache.messages.some(msg =>
                                msg._id === message._id || msg._id.toString() === message._id.toString()
                            );
                            if (!messageExists) {
                                console.log('✅ Adding message to cache:', message._id);
                                return {
                                    ...groupCache,
                                    messages: [...groupCache.messages, message]
                                };
                            } else {
                                console.log('🚫 Message already in cache, skipping:', message._id);
                            }
                        }
                        return groupCache;
                    }
                }
            });

            // Mark as delivered if not from current user
            if (message.senderId._id !== user.id && message.senderId._id !== user._id) {
                // Use socket instead of HTTP API to avoid rate limiting
                socketService.markAsDelivered(null, message.groupId, [message._id])

                // Play appropriate sound
                if (selectedGroup && message.groupId === selectedGroup._id) {
                    soundManager.playMessageSound();
                } else {
                    soundManager.playNotificationSound();
                }

                // Update unread counts
                dispatch({
                    type: 'UPDATE_UNREAD_COUNT', payload: {
                        groupId: message.groupId,
                        count: (unreadCounts[message.groupId] || 0) + 1
                    }
                })

                // Mark as seen if user is currently viewing this group
                if (selectedGroup && selectedGroup._id === message.groupId) {
                    // Use socket instead of HTTP API to avoid rate limiting
                    socketService.markAsSeen(null, message.groupId, [message._id])
                    // Clear unread count for current group
                    dispatch({
                        type: 'UPDATE_UNREAD_COUNT', payload: {
                            groupId: message.groupId,
                            count: 0
                        }
                    })
                }

                // Show notification for new messages
                if (document.hidden) {
                    showNotification(
                        `New message from ${message.senderId.username}`,
                        message.content || 'Sent a file', // Use 'content' field instead of 'text'
                        '/favicon.ico'
                    )
                }
            }
        }, 100),
        [selectedGroup, user.id, user._id, unreadCounts, processedMessageIds]
    );

    const handleNewMessage = useCallback((message) => {
        console.log('🔔 Socket message received:', {
            messageId: message._id,
            senderId: message.senderId._id,
            currentUserId: user.id,
            groupId: message.groupId,
            selectedGroupId: selectedGroup?._id,
            content: message.content?.substring(0, 50) + '...'
        });
        debouncedHandleNewMessage(message);
    }, [debouncedHandleNewMessage, user.id, selectedGroup?._id])

    const handleMessageEdited = useCallback((editedMessage) => {
        dispatch({
            type: 'SET_MESSAGES', payload: prev =>
                prev.map(msg =>
                    msg._id === editedMessage._id ? editedMessage : msg
                )
        })

        // Update cache for this group
        dispatch({
            type: 'UPDATE_MESSAGE_CACHE', payload: {
                groupId: editedMessage.groupId,
                cache: prev => {
                    const groupCache = prev;
                    if (groupCache && groupCache.messages && Array.isArray(groupCache.messages)) {
                        return {
                            ...groupCache,
                            messages: groupCache.messages.map(msg =>
                                msg._id === editedMessage._id ? editedMessage : msg
                            )
                        };
                    }
                    return groupCache;
                }
            }
        });
    }, [])

    const handleMessageDeleted = ({ messageId, deletedBy }) => {
        dispatch({
            type: 'SET_MESSAGES', payload: prev => {
                const updatedMessages = prev.map(msg => {
                    // Handle both string and ObjectId comparisons
                    const msgId = msg._id.toString();
                    const targetId = messageId.toString();

                    if (msgId === targetId) {
                        return {
                            ...msg,
                            deleted: {
                                isDeleted: true,
                                deletedBy: deletedBy,
                                deletedAt: new Date()
                            }
                        }
                    }
                    return msg
                })
                return updatedMessages
            }
        })

        // Update cache for all groups that might have this message
        dispatch({
            type: 'SET_MESSAGE_CACHE', payload: prev => {
                const updatedCache = { ...prev };
                Object.keys(updatedCache).forEach(groupId => {
                    const groupCache = updatedCache[groupId];
                    if (groupCache && groupCache.messages && Array.isArray(groupCache.messages)) {
                        updatedCache[groupId] = {
                            ...groupCache,
                            messages: groupCache.messages.map(msg => {
                                const msgId = msg._id.toString();
                                const targetId = messageId.toString();

                                if (msgId === targetId) {
                                    return {
                                        ...msg,
                                        deleted: {
                                            isDeleted: true,
                                            deletedBy: deletedBy,
                                            deletedAt: new Date()
                                        }
                                    }
                                }
                                return msg
                            })
                        };
                    }
                });
                return updatedCache;
            }
        });
    }

    const handleMultipleMessagesDeleted = ({ messageIds, deletedBy }) => {
        dispatch({
            type: 'SET_MESSAGES', payload: prev => {
                const updatedMessages = prev.map(msg => {
                    const msgId = msg._id.toString();
                    const isDeleted = messageIds.some(id => id.toString() === msgId);

                    if (isDeleted) {
                        return {
                            ...msg,
                            deleted: {
                                isDeleted: true,
                                deletedBy: deletedBy,
                                deletedAt: new Date()
                            }
                        }
                    }
                    return msg
                })
                return updatedMessages
            }
        })

        // Update cache for all groups that might have these messages
        dispatch({
            type: 'SET_MESSAGE_CACHE', payload: prev => {
                const updatedCache = { ...prev };
                Object.keys(updatedCache).forEach(groupId => {
                    const groupCache = updatedCache[groupId];
                    if (groupCache && groupCache.messages && Array.isArray(groupCache.messages)) {
                        updatedCache[groupId] = {
                            ...groupCache,
                            messages: groupCache.messages.map(msg => {
                                const msgId = msg._id.toString();
                                const isDeleted = messageIds.some(id => id.toString() === msgId);

                                if (isDeleted) {
                                    return {
                                        ...msg,
                                        deleted: {
                                            isDeleted: true,
                                            deletedBy: deletedBy,
                                            deletedAt: new Date()
                                        }
                                    }
                                }
                                return msg
                            })
                        };
                    }
                });
                return updatedCache;
            }
        });
    }

    const handleMessageDelivered = ({ messageId, userId }) => {
        dispatch({
            type: 'SET_MESSAGES', payload: prev =>
                prev.map(msg =>
                    msg._id === messageId
                        ? {
                            ...msg,
                            deliveredTo: [...(msg.deliveredTo || []), userId],
                            status: 'delivered'
                        }
                        : msg
                )
        })
    }

    const handleMessageSeen = ({ messageId, userId }) => {
        dispatch({
            type: 'SET_MESSAGES', payload: prev =>
                prev.map(msg =>
                    msg._id === messageId
                        ? {
                            ...msg,
                            seenBy: [...(msg.seenBy || []), userId],
                            status: 'seen'
                        }
                        : msg
                )
        })
    }


    const handleUserJoined = useCallback(({ userId, username }) => {
        dispatch({ type: 'SET_ONLINE_USERS', payload: new Set([...onlineUsers, userId]) })
        toast.success(`${username} joined the group`)
    }, [onlineUsers])

    const handleUserLeft = useCallback(({ userId, username }) => {
        const newSet = new Set(onlineUsers)
        newSet.delete(userId)
        dispatch({ type: 'SET_ONLINE_USERS', payload: newSet })
        toast.info(`${username} left the group`)
    }, [onlineUsers])

    const handleNewNotification = useCallback((notification) => {
        console.log('🔔 New notification received:', notification);

        // Increment notification count in real-time
        dispatch({ type: 'SET_NOTIFICATION_COUNT', payload: notificationCount + 1 });

        // Show toast notification if not in the same group
        if (notification.groupId !== selectedGroup?._id) {
            toast.success(notification.title || 'New notification');
        }
    }, [notificationCount, selectedGroup?._id])

    // Handle message reactions
    const handleMessageReaction = useCallback(({ messageId, reactions, userId, emoji, action }) => {
        dispatch({
            type: 'SET_MESSAGES', payload: prev =>
                prev.map(msg =>
                    msg._id === messageId ? { ...msg, reactions } : msg
                )
        });

        // Update cache
        dispatch({
            type: 'UPDATE_MESSAGE_CACHE', payload: {
                groupId: selectedGroup?._id,
                cache: prev => ({
                    ...prev,
                    messages: prev.messages?.map(msg =>
                        msg._id === messageId ? { ...msg, reactions } : msg
                    ) || []
                })
            }
        });

        console.log(`🎭 Reaction ${action}: ${emoji} on message ${messageId}`);
    }, [selectedGroup?._id]);

    // Handle bulk message delivery
    const handleBulkMessagesDelivered = useCallback(({ messageIds, userId, timestamp }) => {
        dispatch({
            type: 'SET_MESSAGES', payload: prev =>
                prev.map(msg => {
                    if (messageIds.includes(msg._id)) {
                        const alreadyDelivered = msg.deliveredTo?.some(d => d.user === userId);
                        if (!alreadyDelivered) {
                            return {
                                ...msg,
                                deliveredTo: [...(msg.deliveredTo || []), { user: userId, deliveredAt: timestamp }]
                            };
                        }
                    }
                    return msg;
                })
        });
    }, []);

    // Handle bulk message seen
    const handleBulkMessagesSeen = useCallback(({ messageIds, userId, timestamp }) => {
        dispatch({
            type: 'SET_MESSAGES', payload: prev =>
                prev.map(msg => {
                    if (messageIds.includes(msg._id)) {
                        const alreadySeen = msg.seenBy?.some(s => s.user === userId);
                        if (!alreadySeen) {
                            return {
                                ...msg,
                                seenBy: [...(msg.seenBy || []), { user: userId, seenAt: timestamp }]
                            };
                        }
                    }
                    return msg;
                })
        });
    }, []);

    const handleGroupUpdated = (data) => {
        const { group, action, user } = data

        // Update the groups list with the new group data
        dispatch({ type: 'SET_GROUPS', payload: groups.map(g => g._id === group._id ? group : g) })

        // Update selected group if it's the one being updated
        if (selectedGroup && selectedGroup._id === group._id) {
            dispatch({ type: 'SET_SELECTED_GROUP', payload: group })
        }

        // Show appropriate toast message
        switch (action) {
            case 'user_added':
                toast.success(`${user.username} has been added to ${group.name}`)
                break
            case 'user_removed':
                toast.info(`${user.username} has been removed from ${group.name}`)
                break
            case 'manager_added':
                toast.success(`${user.username} has been promoted to manager in ${group.name}`)
                break
            case 'manager_removed':
                toast.info(`${user.username} is no longer a manager in ${group.name}`)
                break
        }
    }

    const handleGroupJoined = (data) => {
        const { group, message } = data

        // Add the new group to the user's groups list
        const exists = groups.some(g => g._id === group._id)
        if (!exists) {
            dispatch({ type: 'SET_GROUPS', payload: [...groups, group] })
        } else {
            dispatch({ type: 'SET_GROUPS', payload: groups.map(g => g._id === group._id ? group : g) })
        }

        toast.success(message)
    }

    const handleGroupLeft = (data) => {
        const { group, message } = data

        // Remove the group from the user's groups list
        dispatch({ type: 'SET_GROUPS', payload: groups.filter(g => g._id !== group._id) })

        // If the user was viewing this group, clear the selection
        if (selectedGroup && selectedGroup._id === group._id) {
            dispatch({ type: 'SET_SELECTED_GROUP', payload: null })
            dispatch({ type: 'SET_MESSAGES', payload: [] })
            saveSelectedGroup(null)
        }

        toast.info(message)
    }

    const handleRoleUpdated = (data) => {
        const { group, newRole, message } = data

        // Update user's role in the context (if needed)
        // This would typically be handled by the auth context

        toast.success(message)
    }

    const handleEditMessage = async (messageId, newText) => {
        try {
            await messageApi.editMessage(messageId, newText)

            // Clear editing state - the socket event will handle updating the message
            setEditingMessage(null)
            toast.success('Message updated successfully')
        } catch (error) {
            console.error('Edit message error:', error);
            console.error('Error response:', error.response?.data);
            const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to edit message';
            toast.error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
        }
    }

    // Handle message reactions
    const handleReactToMessage = (messageId, emoji) => {
        if (selectedGroup) {
            socketService.reactToMessage(messageId, emoji, selectedGroup._id);
        }
    }

    // Handle reply to message
    const handleReplyToMessage = (message) => {
        setReplyingMessage(message);
        console.log('Reply to message:', message);
    }

    // Handle message deletion via socket
    const handleDeleteMessageSocket = (messageId, reason = 'user') => {
        if (selectedGroup) {
            socketService.deleteMessage(messageId, selectedGroup._id, reason);
        }
    }

    // Handle message editing via socket
    const handleEditMessageSocket = (messageId, content) => {
        if (selectedGroup) {
            socketService.editMessage(messageId, content, selectedGroup._id);
        }
    }

    // Mark messages as delivered
    const handleMarkAsDelivered = (messageIds) => {
        if (selectedGroup) {
            if (Array.isArray(messageIds)) {
                socketService.markAsDelivered(null, selectedGroup._id, messageIds);
            } else {
                socketService.markAsDelivered(messageIds, selectedGroup._id);
            }
        }
    }

    // Mark messages as seen
    const handleMarkAsSeen = (messageIds) => {
        if (selectedGroup) {
            if (Array.isArray(messageIds)) {
                socketService.markAsSeen(null, selectedGroup._id, messageIds);
            } else {
                socketService.markAsSeen(messageIds, selectedGroup._id);
            }
        }
    }

    // Auto-mark messages as delivered when they appear in view
    useEffect(() => {
        if (messages.length > 0 && selectedGroup) {
            const messageIds = messages
                .filter(msg => 
                    !msg.deleted?.isDeleted && 
                    msg.senderId._id !== user._id &&
                    !msg.deliveredTo?.some(d => d.user === user._id || d.user === user.id)
                )
                .map(msg => msg._id);
            
            if (messageIds.length > 0) {
                // Debounce delivery marking to avoid spam
                const timeoutId = setTimeout(() => {
                    handleMarkAsDelivered(messageIds);
                }, 2000); // Increased debounce time
                
                return () => clearTimeout(timeoutId);
            }
        }
    }, [messages.length, selectedGroup?._id, user._id]); // Only depend on length and IDs, not the entire messages array

    // Auto-mark messages as seen when user is actively viewing
    useEffect(() => {
        if (messages.length > 0 && selectedGroup && !document.hidden) {
            const messageIds = messages
                .filter(msg => 
                    !msg.deleted?.isDeleted && 
                    msg.senderId._id !== user._id &&
                    !msg.seenBy?.some(s => s.user === user._id || s.user === user.id)
                )
                .map(msg => msg._id);
            
            if (messageIds.length > 0) {
                // Debounce seen marking to avoid spam
                const timeoutId = setTimeout(() => {
                    handleMarkAsSeen(messageIds);
                }, 3000); // Increased debounce time for seen
                
                return () => clearTimeout(timeoutId);
            }
        }
    }, [messages.length, selectedGroup?._id, user._id, document.hidden]); // Only depend on length and IDs, not the entire messages array

    const handleDeleteMessage = async (messageId) => {
        if (window.confirm('Are you sure you want to delete this message?')) {
            try {
                await messageApi.deleteMessage(messageId)
                toast.success('Message deleted successfully')
            } catch (error) {
                toast.error('Failed to delete message')
            }
        }
    }

    const handleDeleteMultipleMessages = async (messageIds) => {
        if (window.confirm(`Are you sure you want to delete ${messageIds.length} messages?`)) {
            try {
                const response = await messageApi.deleteMultipleMessages(messageIds)
                toast.success(response.message || `${messageIds.length} messages deleted successfully`)
                
                // Update the messages state to reflect the deletions
                dispatch({
                    type: 'SET_MESSAGES', 
                    payload: prev => prev.filter(msg => !messageIds.includes(msg._id))
                })
            } catch (error) {
                console.error('Multi-delete error:', error);
                const errorMessage = error.response?.data?.error?.message || 
                                   error.response?.data?.message || 
                                   'Failed to delete messages';
                toast.error(errorMessage);
            }
        }
    }


    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission()
            setNotificationPermission(permission)
            return permission === 'granted'
        }
        return false
    }

    const showNotification = (title, body, icon) => {
        if (notificationPermission === 'granted') {
            new Notification(title, { body, icon })
        }
    }

    // Custom group selection handler that saves to localStorage and uses caching
    const handleGroupSelect = async (group) => {
        if (selectedGroup?._id === group._id) return // Don't switch if already selected
        
        // Clear previous privacy information
        setMessagePrivacy(null)
        
        // Validate that the group is in the user's groups list
        const userGroup = groups.find(g => g._id === group._id);
        if (!userGroup) {
            toast.error('You are not a member of this group');
            return;
        }

        // Save current messages to cache before switching
        if (selectedGroup && messages.length > 0) {
            dispatch({
                type: 'UPDATE_MESSAGE_CACHE', payload: {
                    groupId: selectedGroup._id,
                    cache: {
                        messages: messages,
                        currentPage: currentPage,
                        hasMoreMessages: hasMoreMessages,
                        lastAccessed: Date.now()
                    }
                }
            })
        }

        // Check if we have cached messages for this group
        const cachedData = messageCache[group._id]
        if (cachedData) {
            // Use cached messages for instant display - NO loading states
            dispatch({ type: 'SET_MESSAGES', payload: cachedData.messages })
            dispatch({ type: 'SET_CURRENT_PAGE', payload: cachedData.currentPage })
            dispatch({ type: 'SET_HAS_MORE_MESSAGES', payload: cachedData.hasMoreMessages })
            dispatch({ type: 'SET_LOADING', payload: false })
            dispatch({ type: 'SET_LOADING_MORE', payload: false })

            // Update selected group immediately
            dispatch({ type: 'SET_SELECTED_GROUP', payload: group })
            saveSelectedGroup(group)

            // Close sidebar on mobile
            setIsSidebarOpen(false)

            // Load latest messages in background silently
            loadMessages(group._id, 1, true, true) // true for background load
        } else {
            // No cache - switch group immediately and load messages without showing loading
            dispatch({ type: 'SET_SELECTED_GROUP', payload: group })
            saveSelectedGroup(group)
            setIsSidebarOpen(false)

            // Load messages in background without showing loading state
            loadMessages(group._id, 1, true, true) // true for background load
        }
    }

    // Handle logout and clear selected group
    const handleLogout = () => {
        // Clear all state and cache on logout
        dispatch({ type: 'RESET_STATE' })
        saveSelectedGroup(null) // Clear from localStorage
        logout()
    }

    const handleSendMessage = async (messageData, callback) => {
        console.log('📤 Sending message:', messageData);

        // Validate message data before processing
        const hasValidContent = messageData.content && messageData.content.trim().length > 0;
        const hasFile = messageData.file && messageData.file.url;
        
        if (!hasValidContent && !hasFile) {
            console.warn('Cannot send empty message');
            if (callback) {
                callback({ error: 'Message content is required' });
            }
            return;
        }

        // Check if socket is connected before sending
        if (!socketService.isConnected()) {
            console.log('⚠️ Socket not connected, attempting reconnection...');
            // Try to reconnect with current token
            if (token) {
                socketService.connect(token);
                // Wait a moment for connection
                setTimeout(() => {
                    if (socketService.isConnected()) {
                        console.log('✅ Socket reconnected, sending message via socket');
                        socketService.sendMessage(messageData, (response) => {
                            console.log('📨 Socket message response:', response);
                            if (response && response.error && (response.error.includes('Socket not connected') || response.error.includes('reconnection failed'))) {
                                console.log('❌ Socket still failed, trying API fallback');
                                // Socket still failed, try HTTP API fallback
                                sendMessageViaAPI(messageData).then(apiResponse => {
                                    if (callback) {
                                        callback(apiResponse);
                                    }
                                });
                            } else {
                                if (callback) {
                                    callback(response);
                                }
                            }
                        });
                    } else {
                        console.log('❌ Socket reconnection failed, using API fallback');
                        // Try HTTP API fallback
                        sendMessageViaAPI(messageData).then(apiResponse => {
                            if (callback) {
                                callback(apiResponse);
                            }
                        });
                    }
                }, 1000); // Increased timeout for better reliability
            } else {
                console.log('❌ No token available, using API fallback');
                // Try HTTP API fallback
                const apiResponse = await sendMessageViaAPI(messageData);
                if (callback) {
                    callback(apiResponse);
                }
            }
        } else {
            console.log('✅ Socket connected, sending message via socket');
            
            // Add message optimistically to UI for better UX
            const optimisticMessage = {
                _id: `temp_${Date.now()}_${Math.random()}`,
                content: messageData.content,
                senderId: { _id: user.id, username: user.username },
                groupId: messageData.groupId,
                createdAt: new Date(),
                messageType: messageData.messageType || 'text',
                file: messageData.file,
                replyTo: messageData.replyTo,
                isOptimistic: true
            };
            
            // Add optimistic message to UI
            dispatch({ type: 'SET_MESSAGES', payload: prev => [...prev, optimisticMessage] });
            
            // Use socket for real-time messaging
            socketService.sendMessage(messageData, (response) => {
                console.log('📨 Socket message response:', response);
                if (response && response.error && (response.error.includes('Socket not connected') || response.error.includes('reconnection failed'))) {
                    console.log('❌ Socket failed during send, trying API fallback');
                    // Remove optimistic message and try HTTP API fallback
                    dispatch({ type: 'SET_MESSAGES', payload: prev => prev.filter(msg => msg._id !== optimisticMessage._id) });
                    sendMessageViaAPI(messageData).then(apiResponse => {
                        if (callback) {
                            callback(apiResponse);
                        }
                    });
                } else {
                    // Remove optimistic message as real message will be added via socket
                    dispatch({ type: 'SET_MESSAGES', payload: prev => prev.filter(msg => msg._id !== optimisticMessage._id) });
                    if (callback) {
                        callback(response);
                    }
                }
            });
        }
    }

    // Fallback method to send message via HTTP API when socket fails
    const sendMessageViaAPI = async (messageData) => {
        try {
            // Validate message data before sending
            const hasValidContent = messageData.content && messageData.content.trim().length > 0;
            const hasFile = messageData.file && messageData.file.url;
            
            if (!hasValidContent && !hasFile) {
                console.warn('Cannot send empty message via API');
                return { error: 'Message content is required' };
            }
            
            const response = await messageApi.sendMessage(messageData);
            return { ok: true, data: response };
        } catch (error) {
            return { error: error.response?.data?.error || 'Failed to send message via API' };
        }
    }


    const handleNotificationClick = (notification) => {
        if (notification.groupId) {
            const group = groups.find(g => g._id === notification.groupId)
            if (group) {
                dispatch({ type: 'SET_SELECTED_GROUP', payload: group })
                saveSelectedGroup(group)
            }
        }
    }

    const loadNotificationCount = async () => {
        try {
            const response = await notificationApi.getNotifications()
            const count = response.notifications?.length || 0
            dispatch({ type: 'SET_NOTIFICATION_COUNT', payload: count })
            return count
        } catch (error) {
            dispatch({ type: 'SET_NOTIFICATION_COUNT', payload: 0 })
            return 0
        }
    }

    const handleNotificationPanelOpen = () => {
        setShowNotificationPanel(true)
        loadNotificationCount()
    }

    const handleNotificationCountChange = (newCount) => {
        dispatch({ type: 'SET_NOTIFICATION_COUNT', payload: newCount })
    }

    // Handle sidebar toggle for mobile
    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen)
    }

    // Close sidebar when clicking outside on mobile
    const handleOverlayClick = () => {
        setIsSidebarOpen(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 mx-auto mb-4"></div>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">Loading Dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <ErrorBoundary>
            <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 overflow-hidden relative transition-colors duration-300">
                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
                        onClick={handleOverlayClick}
                    />
                )}

                {/* Enhanced Sidebar */}
                <div className={`
                fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
                transform transition-all duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                w-72 sm:w-80 lg:w-80 xl:w-96
                shadow-xl lg:shadow-none
            `}>
                    <Suspense fallback={
                        <div className="w-full bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    }>
                        <Sidebar
                            user={user}
                            groups={groups}
                            selectedGroup={selectedGroup}
                            onlineUsers={onlineUsers}
                            unreadCounts={unreadCounts}
                            totalUnreadCount={totalUnreadCount}
                            notificationCount={notificationCount}
                            onGroupSelect={handleGroupSelect}
                            onLogout={handleLogout}
                            onNotificationClick={handleNotificationPanelOpen}
                            onClose={() => setIsSidebarOpen(false)}
                        />
                    </Suspense>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-h-0 lg:ml-0">
                    {/* Mobile Header */}
                    <div className="lg:hidden bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 px-3 sm:px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-lg">
                        <button
                            onClick={toggleSidebar}
                            className="p-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 active:from-blue-100 dark:active:from-blue-900/30 transition-all duration-200 flex-shrink-0 touch-manipulation group shadow-sm"
                            aria-label="Toggle sidebar"
                        >
                            {isSidebarOpen ? (
                                <X className="h-5 w-5 sm:h-6 sm:w-6 text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                            ) : (
                                <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                            )}
                        </button>

                        <div className="flex-1 text-center px-2 min-w-0">
                            <h1 className="text-sm sm:text-base md:text-lg font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {selectedGroup ? selectedGroup.name : 'Ramavan Chat'}
                            </h1>
                            {selectedGroup && (
                                <div className="flex items-center justify-center space-x-1 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="hidden xs:inline truncate">{selectedGroup.region}</span>
                                    <span className="hidden xs:inline">•</span>
                                    <span className="flex items-center space-x-1">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                        <span>{selectedGroup.users?.length || 0} members</span>
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                            {/* Connection Status Indicator */}
                            <div className="hidden sm:flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700">
                                {socketStatus === 'connected' ? (
                                    <Wifi className="h-3 w-3 text-emerald-500" />
                                ) : socketStatus === 'connecting' ? (
                                    <div className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <WifiOff className="h-3 w-3 text-red-500" />
                                )}
                            </div>

                            {/* Mobile Notification Button */}
                            <button
                                onClick={handleNotificationPanelOpen}
                                className="relative p-2.5 text-slate-500 hover:text-blue-600 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 group touch-manipulation shadow-sm"
                                aria-label="Notifications"
                            >
                                <Bell className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                                {notificationCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] sm:text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-bold min-w-[16px] sm:min-w-[20px] animate-pulse shadow-lg">
                                        {notificationCount > 99 ? '99+' : notificationCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                    {selectedGroup ? (
                        <div className="flex-1 flex flex-col min-h-0">
                            <Suspense fallback={
                                <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-900">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                                </div>
                            }>
                                <ChatWindow
                                    group={selectedGroup}
                                    messages={messages}
                                    currentUser={user}
                                    editingMessage={editingMessage}
                                    replyingMessage={replyingMessage}
                                    onSendMessage={handleSendMessage}
                                    onEditMessage={handleEditMessage}
                                    onDeleteMessage={handleDeleteMessage}
                                    onDeleteMultipleMessages={handleDeleteMultipleMessages}
                                    onSetEditingMessage={setEditingMessage}
                                    onSetReplyingMessage={setReplyingMessage}
                                    onLoadMore={loadMoreMessages}
                                    loading={loading}
                                    loadingMore={loadingMore}
                                    hasMoreMessages={hasMoreMessages}
                                    socketService={socketService}
                                    availableGroups={groups}
                                    onReactToMessage={handleReactToMessage}
                                    onReplyToMessage={handleReplyToMessage}
                                    messagePrivacy={messagePrivacy}
                                    onDeleteMessageSocket={handleDeleteMessageSocket}
                                    onEditMessageSocket={handleEditMessageSocket}
                                    onMarkAsDelivered={handleMarkAsDelivered}
                                    onMarkAsSeen={handleMarkAsSeen}
                                />
                            </Suspense>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 min-h-0 p-3 sm:p-4 md:p-6">
                            <div className="text-center max-w-sm sm:max-w-md md:max-w-lg w-full">
                                <div className="text-3xl sm:text-4xl md:text-6xl mb-4 sm:mb-6 animate-bounce">💬</div>
                                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-3 sm:mb-4">
                                    Welcome to Ramavan Dashboard
                                </h2>

                                {/* Enhanced Socket Status Indicator */}
                                <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">Connection Status:</span>
                                        <div className="flex items-center space-x-2">
                                            {socketStatus === 'connected' ? (
                                                <Wifi className="h-4 w-4 text-emerald-500" />
                                            ) : socketStatus === 'connecting' ? (
                                                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                            ) : socketStatus === 'error' ? (
                                                <AlertCircle className="h-4 w-4 text-red-500" />
                                            ) : (
                                                <WifiOff className="h-4 w-4 text-slate-400" />
                                            )}
                                            <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 capitalize font-medium">{socketStatus}</span>
                                        </div>
                                    </div>
                                    {socketStatus === 'connected' && (
                                        <div className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></div>
                                            Real-time messaging available
                                        </div>
                                    )}
                                    {socketStatus === 'disconnected' && (
                                        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-slate-400 rounded-full mr-2"></div>
                                            Messages will be sent via API fallback
                                        </div>
                                    )}
                                    {socketStatus === 'error' && (
                                        <div className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium flex items-center justify-center">
                                            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                            Connection failed - using API fallback
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-4 sm:mb-6 leading-relaxed px-2">
                                    {groups.length === 0
                                        ? "You are not a member of any groups yet. Contact an admin to join groups."
                                        : (
                                            <>
                                                <span className="lg:hidden">Tap the menu button above to see your groups</span>
                                                <span className="hidden lg:inline">Select a group from the sidebar to start chatting</span>
                                            </>
                                        )
                                    }
                                </p>

                                {/* Enhanced Mobile instruction for groups */}
                                {groups.length > 0 && (
                                    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-3 sm:p-4 md:p-5 text-left shadow-lg backdrop-blur-sm">
                                        <h3 className="text-sm sm:text-base font-semibold text-blue-900 dark:text-blue-300 mb-3 sm:mb-4 flex items-center">
                                            <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mr-2 animate-pulse"></div>
                                            How to use groups:
                                        </h3>
                                        <ul className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 space-y-2 sm:space-y-3">
                                            <li className="flex items-start">
                                                <span className="text-blue-500 mr-2 mt-0.5 flex-shrink-0">•</span>
                                                <span className="lg:hidden">Tap the menu button to see groups</span>
                                                <span className="hidden lg:inline">Click on any group from the sidebar to start chatting</span>
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-blue-500 mr-2 mt-0.5 flex-shrink-0">•</span>
                                                <span>You can see all groups you are a member of</span>
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-blue-500 mr-2 mt-0.5 flex-shrink-0">•</span>
                                                <span>Contact an admin to join additional groups</span>
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-blue-500 mr-2 mt-0.5 flex-shrink-0">•</span>
                                                <span>Managers have additional permissions in groups</span>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Notification Panel */}
                <Suspense fallback={null}>
                    <NotificationPanel
                        isOpen={showNotificationPanel}
                        onClose={() => setShowNotificationPanel(false)}
                        onNotificationClick={handleNotificationClick}
                        onNotificationCountChange={handleNotificationCountChange}
                    />
                </Suspense>

            </div>
        </ErrorBoundary>
    )
})

Dashboard.displayName = 'Dashboard'

export default Dashboard