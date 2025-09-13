const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const { signAccess } = require('../utils/token');
const { getRedisClient } = require('../config/redis');
const { 
    ValidationError, 
    AuthenticationError, 
    ConflictError, 
    NotFoundError,
    DatabaseError 
} = require('../utils/errors');
const { asyncHandler } = require('../middleware/errorHandler');
const cacheManager = require('../utils/cacheManager');

const getUsers = asyncHandler(async (req, res) => {
    // Try to get from cache first
    const cacheKey = cacheManager.generateKey('api', 'users:list');
    let users = await cacheManager.get(cacheKey);

    if (!users) {
        // Cache miss - fetch from database
        users = await User.find()
            .populate('groupId')
            .select('-password -pin') // Exclude sensitive fields
            .sort({ createdAt: -1 }); // Sort by newest first

        if (users.length === 0) {
            throw new NotFoundError('Users');
        }

        // Cache the result for 5 minutes
        await cacheManager.set(cacheKey, users, 300);
    }

    res.json({ users });
});

const register = asyncHandler(async (req, res) => {
    const { username, email, password, role = 'user' } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
        username,
        email,
        password: hashedPassword,
        role,
    });

    const token = signAccess(user);

    res.status(201).json({
        message: 'User created successfully',
        token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            groupId: user.groupId,
        },
    });
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).populate('groupId');
    if (!user) {
        throw new AuthenticationError('Invalid credentials');
    }

    // Check if user can login (not locked, active)
    if (!(user.isActive && !(user.lockUntil && user.lockUntil > Date.now()))) {
        throw new AuthenticationError('Account is locked or inactive');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        // Increment login attempts
        await User.findByIdAndUpdate(user._id, { $inc: { loginAttempts: 1 } });
        throw new AuthenticationError('Invalid credentials');
    }

    // Reset login attempts on successful login
    await User.findByIdAndUpdate(user._id, { $unset: { loginAttempts: 1, lockUntil: 1 } });

    // Update online status and last login
    await User.findByIdAndUpdate(user._id, {
        isOnline: true,
        lastSeen: new Date(),
        lastLoginAt: new Date(),
    });

    const token = signAccess(user);

    // Store refresh token in Redis (optional)
    const refreshToken = `refresh_${user._id}_${Date.now()}`;
    const redis = getRedisClient();
    if (redis) {
        await redis.setEx(refreshToken, 7 * 24 * 60 * 60, user._id.toString());
    }

    res.json({
        token,
        refreshToken,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            groupId: user.groupId,
            isOnline: user.isOnline,
        },
    });
});

const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const redis = getRedisClient();
    const userId = redis ? await redis.get(refreshToken) : null;
    if (!userId) {
        throw new AuthenticationError('Invalid refresh token');
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new AuthenticationError('User not found');
    }

    const newToken = signAccess(user);

    res.json({ token: newToken });
});

const logout = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Update offline status
    await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
    });

    // Remove all refresh tokens for this user (optional cleanup)
    const redis = getRedisClient();
    const keys = redis ? await redis.keys(`refresh_${userId}_*`) : [];
    if (keys.length > 0 && redis) {
        await redis.del(...keys);
    }

    res.json({ message: 'Logged out successfully' });
});

const getProfile = asyncHandler(async (req, res) => {
    // Try to get from cache first
    let user = await cacheManager.getUser(req.user._id);

    if (!user) {
        // Cache miss - fetch from database
        user = await User.findById(req.user._id)
            .populate('groupId')
            .select('-password -pin');

        if (!user) {
            throw new NotFoundError('User');
        }

        // Cache the user data for 10 minutes
        await cacheManager.setUser(req.user._id, user, 600);
    }

    res.json({ user });
});

const createUser = asyncHandler(async (req, res) => {
    const { username, email, password, pin, role = 'user', isActive = true, profile } = req.body;

    // Validate role - only allow creating users and managers
    if (!['user', 'manager'].includes(role)) {
        throw new ValidationError('Invalid role. Only users and managers can be created by admin.');
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Hash pin if provided
    let hashedPin = null;
    if (pin) {
        hashedPin = await bcrypt.hash(pin, 12);
    }

    // Create user
    const user = await User.create({
        username,
        email,
        password: hashedPassword,
        pin: hashedPin,
        role,
        isActive,
        profile,
    });

    // Invalidate users list cache
    const usersListCacheKey = cacheManager.generateKey('api', 'users:list');
    await cacheManager.del(usersListCacheKey);

    res.status(201).json({
        message: `${role} created successfully`,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            hasPin: !!user.pin,
            profile: user.profile,
        },
    });
});

const loginWithPin = asyncHandler(async (req, res) => {
    const { email, pin } = req.body;

    // Find user
    const user = await User.findOne({ email }).populate('groupId');
    if (!user) {
        throw new AuthenticationError('Invalid credentials');
    }

    // Check if user can login (not locked, active)
    if (!(user.isActive && !(user.lockUntil && user.lockUntil > Date.now()))) {
        throw new AuthenticationError('Account is locked or inactive');
    }

    // Check if user has a PIN
    if (!user.pin) {
        throw new AuthenticationError('PIN not set for this user');
    }

    // Check PIN
    const isPinMatch = await bcrypt.compare(pin, user.pin);
    if (!isPinMatch) {
        // Increment login attempts
        await User.findByIdAndUpdate(user._id, { $inc: { loginAttempts: 1 } });
        throw new AuthenticationError('Invalid PIN');
    }

    // Reset login attempts on successful login
    await User.findByIdAndUpdate(user._id, { $unset: { loginAttempts: 1, lockUntil: 1 } });

    // Update online status and last login
    await User.findByIdAndUpdate(user._id, {
        isOnline: true,
        lastSeen: new Date(),
        lastLoginAt: new Date(),
    });

    const token = signAccess(user);

    // Store refresh token in Redis (optional)
    const refreshToken = `refresh_${user._id}_${Date.now()}`;
    const redis = getRedisClient();
    if (redis) {
        await redis.setEx(refreshToken, 7 * 24 * 60 * 60, user._id.toString());
    }

    res.json({
        token,
        refreshToken,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            groupId: user.groupId,
            isOnline: user.isOnline,
        },
    });
});



const updateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { username, email, role, profile, isActive } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Invalid user ID format');
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
        throw new NotFoundError('User');
    }

    // Prevent admin from updating their own role or status
    if (req.user._id.toString() === userId && (role || isActive !== undefined)) {
        throw new ValidationError('Cannot modify your own role or status');
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
        const existingUser = await User.findOne({ email, _id: { $ne: userId } });
        if (existingUser) {
            throw new ConflictError('Email already exists');
        }
    }

    // Validate role - only allow updating to user or manager
    if (role && !['user', 'manager'].includes(role)) {
        throw new ValidationError('Invalid role. Only users and managers are allowed.');
    }

    // Update user
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (profile) {
        updateData.profile = {
            ...user.profile,
            ...profile
        };
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
    ).select('-password -pin');

    // Invalidate caches
    const usersListCacheKey = cacheManager.generateKey('api', 'users:list');
    await cacheManager.del(usersListCacheKey);
    await cacheManager.deleteUser(userId);

    res.json({
        message: 'User updated successfully',
        user: updatedUser
    });
});

const deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Invalid user ID format');
    }

    // Prevent admin from deleting themselves
    if (req.user._id.toString() === userId) {
        throw new ValidationError('Cannot delete your own account');
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
        throw new NotFoundError('User');
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    // Invalidate caches
    const usersListCacheKey = cacheManager.generateKey('api', 'users:list');
    await cacheManager.del(usersListCacheKey);
    await cacheManager.deleteUser(userId);

    res.json({
        message: 'User deleted successfully'
    });
});

module.exports = {
    getUsers,
    register,
    login,
    loginWithPin,
    refreshToken,
    logout,
    getProfile,
    createUser,
    updateUser,
    deleteUser,
};
