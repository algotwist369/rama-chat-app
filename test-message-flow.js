#!/usr/bin/env node

/**
 * Message Flow Test Script
 * Tests the complete message flow from frontend to backend and back
 */

const io = require('socket.io-client');
const axios = require('axios');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Test credentials (you'll need to replace these with actual test credentials)
const TEST_USER = {
    email: 'test@example.com',
    password: 'testpassword'
};

let authToken = null;
let socket = null;
let testGroupId = null;

async function login() {
    try {
        console.log('🔐 Logging in...');
        const response = await axios.post(`${BACKEND_URL}/api/auth/login`, TEST_USER);
        authToken = response.data.token;
        console.log('✅ Login successful');
        return true;
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        return false;
    }
}

async function getGroups() {
    try {
        console.log('📋 Getting groups...');
        const response = await axios.get(`${BACKEND_URL}/api/groups`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.groups && response.data.groups.length > 0) {
            testGroupId = response.data.groups[0]._id;
            console.log(`✅ Found test group: ${testGroupId}`);
            return true;
        } else {
            console.log('❌ No groups found');
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to get groups:', error.response?.data || error.message);
        return false;
    }
}

function connectSocket() {
    return new Promise((resolve, reject) => {
        console.log('🔌 Connecting to socket...');
        
        socket = io(BACKEND_URL, {
            auth: { token: authToken },
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket.id);
            resolve();
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error.message);
            reject(error);
        });

        socket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
        });

        // Set up message listeners
        socket.on('message:new', (message) => {
            console.log('📨 Received new message:', {
                id: message._id,
                content: message.content?.substring(0, 50) + '...',
                sender: message.senderId?.username,
                groupId: message.groupId
            });
        });

        socket.on('message:edited', (data) => {
            console.log('✏️ Message edited:', {
                messageId: data.messageId,
                content: data.message?.content?.substring(0, 50) + '...'
            });
        });

        socket.on('error', (error) => {
            console.error('❌ Socket error:', error);
        });
    });
}

async function joinGroup() {
    return new Promise((resolve, reject) => {
        console.log(`🏢 Joining group: ${testGroupId}`);
        
        socket.emit('group:join', { groupId: testGroupId }, (response) => {
            if (response && response.error) {
                console.error('❌ Failed to join group:', response.error);
                reject(new Error(response.error));
            } else {
                console.log('✅ Joined group successfully');
                resolve();
            }
        });
    });
}

async function sendTestMessage() {
    return new Promise((resolve, reject) => {
        console.log('📤 Sending test message...');
        
        const messageData = {
            content: `Test message at ${new Date().toISOString()}`,
            groupId: testGroupId,
            messageType: 'text'
        };

        socket.emit('message:send', messageData, (response) => {
            if (response && response.error) {
                console.error('❌ Failed to send message:', response.error);
                reject(new Error(response.error));
            } else {
                console.log('✅ Message sent successfully:', {
                    id: response.id,
                    timestamp: response.timestamp
                });
                resolve(response);
            }
        });
    });
}

async function testMessageFlow() {
    try {
        console.log('🚀 Starting message flow test...\n');

        // Step 1: Login
        const loginSuccess = await login();
        if (!loginSuccess) {
            throw new Error('Login failed');
        }

        // Step 2: Get groups
        const groupsSuccess = await getGroups();
        if (!groupsSuccess) {
            throw new Error('Failed to get groups');
        }

        // Step 3: Connect socket
        await connectSocket();

        // Step 4: Join group
        await joinGroup();

        // Step 5: Send test message
        await sendTestMessage();

        // Step 6: Wait for message to be received
        console.log('⏳ Waiting for message to be received...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('\n🎉 Message flow test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Message flow test failed:', error.message);
        process.exit(1);
    } finally {
        if (socket) {
            socket.disconnect();
        }
    }
}

// Run the test
if (require.main === module) {
    testMessageFlow();
}

module.exports = { testMessageFlow };
