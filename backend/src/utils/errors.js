/**
 * Custom Error Classes and Error Handling Utilities
 * Provides structured error handling with proper HTTP status codes and logging
 */

/**
 * Base Application Error Class
 */
class AppError extends Error {
    constructor(message, statusCode, isOperational = true, code = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        this.timestamp = new Date().toISOString();
        this.stack = this.stack;

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convert error to JSON format
     * @returns {Object} Error in JSON format
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            code: this.code,
            timestamp: this.timestamp,
            isOperational: this.isOperational
        };
    }
}

/**
 * Validation Error Class
 */
class ValidationError extends AppError {
    constructor(message, details = null, code = 'VALIDATION_ERROR') {
        super(message, 400, true, code);
        this.details = details;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            details: this.details
        };
    }
}

/**
 * Authentication Error Class
 */
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed', code = 'AUTH_ERROR') {
        super(message, 401, true, code);
    }
}

/**
 * Authorization Error Class
 */
class AuthorizationError extends AppError {
    constructor(message = 'Access denied', code = 'AUTHORIZATION_ERROR') {
        super(message, 403, true, code);
    }
}

/**
 * Not Found Error Class
 */
class NotFoundError extends AppError {
    constructor(resource = 'Resource', code = 'NOT_FOUND') {
        super(`${resource} not found`, 404, true, code);
    }
}

/**
 * Conflict Error Class
 */
class ConflictError extends AppError {
    constructor(message, code = 'CONFLICT') {
        super(message, 409, true, code);
    }
}

/**
 * Rate Limit Error Class
 */
class RateLimitError extends AppError {
    constructor(message = 'Too many requests', retryAfter = null, code = 'RATE_LIMIT') {
        super(message, 429, true, code);
        this.retryAfter = retryAfter;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            retryAfter: this.retryAfter
        };
    }
}

/**
 * Database Error Class
 */
class DatabaseError extends AppError {
    constructor(message, originalError = null, code = 'DATABASE_ERROR') {
        super(message, 500, true, code);
        this.originalError = originalError;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            originalError: process.env.NODE_ENV === 'development' ? this.originalError : undefined
        };
    }
}

/**
 * External Service Error Class
 */
class ExternalServiceError extends AppError {
    constructor(service, message, originalError = null, code = 'EXTERNAL_SERVICE_ERROR') {
        super(`${service}: ${message}`, 502, true, code);
        this.service = service;
        this.originalError = originalError;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            service: this.service,
            originalError: process.env.NODE_ENV === 'development' ? this.originalError : undefined
        };
    }
}

/**
 * File Upload Error Class
 */
class FileUploadError extends AppError {
    constructor(message, fileInfo = null, code = 'FILE_UPLOAD_ERROR') {
        super(message, 400, true, code);
        this.fileInfo = fileInfo;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            fileInfo: this.fileInfo
        };
    }
}

/**
 * Socket Error Class
 */
class SocketError extends AppError {
    constructor(message, event = null, code = 'SOCKET_ERROR') {
        super(message, 400, true, code);
        this.event = event;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            event: this.event
        };
    }
}

/**
 * Error Handler Utility Class
 */
class ErrorHandler {
    /**
     * Handle MongoDB/Mongoose errors
     * @param {Error} error - Mongoose error
     * @returns {AppError} Formatted application error
     */
    static handleMongooseError(error) {
        if (error.name === 'ValidationError') {
            const details = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));
            return new ValidationError('Validation failed', details);
        }

        if (error.name === 'CastError') {
            return new ValidationError(`Invalid ${error.path}: ${error.value}`);
        }

        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            const value = error.keyValue[field];
            return new ConflictError(`${field} '${value}' already exists`);
        }

        if (error.name === 'MongoNetworkError') {
            return new DatabaseError('Database connection failed', error);
        }

        if (error.name === 'MongoTimeoutError') {
            return new DatabaseError('Database operation timeout', error);
        }

        return new DatabaseError('Database operation failed', error);
    }

    /**
     * Handle JWT errors
     * @param {Error} error - JWT error
     * @returns {AppError} Formatted application error
     */
    static handleJWTError(error) {
        if (error.name === 'JsonWebTokenError') {
            return new AuthenticationError('Invalid token');
        }

        if (error.name === 'TokenExpiredError') {
            return new AuthenticationError('Token expired');
        }

        if (error.name === 'NotBeforeError') {
            return new AuthenticationError('Token not active');
        }

        return new AuthenticationError('Token validation failed');
    }

    /**
     * Handle file upload errors
     * @param {Error} error - Multer error
     * @returns {AppError} Formatted application error
     */
    static handleMulterError(error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return new FileUploadError('File too large', {
                maxSize: error.limit,
                receivedSize: error.received
            });
        }

        if (error.code === 'LIMIT_FILE_COUNT') {
            return new FileUploadError('Too many files', {
                maxCount: error.limit,
                receivedCount: error.received
            });
        }

        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return new FileUploadError('Unexpected file field', {
                field: error.field
            });
        }

        return new FileUploadError('File upload failed', error);
    }

    /**
     * Handle Redis errors
     * @param {Error} error - Redis error
     * @returns {AppError} Formatted application error
     */
    static handleRedisError(error) {
        if (error.code === 'ECONNREFUSED') {
            return new ExternalServiceError('Redis', 'Connection refused');
        }

        if (error.code === 'ETIMEDOUT') {
            return new ExternalServiceError('Redis', 'Connection timeout');
        }

        return new ExternalServiceError('Redis', 'Service unavailable', error);
    }

    /**
     * Log error with appropriate level
     * @param {Error} error - Error to log
     * @param {Object} context - Additional context
     */
    static logError(error, context = {}) {
        const logData = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            context
        };

        if (error instanceof AppError && error.isOperational) {
            console.warn('⚠️  Operational Error:', logData);
        } else {
            console.error('❌ System Error:', logData);
        }
    }

    /**
     * Send error response to client
     * @param {Error} error - Error to send
     * @param {Object} res - Express response object
     */
    static sendErrorResponse(error, res) {
        let statusCode = 500;
        let message = 'Internal server error';
        let code = 'INTERNAL_ERROR';
        let details = null;

        if (error instanceof AppError) {
            statusCode = error.statusCode;
            message = error.message;
            code = error.code;
            details = error.details;
        } else {
            // Log unexpected errors
            this.logError(error, { endpoint: res.req?.path, method: res.req?.method });
        }

        const response = {
            error: {
                message,
                code,
                timestamp: new Date().toISOString()
            }
        };

        if (details) {
            response.error.details = details;
        }

        // Include stack trace in development
        if (process.env.NODE_ENV === 'development') {
            response.error.stack = error.stack;
        }

        res.status(statusCode).json(response);
    }

    /**
     * Handle async errors in route handlers
     * @param {Function} fn - Async function
     * @returns {Function} Wrapped function with error handling
     */
    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * Handle uncaught exceptions
     */
    static handleUncaughtException() {
        process.on('uncaughtException', (error) => {
            console.error('💥 Uncaught Exception:', error);
            this.logError(error, { type: 'uncaughtException' });
            
            // Graceful shutdown
            process.exit(1);
        });
    }

    /**
     * Handle unhandled promise rejections
     */
    static handleUnhandledRejection() {
        process.on('unhandledRejection', (reason, promise) => {
            console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            this.logError(reason, { type: 'unhandledRejection', promise });
            
            // Graceful shutdown
            process.exit(1);
        });
    }

    /**
     * Initialize error handling
     */
    static initialize() {
        this.handleUncaughtException();
        this.handleUnhandledRejection();
    }
}

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    DatabaseError,
    ExternalServiceError,
    FileUploadError,
    SocketError,
    ErrorHandler
};
