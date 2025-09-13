const { getRedisClient } = require('../config/redis');

/**
 * Cache Manager Utility
 * Provides comprehensive caching functionality with Redis
 */

class CacheManager {
    constructor() {
        this.redis = getRedisClient();
        this.defaultTTL = 300; // 5 minutes default TTL
        this.prefixes = {
            user: 'user:',
            group: 'group:',
            message: 'message:',
            session: 'session:',
            rateLimit: 'rate_limit:',
            temp: 'temp:'
        };
    }

    /**
     * Check if Redis is available
     * @returns {boolean} Redis availability
     */
    isAvailable() {
        return this.redis !== null;
    }

    /**
     * Generate cache key with prefix
     * @param {string} prefix - Key prefix
     * @param {string} key - Key identifier
     * @param {Object} params - Additional parameters
     * @returns {string} Full cache key
     */
    generateKey(prefix, key, params = {}) {
        let fullKey = `${prefix}${key}`;
        
        if (Object.keys(params).length > 0) {
            const paramString = Object.entries(params)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => `${k}:${v}`)
                .join(':');
            fullKey += `:${paramString}`;
        }
        
        return fullKey;
    }

    /**
     * Set cache value
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<boolean>} Success status
     */
    async set(key, value, ttl = this.defaultTTL) {
        if (!this.isAvailable()) return false;

        try {
            const serializedValue = JSON.stringify(value);
            await this.redis.setex(key, ttl, serializedValue);
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    /**
     * Get cache value
     * @param {string} key - Cache key
     * @returns {Promise<any>} Cached value or null
     */
    async get(key) {
        if (!this.isAvailable()) return null;

        try {
            const value = await this.redis.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Delete cache value
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Success status
     */
    async del(key) {
        if (!this.isAvailable()) return false;

        try {
            await this.redis.del(key);
            return true;
        } catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    }

    /**
     * Delete multiple cache keys
     * @param {string[]} keys - Cache keys
     * @returns {Promise<number>} Number of deleted keys
     */
    async delMultiple(keys) {
        if (!this.isAvailable() || keys.length === 0) return 0;

        try {
            return await this.redis.del(...keys);
        } catch (error) {
            console.error('Cache delete multiple error:', error);
            return 0;
        }
    }

    /**
     * Check if key exists
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Existence status
     */
    async exists(key) {
        if (!this.isAvailable()) return false;

        try {
            const result = await this.redis.exists(key);
            return result === 1;
        } catch (error) {
            console.error('Cache exists error:', error);
            return false;
        }
    }

    /**
     * Get TTL of a key
     * @param {string} key - Cache key
     * @returns {Promise<number>} TTL in seconds (-1 if no expiry, -2 if key doesn't exist)
     */
    async ttl(key) {
        if (!this.isAvailable()) return -2;

        try {
            return await this.redis.ttl(key);
        } catch (error) {
            console.error('Cache TTL error:', error);
            return -2;
        }
    }

    /**
     * Set expiration for a key
     * @param {string} key - Cache key
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<boolean>} Success status
     */
    async expire(key, ttl) {
        if (!this.isAvailable()) return false;

        try {
            const result = await this.redis.expire(key, ttl);
            return result === 1;
        } catch (error) {
            console.error('Cache expire error:', error);
            return false;
        }
    }

    /**
     * Increment a numeric value
     * @param {string} key - Cache key
     * @param {number} increment - Increment value
     * @returns {Promise<number>} New value
     */
    async incr(key, increment = 1) {
        if (!this.isAvailable()) return 0;

        try {
            return await this.redis.incrby(key, increment);
        } catch (error) {
            console.error('Cache increment error:', error);
            return 0;
        }
    }

    /**
     * Decrement a numeric value
     * @param {string} key - Cache key
     * @param {number} decrement - Decrement value
     * @returns {Promise<number>} New value
     */
    async decr(key, decrement = 1) {
        if (!this.isAvailable()) return 0;

        try {
            return await this.redis.decrby(key, decrement);
        } catch (error) {
            console.error('Cache decrement error:', error);
            return 0;
        }
    }

    /**
     * Get all keys matching a pattern
     * @param {string} pattern - Key pattern
     * @returns {Promise<string[]>} Matching keys
     */
    async keys(pattern) {
        if (!this.isAvailable()) return [];

        try {
            return await this.redis.keys(pattern);
        } catch (error) {
            console.error('Cache keys error:', error);
            return [];
        }
    }

    /**
     * Flush all cache
     * @returns {Promise<boolean>} Success status
     */
    async flushAll() {
        if (!this.isAvailable()) return false;

        try {
            await this.redis.flushall();
            return true;
        } catch (error) {
            console.error('Cache flush all error:', error);
            return false;
        }
    }

    /**
     * Flush cache by pattern
     * @param {string} pattern - Key pattern
     * @returns {Promise<number>} Number of deleted keys
     */
    async flushPattern(pattern) {
        if (!this.isAvailable()) return 0;

        try {
            const keys = await this.keys(pattern);
            if (keys.length === 0) return 0;
            return await this.delMultiple(keys);
        } catch (error) {
            console.error('Cache flush pattern error:', error);
            return 0;
        }
    }

    // User-specific caching methods
    async setUser(userId, userData, ttl = 600) {
        const key = this.generateKey(this.prefixes.user, userId);
        return await this.set(key, userData, ttl);
    }

    async getUser(userId) {
        const key = this.generateKey(this.prefixes.user, userId);
        return await this.get(key);
    }

    async deleteUser(userId) {
        const key = this.generateKey(this.prefixes.user, userId);
        return await this.del(key);
    }

    async deleteUserSessions(userId) {
        const pattern = `${this.prefixes.session}${userId}:*`;
        return await this.flushPattern(pattern);
    }

    // Group-specific caching methods
    async setGroup(groupId, groupData, ttl = 600) {
        const key = this.generateKey(this.prefixes.group, groupId);
        return await this.set(key, groupData, ttl);
    }

    async getGroup(groupId) {
        const key = this.generateKey(this.prefixes.group, groupId);
        return await this.get(key);
    }

    async deleteGroup(groupId) {
        const key = this.generateKey(this.prefixes.group, groupId);
        return await this.del(key);
    }

    async setGroupMembers(groupId, members, ttl = 300) {
        const key = this.generateKey(this.prefixes.group, groupId, { type: 'members' });
        return await this.set(key, members, ttl);
    }

    async getGroupMembers(groupId) {
        const key = this.generateKey(this.prefixes.group, groupId, { type: 'members' });
        return await this.get(key);
    }

    // Message-specific caching methods
    async setMessages(groupId, messages, ttl = 60) {
        const key = this.generateKey(this.prefixes.message, groupId);
        return await this.set(key, messages, ttl);
    }

    async getMessages(groupId) {
        const key = this.generateKey(this.prefixes.message, groupId);
        return await this.get(key);
    }

    async deleteMessages(groupId) {
        const key = this.generateKey(this.prefixes.message, groupId);
        return await this.del(key);
    }

    // Session management
    async setSession(sessionId, sessionData, ttl = 86400) { // 24 hours
        const key = this.generateKey(this.prefixes.session, sessionId);
        return await this.set(key, sessionData, ttl);
    }

    async getSession(sessionId) {
        const key = this.generateKey(this.prefixes.session, sessionId);
        return await this.get(key);
    }

    async deleteSession(sessionId) {
        const key = this.generateKey(this.prefixes.session, sessionId);
        return await this.del(key);
    }

    // Cache statistics
    async getStats() {
        if (!this.isAvailable()) {
            return {
                available: false,
                message: 'Redis not available'
            };
        }

        try {
            const info = await this.redis.info('memory');
            const dbSize = await this.redis.dbsize();
            
            return {
                available: true,
                dbSize,
                memory: info
            };
        } catch (error) {
            return {
                available: false,
                error: error.message
            };
        }
    }

    // Cache warming methods
    async warmUserCache(userId) {
        const User = require('../models/User');
        try {
            const user = await User.findById(userId).select('-password -pin');
            if (user) {
                await this.setUser(userId, user);
                return true;
            }
        } catch (error) {
            console.error('Cache warming error for user:', userId, error);
        }
        return false;
    }

    async warmGroupCache(groupId) {
        const Group = require('../models/Group');
        try {
            const group = await Group.findById(groupId).populate('users managers createdBy');
            if (group) {
                await this.setGroup(groupId, group);
                await this.setGroupMembers(groupId, group.users);
                return true;
            }
        } catch (error) {
            console.error('Cache warming error for group:', groupId, error);
        }
        return false;
    }

    // Cache invalidation patterns
    async invalidateUserRelated(userId) {
        const patterns = [
            `${this.prefixes.user}${userId}`,
            `${this.prefixes.session}${userId}:*`,
            `${this.prefixes.group}*:members:*${userId}*`
        ];

        for (const pattern of patterns) {
            await this.flushPattern(pattern);
        }
    }

    async invalidateGroupRelated(groupId) {
        const patterns = [
            `${this.prefixes.group}${groupId}`,
            `${this.prefixes.group}${groupId}:*`,
            `${this.prefixes.message}${groupId}`
        ];

        for (const pattern of patterns) {
            await this.flushPattern(pattern);
        }
    }
}

// Create singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;
