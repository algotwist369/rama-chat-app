const morgan = require('morgan');
const { logger } = require('../utils/logger');
const performanceMonitor = require('../utils/performanceMonitor');

/**
 * HTTP Request Logging Middleware
 * Provides comprehensive request logging with performance monitoring
 */

// Custom Morgan token for user ID
morgan.token('user-id', (req) => {
    return req.user?.id || '-';
});

// Custom Morgan token for response time in milliseconds
morgan.token('response-time-ms', (req, res) => {
    return res.get('X-Response-Time') || '-';
});

// Custom Morgan token for cache status
morgan.token('cache-status', (req, res) => {
    return res.get('X-Cache') || '-';
});

// Custom Morgan token for request size
morgan.token('req-size', (req) => {
    return req.get('Content-Length') || '-';
});

// Custom Morgan token for response size
morgan.token('res-size', (req, res) => {
    return res.get('Content-Length') || '-';
});

// Custom Morgan token for user agent (truncated)
morgan.token('user-agent-short', (req) => {
    const ua = req.get('User-Agent') || '-';
    return ua.length > 50 ? ua.substring(0, 50) + '...' : ua;
});

// Custom Morgan token for IP address
morgan.token('ip-address', (req) => {
    return req.ip || req.connection.remoteAddress || '-';
});

// Custom Morgan token for request ID (if available)
morgan.token('request-id', (req) => {
    return req.id || '-';
});

// Custom format for development
const devFormat = ':method :url :status :response-time ms - :res-size bytes - :user-id - :ip-address';

// Custom format for production
const prodFormat = JSON.stringify({
    timestamp: ':date[iso]',
    method: ':method',
    url: ':url',
    status: ':status',
    responseTime: ':response-time-ms',
    responseSize: ':res-size',
    requestSize: ':req-size',
    userId: ':user-id',
    ip: ':ip-address',
    userAgent: ':user-agent-short',
    cacheStatus: ':cache-status',
    requestId: ':request-id'
});

// Custom stream for Morgan
const morganStream = {
    write: (message) => {
        try {
            // Parse JSON message for production format
            if (message.startsWith('{')) {
                const logData = JSON.parse(message);
                logger.info('HTTP request', logData);
            } else {
                // Development format - parse manually
                logger.info('HTTP request', { message: message.trim() });
            }
        } catch (error) {
            logger.error(error, { context: 'morgan-stream' });
        }
    }
};

/**
 * Request logging middleware
 * @param {string} format - Log format ('dev' or 'combined')
 * @returns {Function} Express middleware
 */
const requestLogger = (format = 'combined') => {
    const logFormat = format === 'dev' ? devFormat : prodFormat;
    
    return morgan(logFormat, {
        stream: morganStream,
        skip: (req, res) => {
            // Skip logging for health checks and static files
            return req.url === '/health' || 
                   req.url === '/health/db' || 
                   req.url === '/health/rate-limit' ||
                   req.url === '/health/cache' ||
                   req.url.startsWith('/uploads/');
        }
    });
};

/**
 * Performance monitoring middleware
 * @returns {Function} Express middleware
 */
const performanceMiddleware = () => {
    return (req, res, next) => {
        const startTime = Date.now();
        
        // Add response time header
        res.on('finish', () => {
            const responseTime = Date.now() - startTime;
            
            // Only set header if response hasn't been sent yet
            if (!res.headersSent) {
                res.set('X-Response-Time', responseTime.toString());
            }
            
            // Record performance metrics
            performanceMonitor.recordRequest(req, res, responseTime);
        });
        
        next();
    };
};

/**
 * Request ID middleware
 * @returns {Function} Express middleware
 */
const requestIdMiddleware = () => {
    return (req, res, next) => {
        // Generate unique request ID
        req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        res.set('X-Request-ID', req.id);
        next();
    };
};

/**
 * Security logging middleware
 * @returns {Function} Express middleware
 */
const securityLogger = () => {
    return (req, res, next) => {
        // Log suspicious requests
        const suspiciousPatterns = [
            /\.\./, // Directory traversal
            /<script/i, // XSS attempts
            /union.*select/i, // SQL injection
            /javascript:/i, // JavaScript injection
            /onload=/i, // Event handler injection
            /eval\(/i, // Code injection
            /base64/i, // Base64 encoding (potential obfuscation)
            /%3C/i, // URL encoded <
            /%3E/i, // URL encoded >
            /%27/i, // URL encoded '
            /%22/i  // URL encoded "
        ];

        const url = req.url.toLowerCase();
        const userAgent = (req.get('User-Agent') || '').toLowerCase();
        
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(url) || pattern.test(userAgent)) {
                logger.security('Suspicious request detected', {
                    ip: req.ip,
                    method: req.method,
                    url: req.url,
                    userAgent: req.get('User-Agent'),
                    headers: req.headers,
                    body: req.method === 'POST' ? req.body : undefined
                });
                break;
            }
        }

        next();
    };
};

/**
 * Error logging middleware
 * @returns {Function} Express middleware
 */
const errorLogger = () => {
    return (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            // Log errors
            if (res.statusCode >= 400) {
                logger.error('HTTP error response', {
                    statusCode: res.statusCode,
                    method: req.method,
                    url: req.url,
                    ip: req.ip,
                    userId: req.user?.id,
                    userAgent: req.get('User-Agent'),
                    requestId: req.id,
                    responseBody: res.statusCode >= 500 ? data : undefined // Only log body for server errors
                });
            }
            
            originalSend.call(this, data);
        };
        
        next();
    };
};

/**
 * Database query logging middleware
 * @returns {Function} Express middleware
 */
const databaseLogger = () => {
    return (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            // Log database-related headers if present
            const dbQueries = res.get('X-DB-Queries');
            const dbTime = res.get('X-DB-Time');
            
            if (dbQueries && dbTime) {
                logger.database('Database queries executed', {
                    queries: parseInt(dbQueries),
                    totalTime: parseInt(dbTime),
                    method: req.method,
                    url: req.url,
                    userId: req.user?.id
                });
            }
            
            originalSend.call(this, data);
        };
        
        next();
    };
};

/**
 * Cache logging middleware
 * @returns {Function} Express middleware
 */
const cacheLogger = () => {
    return (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            // Log cache-related headers if present
            const cacheStatus = res.get('X-Cache');
            const cacheKey = res.get('X-Cache-Key');
            const cacheTTL = res.get('X-Cache-TTL');
            
            if (cacheStatus) {
                logger.debug('Cache operation', {
                    status: cacheStatus,
                    key: cacheKey,
                    ttl: cacheTTL,
                    method: req.method,
                    url: req.url,
                    userId: req.user?.id
                });
            }
            
            originalSend.call(this, data);
        };
        
        next();
    };
};

/**
 * Comprehensive logging middleware
 * Combines all logging middlewares
 * @param {string} format - Log format ('dev' or 'combined')
 * @returns {Array} Array of middleware functions
 */
const comprehensiveLogging = (format = 'combined') => {
    return [
        requestIdMiddleware(),
        securityLogger(),
        performanceMiddleware(),
        requestLogger(format),
        errorLogger(),
        databaseLogger(),
        cacheLogger()
    ];
};

module.exports = {
    requestLogger,
    performanceMiddleware,
    requestIdMiddleware,
    securityLogger,
    errorLogger,
    databaseLogger,
    cacheLogger,
    comprehensiveLogging
};
