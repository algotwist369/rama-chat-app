import { io } from 'socket.io-client';
import envConfig from '../config/environment';

class AdminSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.recentEvents = new Map(); // Track recent events to prevent duplicates
    this.isAdmin = true; // Flag to identify this as admin socket
  }

  connect(token) {
    // Validate token before attempting connection
    if (!token) {
      console.error('No token provided for admin socket connection');
      return null;
    }

    // Check if token is valid before attempting connection
    if (!this.hasValidToken()) {
      console.error('Invalid or expired token, cannot connect admin socket');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return null;
    }

    // If already connected with the same token, return existing socket
    if (this.socket && this.socket.connected) {
      console.log('Admin socket already connected, reusing connection');
      return this.socket;
    }

    // Disconnect existing socket if it exists but is not connected
    if (this.socket && !this.socket.connected) {
      console.log('Disconnecting existing admin socket before reconnecting...');
      this.socket.disconnect();
      this.socket = null;
    }

    const SOCKET_URL = envConfig.getSocketUrl();
    console.log('Attempting to connect admin socket to:', SOCKET_URL);
    console.log('Using admin token:', token ? 'Present' : 'Missing');
    
    this.socket = io(SOCKET_URL, {
      auth: { token, isAdmin: true }, // Add admin flag
      transports: ['polling', 'websocket'],
      timeout: envConfig.get('SOCKET_TIMEOUT', 20000),
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: envConfig.get('SOCKET_RECONNECTION_ATTEMPTS', 10),
      reconnectionDelay: envConfig.get('SOCKET_RECONNECTION_DELAY', 1000),
      reconnectionDelayMax: envConfig.get('SOCKET_RECONNECTION_DELAY_MAX', 5000),
      maxReconnectionAttempts: envConfig.get('SOCKET_RECONNECTION_ATTEMPTS', 10),
      autoConnect: true,
      upgrade: true,
      rememberUpgrade: false,
      randomizationFactor: 0.5,
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.socket.on('connect', () => {
      console.log('Admin socket connected to server with ID:', this.socket.id);
      console.log('Admin socket transport:', this.socket.io.engine.transport.name);
      // Join admin room immediately
      this.socket.emit('join:admin');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Admin socket disconnected from server. Reason:', reason);
      if (reason === 'io server disconnect') {
        console.log('Server disconnected admin client, attempting to reconnect...');
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Admin socket connection error:', error);
      console.log('Admin socket event received: connect_error', error);
      
      // Handle authentication errors specifically
      if (error.message === 'unauth' || error.message === 'Authentication error') {
        console.error('Admin socket authentication failed - token may be invalid or expired');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else if (error.message === 'Transport unknown' || error.message.includes('websocket error')) {
        console.log('Admin socket transport error, will retry with different transport');
        if (this.socket.io.engine.transport.name === 'websocket') {
          console.log('Admin WebSocket failed, forcing fallback to polling');
          this.socket.io.engine.upgrade = false;
        }
      } else {
        console.log('Admin socket connection error, will retry automatically');
      }
    });

    this.socket.on('error', (error) => {
      console.error('Admin socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      console.log('Disconnecting admin socket...');
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.recentEvents.clear();
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }

  on(event, callback) {
    if (this.socket) {
      // Check if this callback is already registered for this event
      if (this.listeners.has(event)) {
        const existingListeners = this.listeners.get(event);
        const alreadyExists = existingListeners.some(l => l.callback === callback);
        if (alreadyExists) {
          console.warn(`Admin socket listener already exists for event: ${event}`);
          return;
        }
      }
      
      // Create a wrapper function that we can track
      const wrapper = (data) => {
        // Check for duplicate events
        if (this.isDuplicateEvent(event, data)) {
          console.log(`Admin socket duplicate event detected, skipping: ${event}`, data);
          return;
        }
        
        console.log(`Admin socket event received: ${event}`, data);
        callback(data);
      };
      
      this.socket.on(event, wrapper);
      
      // Store the wrapper for cleanup
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push({ callback, wrapper });
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

  emit(event, data, callback) {
    if (this.socket && this.socket.connected) {
      console.log(`Admin socket emitting event: ${event}`, data);
      this.socket.emit(event, data, callback);
    } else {
      console.warn(`Admin socket not connected, cannot emit event: ${event}`);
      if (callback) {
        callback({ error: 'Admin socket not connected' });
      }
    }
  }

  removeAllListeners() {
    if (this.socket) {
      // Remove all listeners from the socket
      this.socket.removeAllListeners();
    }
    // Clear our tracking
    this.listeners.clear();
    this.recentEvents.clear();
  }

  // Admin-specific methods
  joinAdminRoom() {
    this.emit('join:admin');
  }

  leaveAdminRoom() {
    this.emit('leave:admin');
  }

  // Track recent events to prevent duplicates
  isDuplicateEvent(event, data) {
    const now = Date.now();
    const eventKey = `${event}_${JSON.stringify(data)}`;
    
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

  hasValidToken() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < now) {
        console.log('Admin token is expired');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error validating admin token:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new AdminSocketService();
