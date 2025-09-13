const { ErrorHandler, AppError } = require('../utils/errors');

/**
 * Comprehensive Error Handling Middleware
 * Handles all types of errors and provides appropriate responses
 */

/**
 * Global error handling middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = (error, req, res, next) => {
    // Log error with request context
    const context = {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id,
        body: req.body,
        query: req.query,
        params: req.params
    };

    ErrorHandler.logError(error, context);

    // Handle different types of errors
    if (error instanceof AppError) {
        // Application errors (operational)
        return ErrorHandler.sendErrorResponse(error, res);
    }

    // Handle Mongoose errors
    if (error.name === 'ValidationError' || error.name === 'CastError' || error.code === 11000) {
        const appError = ErrorHandler.handleMongooseError(error);
        return ErrorHandler.sendErrorResponse(appError, res);
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError') {
        const appError = ErrorHandler.handleJWTError(error);
        return ErrorHandler.sendErrorResponse(appError, res);
    }

    // Handle Multer errors
    if (error.code && error.code.startsWith('LIMIT_')) {
        const appError = ErrorHandler.handleMulterError(error);
        return ErrorHandler.sendErrorResponse(appError, res);
    }

    // Handle Redis errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        const appError = ErrorHandler.handleRedisError(error);
        return ErrorHandler.sendErrorResponse(appError, res);
    }

    // Handle syntax errors (malformed JSON)
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return ErrorHandler.sendErrorResponse(
            new AppError('Invalid JSON format', 400, true, 'INVALID_JSON'),
            res
        );
    }

    // Handle timeout errors
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        return ErrorHandler.sendErrorResponse(
            new AppError('Request timeout', 408, true, 'TIMEOUT'),
            res
        );
    }

    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return ErrorHandler.sendErrorResponse(
            new AppError('Network error', 503, true, 'NETWORK_ERROR'),
            res
        );
    }

    // Default to internal server error
    ErrorHandler.sendErrorResponse(error, res);
};

/**
 * Handle 404 errors (route not found)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
    const error = new AppError(
        `Route ${req.method} ${req.originalUrl} not found`,
        404,
        true,
        'ROUTE_NOT_FOUND'
    );
    next(error);
};

/**
 * Handle async errors in route handlers
 * @param {Function} fn - Async function
 * @returns {Function} Wrapped function with error handling
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Validation error handler for specific validation failures
 * @param {Error} error - Validation error
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validationErrorHandler = (error, req, res, next) => {
    if (error.name === 'ValidationError') {
        const details = Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message,
            value: err.value
        }));

        return res.status(400).json({
            error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details,
                timestamp: new Date().toISOString()
            }
        });
    }
    next(error);
};

/**
 * Database error handler
 * @param {Error} error - Database error
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const databaseErrorHandler = (error, req, res, next) => {
    if (error.name === 'MongoError' || error.name === 'MongoNetworkError') {
        return res.status(503).json({
            error: {
                message: 'Database service temporarily unavailable',
                code: 'DATABASE_ERROR',
                timestamp: new Date().toISOString()
            }
        });
    }
    next(error);
};

/**
 * Rate limit error handler
 * @param {Error} error - Rate limit error
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const rateLimitErrorHandler = (error, req, res, next) => {
    if (error.status === 429) {
        return res.status(429).json({
            error: {
                message: 'Too many requests',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: error.retryAfter,
                timestamp: new Date().toISOString()
            }
        });
    }
    next(error);
};

/**
 * File upload error handler
 * @param {Error} error - File upload error
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const fileUploadErrorHandler = (error, req, res, next) => {
    if (error.code && error.code.startsWith('LIMIT_')) {
        let message = 'File upload failed';
        let details = null;

        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                message = 'File too large';
                details = {
                    maxSize: error.limit,
                    receivedSize: error.received
                };
                break;
            case 'LIMIT_FILE_COUNT':
                message = 'Too many files';
                details = {
                    maxCount: error.limit,
                    receivedCount: error.received
                };
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = 'Unexpected file field';
                details = {
                    field: error.field
                };
                break;
        }

        return res.status(400).json({
            error: {
                message,
                code: 'FILE_UPLOAD_ERROR',
                details,
                timestamp: new Date().toISOString()
            }
        });
    }
    next(error);
};

/**
 * Socket error handler
 * @param {Error} error - Socket error
 * @param {Object} socket - Socket object
 * @param {Function} next - Next function
 */
const socketErrorHandler = (error, socket, next) => {
    console.error('Socket error:', error);
    
    const errorResponse = {
        error: {
            message: error.message || 'Socket error occurred',
            code: error.code || 'SOCKET_ERROR',
            timestamp: new Date().toISOString()
        }
    };

    socket.emit('error', errorResponse);
    next();
};

/**
 * Request timeout middleware
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Function} Middleware function
 */
const requestTimeout = (timeout = 30000) => {
    return (req, res, next) => {
        req.setTimeout(timeout, () => {
            const error = new AppError('Request timeout', 408, true, 'TIMEOUT');
            next(error);
        });
        next();
    };
};

/**
 * Error logging middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorLogging = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Log error responses
        if (res.statusCode >= 400) {
            console.error(`❌ Error Response: ${res.statusCode} ${req.method} ${req.url}`, {
                statusCode: res.statusCode,
                method: req.method,
                url: req.url,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                userId: req.user?.id,
                timestamp: new Date().toISOString()
            });
        }
        
        originalSend.call(this, data);
    };
    
    next();
};

module.exports = {
    globalErrorHandler,
    notFoundHandler,
    asyncHandler,
    validationErrorHandler,
    databaseErrorHandler,
    rateLimitErrorHandler,
    fileUploadErrorHandler,
    socketErrorHandler,
    requestTimeout,
    errorLogging
};
