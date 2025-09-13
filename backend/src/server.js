 

const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const initSocket = require('./sockets/chatSocket');
const { connectRedis, disconnectRedis } = require('./config/redis');
const envConfig = require('./config/environment');
const { createIndexes } = require('./config/databaseIndexes');

const server = http.createServer(app);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Log the error with context
    const errorContext = {
        type: 'unhandledRejection',
        promise: promise,
        reason: reason,
        timestamp: new Date().toISOString()
    };
    
    console.error('❌ System Error:', {
        name: reason?.name || 'Unknown',
        message: reason?.message || 'Unhandled promise rejection',
        stack: reason?.stack || 'No stack trace available',
        timestamp: errorContext.timestamp,
        context: errorContext
    });
    
    // Don't exit the process, just log the error
    // process.exit(1); // Uncomment if you want to exit on unhandled rejections
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    console.error('❌ System Error:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    });
    
    // Exit the process for uncaught exceptions as they can leave the app in an undefined state
    process.exit(1);
});

(async () => {
    try {
        console.log('🚀 Starting RAMA Chat Backend Server...');
        
        // Print environment information
        envConfig.printEnvironmentInfo();
        
        // Connect to database (indexes are created inside connectDB)
        await connectDB();

        // Connect to Redis
        const redisClient = await connectRedis();

        // Initialize Socket.io
        const useRedis = process.env.USE_REDIS === 'true';
        if (useRedis) {
            console.log('🔴 Using Redis adapter for Socket.io');
            initSocket(server, redisClient, app);
        } else {
            console.log('🔵 Using default Socket.io adapter');
            initSocket(server, null, app);
        }

        const PORT = process.env.PORT || 5000;
        const HOST = process.env.HOST || '0.0.0.0';
        
        server.listen(PORT, HOST, () => {
            console.log(`✅ Server running on http://${HOST}:${PORT}`);
            console.log(`📱 API Base URL: ${process.env.API_URL}`);
            console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
            console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Using default (NOT SECURE)'}`);
            console.log(`🗄️  Database: ${process.env.MONGO_URI ? 'Connected' : 'Not configured'}`);
            console.log(`🔌 Socket.io: ${useRedis ? 'Redis + WebSocket' : 'WebSocket only'}`);
            
            if (envConfig.isLocal) {
                console.log('🏠 Running in LOCAL development mode');
            } else if (envConfig.isProduction) {
                console.log('🚀 Running in PRODUCTION mode');
            } else {
                console.log('🔧 Running in DEVELOPMENT mode');
            }
        });

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received, shutting down gracefully');
            await disconnectRedis();
            server.close(() => {
                console.log('Process terminated');
                process.exit(0);
            });
        });

        process.on('SIGINT', async () => {
            console.log('SIGINT received, shutting down gracefully');
            await disconnectRedis();
            server.close(() => {
                console.log('Process terminated');
                process.exit(0);
            });
        });

    } catch (err) {
        console.error('❌ Server startup error:', err);
        process.exit(1);
    }
})();
