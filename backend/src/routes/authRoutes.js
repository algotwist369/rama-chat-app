const express = require('express');
const mongoose = require('mongoose');
const { register, login, loginWithPin, refreshToken, logout, getProfile, createUser, getUsers, updateUser, deleteUser, getRoutes } = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbac');
const { validate, authSchemas } = require('../middleware/validation');
const { authLimiter, adminLimiter } = require('../middleware/rateLimiter');

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

// Public routes (no auth required)
router.post('/register', authLimiter, validate(authSchemas.register), register);
router.post('/login', authLimiter, validate(authSchemas.login), login);
router.post('/login-pin', authLimiter, validate(authSchemas.loginWithPin), loginWithPin);
router.post('/refresh', authLimiter, validate(authSchemas.refreshToken), refreshToken);

// Protected routes (auth required)
router.post('/logout', auth, logout);
router.get('/profile', auth, getProfile);

// Admin-only routes
router.get('/users', auth, requireAdmin, adminLimiter, getUsers);
router.get('/routes', auth, requireAdmin, adminLimiter, getRoutes);
router.post('/create-user', auth, requireAdmin, adminLimiter, validate(authSchemas.createUser), createUser);
router.put('/users/:userId', 
    auth, 
    requireAdmin, 
    validateObjectId('userId'), 
    adminLimiter, 
    validate(authSchemas.updateUser), 
    updateUser
);
router.delete('/users/:userId', 
    auth, 
    requireAdmin, 
    validateObjectId('userId'), 
    adminLimiter, 
    deleteUser
);

module.exports = router;
