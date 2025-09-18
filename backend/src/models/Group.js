const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Group name is required'],
        minlength: [3, 'Group name must be at least 3 characters long'],
        maxlength: [50, 'Group name cannot exceed 50 characters'],
        trim: true,
        index: true
    },
    description: {
        type: String,
        maxlength: [200, 'Description cannot exceed 200 characters'],
        trim: true,
        default: ''
    },
    region: {
        type: String,
        required: [true, 'Region is required'],
        index: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Group creator is required'],
        index: true
    },
    managers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: undefined
    }],
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: undefined
    }],
    // Group settings
    settings: {
        isPublic: {
            type: Boolean,
            default: false,
            index: true
        },
        allowUserInvites: {
            type: Boolean,
            default: true
        },
        allowFileSharing: {
            type: Boolean,
            default: true
        },
        maxFileSize: {
            type: Number,
            default: 10 * 1024 * 1024, // 10MB in bytes
            max: 100 * 1024 * 1024 // Max 100MB
        },
        messageRetentionDays: {
            type: Number,
            default: 30,
            min: 1,
            max: 365
        }
    },
    // Group statistics
    stats: {
        messageCount: {
            type: Number,
            default: 0,
            min: 0
        },
        lastActivity: {
            type: Date,
            default: Date.now,
            index: true
        },
        memberCount: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    // Group status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    archivedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound indexes for better query performance
groupSchema.index({ region: 1, isActive: 1 });
groupSchema.index({ createdBy: 1, isActive: 1 });
groupSchema.index({ 'stats.lastActivity': -1 });
groupSchema.index({ name: 'text', description: 'text' }); // Text search index

// Virtual for total member count (users + managers + creator)
groupSchema.virtual('totalMembers').get(function() {
    const usersLen = Array.isArray(this.users) ? this.users.length : 0;
    const managersLen = Array.isArray(this.managers) ? this.managers.length : 0;
    return usersLen + managersLen + 1; // +1 for creator
});

// Virtual for member count
groupSchema.virtual('memberCount').get(function() {
    return Array.isArray(this.users) ? this.users.length : 0;
});

// Virtual for manager count
groupSchema.virtual('managerCount').get(function() {
    return Array.isArray(this.managers) ? this.managers.length : 0;
});

// Instance method to check if user is member
groupSchema.methods.isMember = function(userId) {
    return Array.isArray(this.users) && this.users.some(id => id.toString() === userId.toString());
};

// Instance method to check if user is manager
groupSchema.methods.isManager = function(userId) {
    return Array.isArray(this.managers) && this.managers.some(id => id.toString() === userId.toString());
};

// Instance method to check if user is creator
groupSchema.methods.isCreator = function(userId) {
    return this.createdBy.toString() === userId.toString();
};

// Instance method to check if user has admin rights (creator or manager)
groupSchema.methods.hasAdminRights = function(userId) {
    return this.isCreator(userId) || this.isManager(userId);
};

// Instance method to add user to group
groupSchema.methods.addUser = function(userId) {
    if (!Array.isArray(this.users)) this.users = [];
    if (!this.isMember(userId)) {
        this.users.push(userId);
        this.stats.memberCount = this.users.length;
        this.stats.lastActivity = new Date();
    }
    return this.save();
};

// Instance method to remove user from group
groupSchema.methods.removeUser = function(userId) {
    if (!Array.isArray(this.users)) this.users = [];
    this.users = this.users.filter(id => id.toString() !== userId.toString());
    this.stats.memberCount = this.users.length;
    this.stats.lastActivity = new Date();
    return this.save();
};

// Instance method to add manager
groupSchema.methods.addManager = function(userId) {
    if (!Array.isArray(this.managers)) this.managers = [];
    if (!this.isManager(userId) && !this.isCreator(userId)) {
        this.managers.push(userId);
        this.stats.lastActivity = new Date();
    }
    return this.save();
};

// Instance method to remove manager
groupSchema.methods.removeManager = function(userId) {
    if (!Array.isArray(this.managers)) this.managers = [];
    this.managers = this.managers.filter(id => id.toString() !== userId.toString());
    this.stats.lastActivity = new Date();
    return this.save();
};

// Static method to find active groups
groupSchema.statics.findActiveGroups = function() {
    return this.find({ isActive: true });
};

// Static method to find groups by region
groupSchema.statics.findByRegion = function(region) {
    return this.find({ region, isActive: true });
};

// Static method to search groups
groupSchema.statics.searchGroups = function(query, region = null) {
    const searchQuery = {
        isActive: true,
        $text: { $search: query }
    };
    
    if (region) {
        searchQuery.region = region;
    }
    
    return this.find(searchQuery, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } });
};

// Pre-save middleware to update member count
groupSchema.pre('save', function(next) {
    if (!Array.isArray(this.users)) this.users = [];
    if (!Array.isArray(this.managers)) this.managers = [];
    this.stats.memberCount = this.users.length;
    next();
});

// Pre-save middleware to ensure creator is in managers array and not duplicated in users array
groupSchema.pre('save', function(next) {
    if (!Array.isArray(this.managers)) this.managers = [];
    if (!Array.isArray(this.users)) this.users = [];
    // Ensure creator is always a manager
    if (this.createdBy && !this.managers.find(id => id.toString() === this.createdBy.toString())) {
        this.managers.push(this.createdBy);
    }
    // Remove creator from users array to avoid duplication
    if (this.createdBy) {
        this.users = this.users.filter(id => id.toString() !== this.createdBy.toString());
    }
    // Add validation for array lengths
    if (this.managers.length > 100) {
        return next(new Error('A group cannot have more than 100 managers'));
    }
    if (this.users.length > 1000) {
        return next(new Error('A group cannot have more than 1000 users'));
    }
    next();
});

module.exports = mongoose.model('Group', groupSchema);
