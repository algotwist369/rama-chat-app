import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.eventListeners = new Map();
    this.recentEvents = new Map();
  }

  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:9080';
    
    console.log('Connecting to socket server:', backendUrl);
    
    this.socket = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.connected = true;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      this.connected = false;
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Event handling
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);

    if (this.socket) {
      this.socket.on(event, (data) => {
        // Prevent duplicate events
        if (this.isDuplicateEvent(event, data)) {
          console.log(`🔄 Duplicate event prevented: ${event}`, data);
          return;
        }
        
        console.log(`📡 Socket event received: ${event}`, data);
        callback(data);
      });
    }
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data, callback) {
    if (this.socket?.connected) {
      console.log(`📤 Socket event emitted: ${event}`, data);
      this.socket.emit(event, data, callback);
    } else {
      console.log(`❌ Socket not connected, cannot emit: ${event}`, data);
      if (callback) {
        callback({ error: 'Socket not connected' });
      }
    }
  }

  // Duplicate event prevention
  isDuplicateEvent(event, data) {
    const now = Date.now();
    const key = `${event}_${JSON.stringify(data)}`;
    const lastTime = this.recentEvents.get(key);

    if (lastTime && now - lastTime < 500) {
      return true;
    }

    this.recentEvents.set(key, now);

    // Clean up old events
    for (const [eventKey, time] of this.recentEvents.entries()) {
      if (now - time > 3000) {
        this.recentEvents.delete(eventKey);
      }
    }

    return false;
  }

  // Message methods
  sendMessage(messageData, callback) {
    this.emit('message:send', messageData, callback);
  }

  editMessage(messageId, content, groupId) {
    this.emit('message:edit', { messageId, content, groupId });
  }

  deleteMessage(messageId) {
    this.emit('message:delete', { messageId });
  }

  // Group methods
  joinGroup(groupId) {
    console.log('Socket: Joining group:', groupId);
    this.emit('group:join', { groupId });
  }

  leaveGroup(groupId) {
    console.log('Socket: Leaving group:', groupId);
    this.emit('group:leave', { groupId });
  }

  // Typing indicators
  startTyping(groupId) {
    this.emit('typing:start', { groupId });
  }

  stopTyping(groupId) {
    this.emit('typing:stop', { groupId });
  }

  // Message seen status
  markMessageSeen(messageId, groupId) {
    this.emit('message:seen', { messageId, groupId });
  }

  markMessagesSeen(messageIds, groupId) {
    this.emit('message:seen', { messageIds, groupId });
  }

  markMessageDelivered(messageId, groupId) {
    this.emit('message:delivered', { messageId, groupId });
  }

  markMessagesDelivered(messageIds, groupId) {
    this.emit('message:delivered', { messageIds, groupId });
  }

  // Utility methods
  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.connected && this.socket?.connected;
  }

  getConnectionStatus() {
    return {
      connected: this.connected,
      socketId: this.socket?.id,
      transport: this.socket?.io?.engine?.transport?.name
    };
  }

  reconnect() {
    const token = localStorage.getItem('token');
    if (token) {
      this.disconnect();
      setTimeout(() => {
        this.connect(token);
      }, 1000);
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;