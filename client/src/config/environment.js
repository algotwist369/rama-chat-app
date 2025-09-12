/**
 * Frontend Environment Configuration Manager
 * Automatically detects and loads environment-specific configurations
 */

class FrontendEnvironmentConfig {
    constructor() {
        // Handle both Vite (import.meta.env) and Node.js (process.env) environments
        this.env = (typeof import.meta !== 'undefined' && import.meta.env?.MODE) || 
                   process.env.MODE || 
                   process.env.NODE_ENV || 
                   'development';
        this.isProduction = this.env === 'production';
        this.isDevelopment = this.env === 'development';
        this.isLocal = this.detectLocalEnvironment();
        
        this.loadConfig();
    }

    /**
     * Detect if running in local environment
     */
    detectLocalEnvironment() {
        // Check for common local development indicators
        const localIndicators = [
            this.env === 'development',
            // Only check window properties if running in browser
            typeof window !== 'undefined' && window.location.hostname === 'localhost',
            typeof window !== 'undefined' && window.location.hostname === '127.0.0.1',
            typeof window !== 'undefined' && window.location.port === '5173', // Vite default port
            typeof window !== 'undefined' && window.location.port === '3000', // React default port
            typeof window !== 'undefined' && window.location.protocol === 'http:',
            // Check Vite environment if available
            typeof import.meta !== 'undefined' && import.meta.env?.DEV === true
        ];

        return localIndicators.some(indicator => indicator);
    }

    /**
     * Get environment variable from either Vite or Node.js
     */
    getEnvVar(key) {
        // Try Vite environment first (import.meta.env)
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            return import.meta.env[key];
        }
        // Fallback to Node.js environment (process.env)
        return process.env[key];
    }

    /**
     * Load environment-specific configuration
     */
    loadConfig() {
        // Set environment-specific defaults
        if (this.isLocal || this.isDevelopment) {
            this.setupLocalDefaults();
        } else if (this.isProduction) {
            this.setupProductionDefaults();
        }

        this.validateAndSetDefaults();
    }

    /**
     * Setup local development defaults
     */
    setupLocalDefaults() {
        console.log('🏠 Setting up local frontend environment...');
        
        // Local API configuration
        this.config = {
            API_URL: this.getEnvVar('VITE_API_URL') || 'http://localhost:9080',
            FRONTEND_URL: this.getEnvVar('VITE_FRONTEND_URL') || 'http://localhost:5173',
            SOCKET_URL: this.getEnvVar('VITE_SOCKET_URL') || 'http://localhost:9080',
            
            // Local development settings
            DEBUG_MODE: true,
            LOG_LEVEL: 'debug',
            ENABLE_DEV_TOOLS: true,
            ENABLE_HOT_RELOAD: true,
            
            // API settings
            API_TIMEOUT: 30000,
            RETRY_ATTEMPTS: 3,
            RETRY_DELAY: 1000,
            
            // Socket.io settings
            SOCKET_TIMEOUT: 20000,
            SOCKET_RECONNECTION_ATTEMPTS: 5,
            SOCKET_RECONNECTION_DELAY: 2000,
            SOCKET_RECONNECTION_DELAY_MAX: 10000,
            
            // Feature flags
            ENABLE_NOTIFICATIONS: true,
            ENABLE_TYPING_INDICATOR: true,
            ENABLE_ONLINE_STATUS: true,
            ENABLE_FILE_UPLOAD: true,
            ENABLE_EMOJI_PICKER: true,
            ENABLE_MESSAGE_SEARCH: true,
            
            // UI settings
            THEME: 'light',
            LANGUAGE: 'en',
            TIMEZONE: 'UTC',
            DATE_FORMAT: 'MM/DD/YYYY',
            TIME_FORMAT: '12h'
        };
        
        console.log('✅ Local frontend environment configured');
    }

    /**
     * Setup production defaults
     */
    setupProductionDefaults() {
        console.log('🚀 Setting up production frontend environment...');
        
        // Production API configuration
        this.config = {
            API_URL: this.getEnvVar('VITE_API_URL') || 'https://c.api.d0s369.co.in',
            FRONTEND_URL: this.getEnvVar('VITE_FRONTEND_URL') || 'https://chat.d0s369.co.in',
            SOCKET_URL: this.getEnvVar('VITE_SOCKET_URL') || 'https://c.api.d0s369.co.in',
            
            // Production settings
            DEBUG_MODE: false,
            LOG_LEVEL: 'warn',
            ENABLE_DEV_TOOLS: false,
            ENABLE_HOT_RELOAD: false,
            
            // API settings
            API_TIMEOUT: 30000,
            RETRY_ATTEMPTS: 3,
            RETRY_DELAY: 1000,
            
            // Socket.io settings
            SOCKET_TIMEOUT: 20000,
            SOCKET_RECONNECTION_ATTEMPTS: 5,
            SOCKET_RECONNECTION_DELAY: 2000,
            SOCKET_RECONNECTION_DELAY_MAX: 10000,
            
            // Feature flags
            ENABLE_NOTIFICATIONS: true,
            ENABLE_TYPING_INDICATOR: true,
            ENABLE_ONLINE_STATUS: true,
            ENABLE_FILE_UPLOAD: true,
            ENABLE_EMOJI_PICKER: true,
            ENABLE_MESSAGE_SEARCH: true,
            
            // UI settings
            THEME: 'light',
            LANGUAGE: 'en',
            TIMEZONE: 'UTC',
            DATE_FORMAT: 'MM/DD/YYYY',
            TIME_FORMAT: '12h'
        };
        
        console.log('✅ Production frontend environment configured');
    }

    /**
     * Validate and set additional defaults
     */
    validateAndSetDefaults() {
        // Ensure required URLs are set
        if (!this.config.API_URL) {
            throw new Error('API_URL is required');
        }
        
        if (!this.config.SOCKET_URL) {
            this.config.SOCKET_URL = this.config.API_URL;
        }

        // Set additional defaults
        this.config.APP_NAME = 'RAMA Chat App';
        this.config.APP_VERSION = '1.0.0';
        this.config.BUILD_TIME = new Date().toISOString();
        
        // Performance settings
        this.config.DEBOUNCE_DELAY = 300;
        this.config.THROTTLE_DELAY = 1000;
        this.config.CACHE_DURATION = 300000; // 5 minutes
        
        // File upload settings
        this.config.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        this.config.ALLOWED_FILE_TYPES = ['jpeg', 'jpg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt', 'mp4', 'avi', 'mkv'];
        
        // Message settings
        this.config.MAX_MESSAGE_LENGTH = 1000;
        this.config.MESSAGES_PER_PAGE = 50;
        this.config.TYPING_INDICATOR_TIMEOUT = 3000;
        
        // Notification settings
        this.config.NOTIFICATION_DURATION = 5000;
        this.config.NOTIFICATION_POSITION = 'top-right';
        
        // Storage settings
        this.config.LOCAL_STORAGE_PREFIX = 'rama_chat_';
        this.config.SESSION_STORAGE_PREFIX = 'rama_chat_session_';
    }

    /**
     * Get configuration value
     */
    get(key, defaultValue = null) {
        return this.config[key] !== undefined ? this.config[key] : defaultValue;
    }

    /**
     * Get all configuration
     */
    getAll() {
        return { ...this.config };
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
            apiUrl: this.config.API_URL,
            frontendUrl: this.config.FRONTEND_URL,
            socketUrl: this.config.SOCKET_URL,
            debugMode: this.config.DEBUG_MODE,
            logLevel: this.config.LOG_LEVEL
        };
    }

    /**
     * Print environment information
     */
    printEnvironmentInfo() {
        const info = this.getEnvironmentInfo();
        
        console.log('\n🌍 Frontend Environment Information:');
        console.log('=====================================');
        console.log(`Environment: ${info.environment}`);
        console.log(`Mode: ${info.isProduction ? '🚀 Production' : '🏠 Development'}`);
        console.log(`Local: ${info.isLocal ? '✅ Yes' : '❌ No'}`);
        console.log(`API URL: ${info.apiUrl}`);
        console.log(`Frontend URL: ${info.frontendUrl}`);
        console.log(`Socket URL: ${info.socketUrl}`);
        console.log(`Debug Mode: ${info.debugMode ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`Log Level: ${info.logLevel}`);
        console.log('=====================================\n');
    }

    /**
     * Check if feature is enabled
     */
    isFeatureEnabled(feature) {
        return this.config[`ENABLE_${feature.toUpperCase()}`] === true;
    }

    /**
     * Get API endpoint URL
     */
    getApiUrl(endpoint = '') {
        const baseUrl = this.config.API_URL.endsWith('/') 
            ? this.config.API_URL.slice(0, -1) 
            : this.config.API_URL;
        const apiEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return `${baseUrl}/api${apiEndpoint}`;
    }

    /**
     * Get Socket.io URL
     */
    getSocketUrl() {
        return this.config.SOCKET_URL;
    }

    /**
     * Get file upload URL
     */
    getFileUploadUrl() {
        return this.getApiUrl('/upload');
    }

    /**
     * Get file URL
     */
    getFileUrl(filename) {
        const baseUrl = this.config.API_URL.endsWith('/') 
            ? this.config.API_URL.slice(0, -1) 
            : this.config.API_URL;
        return `${baseUrl}/uploads/chat-files/${filename}`;
    }
}

// Create and export singleton instance
const frontendEnvConfig = new FrontendEnvironmentConfig();

export default frontendEnvConfig;
