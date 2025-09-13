const express = require('express');
const mongoose = require('mongoose');
const {
    createGroup,
    getGroups,
    getAllGroups,
    getGroupById,
    getGroupMembers,
    joinGroup,
    leaveGroup,
    addUserToGroup,
    removeUserFromGroup,
    addManager,
    removeManager,
    updateGroup,
    deleteGroup
} = require('../controllers/groupController');
const auth = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/rbac');
const { validate, groupSchemas } = require('../middleware/validation');
const { messageLimiter, adminLimiter } = require('../middleware/rateLimiter');

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

// Group creation and listing routes
router.post('/', requireRole(['admin', 'manager']), validate(groupSchemas.createGroup), messageLimiter, createGroup);
router.get('/', messageLimiter, getGroups);
router.get('/all', requireRole(['admin']), adminLimiter, getAllGroups);

// Group member management routes (specific routes first to avoid conflicts)
router.get('/:groupId/members', validateObjectId('groupId'), messageLimiter, getGroupMembers);
router.post('/:groupId/join', validateObjectId('groupId'), validate(groupSchemas.joinGroup), messageLimiter, joinGroup);
router.post('/:groupId/leave', validateObjectId('groupId'), messageLimiter, leaveGroup);

// Admin-only user management routes
router.post('/:groupId/users/:userId', 
    requireRole(['admin']), 
    validateObjectId('groupId'), 
    validateObjectId('userId'), 
    adminLimiter, 
    addUserToGroup
);
router.delete('/:groupId/users/:userId', 
    requireRole(['admin']), 
    validateObjectId('groupId'), 
    validateObjectId('userId'), 
    adminLimiter, 
    removeUserFromGroup
);

// Manager management routes
router.post('/:groupId/managers/:userId', 
    requireRole(['admin']), 
    validateObjectId('groupId'), 
    validateObjectId('userId'), 
    adminLimiter, 
    addManager
);
router.delete('/:groupId/managers/:userId', 
    requireRole(['admin']), 
    validateObjectId('groupId'), 
    validateObjectId('userId'), 
    adminLimiter, 
    removeManager
);

// Group CRUD operations (put these last to avoid conflicts)
router.get('/:id', validateObjectId('id'), messageLimiter, getGroupById);
router.put('/:id', validateObjectId('id'), validate(groupSchemas.updateGroup), messageLimiter, updateGroup);
router.delete('/:id', requireRole(['admin']), validateObjectId('id'), adminLimiter, deleteGroup);

module.exports = router;
