const { logger } = require('./logger');
const os = require('os');
const process = require('process');

/**
 * Performance Monitoring Utility
 * Tracks and reports application performance metrics
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
                slow: 0
            },
            responseTime: {
                min: Infinity,
                max: 0,
                sum: 0,
                count: 0
            },
            memory: {
                heapUsed: 0,
                heapTotal: 0,
                external: 0,
                rss: 0
            },
            database: {
                queries: 0,
                slowQueries: 0,
                avgQueryTime: 0
            },
            cache: {
                hits: 0,
                misses: 0,
                hitRate: 0
            },
            errors: {
                total: 0,
                byType: {}
            }
        };

        this.startTime = Date.now();
        this.intervalId = null;
        this.slowRequestThreshold = 1000; // 1 second
        this.slowQueryThreshold = 100; // 100ms
    }

    /**
     * Start performance monitoring
     * @param {number} interval - Monitoring interval in milliseconds
     */
    start(interval = 60000) { // 1 minute default
        this.intervalId = setInterval(() => {
            this.collectMetrics();
            this.logMetrics();
        }, interval);

        logger.system('Performance monitoring started', {
            interval: `${interval}ms`,
            slowRequestThreshold: `${this.slowRequestThreshold}ms`,
            slowQueryThreshold: `${this.slowQueryThreshold}ms`
        });
    }

    /**
     * Stop performance monitoring
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            logger.system('Performance monitoring stopped');
        }
    }

    /**
     * Record HTTP request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {number} responseTime - Response time in milliseconds
     */
    recordRequest(req, res, responseTime) {
        this.metrics.requests.total++;
        
        if (res.statusCode >= 200 && res.statusCode < 400) {
            this.metrics.requests.successful++;
        } else {
            this.metrics.requests.failed++;
        }

        if (responseTime > this.slowRequestThreshold) {
            this.metrics.requests.slow++;
        }

        // Update response time metrics
        this.updateResponseTimeMetrics(responseTime);

        // Log slow requests
        if (responseTime > this.slowRequestThreshold) {
            logger.performance('Slow request detected', {
                method: req.method,
                url: req.originalUrl,
                responseTime: `${responseTime}ms`,
                statusCode: res.statusCode,
                userId: req.user?.id
            });
        }
    }

    /**
     * Record database query
     * @param {string} operation - Database operation
     * @param {string} collection - Collection name
     * @param {number} duration - Query duration in milliseconds
     * @param {Object} metadata - Additional metadata
     */
    recordDatabaseQuery(operation, collection, duration, metadata = {}) {
        this.metrics.database.queries++;
        
        if (duration > this.slowQueryThreshold) {
            this.metrics.database.slowQueries++;
        }

        // Update average query time
        const totalTime = this.metrics.database.avgQueryTime * (this.metrics.database.queries - 1) + duration;
        this.metrics.database.avgQueryTime = totalTime / this.metrics.database.queries;

        // Log slow queries
        if (duration > this.slowQueryThreshold) {
            logger.performance('Slow database query detected', {
                operation,
                collection,
                duration: `${duration}ms`,
                ...metadata
            });
        }
    }

    /**
     * Record cache operation
     * @param {boolean} hit - Whether it was a cache hit
     * @param {string} key - Cache key
     * @param {number} responseTime - Response time in milliseconds
     */
    recordCacheOperation(hit, key, responseTime = 0) {
        if (hit) {
            this.metrics.cache.hits++;
        } else {
            this.metrics.cache.misses++;
        }

        // Calculate hit rate
        const total = this.metrics.cache.hits + this.metrics.cache.misses;
        this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;
    }

    /**
     * Record error
     * @param {Error} error - Error object
     * @param {Object} context - Error context
     */
    recordError(error, context = {}) {
        this.metrics.errors.total++;
        
        const errorType = error.name || 'UnknownError';
        this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;

        logger.error(error, {
            errorType,
            ...context
        });
    }

    /**
     * Update response time metrics
     * @param {number} responseTime - Response time in milliseconds
     */
    updateResponseTimeMetrics(responseTime) {
        this.metrics.responseTime.min = Math.min(this.metrics.responseTime.min, responseTime);
        this.metrics.responseTime.max = Math.max(this.metrics.responseTime.max, responseTime);
        this.metrics.responseTime.sum += responseTime;
        this.metrics.responseTime.count++;
    }

    /**
     * Collect system metrics
     */
    collectMetrics() {
        const memUsage = process.memoryUsage();
        this.metrics.memory = {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss
        };
    }

    /**
     * Log performance metrics
     */
    logMetrics() {
        const uptime = Date.now() - this.startTime;
        const avgResponseTime = this.metrics.responseTime.count > 0 
            ? this.metrics.responseTime.sum / this.metrics.responseTime.count 
            : 0;

        const metrics = {
            uptime: `${Math.floor(uptime / 1000)}s`,
            requests: {
                total: this.metrics.requests.total,
                successful: this.metrics.requests.successful,
                failed: this.metrics.requests.failed,
                slow: this.metrics.requests.slow,
                successRate: this.metrics.requests.total > 0 
                    ? (this.metrics.requests.successful / this.metrics.requests.total) * 100 
                    : 0
            },
            responseTime: {
                min: this.metrics.responseTime.min === Infinity ? 0 : this.metrics.responseTime.min,
                max: this.metrics.responseTime.max,
                average: Math.round(avgResponseTime * 100) / 100
            },
            memory: {
                heapUsed: `${Math.round(this.metrics.memory.heapUsed / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(this.metrics.memory.heapTotal / 1024 / 1024)}MB`,
                external: `${Math.round(this.metrics.memory.external / 1024 / 1024)}MB`,
                rss: `${Math.round(this.metrics.memory.rss / 1024 / 1024)}MB`
            },
            database: {
                queries: this.metrics.database.queries,
                slowQueries: this.metrics.database.slowQueries,
                avgQueryTime: Math.round(this.metrics.database.avgQueryTime * 100) / 100
            },
            cache: {
                hits: this.metrics.cache.hits,
                misses: this.metrics.cache.misses,
                hitRate: Math.round(this.metrics.cache.hitRate * 100) / 100
            },
            errors: {
                total: this.metrics.errors.total,
                byType: this.metrics.errors.byType
            },
            system: {
                cpuUsage: process.cpuUsage(),
                loadAverage: os.loadavg(),
                freeMemory: `${Math.round(os.freemem() / 1024 / 1024)}MB`,
                totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)}MB`
            }
        };

        logger.performance('Performance metrics', metrics);
    }

    /**
     * Get current metrics
     * @returns {Object} Current performance metrics
     */
    getMetrics() {
        const uptime = Date.now() - this.startTime;
        const avgResponseTime = this.metrics.responseTime.count > 0 
            ? this.metrics.responseTime.sum / this.metrics.responseTime.count 
            : 0;

        return {
            uptime: Math.floor(uptime / 1000),
            requests: {
                ...this.metrics.requests,
                successRate: this.metrics.requests.total > 0 
                    ? (this.metrics.requests.successful / this.metrics.requests.total) * 100 
                    : 0
            },
            responseTime: {
                min: this.metrics.responseTime.min === Infinity ? 0 : this.metrics.responseTime.min,
                max: this.metrics.responseTime.max,
                average: Math.round(avgResponseTime * 100) / 100
            },
            memory: this.metrics.memory,
            database: this.metrics.database,
            cache: this.metrics.cache,
            errors: this.metrics.errors
        };
    }

    /**
     * Reset metrics
     */
    reset() {
        this.metrics = {
            requests: { total: 0, successful: 0, failed: 0, slow: 0 },
            responseTime: { min: Infinity, max: 0, sum: 0, count: 0 },
            memory: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 },
            database: { queries: 0, slowQueries: 0, avgQueryTime: 0 },
            cache: { hits: 0, misses: 0, hitRate: 0 },
            errors: { total: 0, byType: {} }
        };
        this.startTime = Date.now();
        
        logger.system('Performance metrics reset');
    }

    /**
     * Set slow request threshold
     * @param {number} threshold - Threshold in milliseconds
     */
    setSlowRequestThreshold(threshold) {
        this.slowRequestThreshold = threshold;
        logger.system('Slow request threshold updated', { threshold: `${threshold}ms` });
    }

    /**
     * Set slow query threshold
     * @param {number} threshold - Threshold in milliseconds
     */
    setSlowQueryThreshold(threshold) {
        this.slowQueryThreshold = threshold;
        logger.system('Slow query threshold updated', { threshold: `${threshold}ms` });
    }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;
