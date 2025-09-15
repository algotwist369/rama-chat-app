#!/usr/bin/env node

/**
 * Simple socket connection test script
 * This script tests the socket connection and basic message flow
 */

const { io } = require('socket.io-client');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:9080';
const TEST_TOKEN = process.env.TEST_TOKEN || 'your-test-token-here';

console.log('🧪 Testing Socket Connection...');
console.log('Backend URL:', BACKEND_URL);

// Create socket connection
const socket = io(BACKEND_URL, {
  auth: { token: TEST_TOKEN },
  transports: ['websocket', 'polling'],
  timeout: 10000,
  forceNew: true
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Socket connected successfully!');
  console.log('Socket ID:', socket.id);
  
  // Test joining a group (replace with actual group ID)
  const testGroupId = '507f1f77bcf86cd799439011'; // Example ObjectId
  socket.emit('group:join', { groupId: testGroupId });
  console.log('📝 Attempted to join test group:', testGroupId);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Socket disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

// Message events
socket.on('message:new', (message) => {
  console.log('📨 New message received:', {
    id: message._id,
    content: message.content,
    sender: message.senderId?.username,
    group: message.groupId?.name
  });
});

socket.on('typing:start', (data) => {
  console.log('⌨️ User started typing:', data.username);
});

socket.on('typing:stop', (data) => {
  console.log('⌨️ User stopped typing:', data.username);
});

// Test sending a message
setTimeout(() => {
  if (socket.connected) {
    console.log('📤 Testing message send...');
    const testMessage = {
      content: 'Test message from socket test script',
      groupId: '507f1f77bcf86cd799439011', // Replace with actual group ID
      messageType: 'text'
    };
    
    socket.emit('message:send', testMessage, (response) => {
      console.log('📨 Message send response:', response);
    });
  } else {
    console.log('❌ Socket not connected, cannot test message send');
  }
}, 2000);

// Test typing indicators
setTimeout(() => {
  if (socket.connected) {
    console.log('⌨️ Testing typing indicators...');
    const testGroupId = '507f1f77bcf86cd799439011'; // Replace with actual group ID
    
    socket.emit('typing:start', { groupId: testGroupId });
    
    setTimeout(() => {
      socket.emit('typing:stop', { groupId: testGroupId });
    }, 2000);
  }
}, 4000);

// Cleanup after 10 seconds
setTimeout(() => {
  console.log('🧹 Cleaning up...');
  socket.disconnect();
  process.exit(0);
}, 10000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  socket.disconnect();
  process.exit(0);
});

console.log('⏱️ Test will run for 10 seconds...');
console.log('💡 Make sure to set TEST_TOKEN environment variable with a valid JWT token');
console.log('💡 Update the testGroupId in the script to match an actual group ID');
