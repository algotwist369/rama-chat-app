#!/usr/bin/env node

/**
 * Performance Optimization Script
 * Optimizes the chat application for better real-time performance
 */

const mongoose = require('mongoose');
const { createIndexes, validateIndexes } = require('../src/config/databaseIndexes');
require('dotenv').config();

async function optimizePerformance() {
    try {
        console.log('🚀 Starting performance optimization...');
        
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log('✅ Connected to database');
        
        // Validate existing indexes
        console.log('🔍 Validating database indexes...');
        const indexesValid = await validateIndexes();
        
        if (!indexesValid) {
            console.log('📊 Creating missing indexes...');
            await createIndexes();
        }
        
        // Optimize collections
        console.log('⚡ Optimizing collections...');
        await optimizeCollections();
        
        // Clean up old data
        console.log('🧹 Cleaning up old data...');
        await cleanupOldData();
        
        // Analyze performance
        console.log('📈 Analyzing performance...');
        await analyzePerformance();
        
        console.log('🎉 Performance optimization completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during performance optimization:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

async function optimizeCollections() {
    const db = mongoose.connection.db;
    
    // Optimize messages collection
    console.log('  📝 Optimizing messages collection...');
    await db.collection('messages').createIndex({ 
        groupId: 1, 
        createdAt: -1, 
        'deleted.isDeleted': 1 
    }, { background: true });
    
    // Optimize users collection
    console.log('  👥 Optimizing users collection...');
    await db.collection('users').createIndex({ 
        groupId: 1, 
        isOnline: 1, 
        lastSeen: -1 
    }, { background: true });
    
    // Optimize groups collection
    console.log('  🏢 Optimizing groups collection...');
    await db.collection('groups').createIndex({ 
        region: 1, 
        isActive: 1, 
        'stats.lastActivity': -1 
    }, { background: true });
}

async function cleanupOldData() {
    const Message = mongoose.model('Message');
    const User = mongoose.model('User');
    
    // Clean up old deleted messages (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const deletedResult = await Message.deleteMany({
        'deleted.isDeleted': true,
        'deleted.deletedAt': { $lt: sevenDaysAgo }
    });
    console.log(`  🗑️ Cleaned up ${deletedResult.deletedCount} old deleted messages`);
    
    // Clean up old inactive users (older than 90 days, never logged in)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const inactiveResult = await User.deleteMany({
        isActive: false,
        lastLogin: { $lt: ninetyDaysAgo },
        createdAt: { $lt: ninetyDaysAgo }
    });
    console.log(`  👤 Cleaned up ${inactiveResult.deletedCount} inactive users`);
}

async function analyzePerformance() {
    const db = mongoose.connection.db;
    
    // Analyze collections
    const collections = ['messages', 'users', 'groups'];
    
    for (const collectionName of collections) {
        console.log(`  📊 Analyzing ${collectionName} collection...`);
        
        const stats = await db.collection(collectionName).stats();
        console.log(`    Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`    Documents: ${stats.count}`);
        console.log(`    Indexes: ${stats.nindexes}`);
        console.log(`    Average document size: ${(stats.avgObjSize / 1024).toFixed(2)} KB`);
    }
    
    // Check for slow queries
    console.log('  🔍 Checking for slow operations...');
    const slowOps = await db.admin().currentOp({ secs_running: { $gt: 1 } });
    if (slowOps.inprog && slowOps.inprog.length > 0) {
        console.log(`    ⚠️ Found ${slowOps.inprog.length} slow operations`);
    } else {
        console.log('    ✅ No slow operations detected');
    }
}

// Run optimization if called directly
if (require.main === module) {
    optimizePerformance();
}

module.exports = { optimizePerformance };
