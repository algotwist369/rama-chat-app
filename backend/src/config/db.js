const mongoose = require('mongoose');
const envConfig = require('./environment');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        
        const connectionOptions = {
            // Connection timeout settings
            serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT) || 30000,
            socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT) || 45000,
            connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT) || 10000,
            
            // Connection pooling optimization
            maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || 20, // Increased for better performance
            minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE) || 5,  // Increased for better performance
            maxIdleTimeMS: parseInt(process.env.MONGO_MAX_IDLE_TIME) || 30000,
            waitQueueTimeoutMS: parseInt(process.env.MONGO_WAIT_QUEUE_TIMEOUT) || 10000,
            
            // Performance optimizations
            bufferCommands: false, // Disable mongoose buffering
            useNewUrlParser: true,
            useUnifiedTopology: true,
            
            // Read/Write concerns for better performance
            readPreference: process.env.MONGO_READ_PREFERENCE || 'primary',
            readConcern: { level: 'majority' },
            writeConcern: { w: 'majority', j: true },
            
            // Compression for better network performance
            compressors: ['zlib'],
            zlibCompressionLevel: 6,
            
            // Server API version
            serverApi: { version: '1' },
            
            // Retry settings
            retryWrites: true,
            retryReads: true,
            
            // Heartbeat settings
            heartbeatFrequencyMS: parseInt(process.env.MONGO_HEARTBEAT_FREQUENCY) || 10000,
            
            // Additional performance settings (only for secondary read preference)
            localThresholdMS: 15 // Consider servers within 15ms as local
        };

        // Add authentication if provided
        if (process.env.MONGO_USERNAME && process.env.MONGO_PASSWORD) {
            connectionOptions.auth = {
                username: process.env.MONGO_USERNAME,
                password: process.env.MONGO_PASSWORD
            };
        }

        // Add SSL options if provided
        if (process.env.MONGO_SSL === 'true') {
            connectionOptions.ssl = true;
            if (process.env.MONGO_SSL_VALIDATE === 'false') {
                connectionOptions.sslValidate = false;
            }
        }

        await mongoose.connect(mongoUri, connectionOptions);
        console.log('✅ MongoDB connected successfully');
        console.log(`🗄️ Database: ${mongoUri.includes('localhost') ? 'Local MongoDB' : 'Cloud MongoDB'}`);
        console.log(`🌍 Environment: ${envConfig.env} (${envConfig.isLocal ? 'Local' : envConfig.isProduction ? 'Production' : 'Development'})`);
        
        // Create indexes for optimal performance
        if (process.env.NODE_ENV !== 'test') {
            const { createIndexes } = require('./databaseIndexes');
            await createIndexes();
        }
    } catch (error) {
        console.error('MongoDB connection error:', error);
        // Don't exit in development, just log the error
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
}

module.exports = connectDB;
