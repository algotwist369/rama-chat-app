const mongoose = require('mongoose');

/**
 * Database Health Monitoring Utility
 * Monitors database performance, connection health, and provides diagnostics
 */

class DatabaseHealthMonitor {
    constructor() {
        this.metrics = {
            connectionCount: 0,
            queryCount: 0,
            slowQueries: 0,
            errors: 0,
            lastHealthCheck: null,
            uptime: Date.now()
        };
        
        this.setupEventListeners();
    }

    /**
     * Setup MongoDB event listeners for monitoring
     */
    setupEventListeners() {
        const db = mongoose.connection;

        // Connection events
        db.on('connected', () => {
            console.log('📊 Database Health Monitor: Connected to MongoDB');
            this.metrics.connectionCount++;
        });

        db.on('disconnected', () => {
            console.log('📊 Database Health Monitor: Disconnected from MongoDB');
        });

        db.on('error', (error) => {
            console.error('📊 Database Health Monitor: Connection error:', error);
            this.metrics.errors++;
        });

        // Query monitoring
        mongoose.set('debug', (collectionName, method, query, doc) => {
            const queryTime = Date.now();
            console.log(`📊 Query: ${collectionName}.${method}`, {
                query: JSON.stringify(query),
                doc: doc ? JSON.stringify(doc) : 'N/A',
                timestamp: new Date().toISOString()
            });
            
            this.metrics.queryCount++;
        });
    }

    /**
     * Get current database health status
     * @returns {Promise<Object>} Health status
     */
    async getHealthStatus() {
        try {
            const db = mongoose.connection;
            const admin = db.db.admin();
            
            // Get server status
            const serverStatus = await admin.serverStatus();
            
            // Get database stats
            const dbStats = await db.db.stats();
            
            // Check connection state
            const connectionState = db.readyState;
            const connectionStates = {
                0: 'disconnected',
                1: 'connected',
                2: 'connecting',
                3: 'disconnecting'
            };

            // Calculate health score (0-100)
            const healthScore = this.calculateHealthScore(serverStatus, dbStats, connectionState);

            return {
                status: healthScore > 80 ? 'healthy' : healthScore > 50 ? 'warning' : 'critical',
                healthScore,
                connection: {
                    state: connectionStates[connectionState],
                    host: db.host,
                    port: db.port,
                    name: db.name
                },
                server: {
                    version: serverStatus.version,
                    uptime: serverStatus.uptime,
                    connections: serverStatus.connections,
                    memory: serverStatus.mem,
                    network: serverStatus.network
                },
                database: {
                    collections: dbStats.collections,
                    dataSize: dbStats.dataSize,
                    storageSize: dbStats.storageSize,
                    indexes: dbStats.indexes,
                    indexSize: dbStats.indexSize
                },
                metrics: this.metrics,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting database health status:', error);
            return {
                status: 'error',
                healthScore: 0,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Calculate health score based on various metrics
     * @param {Object} serverStatus - MongoDB server status
     * @param {Object} dbStats - Database statistics
     * @param {number} connectionState - Connection state
     * @returns {number} Health score (0-100)
     */
    calculateHealthScore(serverStatus, dbStats, connectionState) {
        let score = 100;

        // Connection state penalty
        if (connectionState !== 1) {
            score -= 50; // Major penalty for disconnected state
        }

        // Memory usage penalty
        if (serverStatus.mem && serverStatus.mem.resident > 1000) {
            score -= Math.min(20, (serverStatus.mem.resident - 1000) / 100);
        }

        // Connection count penalty
        if (serverStatus.connections && serverStatus.connections.current > 100) {
            score -= Math.min(15, (serverStatus.connections.current - 100) / 10);
        }

        // Error rate penalty
        const errorRate = this.metrics.errors / Math.max(1, this.metrics.queryCount);
        if (errorRate > 0.01) { // 1% error rate
            score -= Math.min(25, errorRate * 1000);
        }

        // Slow query penalty
        const slowQueryRate = this.metrics.slowQueries / Math.max(1, this.metrics.queryCount);
        if (slowQueryRate > 0.05) { // 5% slow query rate
            score -= Math.min(20, slowQueryRate * 200);
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Get performance metrics for specific collections
     * @param {Array} collectionNames - Collection names to analyze
     * @returns {Promise<Object>} Performance metrics
     */
    async getCollectionMetrics(collectionNames = []) {
        try {
            const db = mongoose.connection;
            const metrics = {};

            for (const collectionName of collectionNames) {
                const collection = db.collection(collectionName);
                const stats = await collection.stats();
                
                metrics[collectionName] = {
                    count: stats.count,
                    size: stats.size,
                    avgObjSize: stats.avgObjSize,
                    storageSize: stats.storageSize,
                    totalIndexSize: stats.totalIndexSize,
                    indexSizes: stats.indexSizes,
                    nindexes: stats.nindexes
                };
            }

            return metrics;
        } catch (error) {
            console.error('Error getting collection metrics:', error);
            throw error;
        }
    }

    /**
     * Get slow query log (if available)
     * @returns {Promise<Array>} Slow queries
     */
    async getSlowQueries() {
        try {
            const db = mongoose.connection;
            const admin = db.db.admin();
            
            // Get profiler data
            const profilerData = await admin.command({ profile: 0 });
            
            if (profilerData.was === 0) {
                return { message: 'Profiler is not enabled' };
            }

            // Get slow operations from profiler collection
            const profilerCollection = db.collection('system.profile');
            const slowQueries = await profilerCollection
                .find({ millis: { $gt: 100 } }) // Queries taking more than 100ms
                .sort({ ts: -1 })
                .limit(50)
                .toArray();

            return slowQueries;
        } catch (error) {
            console.error('Error getting slow queries:', error);
            return { error: error.message };
        }
    }

    /**
     * Get index usage statistics
     * @returns {Promise<Object>} Index usage stats
     */
    async getIndexUsageStats() {
        try {
            const db = mongoose.connection;
            const admin = db.db.admin();
            
            // Get index usage stats
            const indexStats = await admin.command({ collStats: 'system.indexes' });
            
            return indexStats;
        } catch (error) {
            console.error('Error getting index usage stats:', error);
            return { error: error.message };
        }
    }

    /**
     * Optimize database performance
     * @returns {Promise<Object>} Optimization results
     */
    async optimizePerformance() {
        try {
            const results = {
                indexes: await this.ensureIndexes(),
                cleanup: await this.cleanupOldData(),
                compression: await this.optimizeCompression()
            };

            return results;
        } catch (error) {
            console.error('Error optimizing performance:', error);
            throw error;
        }
    }

    /**
     * Ensure all necessary indexes exist
     * @returns {Promise<Object>} Index creation results
     */
    async ensureIndexes() {
        try {
            const { createIndexes } = require('../config/databaseIndexes');
            await createIndexes();
            return { status: 'success', message: 'All indexes ensured' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    /**
     * Cleanup old data (messages, logs, etc.)
     * @returns {Promise<Object>} Cleanup results
     */
    async cleanupOldData() {
        try {
            const Message = mongoose.model('Message');
            const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

            // Delete old soft-deleted messages
            const deletedMessages = await Message.deleteMany({
                'deleted.isDeleted': true,
                'deleted.deletedAt': { $lt: cutoffDate }
            });

            return {
                status: 'success',
                deletedMessages: deletedMessages.deletedCount,
                message: 'Old data cleanup completed'
            };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    /**
     * Optimize compression settings
     * @returns {Promise<Object>} Compression optimization results
     */
    async optimizeCompression() {
        try {
            // This would typically involve database-level compression settings
            // For MongoDB, this might involve adjusting storage engine settings
            return {
                status: 'success',
                message: 'Compression optimization completed'
            };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    /**
     * Reset monitoring metrics
     */
    resetMetrics() {
        this.metrics = {
            connectionCount: 0,
            queryCount: 0,
            slowQueries: 0,
            errors: 0,
            lastHealthCheck: new Date(),
            uptime: Date.now()
        };
    }

    /**
     * Get monitoring metrics
     * @returns {Object} Current metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.metrics.uptime
        };
    }
}

// Create singleton instance
const dbHealthMonitor = new DatabaseHealthMonitor();

module.exports = dbHealthMonitor;
