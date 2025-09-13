const express = require('express');
const mongoose = require('mongoose');
const {
    sendMessage,
    getMessages,
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
const { validate, messageSchemas } = require('../middleware/validation');
const { messageSendLimiter, messageLimiter } = require('../middleware/rateLimiter');

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

module.exports = router;
