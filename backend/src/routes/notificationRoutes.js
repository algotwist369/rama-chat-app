const express = require('express');
const router = express.Router();
const { getNotifications, clearNotifications, markNotificationsAsSeen } = require('../services/notificationService');
const auth = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const { messageLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../utils/logger');

// Get user notifications
router.get('/', 
    auth, 
    messageLimiter, 
    asyncHandler(async (req, res) => {
        const notifications = await getNotifications(req.user._id);
        
        logger.business('Notifications fetched', {
            userId: req.user._id,
            notificationCount: notifications.length
        });
        
        res.json({ notifications });
    })
);

// Mark notifications as seen
router.patch('/seen', 
    auth, 
    messageLimiter, 
    asyncHandler(async (req, res) => {
        await markNotificationsAsSeen(req.user._id);
        
        logger.business('Notifications marked as seen', {
            userId: req.user._id
        });
        
        res.json({ message: 'Notifications marked as seen successfully' });
    })
);

// Clear all notifications
router.delete('/', 
    auth, 
    messageLimiter, 
    asyncHandler(async (req, res) => {
        await clearNotifications(req.user._id);
        
        logger.business('Notifications cleared', {
            userId: req.user._id
        });
        
        res.json({ message: 'Notifications cleared successfully' });
    })
);

// Test endpoint to create sample notifications (remove in production)
if (process.env.NODE_ENV === 'development') {
    router.post('/test', 
        auth, 
        messageLimiter, 
        asyncHandler(async (req, res) => {
            const { sendNotification } = require('../services/notificationService');
            
            const testNotifications = [
                {
                    type: 'message',
                    title: 'New message from John Doe',
                    message: 'Hey, how are you doing?',
                    groupId: '507f1f77bcf86cd799439011',
                    groupName: 'General Chat',
                    senderId: '507f1f77bcf86cd799439012',
                    senderUsername: 'John Doe',
                    createdAt: new Date()
                },
                {
                    type: 'user_joined',
                    title: 'Alice joined the group',
                    message: 'Alice has joined General Chat',
                    groupId: '507f1f77bcf86cd799439011',
                    groupName: 'General Chat',
                    createdAt: new Date()
                },
                {
                    type: 'user_left',
                    title: 'Bob left the group',
                    message: 'Bob has left General Chat',
                    groupId: '507f1f77bcf86cd799439011',
                    groupName: 'General Chat',
                    createdAt: new Date()
                }
            ];

            for (const notification of testNotifications) {
                await sendNotification(req.user._id, notification);
            }

            logger.business('Test notifications created', {
                userId: req.user._id,
                notificationCount: testNotifications.length
            });

            res.json({ message: 'Test notifications created successfully' });
        })
    );
}

module.exports = router;
