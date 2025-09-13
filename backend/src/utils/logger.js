const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

/**
 * Advanced Logging System
 * Provides structured logging with multiple transports and log levels
 */

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }
        
        return log;
    })
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} ${level}: ${message}`;
        
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta, null, 2)}`;
        }
        
        return log;
    })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: {
        service: 'chat-app-backend',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: consoleFormat,
            silent: process.env.NODE_ENV === 'test'
        }),

        // Combined log file (all levels)
        new DailyRotateFile({
            filename: path.join(logsDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            zippedArchive: true,
            format: logFormat
        }),

        // Error log file (errors only)
        new DailyRotateFile({
            filename: path.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '30d',
            zippedArchive: true,
            format: logFormat
        }),

        // Access log file (HTTP requests)
        new DailyRotateFile({
            filename: path.join(logsDir, 'access-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '7d',
            zippedArchive: true,
            format: logFormat
        }),

        // Performance log file (slow queries, performance metrics)
        new DailyRotateFile({
            filename: path.join(logsDir, 'performance-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '7d',
            zippedArchive: true,
            format: logFormat
        })
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log'),
            format: logFormat
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log'),
            format: logFormat
        })
    ]
});

// Add custom log levels (colors are handled by winston internally)
// logger.addColors is not needed as colors are defined in the format

// Custom logging methods
class Logger {
    constructor() {
        this.logger = logger;
    }

    /**
     * Log HTTP requests
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {number} responseTime - Response time in milliseconds
     */
    http(req, res, responseTime) {
        const logData = {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            userId: req.user?.id,
            contentLength: res.get('Content-Length') || 0
        };

        // Log slow requests as warnings
        if (responseTime > 1000) {
            this.logger.warn('Slow HTTP request detected', logData);
        } else {
            this.logger.http('HTTP request', logData);
        }
    }

    /**
     * Log database operations
     * @param {string} operation - Database operation
     * @param {string} collection - Collection name
     * @param {number} duration - Operation duration in milliseconds
     * @param {Object} metadata - Additional metadata
     */
    database(operation, collection, duration, metadata = {}) {
        const logData = {
            operation,
            collection,
            duration: `${duration}ms`,
            ...metadata
        };

        // Log slow queries as warnings
        if (duration > 100) {
            this.logger.warn('Slow database query detected', logData);
        } else {
            this.logger.debug('Database operation', logData);
        }
    }

    /**
     * Log performance metrics
     * @param {string} metric - Metric name
     * @param {number} value - Metric value
     * @param {string} unit - Unit of measurement
     * @param {Object} metadata - Additional metadata
     */
    performance(metric, value, unit = 'ms', metadata = {}) {
        this.logger.info('Performance metric', {
            metric,
            value,
            unit,
            ...metadata
        });
    }

    /**
     * Log security events
     * @param {string} event - Security event type
     * @param {Object} details - Event details
     * @param {string} severity - Event severity (low, medium, high, critical)
     */
    security(event, details, severity = 'medium') {
        this.logger.warn('Security event', {
            event,
            severity,
            ...details
        });
    }

    /**
     * Log authentication events
     * @param {string} event - Auth event type
     * @param {string} userId - User ID
     * @param {Object} metadata - Additional metadata
     */
    auth(event, userId, metadata = {}) {
        this.logger.info('Authentication event', {
            event,
            userId,
            ...metadata
        });
    }

    /**
     * Log business logic events
     * @param {string} event - Business event type
     * @param {Object} details - Event details
     */
    business(event, details) {
        this.logger.info('Business event', {
            event,
            ...details
        });
    }

    /**
     * Log system events
     * @param {string} event - System event type
     * @param {Object} details - Event details
     */
    system(event, details) {
        this.logger.info('System event', {
            event,
            ...details
        });
    }

    /**
     * Log errors with context
     * @param {Error} error - Error object
     * @param {Object} context - Error context
     */
    error(error, context = {}) {
        this.logger.error('Application error', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            ...context
        });
    }

    /**
     * Log warnings
     * @param {string} message - Warning message
     * @param {Object} metadata - Additional metadata
     */
    warn(message, metadata = {}) {
        this.logger.warn(message, metadata);
    }

    /**
     * Log info messages
     * @param {string} message - Info message
     * @param {Object} metadata - Additional metadata
     */
    info(message, metadata = {}) {
        this.logger.info(message, metadata);
    }

    /**
     * Log debug messages
     * @param {string} message - Debug message
     * @param {Object} metadata - Additional metadata
     */
    debug(message, metadata = {}) {
        this.logger.debug(message, metadata);
    }

    /**
     * Create child logger with additional context
     * @param {Object} context - Additional context
     * @returns {Logger} Child logger instance
     */
    child(context) {
        const childLogger = this.logger.child(context);
        return new Logger(childLogger);
    }

    /**
     * Get log statistics
     * @returns {Object} Log statistics
     */
    getStats() {
        return {
            level: this.logger.level,
            transports: this.logger.transports.length,
            environment: process.env.NODE_ENV || 'development'
        };
    }
}

// Create singleton instance
const appLogger = new Logger();

// Export both the class and instance
module.exports = {
    Logger,
    logger: appLogger,
    winston
};
