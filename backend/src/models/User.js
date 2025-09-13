const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'],
        index: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        maxlength: [128, 'Password cannot exceed 128 characters']
    },
    pin: {
        type: String,
        match: [/^\$2[aby]\$\d+\$/, 'PIN must be properly hashed'],
        default: null
    },
    role: {
        type: String,
        enum: {
            values: ['admin', 'manager', 'user'],
            message: 'Role must be either admin, manager, or user'
        },
        default: 'user',
        index: true
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        index: true,
        default: null
    },
    groupJoinedAt: {
        type: Date,
        default: null
    },
    isOnline: {
        type: Boolean,
        default: false,
        index: true
    },
    lastSeen: {
        type: Date,
        default: Date.now,
        index: true
    },
    notifications: [{
        type: {
            type: String,
            enum: ['message', 'group_invite', 'system'],
            required: true
        },
        title: {
            type: String,
            required: true,
            maxlength: 100
        },
        message: {
            type: String,
            required: true,
            maxlength: 500
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        read: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Add profile fields for better user management
    profile: {
        firstName: {
            type: String,
            maxlength: [50, 'First name cannot exceed 50 characters'],
            trim: true
        },
        lastName: {
            type: String,
            maxlength: [50, 'Last name cannot exceed 50 characters'],
            trim: true
        },
        avatar: {
            type: String,
            default: null
        },
        bio: {
            type: String,
            maxlength: [200, 'Bio cannot exceed 200 characters'],
            trim: true
        }
    },
    // Account status and security
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    emailVerified: {
        type: Boolean,
        default: false,
        index: true
    },
    loginAttempts: {
        type: Number,
        default: 0,
        max: 5
    },
    lockUntil: {
        type: Date,
        default: null
    },
    lastLoginAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            // Remove sensitive fields from JSON output
            delete ret.password;
            delete ret.pin;
            delete ret.loginAttempts;
            delete ret.lockUntil;
            return ret;
        }
    },
    toObject: {
        transform: function(doc, ret) {
            // Remove sensitive fields from object output
            delete ret.password;
            delete ret.pin;
            delete ret.loginAttempts;
            delete ret.lockUntil;
            return ret;
        }
    }
});

// Compound indexes for better query performance
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ groupId: 1, isOnline: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ lastSeen: -1 });
userSchema.index({ createdAt: -1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    if (this.profile?.firstName && this.profile?.lastName) {
        return `${this.profile.firstName} ${this.profile.lastName}`;
    }
    return this.username;
});

// Instance method to check if user can login
userSchema.methods.canLogin = function() {
    return this.isActive && !this.isLocked;
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }
    
    return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 }
    });
};

// Static method to find active users
userSchema.statics.findActiveUsers = function() {
    return this.find({ isActive: true });
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
    return this.find({ role, isActive: true });
};

// Pre-save middleware to update lastSeen when isOnline changes
userSchema.pre('save', function(next) {
    if (this.isModified('isOnline') && this.isOnline) {
        this.lastSeen = new Date();
    }
    next();
});


module.exports = mongoose.model('User', userSchema);
