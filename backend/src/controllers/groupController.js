const mongoose = require('mongoose');
const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');
const {
    ValidationError,
    NotFoundError,
    AuthorizationError,
    ConflictError
} = require('../utils/errors');
const { asyncHandler } = require('../middleware/errorHandler');
const cacheManager = require('../utils/cacheManager');
const { logger } = require('../utils/logger');

const createGroup = asyncHandler(async (req, res) => {
    const { name, region, description } = req.body;
    const createdBy = req.user._id;

    // Allow admins to create multiple groups, regular users can only create one group
    const existingUser = await User.findById(createdBy);
    if (existingUser.role !== 'admin' && existingUser.groupId) {
        throw new ConflictError('Regular users can only be a member of one group. Admins can create multiple groups.');
    }

    const group = await Group.create({
        name,
        region,
        description,
        createdBy,
        managers: [createdBy],
        users: [], // Creator will be added as manager, not user
    });

    // Update user's groupId and join date only for non-admin users
    if (existingUser.role !== 'admin') {
        await User.findByIdAndUpdate(createdBy, {
            groupId: group._id,
            groupJoinedAt: new Date()
        });
    }

    // Invalidate user cache
    await cacheManager.invalidateUserRelated(createdBy);

    const populatedGroup = await group.populate(['createdBy', 'managers', 'users']);

    logger.business('Group created', {
        groupId: group._id,
        createdBy,
        name,
        region
    });

    res.status(201).json({
        message: 'Group created successfully',
        group: populatedGroup,
    });
});

const getGroups = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    // Base query to only get groups where user is a member
    const baseQuery = {
        $or: [
            { users: userId },
            { managers: userId }
        ]
    };

    const searchQuery = search
        ? {
            ...baseQuery,
            $and: [
                baseQuery,
                {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { region: { $regex: search, $options: 'i' } },
                    ]
                }
            ]
        }
        : baseQuery;

    // Use aggregation for better performance with large groups
    const groups = await Group.aggregate([
        { $match: searchQuery },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
            $lookup: {
                from: 'users',
                localField: 'createdBy',
                foreignField: '_id',
                as: 'createdBy',
                pipeline: [{ $project: { username: 1, email: 1 } }]
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'managers',
                foreignField: '_id',
                as: 'managers',
                pipeline: [{ $project: { username: 1, email: 1, isOnline: 1, lastSeen: 1 } }]
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'users',
                foreignField: '_id',
                as: 'users',
                pipeline: [{ $project: { username: 1, email: 1, role: 1, isOnline: 1, lastSeen: 1 } }]
            }
        },
        {
            $addFields: {
                createdBy: { $arrayElemAt: ['$createdBy', 0] },
                memberCount: { $size: '$users' },
                managerCount: { $size: '$managers' },
                totalMembers: { $add: [{ $size: '$users' }, { $size: '$managers' }] }
            }
        }
    ]);

    const total = await Group.countDocuments(searchQuery);

    res.json({
        groups,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

const getGroupById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid group ID format');
    }

    const group = await Group.findById(id)
        .populate('createdBy', 'username email role')
        .populate('managers', 'username email role isOnline lastSeen')
        .populate('users', 'username email role isOnline lastSeen');

    if (!group) {
        throw new NotFoundError('Group');
    }

    // Use model methods for authorization
    if (!group.users.some(id => id.toString() === userId.toString()) && !group.managers.some(id => id.toString() === userId.toString()) && !group.createdBy.equals(userId)) {
        throw new AuthorizationError('Access denied. You are not a member of this group.');
    }

    // Cache the result
    await cacheManager.setGroup(id, group);

    logger.business('Group accessed', {
        groupId: id,
        userId,
        groupName: group.name
    });

    res.json({ group });
});

const joinGroup = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        throw new ValidationError('Invalid group ID format');
    }

    const group = await Group.findById(groupId);
    if (!group) {
        throw new NotFoundError('Group');
    }

    // Check if already a member using model method
    if (group.users.some(id => id.toString() === userId.toString())) {
        throw new ConflictError('Already a member of this group');
    }

    // Use model method to add user
    await group.addUser(userId);

    // Update user's groupId only for non-admin users
    const user = await User.findById(userId);
    if (user.role !== 'admin') {
        await User.findByIdAndUpdate(userId, { 
            groupId,
            groupJoinedAt: new Date()
        });
    }

    // Invalidate caches
    await cacheManager.invalidateUserRelated(userId);
    await cacheManager.invalidateGroupRelated(groupId);

    logger.business('User joined group', {
        userId,
        groupId,
        groupName: group.name
    });

    res.json({ 
        message: 'Successfully joined the group',
        note: 'You can only see messages sent after you joined this group'
    });
});

const leaveGroup = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        throw new ValidationError('Invalid group ID format');
    }

    const group = await Group.findById(groupId);
    if (!group) {
        throw new NotFoundError('Group');
    }

    // Check if user is a member
    if (!group.users.some(id => id.toString() === userId.toString()) && !group.managers.some(id => id.toString() === userId.toString())) {
        throw new ConflictError('You are not a member of this group');
    }

    // Use model methods to remove user
    await group.removeUser(userId);
    if (group.managers.some(id => id.toString() === userId.toString())) {
        await group.removeManager(userId);
    }

    // Clear user's groupId and reset role only for non-admin users
    const user = await User.findById(userId);
    if (user.role !== 'admin') {
        await User.findByIdAndUpdate(userId, { 
            groupId: null,
            role: 'user'
        });
    }

    // Invalidate caches
    await cacheManager.invalidateUserRelated(userId);
    await cacheManager.invalidateGroupRelated(groupId);

    logger.business('User left group', {
        userId,
        groupId,
        groupName: group.name
    });

    res.json({ message: 'Successfully left the group' });
});

const addUserToGroup = asyncHandler(async (req, res) => {
    const { groupId, userId } = req.params;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        throw new ValidationError('Invalid group ID format');
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Invalid user ID format');
    }

    // Check if current user is admin or group creator
    const group = await Group.findById(groupId);
    if (!group) {
        throw new NotFoundError('Group');
    }

    if (req.user.role !== 'admin' && !group.isCreator(req.user._id)) {
        throw new AuthorizationError('Not authorized to add users to this group');
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
        throw new NotFoundError('User');
    }

    // Check if user is already a member using proper ObjectId comparison
    if (group.users.some(id => id.toString() === userId.toString())) {
        throw new ConflictError('User is already a member of this group');
    }

    // Use model method to add user
    await group.addUser(userId);

    // Update user's groupId and set join timestamp
    await User.findByIdAndUpdate(userId, {
        groupId,
        groupJoinedAt: new Date()
    });

    // Invalidate caches
    await cacheManager.invalidateUserRelated(userId);
    await cacheManager.invalidateGroupRelated(groupId);

    // Emit real-time event to all group members
    const io = req.app.get('io');
    if (io) {
        const updatedGroup = await Group.findById(groupId)
            .populate('users', 'username email role isOnline lastSeen')
            .populate('managers', 'username email role isOnline lastSeen');

        io.to(`group:${groupId}`).emit('group:updated', {
            group: updatedGroup,
            action: 'user_added',
            user: { _id: user._id, username: user.username, email: user.email }
        });

        // Notify the added user specifically
        io.to(`user:${userId}`).emit('group:joined', {
            group: updatedGroup,
            message: `You have been added to ${group.name}`
        });
    }

    logger.business('User added to group', {
        groupId,
        userId,
        addedBy: req.user._id,
        groupName: group.name,
        userName: user.username
    });

    res.json({ 
        message: 'User added to group successfully',
        note: 'User can only see messages sent after joining this group'
    });
});

const addManager = asyncHandler(async (req, res) => {
    const { groupId, userId } = req.params;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        throw new ValidationError('Invalid group ID format');
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Invalid user ID format');
    }

    // Check if current user is admin or group creator
    const group = await Group.findById(groupId);
    if (!group) {
        throw new NotFoundError('Group');
    }

    if (req.user.role !== 'admin' && !group.isCreator(req.user._id)) {
        throw new AuthorizationError('Not authorized to promote users in this group');
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
        throw new NotFoundError('User');
    }

    // Check if user is already a manager using proper ObjectId comparison
    if (group.managers.some(id => id.toString() === userId.toString())) {
        throw new ConflictError('User is already a manager of this group');
    }

    // Use model method to add manager
    await group.addManager(userId);

    // Also add to users array if not already there
    if (!group.users.some(id => id.toString() === userId.toString())) {
        await group.addUser(userId);
    }

    // Update user role and groupId only for non-admin users
    if (user.role !== 'admin') {
        await User.findByIdAndUpdate(userId, {
            role: 'manager',
            groupId: groupId
        });
    }

    // Invalidate caches
    await cacheManager.invalidateUserRelated(userId);
    await cacheManager.invalidateGroupRelated(groupId);

    // Emit real-time event to all group members
    const io = req.app.get('io');
    if (io) {
        const updatedGroup = await Group.findById(groupId)
            .populate('users', 'username email role isOnline lastSeen')
            .populate('managers', 'username email role isOnline lastSeen');

        io.to(`group:${groupId}`).emit('group:updated', {
            group: updatedGroup,
            action: 'manager_added',
            user: { _id: user._id, username: user.username, email: user.email }
        });

        // Notify the promoted user specifically
        io.to(`user:${userId}`).emit('role:updated', {
            group: { _id: group._id, name: group.name },
            newRole: 'manager',
            message: `You have been promoted to manager in ${group.name}`
        });
    }

    logger.business('User promoted to manager', {
        groupId,
        userId,
        promotedBy: req.user._id,
        groupName: group.name,
        userName: user.username
    });

    res.json({ message: 'User promoted to manager' });
});

const removeUserFromGroup = asyncHandler(async (req, res) => {
    const { groupId, userId } = req.params;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        throw new ValidationError('Invalid group ID format');
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Invalid user ID format');
    }

    // Check if current user is admin or group creator
    const group = await Group.findById(groupId);
    if (!group) {
        throw new NotFoundError('Group');
    }

    if (req.user.role !== 'admin' && !group.isCreator(req.user._id)) {
        throw new AuthorizationError('Not authorized to remove users from this group');
    }

    // Check if user is a member using proper ObjectId comparison
    if (!group.users.some(id => id.toString() === userId.toString()) && 
        !group.managers.some(id => id.toString() === userId.toString())) {
        throw new ConflictError('User is not a member of this group');
    }

    // Get user info before removal
    const user = await User.findById(userId);
    if (!user) {
        throw new NotFoundError('User');
    }

    // Use model methods to remove user
    await group.removeUser(userId);
    if (group.managers.some(id => id.toString() === userId.toString())) {
        await group.removeManager(userId);
    }

    // Clear user's groupId and reset role to user only for non-admin users
    if (user.role !== 'admin') {
        await User.findByIdAndUpdate(userId, {
            groupId: null,
            role: 'user'
        });
    }

    // Invalidate caches
    await cacheManager.invalidateUserRelated(userId);
    await cacheManager.invalidateGroupRelated(groupId);

    // Emit real-time event to all group members
    const io = req.app.get('io');
    if (io) {
        const updatedGroup = await Group.findById(groupId)
            .populate('users', 'username email role isOnline lastSeen')
            .populate('managers', 'username email role isOnline lastSeen');

        io.to(`group:${groupId}`).emit('group:updated', {
            group: updatedGroup,
            action: 'user_removed',
            user: { _id: user._id, username: user.username, email: user.email }
        });

        // Notify the removed user specifically
        io.to(`user:${userId}`).emit('group:left', {
            group: { _id: group._id, name: group.name },
            message: `You have been removed from ${group.name}`
        });
    }

    logger.business('User removed from group', {
        groupId,
        userId,
        removedBy: req.user._id,
        groupName: group.name,
        userName: user.username
    });

    res.json({ message: 'User removed from group successfully' });
});

const removeManager = asyncHandler(async (req, res) => {
    const { groupId, userId } = req.params;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        throw new ValidationError('Invalid group ID format');
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Invalid user ID format');
    }

    const group = await Group.findById(groupId);
    if (!group) {
        throw new NotFoundError('Group');
    }

    if (req.user.role !== 'admin' && !group.isCreator(req.user._id)) {
        throw new AuthorizationError('Not authorized to remove managers from this group');
    }

    // Check if user is a manager using proper ObjectId comparison
    if (!group.managers.some(id => id.toString() === userId.toString())) {
        throw new ConflictError('User is not a manager of this group');
    }

    // Get user info before removal
    const user = await User.findById(userId);
    if (!user) {
        throw new NotFoundError('User');
    }

    // Use model method to remove manager
    await group.removeManager(userId);

    // Update user role back to user
    await User.findByIdAndUpdate(userId, { role: 'user' });

    // Invalidate caches
    await cacheManager.invalidateUserRelated(userId);
    await cacheManager.invalidateGroupRelated(groupId);

    // Emit real-time event to all group members
    const io = req.app.get('io');
    if (io) {
        const updatedGroup = await Group.findById(groupId)
            .populate('users', 'username email role isOnline lastSeen')
            .populate('managers', 'username email role isOnline lastSeen');

        io.to(`group:${groupId}`).emit('group:updated', {
            group: updatedGroup,
            action: 'manager_removed',
            user: { _id: user._id, username: user.username, email: user.email }
        });

        // Notify the demoted user specifically
        io.to(`user:${userId}`).emit('role:updated', {
            group: { _id: group._id, name: group.name },
            newRole: 'user',
            message: `Your manager privileges have been removed from ${group.name}`
        });
    }

    logger.business('Manager privileges removed', {
        groupId,
        userId,
        removedBy: req.user._id,
        groupName: group.name,
        userName: user.username
    });

    res.json({ message: 'Manager privileges removed' });
});

const getAllGroups = asyncHandler(async (req, res) => {
    // Only admins can see all groups
    if (req.user.role !== 'admin') {
        throw new AuthorizationError('Access denied. Admin privileges required.');
    }

    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skipNum = (pageNum - 1) * limitNum;

    const searchQuery = search
        ? {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { region: { $regex: search, $options: 'i' } },
            ],
        }
        : {};

    const groups = await Group.find(searchQuery)
        .populate('createdBy', 'username email')
        .populate('managers', 'username email')
        .populate('users', 'username email role isOnline lastSeen')
        .sort({ createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum);

    const total = await Group.countDocuments(searchQuery);

    logger.business('All groups accessed', {
        userId: req.user._id,
        page: pageNum,
        limit: limitNum,
        total,
        search
    });

    res.json({
        groups,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
        },
    });
});

const getGroupMembers = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        throw new ValidationError('Invalid group ID format');
    }

    // Verify user is a member of the group
    const group = await Group.findById(groupId);
    if (!group) {
        throw new NotFoundError('Group');
    }

    // Use model methods for authorization
    if (!group.users.some(id => id.toString() === userId.toString()) && !group.managers.some(id => id.toString() === userId.toString()) && !group.createdBy.equals(userId)) {
        throw new AuthorizationError('Access denied. You are not a member of this group.');
    }

    // Try to get from cache first
    const cacheKey = `group:${groupId}:members`;
    let cachedMembers = await cacheManager.get(cacheKey);
    
    if (cachedMembers) {
        return res.json(cachedMembers);
    }

    // Get all group members with their online status
    const allMemberIds = [...group.users, ...group.managers];
    const members = await User.find({ _id: { $in: allMemberIds } })
        .select('username email isOnline lastSeen role')
        .lean();

    // Separate users and managers
    const users = members.filter(member => group.users.includes(member._id));
    const managers = members.filter(member => group.managers.includes(member._id));

    const result = {
        users,
        managers,
        totalMembers: members.length,
        onlineMembers: members.filter(member => member.isOnline).length
    };

    // Cache the result
    await cacheManager.set(cacheKey, result, 300); // 5 minutes

    res.json(result);
});

const updateGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, region, description } = req.body;
    const userId = req.user._id;

    // Find the group
    const group = await Group.findById(id);
    if (!group) {
        throw new NotFoundError('Group');
    }

    // Check if user is admin or group creator/manager
    const isAdmin = req.user.role === 'admin';
    const isCreator = group.createdBy.equals(userId);
    const isManager = group.managers.some(id => id.toString() === userId.toString());

    if (!isAdmin && !isCreator && !isManager) {
        throw new AuthorizationError('Not authorized to update this group');
    }

    // Update group fields
    const updateData = {};
    if (name) updateData.name = name;
    if (region) updateData.region = region;
    if (description !== undefined) updateData.description = description;

    const updatedGroup = await Group.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate(['createdBy', 'managers', 'users']);

    // Invalidate group cache
    await cacheManager.invalidateGroupRelated(id);

    logger.business('Group updated', {
        groupId: id,
        updatedBy: userId,
        changes: updateData
    });

    res.json({
        message: 'Group updated successfully',
        group: updatedGroup
    });
});

const deleteGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    // Find the group
    const group = await Group.findById(id);
    if (!group) {
        throw new NotFoundError('Group');
    }

    // Check if user is admin or group creator
    const isAdmin = req.user.role === 'admin';
    const isCreator = group.createdBy.equals(userId);

    if (!isAdmin && !isCreator) {
        throw new AuthorizationError('Not authorized to delete this group');
    }

    // Remove all users from the group
    const allMemberIds = [...group.users, ...group.managers];
    await User.updateMany(
        { _id: { $in: allMemberIds } },
        {
            $unset: { groupId: 1, groupJoinedAt: 1 },
            $set: { role: 'user' } // Reset all members to user role
        }
    );

    // Delete all messages in the group
    await Message.deleteMany({ groupId: id });

    // Delete the group
    await Group.findByIdAndDelete(id);

    // Invalidate all related caches
    await cacheManager.invalidateGroupRelated(id);
    for (const memberId of allMemberIds) {
        await cacheManager.invalidateUserRelated(memberId);
    }

    logger.business('Group deleted', {
        groupId: id,
        deletedBy: userId,
        memberCount: allMemberIds.length
    });

    res.json({
        message: 'Group deleted successfully'
    });
});

module.exports = {
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
    deleteGroup,
};
