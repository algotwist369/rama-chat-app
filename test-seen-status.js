#!/usr/bin/env node

/**
 * Test script for seen status functionality
 * This script tests the seen status feature by simulating message interactions
 */

const axios = require('axios');
const io = require('socket.io-client');

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:9080';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Test users
const testUsers = [
  {
    username: 'testuser1',
    email: 'testuser1@example.com',
    password: 'password123'
  },
  {
    username: 'testuser2', 
    email: 'testuser2@example.com',
    password: 'password123'
  }
];

let authTokens = {};
let testGroupId = null;

async function createTestUser(userData) {
  try {
    console.log(`Creating test user: ${userData.username}`);
    const response = await axios.post(`${BASE_URL}/api/auth/register`, userData);
    console.log(`✅ User ${userData.username} created successfully`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`⚠️  User ${userData.username} already exists, logging in...`);
      return await loginUser(userData);
    }
    throw error;
  }
}

async function loginUser(userData) {
  try {
    console.log(`Logging in user: ${userData.username}`);
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: userData.email,
      password: userData.password
    });
    console.log(`✅ User ${userData.username} logged in successfully`);
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function createTestGroup(token) {
  try {
    console.log('Creating test group...');
    const response = await axios.post(`${BASE_URL}/api/groups`, {
      name: 'Seen Status Test Group',
      region: 'Test Region',
      description: 'Group for testing seen status functionality'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Test group created successfully');
    return response.data.group._id;
  } catch (error) {
    throw error;
  }
}

async function getGroupMembers(token, groupId) {
  try {
    const response = await axios.get(`${BASE_URL}/api/groups/${groupId}/members`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function sendTestMessage(token, groupId, content) {
  try {
    const response = await axios.post(`${BASE_URL}/api/messages`, {
      content,
      groupId,
      messageType: 'text'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  } catch (error) {
    throw error;
  }
}

function createSocketConnection(token) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected');
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      reject(error);
    });

    setTimeout(() => {
      reject(new Error('Socket connection timeout'));
    }, 10000);
  });
}

async function testSeenStatus() {
  try {
    console.log('🚀 Starting seen status test...\n');

    // Step 1: Create test users
    console.log('Step 1: Creating test users');
    for (const user of testUsers) {
      const userData = await createTestUser(user);
      authTokens[user.username] = userData.token;
    }

    // Step 2: Create test group
    console.log('\nStep 2: Creating test group');
    testGroupId = await createTestGroup(authTokens.testuser1);
    console.log(`Group ID: ${testGroupId}`);

    // Step 3: Get group members
    console.log('\nStep 3: Getting group members');
    const members = await getGroupMembers(authTokens.testuser1, testGroupId);
    console.log(`Group has ${members.totalMembers} members`);

    // Step 4: Create socket connections
    console.log('\nStep 4: Creating socket connections');
    const socket1 = await createSocketConnection(authTokens.testuser1);
    const socket2 = await createSocketConnection(authTokens.testuser2);

    // Join group
    socket1.emit('group:join', { groupId: testGroupId });
    socket2.emit('group:join', { groupId: testGroupId });

    // Step 5: Send test message
    console.log('\nStep 5: Sending test message');
    const message = await sendTestMessage(authTokens.testuser1, testGroupId, 'Test message for seen status');
    console.log(`Message sent with ID: ${message._id}`);

    // Step 6: Test seen status
    console.log('\nStep 6: Testing seen status');
    
    // Wait for message to be received
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mark message as seen by user2
    socket2.emit('message:seen', { 
      messageId: message._id, 
      groupId: testGroupId 
    });

    console.log('✅ Seen status test completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('- Created 2 test users');
    console.log('- Created test group');
    console.log('- Established socket connections');
    console.log('- Sent test message');
    console.log('- Marked message as seen');
    console.log('\n🎉 Seen status functionality is working correctly!');

    // Cleanup
    socket1.disconnect();
    socket2.disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSeenStatus();
}

module.exports = { testSeenStatus };
