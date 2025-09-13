const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const hpp = require('hpp');
const { logger } = require('../utils/logger');

/**
 * Security Middleware
 * Provides comprehensive security measures for the application
 */

/**
 * MongoDB injection protection
 * Sanitizes user input to prevent NoSQL injection attacks
 */
const mongoSanitization = mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        logger.security('MongoDB injection attempt blocked', {
            ip: req.ip,
            key,
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent')
        });
    }
});

/**
 * XSS protection
 * Sanitizes user input to prevent cross-site scripting attacks
 */
const xssProtection = (req, res, next) => {
    const sanitizeObject = (obj) => {
        if (typeof obj === 'string') {
            return xss(obj, {
                whiteList: {
                    // Allow basic HTML tags for rich text (if needed)
                    p: [],
                    br: [],
                    strong: [],
                    em: [],
                    u: [],
                    // Add more tags as needed for your use case
                },
                stripIgnoreTag: true,
                stripIgnoreTagBody: ['script', 'style']
            });
        }
        
        if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        }
        
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                sanitized[key] = sanitizeObject(value);
            }
            return sanitized;
        }
        
        return obj;
    };

    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params);
    }

    next();
};

/**
 * HTTP Parameter Pollution protection
 * Prevents parameter pollution attacks
 */
const parameterPollutionProtection = hpp({
    whitelist: ['page', 'limit', 'sort', 'order'] // Allow these parameters to be arrays
});

/**
 * Content Security Policy
 * Sets strict CSP headers
 */
const contentSecurityPolicy = (req, res, next) => {
    const csp = process.env.NODE_ENV === 'production' 
        ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss:; frame-ancestors 'none';"
        : "default-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https:; connect-src 'self' ws: wss:;";

    res.setHeader('Content-Security-Policy', csp);
    next();
};

/**
 * Security headers middleware
 * Sets various security headers
 */
const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Strict transport security (HTTPS only)
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    next();
};

/**
 * Request size limiter
 * Limits request body size
 */
const requestSizeLimiter = (maxSize = '10mb') => {
    return (req, res, next) => {
        const contentLength = parseInt(req.get('Content-Length') || '0');
        const maxSizeBytes = parseSize(maxSize);
        
        if (contentLength > maxSizeBytes) {
            logger.security('Request size limit exceeded', {
                ip: req.ip,
                contentLength,
                maxSize: maxSizeBytes,
                method: req.method,
                url: req.url
            });
            
            return res.status(413).json({
                error: {
                    message: 'Request entity too large',
                    code: 'REQUEST_TOO_LARGE',
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        next();
    };
};

/**
 * Parse size string to bytes
 * @param {string} size - Size string (e.g., '10mb', '1kb')
 * @returns {number} Size in bytes
 */
const parseSize = (size) => {
    const units = {
        b: 1,
        kb: 1024,
        mb: 1024 * 1024,
        gb: 1024 * 1024 * 1024
    };
    
    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2] || 'b';
    
    return Math.floor(value * units[unit]);
};

/**
 * IP whitelist middleware
 * Restricts access to specific IP addresses
 */
const ipWhitelist = (allowedIPs = []) => {
    return (req, res, next) => {
        if (allowedIPs.length === 0) {
            return next();
        }
        
        const clientIP = req.ip || req.connection.remoteAddress;
        
        if (!allowedIPs.includes(clientIP)) {
            logger.security('IP not in whitelist', {
                ip: clientIP,
                allowedIPs,
                method: req.method,
                url: req.url
            });
            
            return res.status(403).json({
                error: {
                    message: 'Access denied',
                    code: 'IP_NOT_ALLOWED',
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        next();
    };
};

/**
 * User agent validation
 * Blocks requests with suspicious user agents
 */
const userAgentValidation = (req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    const suspiciousPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i,
        /python/i,
        /java/i,
        /php/i,
        /perl/i,
        /ruby/i,
        /go-http/i,
        /okhttp/i,
        /apache/i,
        /nginx/i
    ];
    
    // Allow certain endpoints for bots
    const allowedPaths = ['/health', '/health/db', '/health/cache', '/health/performance'];
    if (allowedPaths.includes(req.path)) {
        return next();
    }
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(userAgent)) {
            logger.security('Suspicious user agent detected', {
                ip: req.ip,
                userAgent,
                method: req.method,
                url: req.url
            });
            
            return res.status(403).json({
                error: {
                    message: 'Access denied',
                    code: 'SUSPICIOUS_USER_AGENT',
                    timestamp: new Date().toISOString()
                }
            });
        }
    }
    
    next();
};

/**
 * Request frequency limiter
 * Limits requests per IP per time window
 */
const requestFrequencyLimiter = (windowMs = 60000, maxRequests = 100) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old entries
        for (const [ip, timestamps] of requests.entries()) {
            const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
            if (validTimestamps.length === 0) {
                requests.delete(ip);
            } else {
                requests.set(ip, validTimestamps);
            }
        }
        
        // Check current IP
        const ipRequests = requests.get(clientIP) || [];
        if (ipRequests.length >= maxRequests) {
            logger.security('Request frequency limit exceeded', {
                ip: clientIP,
                requests: ipRequests.length,
                maxRequests,
                windowMs,
                method: req.method,
                url: req.url
            });
            
            return res.status(429).json({
                error: {
                    message: 'Too many requests',
                    code: 'FREQUENCY_LIMIT_EXCEEDED',
                    retryAfter: Math.ceil(windowMs / 1000),
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        // Add current request
        ipRequests.push(now);
        requests.set(clientIP, ipRequests);
        
        next();
    };
};

/**
 * File upload security
 * Validates file uploads for security
 */
const fileUploadSecurity = (req, res, next) => {
    if (!req.file && !req.files) {
        return next();
    }
    
    const files = req.files || [req.file];
    const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    
    for (const file of files) {
        // Check file size
        if (file.size > maxFileSize) {
            logger.security('File upload size exceeded', {
                ip: req.ip,
                filename: file.originalname,
                size: file.size,
                maxSize: maxFileSize
            });
            
            return res.status(413).json({
                error: {
                    message: 'File too large',
                    code: 'FILE_TOO_LARGE',
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        // Check MIME type
        if (!allowedMimeTypes.includes(file.mimetype)) {
            logger.security('Invalid file type uploaded', {
                ip: req.ip,
                filename: file.originalname,
                mimetype: file.mimetype,
                allowedTypes: allowedMimeTypes
            });
            
            return res.status(400).json({
                error: {
                    message: 'Invalid file type',
                    code: 'INVALID_FILE_TYPE',
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        // Check filename for suspicious patterns
        const suspiciousPatterns = [
            /\.exe$/i,
            /\.bat$/i,
            /\.cmd$/i,
            /\.scr$/i,
            /\.pif$/i,
            /\.vbs$/i,
            /\.js$/i,
            /\.jar$/i,
            /\.php$/i,
            /\.asp$/i,
            /\.jsp$/i
        ];
        
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(file.originalname)) {
                logger.security('Suspicious file upload attempt', {
                    ip: req.ip,
                    filename: file.originalname,
                    mimetype: file.mimetype
                });
                
                return res.status(400).json({
                    error: {
                        message: 'Suspicious file type',
                        code: 'SUSPICIOUS_FILE_TYPE',
                        timestamp: new Date().toISOString()
                    }
                });
            }
        }
    }
    
    next();
};

/**
 * Comprehensive security middleware
 * Combines all security measures
 */
const comprehensiveSecurity = (options = {}) => {
    const {
        maxRequestSize = '10mb',
        allowedIPs = [],
        frequencyLimit = { windowMs: 60000, maxRequests: 100 },
        enableUserAgentValidation = true,
        enableFileUploadSecurity = true
    } = options;
    
    const middlewares = [
        securityHeaders,
        contentSecurityPolicy,
        mongoSanitization,
        xssProtection,
        parameterPollutionProtection,
        requestSizeLimiter(maxRequestSize)
    ];
    
    if (allowedIPs.length > 0) {
        middlewares.push(ipWhitelist(allowedIPs));
    }
    
    if (enableUserAgentValidation) {
        middlewares.push(userAgentValidation);
    }
    
    middlewares.push(requestFrequencyLimiter(frequencyLimit.windowMs, frequencyLimit.maxRequests));
    
    if (enableFileUploadSecurity) {
        middlewares.push(fileUploadSecurity);
    }
    
    return middlewares;
};

module.exports = {
    mongoSanitization,
    xssProtection,
    parameterPollutionProtection,
    contentSecurityPolicy,
    securityHeaders,
    requestSizeLimiter,
    ipWhitelist,
    userAgentValidation,
    requestFrequencyLimiter,
    fileUploadSecurity,
    comprehensiveSecurity
};
