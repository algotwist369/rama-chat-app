const Message = require('../models/Message');
const Group = require('../models/Group');
const User = require('../models/User');
const extractTags = require('../utils/parser');
const mongoose = require('mongoose');
const { 
    ValidationError, 
    NotFoundError, 
    AuthorizationError 
} = require('../utils/errors');
const { asyncHandler } = require('../middleware/errorHandler');
const cacheManager = require('../utils/cacheManager');
const { logger } = require('../utils/logger');

// Memory-optimized message cleanup with chunking
const cleanupDeletedMessages = async () => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Process in chunks to avoid memory issues
        let totalDeleted = 0;
        let hasMore = true;
        const chunkSize = 1000;
        
        while (hasMore) {
        const result = await Message.deleteMany({
            'deleted.isDeleted': true,
            'deleted.deletedAt': { $lt: twentyFourHoursAgo }
            }).limit(chunkSize);
            
            totalDeleted += result.deletedCount;
            hasMore = result.deletedCount === chunkSize;
            
            // Small delay to prevent overwhelming the database
            if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        if (totalDeleted > 0) {
            console.log(`Cleaned up ${totalDeleted} permanently deleted messages`);
        }
    } catch (error) {
        console.error('Error cleaning up deleted messages:', error);
    }
};

// Optimized cleanup for old messages (older than 90 days)
const cleanupOldMessages = async () => {
    try {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        
        // Only clean up messages from inactive groups or very old messages
        const result = await Message.deleteMany({
            createdAt: { $lt: ninetyDaysAgo },
            'deleted.isDeleted': true
        }).limit(5000); // Limit to prevent long-running operations
        
        if (result.deletedCount > 0) {
            console.log(`Cleaned up ${result.deletedCount} old deleted messages`);
        }
    } catch (error) {
        console.error('Error cleaning up old messages:', error);
    }
};

// Run cleanup every hour for deleted messages, every 6 hours for old messages
setInterval(cleanupDeletedMessages, 60 * 60 * 1000);
setInterval(cleanupOldMessages, 6 * 60 * 60 * 1000);

/**
 * Send a new message
 */
const sendMessage = asyncHandler(async (req, res) => {
    const { content, groupId, file, messageType = 'text', replyTo } = req.body;
    const userId = req.user._id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        throw new ValidationError('Invalid group ID format');
    }

    // Validate replyTo if provided
    if (replyTo && !mongoose.Types.ObjectId.isValid(replyTo)) {
        throw new ValidationError('Invalid reply message ID format');
    }

    // Validate required fields - check for meaningful content
    const hasValidContent = content && content.trim().length > 0;
    const hasFile = file && file.url;
    
    // Debug logging
    console.log('Message validation:', {
        content: content,
        contentLength: content ? content.length : 0,
        contentTrimmed: content ? content.trim().length : 0,
        hasValidContent,
        hasFile,
        file: file
    });
    
    if (!hasValidContent && !hasFile) {
        throw new ValidationError('Message content or file is required');
    }

    // Verify user is member of the group
    const group = await Group.findById(groupId);
    if (!group) {
        throw new NotFoundError('Group');
    }

    const isMember = group.users.includes(userId) ||
                    group.managers.includes(userId) ||
                    group.createdBy.equals(userId);

    if (!isMember) {
        throw new AuthorizationError('You are not a member of this group');
    }

    // Create the message - only if we have valid content or file
    if (!hasValidContent && !hasFile) {
        throw new ValidationError('Message must have either valid content or a file');
    }

    const messageData = {
        senderId: userId,
        groupId: groupId,
        messageType,
        file: hasFile ? file : null,
        replyTo: replyTo || null
    };

    // Only add content if it's valid
    if (hasValidContent) {
        messageData.content = content.trim();
        messageData.tags = extractTags(content.trim());
    }

    // Debug logging before message creation
    console.log('Creating message with data:', {
        messageData,
        hasValidContent,
        hasFile
    });

    const message = await Message.create(messageData);

    // Invalidate message cache for this group
    await cacheManager.deleteMessages(groupId);

    // Populate the message with sender and group information
    const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'username email profile.firstName profile.lastName')
        .populate('groupId', 'name region')
        .lean();

    // Emit to the group via socket with error handling
    const io = req.app.get('io');
    if (io) {
        try {
            io.to(`group:${groupId}`).emit('message:new', populatedMessage);
            console.log(`📤 Message broadcasted to group: ${groupId}, messageId: ${message._id}`);
        } catch (error) {
            console.error('Error broadcasting message to group:', error);
        }
    }

    logger.business('Message sent', {
        messageId: message._id,
        senderId: userId,
        groupId,
        messageType
    });

    res.status(201).json({
        message: 'Message sent successfully',
        data: populatedMessage
    });
});

/**
 * Get messages from a group with optimized chunking and memory management
 */
const getMessages = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const { 
            chunkSize = 50,           // Smaller chunks for better memory management
            before,                   // Cursor-based pagination
            after,                    // For loading newer messages
            includeMetadata = false   // Only include essential data by default
        } = req.query;
        
        const userId = req.user._id;
        const chunkLimit = Math.min(parseInt(chunkSize), 100); // Cap at 100 for performance

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        throw new ValidationError('Invalid group ID format');
    }

    // Fast group membership check with projection
    const group = await Group.findById(groupId, { 
        users: 1, 
        managers: 1, 
        _id: 1 
    }).lean();
    
    if (!group) {
        throw new NotFoundError('Group');
    }

    // Check if user is admin (admins can view messages from any group)
    const isAdmin = req.user.role === 'admin';
    
    // Proper ObjectId comparison for membership check
    const isMember = group.users.some(id => id.toString() === userId.toString()) ||
                    group.managers.some(id => id.toString() === userId.toString());
    
    if (!isAdmin && !isMember) {
        throw new AuthorizationError('Not authorized to view messages');
    }

        // Get user's join date with minimal projection
        const user = await User.findById(userId, { groupJoinedAt: 1 }).lean();
        const userJoinedAt = user?.groupJoinedAt;

        // Build optimized query with proper indexing
        const baseQuery = { 
            groupId: groupId, // Mongoose will automatically cast string to ObjectId
            'deleted.isDeleted': { $ne: true }
        };
        
        // Message privacy feature: New users can only see messages sent after they joined the group
        // Admins can see all messages regardless of join date
        // Regular users only see messages created after their groupJoinedAt timestamp
        // But if userJoinedAt is null or very old, show all messages (for existing users)
        if (!isAdmin && userJoinedAt && (Date.now() - userJoinedAt.getTime()) < (7 * 24 * 60 * 60 * 1000)) {
            // Only apply privacy restriction for users who joined within the last 7 days
            baseQuery.createdAt = { $gte: userJoinedAt };
        }
        
        // Cursor-based pagination
        if (before) {
            baseQuery.createdAt = { ...baseQuery.createdAt, $lt: new Date(before) };
        }
        
        if (after) {
            baseQuery.createdAt = { ...baseQuery.createdAt, $gt: new Date(after) };
        }

        // Debug logging to help troubleshoot
        console.log('🔍 Message Query Debug:', {
            groupId,
            userId,
            isAdmin,
            userJoinedAt,
            messagePrivacy: !isAdmin && userJoinedAt ? 'enabled' : 'disabled',
            baseQuery,
            chunkLimit
        });

        // Test query to see if any messages exist for this group
        const testQuery = { groupId: groupId };
        const testCount = await Message.countDocuments(testQuery);
        console.log('🧪 Test Query Results:', {
            testQuery,
            testCount,
            groupIdType: typeof groupId,
            groupId
        });

        // Optimized aggregation pipeline with memory-efficient operations
        const pipeline = [
            { $match: baseQuery },
            { $sort: { createdAt: -1 } },
            { $limit: chunkLimit },
            
            // Optimized lookup with minimal data projection
            {
                $lookup: {
                    from: 'users',
                    localField: 'senderId',
                    foreignField: '_id',
                    as: 'sender',
                    pipeline: [
                        { 
                            $project: { 
                                username: 1, 
                                _id: 1,
                                // Only include role if metadata is requested
                                ...(includeMetadata === 'true' && { role: 1, email: 1 })
                            } 
                        }
                    ]
                }
            },
            
            // Only lookup deletedBy if there are deleted messages
            {
                $lookup: {
                    from: 'users',
                    localField: 'deleted.deletedBy',
                    foreignField: '_id',
                    as: 'deletedByUser',
                    pipeline: [{ $project: { username: 1, _id: 1 } }]
                }
            },
            
            // Lookup replyTo message
            {
                $lookup: {
                    from: 'messages',
                    localField: 'replyTo',
                    foreignField: '_id',
                    as: 'replyToMessage',
                    pipeline: [
                        { 
                            $project: { 
                                content: 1, 
                                _id: 1,
                                messageType: 1,
                                file: 1,
                                senderId: 1
                            } 
                        }
                    ]
                }
            },
            
            // Lookup replyTo sender
            {
                $lookup: {
                    from: 'users',
                    let: { replyToSenderId: { $arrayElemAt: ['$replyToMessage.senderId', 0] } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$replyToSenderId'] }
                            }
                        },
                        { $project: { username: 1, _id: 1, 'profile.firstName': 1, 'profile.lastName': 1, email: 1 } }
                    ],
                    as: 'replyToSender'
                }
            },
            
            // Optimized field projection
            {
                $addFields: {
                    senderId: { $arrayElemAt: ['$sender', 0] },
                    'deleted.deletedBy': { 
                        $cond: {
                            if: { $gt: [{ $size: '$deletedByUser' }, 0] },
                            then: { $arrayElemAt: ['$deletedByUser', 0] },
                            else: null
                        }
                    },
                    replyToPopulated: {
                        $cond: {
                            if: { $gt: [{ $size: '$replyToMessage' }, 0] },
                            then: {
                                $mergeObjects: [
                                    { $arrayElemAt: ['$replyToMessage', 0] },
                                    { senderId: { $arrayElemAt: ['$replyToSender', 0] } }
                                ]
                            },
                            else: null
                        }
                    }
                }
            },
            
            // Replace original replyTo with populated version
            {
                $addFields: {
                    replyTo: '$replyToPopulated'
                }
            },
            
            // Remove unnecessary fields to reduce memory usage
            {
                $project: {
                    _id: 1,
                    content: 1,
                    messageType: 1,
                    file: 1,
                    senderId: 1,
                    groupId: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    deleted: 1,
                    replyTo: 1,
                    // Only include these fields if metadata is requested
                    ...(includeMetadata === 'true' && {
                        seenBy: 1,
                        deliveredTo: 1,
                        status: 1
                    })
                }
            },
            
            // Final sort for chronological order
            { $sort: { createdAt: 1 } }
        ];

        // Execute aggregation with memory optimization
        let messages = await Message.aggregate(pipeline).allowDiskUse(false);
        
        // Debug: Log first message with replyTo to see the structure
        const messageWithReply = messages.find(msg => msg.replyTo);
        if (messageWithReply) {
            console.log('🔍 Debug - Message with replyTo:', JSON.stringify(messageWithReply.replyTo, null, 2));
            console.log('🔍 Debug - Full message structure:', JSON.stringify(messageWithReply, null, 2));
        }

        // Debug logging for aggregation results
        console.log('📊 Aggregation Results:', {
            messagesFound: messages.length,
            firstMessage: messages[0] ? {
                _id: messages[0]._id,
                content: messages[0].content, // Use 'content' instead of 'text'
                createdAt: messages[0].createdAt
            } : null
        });

        // Fallback: If aggregation returns no results but test query found messages, try simple query
        if (messages.length === 0 && testCount > 0) {
            console.log('🔄 Using fallback query - aggregation returned no results');
            const fallbackQuery = { 
                groupId: groupId,
                'deleted.isDeleted': { $ne: true }
            };
            
            messages = await Message.find(fallbackQuery)
                .populate('senderId', 'username _id')
                .sort({ createdAt: -1 })
                .limit(chunkLimit)
                .lean();
                
            // Sort messages chronologically for consistency
            messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                
            console.log('🔄 Fallback Results:', {
                messagesFound: messages.length,
                firstMessage: messages[0] ? {
                    _id: messages[0]._id,
                    content: messages[0].content,
                    createdAt: messages[0].createdAt
                } : null
            });
        }

        // Get approximate count using estimatedDocumentCount for better performance
        const estimatedCount = await Message.estimatedDocumentCount({ groupId: groupId });
        
        // Only get exact count if it's small (less than 10k messages)
        let totalCount = estimatedCount;
        if (estimatedCount < 10000) {
            totalCount = await Message.countDocuments(baseQuery);
        }

        console.log('📈 Count Results:', {
            estimatedCount,
            totalCount,
            baseQuery
        });

        // Calculate next cursor efficiently
        const nextCursor = messages.length > 0 ? messages[messages.length - 1].createdAt : null;
        const prevCursor = messages.length > 0 ? messages[0].createdAt : null;

        // Response with optimized structure
        const response = {
            messages,
            chunk: {
                size: chunkLimit,
                hasMore: messages.length === chunkLimit,
                nextCursor,
                prevCursor,
                total: totalCount,
                isEstimated: totalCount === estimatedCount && estimatedCount >= 10000
            },
            privacy: {
                messagePrivacyEnabled: !isAdmin && userJoinedAt && (Date.now() - userJoinedAt.getTime()) < (7 * 24 * 60 * 60 * 1000),
                userJoinedAt: userJoinedAt,
                isAdmin: isAdmin,
                note: !isAdmin && userJoinedAt && (Date.now() - userJoinedAt.getTime()) < (7 * 24 * 60 * 60 * 1000) ? 
                    'You can only see messages sent after you joined this group (new members have limited message history)' : 
                    'You can see all messages in this group'
            }
        };

        // Add metadata only if requested
        if (includeMetadata === 'true') {
            response.metadata = {
                chunkSize: chunkLimit,
                loadTime: Date.now(),
                memoryOptimized: true
            };
        }

        res.json(response);
});

/**
 * Edit a message (only by sender within 15 minutes)
 */
const editMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body; // Use 'content' instead of 'text'
    const userId = req.user._id;

    // Debug logging
    console.log('Edit message request:', {
        messageId,
        content,
        contentType: typeof content,
        contentLength: content ? content.length : 0,
        body: req.body
    });

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new ValidationError('Invalid message ID format');
    }

    const message = await Message.findById(messageId);
    if (!message) {
        throw new NotFoundError('Message');
    }

    if (!message.senderId.equals(userId)) {
        throw new AuthorizationError('Not authorized to edit this message');
    }

    const editTimeLimit = 15 * 60 * 1000;
    if (Date.now() - message.createdAt.getTime() > editTimeLimit) {
        throw new ValidationError('Message too old to edit');
    }

    message.content = content; // Use 'content' instead of 'text'
    message.tags = extractTags(content);
    message.edited = { isEdited: true, editedAt: new Date() };

    await message.save();

    // If this is an original message, also update all forwarded copies
    if (!message.forwardedFrom) {
        await Message.updateMany(
            { forwardedFrom: messageId },
            { 
                content: content, // Use 'content' instead of 'text'
                tags: extractTags(content),
                edited: { isEdited: true, editedAt: new Date() }
            }
        );
    }

    // Invalidate message cache
    await cacheManager.deleteMessages(message.groupId);

    // Populate the message with sender and group information before emitting
    const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'username email')
        .populate('groupId', 'name region')
        .lean();

    // Emit edit update to all group members with error handling
    const io = req.app.get('io');
    if (io) {
        try {
            io.to(`group:${message.groupId}`).emit('message:edited', {
                messageId: message._id,
                message: populatedMessage,
                timestamp: new Date()
            });
            console.log(`✏️ Message edit broadcasted to group: ${message.groupId}, messageId: ${message._id}`);
        } catch (error) {
            console.error('Error broadcasting message edit to group:', error);
        }
    }

    logger.business('Message edited', {
        messageId: message._id,
        senderId: userId,
        groupId: message.groupId
    });

    res.json({ message: 'Message updated successfully', message });
});

/**
 * Soft delete a message (owner, manager, or admin)
 */
const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new ValidationError('Invalid message ID format');
    }

    const message = await Message.findById(messageId);
    if (!message) {
        throw new NotFoundError('Message');
    }

    const canDelete =
        message.senderId.equals(userId) ||
        req.user.role === 'admin' ||
        req.user.role === 'manager';

    if (!canDelete) {
        throw new AuthorizationError('Not authorized to delete this message');
    }

    message.deleted = {
        isDeleted: true,
        deletedBy: userId,
        deletedAt: new Date()
    };

    await message.save();

    // If this is an original message, also delete all forwarded copies
    if (!message.forwardedFrom) {
        await Message.updateMany(
            { forwardedFrom: messageId },
            { 
                deleted: {
                    isDeleted: true,
                    deletedBy: userId,
                    deletedAt: new Date()
                }
            }
        );
    }

    // Invalidate message cache
    await cacheManager.deleteMessages(message.groupId);

    // Populate the deletedBy field with user information for the socket event
    const populatedMessage = await Message.findById(messageId)
        .populate('deleted.deletedBy', 'username')
        .populate('senderId', 'username')
        .lean();

    logger.business('Message deleted', {
        messageId,
        deletedBy: userId,
        groupId: message.groupId
    });
    
    req.app.get('io')?.to(`group:${message.groupId}`).emit('message:deleted', {
        messageId,
        deletedBy: populatedMessage.deleted.deletedBy
    });

    res.json({ message: 'Message deleted successfully' });
});

/**
 * Search messages (text, group, date range)
 */
const searchMessages = asyncHandler(async (req, res) => {
    const { q, groupId, startDate, endDate, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Validate ObjectId if groupId is provided
    if (groupId && !mongoose.Types.ObjectId.isValid(groupId)) {
        throw new ValidationError('Invalid group ID format');
    }

    let searchQuery = { 'deleted.isDeleted': { $ne: true } };
    if (groupId) searchQuery.groupId = groupId;
    if (q) searchQuery.content = { $regex: q, $options: 'i' }; // Use 'content' instead of 'text'
    if (startDate || endDate) {
        searchQuery.createdAt = {};
        if (startDate) searchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) searchQuery.createdAt.$lte = new Date(endDate);
    }

    const messages = await Message.find(searchQuery)
        .populate('senderId', 'username email')
        .populate('groupId', 'name region')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Message.countDocuments(searchQuery);

    logger.business('Messages searched', {
        userId: req.user._id,
        query: q,
        groupId,
        resultsCount: messages.length
    });

    res.json({
        messages,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

/**
 * Forward message to other groups
 */
const forwardMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { groupIds } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new ValidationError('Invalid message ID format');
    }

    // Validate groupIds array
    if (!Array.isArray(groupIds) || groupIds.length === 0) {
        throw new ValidationError('Group IDs array is required');
    }

    // Validate all group IDs
    for (const groupId of groupIds) {
        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            throw new ValidationError('Invalid group ID format in array');
        }
    }

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
        throw new NotFoundError('Message');
    }

    const targetGroups = await Group.find({ _id: { $in: groupIds } });

    const forwardedMessages = await Promise.all(
        targetGroups.map(group =>
            Message.create({
                senderId: req.user._id,
                groupId: group._id,
                content: `[Forwarded] ${originalMessage.content}`, // Use 'content' field instead of 'text'
                file: originalMessage.file,
                tags: originalMessage.tags,
                forwardedFrom: originalMessage._id
            })
        )
    );

    // Invalidate message cache for all target groups
    await Promise.all(
        targetGroups.map(group => cacheManager.deleteMessages(group._id))
    );

    const io = req.app.get('io');
    if (io) {
        forwardedMessages.forEach(msg => {
            io.to(`group:${msg.groupId}`).emit('message:new', msg);
        });
    }

    logger.business('Message forwarded', {
        originalMessageId: messageId,
        forwardedBy: req.user._id,
        targetGroups: groupIds,
        forwardedCount: forwardedMessages.length
    });

    res.json({
        message: 'Message forwarded successfully',
        forwardedTo: targetGroups.length
    });
});

/**
 * Mark messages as delivered for a user
 */
const markAsDelivered = asyncHandler(async (req, res) => {
    const { messageIds } = req.body;
    const userId = req.user._id;

    // Validate messageIds array
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
        throw new ValidationError('Message IDs array is required');
    }

    // Validate all message IDs
    for (const messageId of messageIds) {
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            throw new ValidationError('Invalid message ID format in array');
        }
    }

    await Message.updateMany(
        { _id: { $in: messageIds }, deliveredTo: { $ne: userId } },
        { $push: { deliveredTo: userId }, $set: { status: 'delivered' } }
    );

    logger.business('Messages marked as delivered', {
        userId,
        messageCount: messageIds.length
    });

    res.json({ message: 'Messages marked as delivered' });
});

/**
 * Mark messages as seen for a user
 */
const markAsSeen = asyncHandler(async (req, res) => {
    const { messageIds } = req.body;
    const userId = req.user._id;

    // Validate messageIds array
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
        throw new ValidationError('Message IDs array is required');
    }

    // Validate all message IDs
    for (const messageId of messageIds) {
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            throw new ValidationError('Invalid message ID format in array');
        }
    }

    await Message.updateMany(
        { _id: { $in: messageIds }, seenBy: { $ne: userId } },
        { $push: { seenBy: userId }, $set: { status: 'seen' } }
    );

    logger.business('Messages marked as seen', {
        userId,
        messageCount: messageIds.length
    });

    res.json({ message: 'Messages marked as seen' });
});

/**
 * Test endpoint to debug message retrieval
 */
const testGetMessages = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        throw new ValidationError('Invalid group ID format');
    }

    console.log('🧪 Test endpoint called:', { groupId, userId });

    // Simple query to get all messages for the group
    const messages = await Message.find({ 
        groupId: groupId 
    })
    .populate('senderId', 'username _id')
    .sort({ createdAt: 1 })
    .lean();

    console.log('🧪 Test results:', {
        groupId,
        messagesFound: messages.length,
        messages: messages.map(m => ({
            _id: m._id,
            content: m.content,
            senderId: m.senderId,
            createdAt: m.createdAt
        }))
    });

    res.json({
        success: true,
        groupId,
        messagesFound: messages.length,
        messages: messages
    });
});

const deleteMultipleMessages = asyncHandler(async (req, res) => {
    const { messageIds } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
        throw new ValidationError('messageIds must be a non-empty array');
    }

    // Validate all message IDs
    for (const messageId of messageIds) {
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            throw new ValidationError(`Invalid message ID format: ${messageId}`);
        }
    }

    // Find all messages and check permissions
    const messages = await Message.find({ _id: { $in: messageIds } });
    
    if (messages.length === 0) {
        throw new NotFoundError('No messages found');
    }

    // // Check if user can delete all messages
    // const canDeleteAll = messages.every(message => 
    //     message.senderId.equals(userId) ||
    //     req.user.role === 'admin' ||
    //     req.user.role === 'manager' ||
    //     req.user.role === 'user'
    // );

    // if (!canDeleteAll) {
    //     throw new AuthorizationError('Not authorized to delete one or more messages');
    // }

    // Delete all messages
    const deletedMessages = [];
    const groupIds = new Set();

    for (const message of messages) {
        message.deleted = {
            isDeleted: true,
            deletedBy: userId,
            deletedAt: new Date()
        };

        await message.save();
        deletedMessages.push(message._id);
        groupIds.add(message.groupId.toString());

        // If this is an original message, also delete all forwarded copies
        if (!message.forwardedFrom) {
            await Message.updateMany(
                { forwardedFrom: message._id },
                { 
                    deleted: {
                        isDeleted: true,
                        deletedBy: userId,
                        deletedAt: new Date()
                    }
                }
            );
        }
    }

    // Invalidate message cache for all affected groups
    for (const groupId of groupIds) {
        await cacheManager.deleteMessages(groupId);
    }

    logger.business('Multiple messages deleted', {
        userId: req.user._id,
        messageIds: deletedMessages,
        count: deletedMessages.length,
        groupIds: Array.from(groupIds)
    });

    res.json({
        success: true,
        message: `${deletedMessages.length} messages deleted successfully`,
        deletedCount: deletedMessages.length,
        deletedMessageIds: deletedMessages
    });
});

module.exports = {
    sendMessage,
    getMessages,
    testGetMessages,
    editMessage,
    deleteMessage,
    deleteMultipleMessages,
    searchMessages,
    forwardMessage,
    markAsDelivered,
    markAsSeen
};