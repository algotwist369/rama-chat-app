const mongoose = require('mongoose');

/**
 * Database Indexes Configuration
 * This file ensures all necessary indexes are created for optimal performance
 */

const createIndexes = async () => {
    try {
        console.log('🔍 Creating database indexes...');
        
        // User model indexes
        const User = mongoose.model('User');
        await User.collection.createIndex({ email: 1, isActive: 1 });
        await User.collection.createIndex({ groupId: 1, isOnline: 1 });
        await User.collection.createIndex({ role: 1, isActive: 1 });
        await User.collection.createIndex({ lastSeen: -1 });
        await User.collection.createIndex({ createdAt: -1 });
        await User.collection.createIndex({ isOnline: 1 });
        await User.collection.createIndex({ isActive: 1 });
        await User.collection.createIndex({ emailVerified: 1 });
        console.log('✅ User indexes created');

        // Group model indexes
        const Group = mongoose.model('Group');
        await Group.collection.createIndex({ region: 1, isActive: 1 });
        await Group.collection.createIndex({ createdBy: 1, isActive: 1 });
        await Group.collection.createIndex({ 'stats.lastActivity': -1 });
        await Group.collection.createIndex({ name: 'text', description: 'text' });
        await Group.collection.createIndex({ name: 1 });
        await Group.collection.createIndex({ isPublic: 1 });
        await Group.collection.createIndex({ isActive: 1 });
        console.log('✅ Group indexes created');

        // Message model indexes
        const Message = mongoose.model('Message');
        await Message.collection.createIndex({ groupId: 1, createdAt: -1 });
        await Message.collection.createIndex({ senderId: 1, createdAt: -1 });
        await Message.collection.createIndex({ groupId: 1, messageType: 1, createdAt: -1 });
        await Message.collection.createIndex({ 'deleted.isDeleted': 1, groupId: 1, createdAt: -1 });
        await Message.collection.createIndex({ tags: 1 });
        await Message.collection.createIndex({ mentions: 1 });
        await Message.collection.createIndex({ replyTo: 1 });
        await Message.collection.createIndex({ content: 'text' });
        await Message.collection.createIndex({ messageType: 1 });
        await Message.collection.createIndex({ status: 1 });
        await Message.collection.createIndex({ priority: 1 });
        console.log('✅ Message indexes created');

        // Compound indexes for complex queries
        await Message.collection.createIndex({ 
            groupId: 1, 
            'deleted.isDeleted': 1, 
            createdAt: -1 
        });
        
        await Message.collection.createIndex({ 
            groupId: 1, 
            messageType: 1, 
            'deleted.isDeleted': 1, 
            createdAt: -1 
        });

        await User.collection.createIndex({ 
            groupId: 1, 
            role: 1, 
            isActive: 1 
        });

        await Group.collection.createIndex({ 
            region: 1, 
            'settings.isPublic': 1, 
            isActive: 1 
        });

        console.log('✅ Compound indexes created');
        console.log('🎉 All database indexes created successfully!');
        
    } catch (error) {
        console.error('❌ Error creating database indexes:', error);
        throw error;
    }
};

/**
 * Drop all indexes (use with caution - only for development)
 */
const dropAllIndexes = async () => {
    try {
        console.log('⚠️  Dropping all indexes...');
        
        const User = mongoose.model('User');
        const Group = mongoose.model('Group');
        const Message = mongoose.model('Message');
        
        await User.collection.dropIndexes();
        await Group.collection.dropIndexes();
        await Message.collection.dropIndexes();
        
        console.log('✅ All indexes dropped');
    } catch (error) {
        console.error('❌ Error dropping indexes:', error);
        throw error;
    }
};

/**
 * Get index information for all collections
 */
const getIndexInfo = async () => {
    try {
        const User = mongoose.model('User');
        const Group = mongoose.model('Group');
        const Message = mongoose.model('Message');
        
        const userIndexes = await User.collection.getIndexes();
        const groupIndexes = await Group.collection.getIndexes();
        const messageIndexes = await Message.collection.getIndexes();
        
        return {
            users: userIndexes,
            groups: groupIndexes,
            messages: messageIndexes
        };
    } catch (error) {
        console.error('❌ Error getting index info:', error);
        throw error;
    }
};

/**
 * Check if indexes exist and are optimal
 */
const validateIndexes = async () => {
    try {
        console.log('🔍 Validating database indexes...');
        
        const indexInfo = await getIndexInfo();
        const requiredIndexes = {
            users: [
                { email: 1, isActive: 1 },
                { groupId: 1, isOnline: 1 },
                { role: 1, isActive: 1 },
                { lastSeen: -1 },
                { createdAt: -1 }
            ],
            groups: [
                { region: 1, isActive: 1 },
                { createdBy: 1, isActive: 1 },
                { 'stats.lastActivity': -1 }
            ],
            messages: [
                { groupId: 1, createdAt: -1 },
                { senderId: 1, createdAt: -1 },
                { groupId: 1, messageType: 1, createdAt: -1 },
                { 'deleted.isDeleted': 1, groupId: 1, createdAt: -1 }
            ]
        };
        
        let allValid = true;
        
        for (const [collection, indexes] of Object.entries(requiredIndexes)) {
            const existingIndexes = indexInfo[collection];
            
            for (const requiredIndex of indexes) {
                const indexExists = existingIndexes.some(index => 
                    JSON.stringify(index.key) === JSON.stringify(requiredIndex)
                );
                
                if (!indexExists) {
                    console.warn(`⚠️  Missing index in ${collection}:`, requiredIndex);
                    allValid = false;
                }
            }
        }
        
        if (allValid) {
            console.log('✅ All required indexes are present');
        } else {
            console.log('❌ Some indexes are missing. Run createIndexes() to fix.');
        }
        
        return allValid;
    } catch (error) {
        console.error('❌ Error validating indexes:', error);
        throw error;
    }
};

module.exports = {
    createIndexes,
    dropAllIndexes,
    getIndexInfo,
    validateIndexes
};