const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { getRedisClient } = require('../config/redis');

// Helper function to safely generate keys from IP addresses
const createSafeKeyGenerator = (fallbackKey) => {
    return (req) => {
        // Use user ID if authenticated
        if (req.user?.id) {
            return req.user.id;
        }
        
        // Use fallback key if provided
        if (fallbackKey && req.body?.[fallbackKey]) {
            return req.body[fallbackKey];
        }
        
        // Use IP address with proper IPv6 handling using the built-in helper
        return rateLimit.ipKeyGenerator(req);
    };
};

/**
 * Rate Limiting Middleware
 * Provides different rate limiting strategies for different endpoints
 */

// Redis store for rate limiting (if available)
const createRedisStore = () => {
    const redis = getRedisClient();
    if (!redis) return undefined;

    return {
        increment: async (key, windowMs) => {
            const multi = redis.multi();
            const now = Date.now();
            const window = Math.floor(now / windowMs);
            const redisKey = `rate_limit:${key}:${window}`;
            
            multi.incr(redisKey);
            multi.expire(redisKey, Math.ceil(windowMs / 1000));
            
            const results = await multi.exec();
            return results[0][1];
        },
        decrement: async (key, windowMs) => {
            const redis = getRedisClient();
            const now = Date.now();
            const window = Math.floor(now / windowMs);
            const redisKey = `rate_limit:${key}:${window}`;
            
            await redis.decr(redisKey);
        },
        resetKey: async (key, windowMs) => {
            const redis = getRedisClient();
            const now = Date.now();
            const window = Math.floor(now / windowMs);
            const redisKey = `rate_limit:${key}:${window}`;
            
            await redis.del(redisKey);
        }
    };
};

/**
 * General API rate limiter
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: {
            message: 'Too many requests from this IP, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(15 * 60), // 15 minutes in seconds
            timestamp: new Date().toISOString()
        }
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    store: createRedisStore(),
    keyGenerator: createSafeKeyGenerator(),
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/health/db';
    }
});

/**
 * Authentication rate limiter (stricter for login/register)
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: {
        error: {
            message: 'Too many authentication attempts, please try again later',
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(15 * 60), // 15 minutes in seconds
            timestamp: new Date().toISOString()
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(),
    keyGenerator: createSafeKeyGenerator('email'),
    skipSuccessfulRequests: true, // Don't count successful requests
    skipFailedRequests: false // Count failed requests
});

/**
 * Password reset rate limiter (very strict)
 */
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: {
        error: {
            message: 'Too many password reset attempts, please try again later',
            code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(60 * 60), // 1 hour in seconds
            timestamp: new Date().toISOString()
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(),
    keyGenerator: createSafeKeyGenerator('email')
});

/**
 * File upload rate limiter
 */
const fileUploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each user to 50 file uploads per hour
    message: {
        error: {
            message: 'Too many file uploads, please try again later',
            code: 'FILE_UPLOAD_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(60 * 60), // 1 hour in seconds
            timestamp: new Date().toISOString()
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(),
    keyGenerator: createSafeKeyGenerator()
});

/**
 * Message sending rate limiter (for actual message creation)
 */
const messageSendLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 500, // Limit each user to 500 messages per minute
    message: {
        error: {
            message: 'Too many messages sent, please slow down',
            code: 'MESSAGE_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(60), // 1 minute in seconds
            timestamp: new Date().toISOString()
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(),
    keyGenerator: createSafeKeyGenerator()
});

/**
 * General message operations rate limiter (for reading, searching, etc.)
 */
const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // Limit each user to 200 message operations per minute
    message: {
        error: {
            message: 'Too many message operations, please slow down',
            code: 'MESSAGE_OPERATION_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(60), // 1 minute in seconds
            timestamp: new Date().toISOString()
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(),
    keyGenerator: createSafeKeyGenerator()
});

/**
 * Admin operations rate limiter
 */
const adminLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 500, // Limit each admin to 500 operations per minute
    message: {
        error: {
            message: 'Too many admin operations, please slow down',
            code: 'ADMIN_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(60), // 1 minute in seconds
            timestamp: new Date().toISOString()
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(),
    keyGenerator: createSafeKeyGenerator()
});

/**
 * Slow down middleware for repeated requests
 */
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per 15 minutes, then...
    delayMs: () => 500, // Add 500ms delay per request above 50
    maxDelayMs: 20000, // Maximum delay of 20 seconds
    store: createRedisStore(),
    keyGenerator: createSafeKeyGenerator(),
    skip: (req) => {
        // Skip slow down for health checks
        return req.path === '/health' || req.path === '/health/db';
    }
});

/**
 * Dynamic rate limiter based on user role
 */
const dynamicLimiter = (req, res, next) => {
    const user = req.user;
    
    if (!user) {
        // No user, use general limiter
        return generalLimiter(req, res, next);
    }

    // Different limits based on user role
    let maxRequests;
    let windowMs;

    switch (user.role) {
        case 'admin':
            maxRequests = 1000; // 1000 requests per 15 minutes
            windowMs = 15 * 60 * 1000;
            break;
        case 'manager':
            maxRequests = 500; // 500 requests per 15 minutes
            windowMs = 15 * 60 * 1000;
            break;
        case 'user':
        default:
            maxRequests = 100; // 100 requests per 15 minutes
            windowMs = 15 * 60 * 1000;
            break;
    }

    const limiter = rateLimit({
        windowMs,
        max: maxRequests,
        message: {
            error: {
                message: `Rate limit exceeded for ${user.role} role`,
                code: 'ROLE_RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil(windowMs / 1000),
                timestamp: new Date().toISOString()
            }
        },
        standardHeaders: true,
        legacyHeaders: false,
        store: createRedisStore(),
        keyGenerator: () => user.id
    });

    limiter(req, res, next);
};

/**
 * IP-based rate limiter for suspicious activity
 */
const suspiciousActivityLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Very strict limit for suspicious IPs
    message: {
        error: {
            message: 'Suspicious activity detected, access temporarily restricted',
            code: 'SUSPICIOUS_ACTIVITY_DETECTED',
            retryAfter: Math.ceil(5 * 60), // 5 minutes in seconds
            timestamp: new Date().toISOString()
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(),
    keyGenerator: createSafeKeyGenerator(),
    skip: (req) => {
        // Skip for authenticated users with good standing
        return req.user && req.user.role !== 'user';
    }
});

/**
 * Rate limiter for API key usage (if implemented)
 */
const apiKeyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // 1000 requests per hour per API key
    message: {
        error: {
            message: 'API key rate limit exceeded',
            code: 'API_KEY_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(60 * 60), // 1 hour in seconds
            timestamp: new Date().toISOString()
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(),
    keyGenerator: (req) => {
        return req.headers['x-api-key'] || rateLimit.ipKeyGenerator(req);
    }
});

/**
 * Custom rate limiter factory
 */
const createCustomLimiter = (options) => {
    const defaultOptions = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        message: {
            error: {
                message: 'Rate limit exceeded',
                code: 'CUSTOM_RATE_LIMIT_EXCEEDED',
                timestamp: new Date().toISOString()
            }
        },
        standardHeaders: true,
        legacyHeaders: false,
        store: createRedisStore()
    };

    return rateLimit({ ...defaultOptions, ...options });
};

/**
 * Rate limit status endpoint
 */
const getRateLimitStatus = async (req, res) => {
    try {
        const redis = getRedisClient();
        if (!redis) {
            return res.json({
                message: 'Rate limiting is active (in-memory store)',
                redis: false
            });
        }

        const key = req.user?.id || req.ip;
        const now = Date.now();
        const window = Math.floor(now / (15 * 60 * 1000)); // 15 minute windows
        const redisKey = `rate_limit:${key}:${window}`;
        
        const currentCount = await redis.get(redisKey) || 0;
        const ttl = await redis.ttl(redisKey);

        res.json({
            message: 'Rate limiting is active (Redis store)',
            redis: true,
            currentCount: parseInt(currentCount),
            windowStart: new Date(window * 15 * 60 * 1000).toISOString(),
            windowEnd: new Date((window + 1) * 15 * 60 * 1000).toISOString(),
            ttl: ttl > 0 ? ttl : 0
        });
    } catch (error) {
        res.status(500).json({
            error: {
                message: 'Failed to get rate limit status',
                code: 'RATE_LIMIT_STATUS_ERROR',
                timestamp: new Date().toISOString()
            }
        });
    }
};

module.exports = {
    generalLimiter,
    authLimiter,
    passwordResetLimiter,
    fileUploadLimiter,
    messageSendLimiter,
    messageLimiter,
    adminLimiter,
    speedLimiter,
    dynamicLimiter,
    suspiciousActivityLimiter,
    apiKeyLimiter,
    createCustomLimiter,
    getRateLimitStatus
};
