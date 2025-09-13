const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Sender is required'],
        index: true
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: [true, 'Group is required'],
        index: true
    },
    content: {
        type: String,
        maxlength: [4096, 'Message content cannot exceed 4096 characters'],
        trim: true,
        default: ''
    },
    messageType: {
        type: String,
        enum: {
            values: ['text', 'image', 'file', 'system'],
            message: 'Message type must be text, image, file, or system'
        },
        default: 'text',
        index: true
    },
    file: {
        url: {
            type: String,
            validate: {
                validator: function(v) {
                    if (this.messageType === 'file' || this.messageType === 'image') {
                        return v && v.length > 0;
                    }
                    return true;
                },
                message: 'File URL is required for file/image messages'
            }
        },
        key: {
            type: String,
            validate: {
                validator: function(v) {
                    if (this.messageType === 'file' || this.messageType === 'image') {
                        return v && v.length > 0;
                    }
                    return true;
                },
                message: 'File key is required for file/image messages'
            }
        },
        size: {
            type: Number,
            min: [0, 'File size cannot be negative'],
            max: [100 * 1024 * 1024, 'File size cannot exceed 100MB'] // 100MB max
        },
        mimetype: {
            type: String,
            validate: {
                validator: function(v) {
                    if (this.messageType === 'file' || this.messageType === 'image') {
                        return v && v.length > 0;
                    }
                    return true;
                },
                message: 'MIME type is required for file/image messages'
            }
        },
        originalname: {
            type: String,
            maxlength: [255, 'Original filename cannot exceed 255 characters'],
            trim: true
        },
        thumbnail: {
            type: String,
            default: null
        }
    },
    tags: [{
        type: String,
        maxlength: [50, 'Tag cannot exceed 50 characters'],
        trim: true
    }],
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    forwardedToGroups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        validate: {
            validator: function(v) {
                return v.length <= 5; // Limit to 5 groups per forward
            },
            message: 'Cannot forward to more than 5 groups at once'
        }
    }],
    forwardedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    status: {
        type: String,
        enum: {
            values: ['sent', 'delivered', 'seen'],
            message: 'Status must be sent, delivered, or seen'
        },
        default: 'sent',
        index: true
    },
    deliveredTo: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        deliveredAt: {
            type: Date,
            default: Date.now
        }
    }],
    seenBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        seenAt: {
            type: Date,
            default: Date.now
        }
    }],
    reactions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        emoji: {
            type: String,
            required: true,
            maxlength: [10, 'Emoji cannot exceed 10 characters']
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    edited: {
        isEdited: {
            type: Boolean,
            default: false
        },
        editedAt: {
            type: Date,
            default: null
        },
        editCount: {
            type: Number,
            default: 0,
            max: [5, 'Message cannot be edited more than 5 times']
        }
    },
    deleted: {
        isDeleted: {
            type: Boolean,
            default: false,
            index: true
        },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        deletedAt: {
            type: Date,
            default: null
        },
        deleteReason: {
            type: String,
            enum: ['user', 'admin', 'system', 'moderation'],
            default: 'user'
        }
    },
    // Message metadata
    metadata: {
        ipAddress: {
            type: String,
            default: null
        },
        userAgent: {
            type: String,
            default: null
        },
        clientVersion: {
            type: String,
            default: null
        }
    },
    // Message priority for system messages
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
        index: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound indexes for better query performance
messageSchema.index({ groupId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ groupId: 1, messageType: 1, createdAt: -1 });
messageSchema.index({ 'deleted.isDeleted': 1, groupId: 1, createdAt: -1 });
messageSchema.index({ tags: 1 });
messageSchema.index({ mentions: 1 });
messageSchema.index({ replyTo: 1 });

// Text search index for message content
messageSchema.index({ content: 'text' });

// Virtual for reaction count
messageSchema.virtual('reactionCount').get(function() {
    return this.reactions.length;
});

// Virtual for delivery count
messageSchema.virtual('deliveryCount').get(function() {
    return this.deliveredTo.length;
});

// Virtual for seen count
messageSchema.virtual('seenCount').get(function() {
    return this.seenBy.length;
});

// Virtual for is system message
messageSchema.virtual('isSystemMessage').get(function() {
    return this.messageType === 'system';
});

// Instance method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
    // Remove existing reaction from this user
    this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
    
    // Add new reaction
    this.reactions.push({
        user: userId,
        emoji: emoji
    });
    
    return this.save();
};

// Instance method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
    this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
    return this.save();
};

// Instance method to mark as delivered
messageSchema.methods.markDelivered = function(userId) {
    const alreadyDelivered = this.deliveredTo.some(d => d.user.toString() === userId.toString());
    if (!alreadyDelivered) {
        this.deliveredTo.push({
            user: userId,
            deliveredAt: new Date()
        });
    }
    return this.save();
};

// Instance method to mark as seen
messageSchema.methods.markSeen = function(userId) {
    const alreadySeen = this.seenBy.some(s => s.user.toString() === userId.toString());
    if (!alreadySeen) {
        this.seenBy.push({
            user: userId,
            seenAt: new Date()
        });
    }
    return this.save();
};

// Instance method to edit message
messageSchema.methods.editMessage = function(newContent) {
    if (this.edited.editCount >= 5) {
        throw new Error('Message cannot be edited more than 5 times');
    }
    
    this.content = newContent;
    this.edited.isEdited = true;
    this.edited.editedAt = new Date();
    this.edited.editCount += 1;
    
    return this.save();
};

// Instance method to soft delete message
messageSchema.methods.softDelete = function(deletedBy, reason = 'user') {
    this.deleted.isDeleted = true;
    this.deleted.deletedBy = deletedBy;
    this.deleted.deletedAt = new Date();
    this.deleted.deleteReason = reason;
    
    return this.save();
};

// Static method to find messages by group
messageSchema.statics.findByGroup = function(groupId, options = {}) {
    const query = {
        groupId,
        'deleted.isDeleted': false
    };
    
    if (options.messageType) {
        query.messageType = options.messageType;
    }
    
    if (options.senderId) {
        query.senderId = options.senderId;
    }
    
    return this.find(query)
        .populate('senderId', 'username email profile.firstName profile.lastName')
        .populate('replyTo')
        .populate('mentions', 'username email')
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};

// Static method to find messages with mentions
messageSchema.statics.findMentions = function(userId, options = {}) {
    return this.find({
        mentions: userId,
        'deleted.isDeleted': false
    })
        .populate('senderId', 'username email')
        .populate('groupId', 'name')
        .sort({ createdAt: -1 })
        .limit(options.limit || 20);
};

// Static method to search messages
messageSchema.statics.searchMessages = function(groupId, searchQuery, options = {}) {
    return this.find({
        groupId,
        'deleted.isDeleted': false,
        $text: { $search: searchQuery }
    }, { score: { $meta: 'textScore' } })
        .populate('senderId', 'username email')
        .sort({ score: { $meta: 'textScore' } })
        .limit(options.limit || 20);
};

// Pre-save middleware to validate message content
messageSchema.pre('save', function(next) {
    // Ensure content is provided for text messages
    if (this.messageType === 'text') {
        if (!this.content || typeof this.content !== 'string' || this.content.trim().length === 0) {
            return next(new Error('Text messages must have valid content'));
        }
    }
    
    // Ensure file is provided for file/image messages
    if ((this.messageType === 'file' || this.messageType === 'image')) {
        if (!this.file || !this.file.url) {
            return next(new Error('File/image messages must have a valid file'));
        }
    }
    
    // Ensure at least one of content or file is provided
    const hasContent = this.content && typeof this.content === 'string' && this.content.trim().length > 0;
    const hasFile = this.file && this.file.url;
    
    if (!hasContent && !hasFile) {
        return next(new Error('Message must have either content or a file'));
    }
    
    next();
});

// Pre-save middleware to update group stats
messageSchema.post('save', async function() {
    if (!this.isNew) return;
    
    try {
        const Group = mongoose.model('Group');
        await Group.findByIdAndUpdate(this.groupId, {
            $inc: { 'stats.messageCount': 1 },
            $set: { 'stats.lastActivity': new Date() }
        });
    } catch (error) {
        console.error('Error updating group stats:', error);
    }
});

module.exports = mongoose.model('Message', messageSchema);
