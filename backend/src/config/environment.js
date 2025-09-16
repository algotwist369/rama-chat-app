/**
 * Environment Configuration Manager
 * Automatically detects and loads environment-specific configurations
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config();

class EnvironmentConfig {
    constructor() {
        this.env = process.env.NODE_ENV || 'development';
        this.isProduction = this.env === 'production';
        this.isDevelopment = this.env === 'development';
        this.isLocal = this.detectLocalEnvironment();
        
        this.loadConfig();
    }

    /**
     * Detect if running in local environment
     */
    detectLocalEnvironment() {
        // If explicitly set to production, don't detect as local
        if (process.env.NODE_ENV === 'production') {
            return false;
        }

        // Check for common local development indicators
        const localIndicators = [
            process.env.NODE_ENV === 'development',
            process.env.NODE_ENV === 'local',
            process.env.LOCAL_DEVELOPMENT === 'true',
            process.env.USER === 'ankit', // Your local username
            process.env.HOME && process.env.HOME.includes('ankit'), // Your local home path
            process.cwd().includes('Desktop'), // Running from Desktop
            process.cwd().includes('Documents'), // Running from Documents
            (!process.env.PORT || process.env.PORT === '5000') && process.env.NODE_ENV !== 'production', // Default port
            (!process.env.HOST || process.env.HOST === 'localhost' || process.env.HOST === '127.0.0.1') && process.env.NODE_ENV !== 'production'
        ];

        return localIndicators.some(indicator => indicator);
    }

    /**
     * Load environment-specific configuration
     */
    loadConfig() {
        const configPath = path.join(__dirname, '..', '..', '.env');

        // Load consolidated .env file
        if (fs.existsSync(configPath)) {
            require('dotenv').config({ path: configPath });
            console.log('📁 Loaded consolidated .env configuration');
        } else {
            console.warn('⚠️  No .env file found, using defaults');
            this.setupDefaults();
        }

        this.validateAndSetDefaults();
    }

    /**
     * Setup default configuration when .env file is not found
     */
    setupDefaults() {
        console.log('🔧 Setting up default environment configuration...');
        
        // Set basic defaults
        process.env.NODE_ENV = process.env.NODE_ENV || 'development';
        process.env.PORT = process.env.PORT || '9080';
        process.env.HOST = process.env.HOST || 'localhost';
        
        // API configuration
        process.env.API_URL = process.env.API_URL || 'http://localhost:9080';
        process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
        
        // Database - require user to set MONGO_URI
        if (!process.env.MONGO_URI) {
            console.error('❌ MONGO_URI is required. Please set it in your .env file');
            process.exit(1);
        }
        
        // CORS
        process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000';
        process.env.SOCKET_CORS_ORIGINS = process.env.SOCKET_CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000';
        
        // File uploads
        process.env.FILE_BASE_URL = process.env.FILE_BASE_URL || 'http://localhost:9080';
        process.env.UPLOAD_PATH = process.env.UPLOAD_PATH || '/uploads/chat-files';
        
        // JWT - require user to set JWT_SECRET
        if (!process.env.JWT_SECRET) {
            console.error('❌ JWT_SECRET is required. Please set it in your .env file');
            process.exit(1);
        }
        
        // Redis
        process.env.USE_REDIS = process.env.USE_REDIS || 'false';
        process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
        
        console.log('✅ Default environment configuration set');
    }


    /**
     * Validate and set additional defaults
     */
    validateAndSetDefaults() {
        // JWT Configuration
        process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
        process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
        
        // MongoDB Configuration
        process.env.MONGO_SERVER_SELECTION_TIMEOUT = process.env.MONGO_SERVER_SELECTION_TIMEOUT || '30000';
        process.env.MONGO_SOCKET_TIMEOUT = process.env.MONGO_SOCKET_TIMEOUT || '45000';
        process.env.MONGO_CONNECT_TIMEOUT = process.env.MONGO_CONNECT_TIMEOUT || '10000';
        process.env.MONGO_MAX_POOL_SIZE = process.env.MONGO_MAX_POOL_SIZE || '10';
        process.env.MONGO_MIN_POOL_SIZE = process.env.MONGO_MIN_POOL_SIZE || '1';
        process.env.MONGO_MAX_IDLE_TIME = process.env.MONGO_MAX_IDLE_TIME || '30000';
        process.env.MONGO_WAIT_QUEUE_TIMEOUT = process.env.MONGO_WAIT_QUEUE_TIMEOUT || '10000';
        
        // CORS Configuration
        process.env.CORS_CREDENTIALS = process.env.CORS_CREDENTIALS || 'true';
        process.env.CORS_METHODS = process.env.CORS_METHODS || 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
        process.env.CORS_HEADERS = process.env.CORS_HEADERS || 'Content-Type,Authorization';
        
        // Socket.io Configuration
        process.env.SOCKET_CORS_CREDENTIALS = process.env.SOCKET_CORS_CREDENTIALS || 'true';
        process.env.SOCKET_CORS_METHODS = process.env.SOCKET_CORS_METHODS || 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
        process.env.SOCKET_TRANSPORTS = process.env.SOCKET_TRANSPORTS || 'polling,websocket';
        process.env.SOCKET_ALLOW_EIO3 = process.env.SOCKET_ALLOW_EIO3 || 'true';
        process.env.SOCKET_PING_TIMEOUT = process.env.SOCKET_PING_TIMEOUT || '60000';
        process.env.SOCKET_PING_INTERVAL = process.env.SOCKET_PING_INTERVAL || '25000';
        process.env.SOCKET_MAX_HTTP_BUFFER_SIZE = process.env.SOCKET_MAX_HTTP_BUFFER_SIZE || '1000000';
        
        // File Upload Configuration
        process.env.MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || '10485760';
        process.env.ALLOWED_FILE_TYPES = process.env.ALLOWED_FILE_TYPES || 'jpeg,jpg,png,gif,pdf,doc,docx,txt,mp4,avi,mkv';
        
        // Logging Configuration
        process.env.LOG_LEVEL = process.env.LOG_LEVEL || (this.isProduction ? 'warn' : 'info');
        process.env.LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs/app.log';
        
        // Body parsing limits
        process.env.JSON_LIMIT = process.env.JSON_LIMIT || '10mb';
        process.env.URL_LIMIT = process.env.URL_LIMIT || '10mb';
        process.env.MAX_REQUEST_SIZE = process.env.MAX_REQUEST_SIZE || '10mb';
        
        // Security Configuration
        process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '12';
        process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || '900000';
        process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS || '100';
        process.env.FREQUENCY_LIMIT_WINDOW = process.env.FREQUENCY_LIMIT_WINDOW || '60000';
        process.env.FREQUENCY_LIMIT_MAX = process.env.FREQUENCY_LIMIT_MAX || '100';
        
        // Feature Flags
        process.env.ENABLE_DEBUG_ROUTES = process.env.ENABLE_DEBUG_ROUTES || 'false';
        process.env.ENABLE_SWAGGER_UI = process.env.ENABLE_SWAGGER_UI || 'false';
        process.env.ENABLE_METRICS = process.env.ENABLE_METRICS || 'false';
        process.env.ENABLE_USER_AGENT_VALIDATION = process.env.ENABLE_USER_AGENT_VALIDATION || 'true';
        process.env.ENABLE_FILE_UPLOAD_SECURITY = process.env.ENABLE_FILE_UPLOAD_SECURITY || 'true';
        process.env.ENABLE_HEALTH_CHECKS = process.env.ENABLE_HEALTH_CHECKS || 'true';
        process.env.HEALTH_CHECK_INTERVAL = process.env.HEALTH_CHECK_INTERVAL || '30000';
        process.env.ENABLE_PERFORMANCE_MONITORING = process.env.ENABLE_PERFORMANCE_MONITORING || 'false';
    }

    /**
     * Get current environment info
     */
    getEnvironmentInfo() {
        return {
            environment: this.env,
            isProduction: this.isProduction,
            isDevelopment: this.isDevelopment,
            isLocal: this.isLocal,
            port: process.env.PORT,
            host: process.env.HOST,
            apiUrl: process.env.API_URL,
            frontendUrl: process.env.FRONTEND_URL,
            mongoUri: process.env.MONGO_URI ? 'configured' : 'not configured',
            jwtSecret: process.env.JWT_SECRET ? 'configured' : 'not configured'
        };
    }

    /**
     * Print environment information
     */
    printEnvironmentInfo() {
        const info = this.getEnvironmentInfo();
        
        console.log('\n🌍 Environment Information:');
        console.log('============================');
        console.log(`Environment: ${info.environment}`);
        console.log(`Mode: ${info.isProduction ? '🚀 Production' : '🏠 Development'}`);
        console.log(`Local: ${info.isLocal ? '✅ Yes' : '❌ No'}`);
        console.log(`Port: ${info.port}`);
        console.log(`Host: ${info.host}`);
        console.log(`API URL: ${info.apiUrl}`);
        console.log(`Frontend URL: ${info.frontendUrl}`);
        console.log(`Database: ${info.mongoUri}`);
        console.log(`JWT Secret: ${info.jwtSecret}`);
        console.log(`Redis: ${process.env.USE_REDIS === 'true' ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`Debug Routes: ${process.env.ENABLE_DEBUG_ROUTES === 'true' ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`Metrics: ${process.env.ENABLE_METRICS === 'true' ? '✅ Enabled' : '❌ Disabled'}`);
        console.log('============================\n');
    }
}

// Create and export singleton instance
const envConfig = new EnvironmentConfig();

module.exports = envConfig;
