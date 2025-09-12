import { io } from 'socket.io-client';
import envConfig from '../config/environment';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.recentEvents = new Map(); // Track recent events to prevent duplicates
    this.joinedGroups = new Set(); // Track which groups we've joined
  }

  connect(token) {
    // Validate token before attempting connection
    if (!token) {
      console.error('No token provided for socket connection');
      return null;
    }

    // Check if token is valid before attempting connection
    if (!this.hasValidToken()) {
      console.error('Invalid or expired token, cannot connect socket');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return null;
    }

    // If already connected with the same token, return existing socket
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected, reusing connection');
      return this.socket;
    }

    // Disconnect existing socket if it exists but is not connected
    if (this.socket && !this.socket.connected) {
      console.log('Disconnecting existing socket before reconnecting...');
      this.socket.disconnect();
      this.socket = null;
    }

    const SOCKET_URL = envConfig.getSocketUrl();
    console.log('Attempting to connect to:', SOCKET_URL);
    console.log('Using token:', token ? 'Present' : 'Missing');
    
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'], // Enable WebSocket with polling fallback
      timeout: envConfig.get('SOCKET_TIMEOUT', 20000),
      forceNew: true, // Force new connection
      reconnection: true, // Enable reconnection for production
      reconnectionAttempts: envConfig.get('SOCKET_RECONNECTION_ATTEMPTS', 5),
      reconnectionDelay: envConfig.get('SOCKET_RECONNECTION_DELAY', 2000),
      reconnectionDelayMax: envConfig.get('SOCKET_RECONNECTION_DELAY_MAX', 10000),
      maxReconnectionAttempts: envConfig.get('SOCKET_RECONNECTION_ATTEMPTS', 5),
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('Connected to server with ID:', this.socket.id);
      console.log('Socket transport:', this.socket.io.engine.transport.name);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server. Reason:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected the client, need to reconnect manually
        console.log('Server disconnected client, attempting to reconnect...');
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      console.log('Socket event received: connect_error', error);
      
      // Handle authentication errors specifically
      if (error.message === 'unauth') {
        console.error('Socket authentication failed - token may be invalid or expired');
        // Clear invalid token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnection attempt:', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
      console.log('Failed to reconnect socket');
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      console.log('Failed to reconnect socket');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    // Clear recent events and joined groups when disconnecting
    this.recentEvents.clear();
    this.joinedGroups.clear();
  }

  // Check if an event is a duplicate (same event with same data within 1 second)
  isDuplicateEvent(event, data) {
    const eventKey = `${event}_${JSON.stringify(data)}`;
    const now = Date.now();
    
    if (this.recentEvents.has(eventKey)) {
      const lastTime = this.recentEvents.get(eventKey);
      if (now - lastTime < 1000) { // 1 second window
        return true;
      }
    }
    
    this.recentEvents.set(eventKey, now);
    
    // Clean up old events (older than 5 seconds)
    for (const [key, time] of this.recentEvents.entries()) {
      if (now - time > 5000) {
        this.recentEvents.delete(key);
      }
    }
    
    return false;
  }

  on(event, callback) {
    if (this.socket) {
      // Check if this callback is already registered for this event
      if (this.listeners.has(event)) {
        const existingListeners = this.listeners.get(event);
        const alreadyExists = existingListeners.some(l => l.callback === callback);
        if (alreadyExists) {
          console.warn(`Listener already exists for event: ${event}`);
          return;
        }
      }
      
      // Create a wrapper function that we can track
      const wrapper = (data) => {
        // Check for duplicate events
        if (this.isDuplicateEvent(event, data)) {
          console.log(`Duplicate event detected, skipping: ${event}`, data);
          return;
        }
        
        console.log(`Socket event received: ${event}`, data);
        callback(data);
      };
      
      this.socket.on(event, wrapper);
      
      // Store the wrapper for cleanup
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push({ callback, wrapper });
    } else {
      console.warn(`Socket not connected when trying to listen to ${event}`);
    }
  }

  off(event, callback) {
    if (this.socket && this.listeners.has(event)) {
      const eventListeners = this.listeners.get(event);
      const listenerIndex = eventListeners.findIndex(l => l.callback === callback);
      
      if (listenerIndex !== -1) {
        const { wrapper } = eventListeners[listenerIndex];
        this.socket.off(event, wrapper);
        eventListeners.splice(listenerIndex, 1);
        
        if (eventListeners.length === 0) {
          this.listeners.delete(event);
        }
      }
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.listeners.clear();
    }
    // Clear recent events and joined groups when removing all listeners
    this.recentEvents.clear();
    this.joinedGroups.clear();
  }

  emit(event, data, callback) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data, callback);
    } else {
      console.warn(`Socket not connected when trying to emit ${event}. Socket exists: ${!!this.socket}, Connected: ${this.socket?.connected}`);
      
      // If socket exists but not connected, try to reconnect with fresh token
      if (this.socket && !this.socket.connected) {
        console.log('Attempting to reconnect socket...');
        const token = localStorage.getItem('token');
        if (token) {
          this.connect(token);
          
          // Wait a bit and try again
          setTimeout(() => {
            if (this.socket && this.socket.connected) {
              console.log('Socket reconnected, retrying emit...');
              this.socket.emit(event, data, callback);
            } else {
              console.error('Failed to reconnect socket');
              if (callback) {
                callback({ error: 'Socket not connected and reconnection failed' });
              }
            }
          }, 1000);
        } else {
          console.error('No authentication token available for reconnection');
          if (callback) {
            callback({ error: 'No authentication token available' });
          }
        }
      } else if (!this.socket) {
        // No socket exists, try to create a new connection
        console.log('No socket exists, attempting to create new connection...');
        const token = localStorage.getItem('token');
        if (token) {
          this.connect(token);
          setTimeout(() => {
            if (this.socket && this.socket.connected) {
              console.log('New socket connected, retrying emit...');
              this.socket.emit(event, data, callback);
            } else {
              console.error('Failed to create new socket connection');
              if (callback) {
                callback({ error: 'Failed to establish socket connection' });
              }
            }
          }, 2000);
        } else {
          console.error('No authentication token available');
          if (callback) {
            callback({ error: 'No authentication token available' });
          }
        }
      } else {
        if (callback) {
          callback({ error: 'Socket not connected' });
        }
      }
    }
  }

  // Message-related methods
  sendMessage(messageData, callback) {
    this.emit('message:send', messageData, callback);
  }

  startTyping(groupId) {
    console.log('Socket: Emitting typing:start for group:', groupId);
    this.emit('typing:start', { groupId });
  }

  stopTyping(groupId) {
    console.log('Socket: Emitting typing:stop for group:', groupId);
    this.emit('typing:stop', { groupId });
  }

  joinGroup(groupId) {
    if (this.joinedGroups.has(groupId)) {
      console.log('Already joined group:', groupId);
      return;
    }
    
    console.log('Joining group via socket:', groupId);
    this.emit('group:join', { groupId });
    this.joinedGroups.add(groupId);
  }

  leaveGroup(groupId) {
    console.log('Leaving group via socket:', groupId);
    this.emit('group:leave', { groupId });
    this.joinedGroups.delete(groupId);
  }

  // Notification methods
  onNotification(callback) {
    this.on('notification:new', callback);
  }

  // Online status methods
  onUserOnline(callback) {
    this.on('user:online', callback);
  }

  onUserOffline(callback) {
    this.on('user:offline', callback);
  }

  // Remove online status listeners
  offUserOnline(callback) {
    this.off('user:online', callback);
  }

  offUserOffline(callback) {
    this.off('user:offline', callback);
  }

  // Global status change listener
  onUserStatusChanged(callback) {
    this.on('user:status:changed', callback);
  }

  offUserStatusChanged(callback) {
    this.off('user:status:changed', callback);
  }

  // Typing indicator methods
  onTypingStart(callback) {
    this.on('typing:start', callback);
  }

  onTypingStop(callback) {
    this.on('typing:stop', callback);
  }

  offTypingStart(callback) {
    this.off('typing:start', callback);
  }

  offTypingStop(callback) {
    this.off('typing:stop', callback);
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }

  // Check connection status
  isConnected() {
    return this.socket && this.socket.connected;
  }

  // Get connection status info
  getConnectionStatus() {
    return {
      socketExists: !!this.socket,
      connected: this.socket?.connected || false,
      socketId: this.socket?.id || null,
      transport: this.socket?.io?.engine?.transport?.name || null
    };
  }

  // Manual reconnect with fresh token
  reconnect() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token available for reconnection');
      return false;
    }
    
    console.log('Manually reconnecting socket with fresh token...');
    this.disconnect();
    return this.connect(token);
  }

  // Check if token exists and is not expired (basic check)
  hasValidToken() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      // Basic JWT structure check - decode without verification
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // Check if token is expired
      if (payload.exp && payload.exp < now) {
        console.log('Token is expired');
        return false;
      }
      
      return true;
    } catch (e) {
      console.log('Invalid token format');
      return false;
    }
  }
}

const socketService = new SocketService();
export default socketService;