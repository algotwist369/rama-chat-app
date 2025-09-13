const cacheManager = require('../utils/cacheManager');

/**
 * Caching Middleware
 * Provides intelligent caching for API endpoints
 */

/**
 * Cache middleware factory
 * @param {Object} options - Caching options
 * @returns {Function} Middleware function
 */
const cache = (options = {}) => {
    const {
        ttl = 300, // 5 minutes default
        keyGenerator = null,
        skipCache = false,
        skipIf = null,
        varyBy = [],
        tags = []
    } = options;

    return async (req, res, next) => {
        // Skip caching if Redis is not available
        if (!cacheManager.isAvailable()) {
            return next();
        }

        // Skip caching if skipCache is true
        if (skipCache) {
            return next();
        }

        // Skip caching if skipIf condition is met
        if (skipIf && skipIf(req)) {
            return next();
        }

        try {
            // Generate cache key
            let cacheKey;
            if (keyGenerator) {
                cacheKey = keyGenerator(req);
            } else {
                cacheKey = generateDefaultKey(req, varyBy);
            }

            // Try to get from cache
            const cachedData = await cacheManager.get(cacheKey);
            if (cachedData) {
                // Add cache headers
                res.set({
                    'X-Cache': 'HIT',
                    'X-Cache-Key': cacheKey,
                    'X-Cache-TTL': ttl
                });
                
                return res.json(cachedData);
            }

            // Cache miss - continue to route handler
            const originalSend = res.json;
            res.json = function(data) {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    // Add cache headers
                    res.set({
                        'X-Cache': 'MISS',
                        'X-Cache-Key': cacheKey,
                        'X-Cache-TTL': ttl
                    });

                    // Cache the response
                    cacheManager.set(cacheKey, data, ttl).catch(error => {
                        console.error('Cache set error:', error);
                    });
                }

                // Call original send method
                originalSend.call(this, data);
            };

            next();
        } catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
};

/**
 * Generate default cache key
 * @param {Object} req - Express request object
 * @param {Array} varyBy - Fields to vary cache by
 * @returns {string} Cache key
 */
const generateDefaultKey = (req, varyBy = []) => {
    const baseKey = `${req.method}:${req.originalUrl}`;
    
    if (varyBy.length === 0) {
        return baseKey;
    }

    const varyParams = {};
    varyBy.forEach(field => {
        if (field.startsWith('query.')) {
            const queryField = field.replace('query.', '');
            varyParams[`q_${queryField}`] = req.query[queryField];
        } else if (field.startsWith('params.')) {
            const paramField = field.replace('params.', '');
            varyParams[`p_${paramField}`] = req.params[paramField];
        } else if (field.startsWith('user.')) {
            const userField = field.replace('user.', '');
            varyParams[`u_${userField}`] = req.user?.[userField];
        } else if (field === 'user') {
            varyParams.user = req.user?.id;
        }
    });

    return cacheManager.generateKey('api', baseKey, varyParams);
};

/**
 * Cache invalidation middleware
 * @param {Object} options - Invalidation options
 * @returns {Function} Middleware function
 */
const invalidateCache = (options = {}) => {
    const {
        patterns = [],
        tags = [],
        onSuccess = true,
        onError = false
    } = options;

    return async (req, res, next) => {
        const originalSend = res.json;
        
        res.json = function(data) {
            const shouldInvalidate = (onSuccess && res.statusCode >= 200 && res.statusCode < 300) ||
                                   (onError && res.statusCode >= 400);

            if (shouldInvalidate) {
                // Invalidate cache patterns
                patterns.forEach(pattern => {
                    cacheManager.flushPattern(pattern).catch(error => {
                        console.error('Cache invalidation error:', error);
                    });
                });

                // Invalidate by tags (if implemented)
                tags.forEach(tag => {
                    // This would require a tag-based cache system
                    console.log(`Invalidating cache tag: ${tag}`);
                });
            }

            originalSend.call(this, data);
        };

        next();
    };
};

/**
 * User-specific cache middleware
 * @param {Object} options - Caching options
 * @returns {Function} Middleware function
 */
const cacheUser = (options = {}) => {
    const { ttl = 600 } = options; // 10 minutes for user data

    return async (req, res, next) => {
        if (!cacheManager.isAvailable() || !req.user?.id) {
            return next();
        }

        try {
            const cacheKey = cacheManager.generateKey('user', req.user.id);
            const cachedUser = await cacheManager.getUser(req.user.id);
            
            if (cachedUser) {
                res.set({
                    'X-Cache': 'HIT',
                    'X-Cache-Type': 'user'
                });
                return res.json({ user: cachedUser });
            }

            // Cache miss - continue to route handler
            const originalSend = res.json;
            res.json = function(data) {
                if (res.statusCode >= 200 && res.statusCode < 300 && data.user) {
                    res.set({
                        'X-Cache': 'MISS',
                        'X-Cache-Type': 'user'
                    });

                    cacheManager.setUser(req.user.id, data.user, ttl).catch(error => {
                        console.error('User cache set error:', error);
                    });
                }

                originalSend.call(this, data);
            };

            next();
        } catch (error) {
            console.error('User cache middleware error:', error);
            next();
        }
    };
};

/**
 * Group-specific cache middleware
 * @param {Object} options - Caching options
 * @returns {Function} Middleware function
 */
const cacheGroup = (options = {}) => {
    const { ttl = 600 } = options; // 10 minutes for group data

    return async (req, res, next) => {
        if (!cacheManager.isAvailable()) {
            return next();
        }

        const groupId = req.params.groupId || req.body.groupId;
        if (!groupId) {
            return next();
        }

        try {
            const cachedGroup = await cacheManager.getGroup(groupId);
            
            if (cachedGroup) {
                res.set({
                    'X-Cache': 'HIT',
                    'X-Cache-Type': 'group'
                });
                return res.json({ group: cachedGroup });
            }

            // Cache miss - continue to route handler
            const originalSend = res.json;
            res.json = function(data) {
                if (res.statusCode >= 200 && res.statusCode < 300 && data.group) {
                    res.set({
                        'X-Cache': 'MISS',
                        'X-Cache-Type': 'group'
                    });

                    cacheManager.setGroup(groupId, data.group, ttl).catch(error => {
                        console.error('Group cache set error:', error);
                    });
                }

                originalSend.call(this, data);
            };

            next();
        } catch (error) {
            console.error('Group cache middleware error:', error);
            next();
        }
    };
};

/**
 * Messages cache middleware
 * @param {Object} options - Caching options
 * @returns {Function} Middleware function
 */
const cacheMessages = (options = {}) => {
    const { ttl = 60 } = options; // 1 minute for messages (shorter due to real-time nature)

    return async (req, res, next) => {
        if (!cacheManager.isAvailable()) {
            return next();
        }

        const groupId = req.params.groupId || req.query.groupId;
        if (!groupId) {
            return next();
        }

        try {
            const cachedMessages = await cacheManager.getMessages(groupId);
            
            if (cachedMessages) {
                res.set({
                    'X-Cache': 'HIT',
                    'X-Cache-Type': 'messages'
                });
                return res.json({ messages: cachedMessages });
            }

            // Cache miss - continue to route handler
            const originalSend = res.json;
            res.json = function(data) {
                if (res.statusCode >= 200 && res.statusCode < 300 && data.messages) {
                    res.set({
                        'X-Cache': 'MISS',
                        'X-Cache-Type': 'messages'
                    });

                    cacheManager.setMessages(groupId, data.messages, ttl).catch(error => {
                        console.error('Messages cache set error:', error);
                    });
                }

                originalSend.call(this, data);
            };

            next();
        } catch (error) {
            console.error('Messages cache middleware error:', error);
            next();
        }
    };
};

/**
 * Cache warming middleware
 * @param {Object} options - Warming options
 * @returns {Function} Middleware function
 */
const warmCache = (options = {}) => {
    const { 
        user = false, 
        group = false, 
        messages = false 
    } = options;

    return async (req, res, next) => {
        try {
            const promises = [];

            if (user && req.user?.id) {
                promises.push(cacheManager.warmUserCache(req.user.id));
            }

            if (group && req.params.groupId) {
                promises.push(cacheManager.warmGroupCache(req.params.groupId));
            }

            if (promises.length > 0) {
                await Promise.all(promises);
            }

            next();
        } catch (error) {
            console.error('Cache warming error:', error);
            next();
        }
    };
};

/**
 * Cache statistics endpoint
 */
const getCacheStats = async (req, res) => {
    try {
        const stats = await cacheManager.getStats();
        res.json({
            cache: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: {
                message: 'Failed to get cache statistics',
                code: 'CACHE_STATS_ERROR',
                timestamp: new Date().toISOString()
            }
        });
    }
};

module.exports = {
    cache,
    invalidateCache,
    cacheUser,
    cacheGroup,
    cacheMessages,
    warmCache,
    getCacheStats,
    generateDefaultKey
};
