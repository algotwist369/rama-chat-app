const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const {
    sendMessage,
    getMessages,
    getAllMessages,
    editMessage,
    deleteMessage,
    deleteMultipleMessages,
    searchMessages,
    forwardMessage,
    markAsDelivered,
    markAsSeen,
    testGetMessages
} = require('../controllers/messageController');
const auth = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbac');
const { validate, messageSchemas } = require('../middleware/validation');
const { messageSendLimiter, messageLimiter, adminLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Middleware to validate ObjectId format
const validateObjectId = (paramName) => {
    return (req, res, next) => {
        const id = req.params[paramName];
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                error: {
                    message: `Invalid ${paramName} format`,
                    code: 'INVALID_ID_FORMAT',
                    timestamp: new Date().toISOString()
                }
            });
        }
        next();
    };
};

router.use(auth); // all routes require auth

// Message creation and search routes (specific routes first)
router.post('/', messageSendLimiter, validate(messageSchemas.sendMessage), sendMessage);
router.delete('/delete-multiple', messageSendLimiter, deleteMultipleMessages);
router.get('/search', messageLimiter, searchMessages);
router.get('/all', auth, requireAdmin, adminLimiter, getAllMessages);
router.post('/delivered', messageLimiter, validate(messageSchemas.markAsDelivered), markAsDelivered);
router.post('/seen', messageLimiter, validate(messageSchemas.markAsSeen), markAsSeen);

// Test endpoint (should be removed in production)
router.get('/test/:groupId', validateObjectId('groupId'), testGetMessages);

// Message CRUD operations (put these last to avoid conflicts)
router.get('/:groupId', 
    validateObjectId('groupId'), 
    messageLimiter, 
    getMessages
);
router.put('/:messageId', 
    validateObjectId('messageId'), 
    messageSendLimiter, 
    validate(messageSchemas.updateMessage), 
    editMessage
);
router.delete('/:messageId', 
    validateObjectId('messageId'), 
    messageSendLimiter, 
    deleteMessage
);
router.post('/:messageId/forward', 
    validateObjectId('messageId'), 
    messageSendLimiter, 
    validate(messageSchemas.forwardMessage), 
    forwardMessage
);

// Message reactions routes
router.post('/:messageId/reactions', 
    validateObjectId('messageId'), 
    messageSendLimiter, 
    async (req, res) => {
        try {
            const { messageId } = req.params;
            const { emoji } = req.body;
            const userId = req.user._id;
            
            const message = await Message.findById(messageId);
            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }
            
            // Check if user already reacted with this emoji
            const existingReaction = message.reactions.find(
                r => r.user.toString() === userId.toString() && r.emoji === emoji
            );
            
            if (existingReaction) {
                // Remove reaction
                message.reactions = message.reactions.filter(
                    r => !(r.user.toString() === userId.toString() && r.emoji === emoji)
                );
            } else {
                // Add reaction
                message.reactions.push({
                    user: userId,
                    emoji: emoji,
                    createdAt: new Date()
                });
            }
            
            await message.save();
            
            // Emit reaction update to all group members
            const io = req.app.get('io');
            if (io) {
                io.to(`group:${message.groupId}`).emit('message:reaction', {
                    messageId,
                    reactions: message.reactions,
                    userId: userId,
                    emoji,
                    action: existingReaction ? 'removed' : 'added',
                    timestamp: new Date()
                });
            }
            
            res.json({ 
                message: 'Reaction updated successfully',
                reactions: message.reactions
            });
        } catch (error) {
            console.error('Error handling reaction:', error);
            res.status(500).json({ error: 'Failed to update reaction' });
        }
    }
);

module.exports = router;
