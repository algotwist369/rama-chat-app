const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const messageRoutes = require('./routes/messageRoutes');
const fileRoutes = require('./routes/fileRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Error handling
const { ErrorHandler } = require('./utils/errors');
const { 
    globalErrorHandler, 
    notFoundHandler, 
    errorLogging,
    requestTimeout 
} = require('./middleware/errorHandler');

// Rate limiting
const { 
    generalLimiter, 
    speedLimiter, 
    getRateLimitStatus 
} = require('./middleware/rateLimiter');

// Caching
const { getCacheStats } = require('./middleware/cacheMiddleware');

// Logging and Performance
const { logger } = require('./utils/logger');
const performanceMonitor = require('./utils/performanceMonitor');
const { comprehensiveLogging } = require('./middleware/requestLogger');

// Security
const { comprehensiveSecurity } = require('./middleware/security');
const securityAudit = require('./utils/securityAudit');

const app = express();

// Initialize error handling
ErrorHandler.initialize();

// Start performance monitoring
performanceMonitor.start();

// Request timeout middleware
app.use(requestTimeout(30000)); // 30 seconds timeout

// Compression middleware
app.use(compression());

// Comprehensive security middleware
const securityOptions = {
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
    allowedIPs: process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : [],
    frequencyLimit: {
        windowMs: parseInt(process.env.FREQUENCY_LIMIT_WINDOW) || 60000,
        maxRequests: parseInt(process.env.FREQUENCY_LIMIT_MAX) || 100
    },
    enableUserAgentValidation: process.env.ENABLE_USER_AGENT_VALIDATION !== 'false',
    enableFileUploadSecurity: process.env.ENABLE_FILE_UPLOAD_SECURITY !== 'false'
};

app.use(comprehensiveSecurity(securityOptions));

// Comprehensive logging middleware
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(comprehensiveLogging(logFormat));

// Rate limiting middleware
app.use(generalLimiter);
app.use(speedLimiter);

// Additional security middleware
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
}));

// Body parsing middleware
const jsonLimit = process.env.JSON_LIMIT || '10mb';
const urlLimit = process.env.URL_LIMIT || '10mb';
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: urlLimit }));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['https://chat.d0s369.co.in', 'http://localhost:5173'];

app.use(cors({
    origin: corsOrigins,
    credentials: process.env.CORS_CREDENTIALS === 'true' || true,
    methods: process.env.CORS_METHODS 
        ? process.env.CORS_METHODS.split(',').map(method => method.trim())
        : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: process.env.CORS_HEADERS 
        ? process.env.CORS_HEADERS.split(',').map(header => header.trim())
        : ['Content-Type', 'Authorization']
}));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Remove old request logging middleware (replaced by comprehensive logging)

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: 'RAMA Chat API Server',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            api: '/api',
            docs: '/api/docs'
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database health check
app.get('/health/db', async (req, res) => {
    try {
        const dbHealthMonitor = require('./utils/dbHealthMonitor');
        const healthStatus = await dbHealthMonitor.getHealthStatus();
        
        const statusCode = healthStatus.status === 'healthy' ? 200 : 
                          healthStatus.status === 'warning' ? 200 : 503;
        
        res.status(statusCode).json(healthStatus);
    } catch (error) {
        res.status(503).json({
            status: 'error',
            healthScore: 0,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Rate limit status endpoint
app.get('/health/rate-limit', getRateLimitStatus);

// Cache statistics endpoint
app.get('/health/cache', getCacheStats);

// Performance metrics endpoint
app.get('/health/performance', (req, res) => {
    try {
        const metrics = performanceMonitor.getMetrics();
        res.json({
            performance: metrics,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: {
                message: 'Failed to get performance metrics',
                code: 'PERFORMANCE_METRICS_ERROR',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Security audit endpoint
app.get('/health/security', async (req, res) => {
    try {
        const auditResults = await securityAudit.runAudit();
        res.json({
            security: auditResults,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: {
                message: 'Failed to run security audit',
                code: 'SECURITY_AUDIT_ERROR',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler (must be before global error handler)
app.use('*', notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

module.exports = app;
