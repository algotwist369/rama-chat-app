/**
 * Test Frontend Environment Configuration
 * Run this script to test environment detection and configuration
 */

import envConfig from '../config/environment.js';

console.log('🧪 Testing Frontend Environment Configuration...\n');

// Test environment detection
console.log('🔍 Environment Detection:');
console.log(`  Environment: ${envConfig.env}`);
console.log(`  Is Production: ${envConfig.isProduction}`);
console.log(`  Is Development: ${envConfig.isDevelopment}`);
console.log(`  Is Local: ${envConfig.isLocal}`);

// Test configuration loading
console.log('\n📋 Loaded Configuration:');
const info = envConfig.getEnvironmentInfo();
Object.entries(info).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
});

// Test environment-specific settings
console.log('\n⚙️  Environment-Specific Settings:');
console.log(`  API URL: ${envConfig.get('API_URL')}`);
console.log(`  Frontend URL: ${envConfig.get('FRONTEND_URL')}`);
console.log(`  Socket URL: ${envConfig.get('SOCKET_URL')}`);
console.log(`  Debug Mode: ${envConfig.get('DEBUG_MODE')}`);
console.log(`  Log Level: ${envConfig.get('LOG_LEVEL')}`);
console.log(`  API Timeout: ${envConfig.get('API_TIMEOUT')}`);
console.log(`  Socket Timeout: ${envConfig.get('SOCKET_TIMEOUT')}`);

// Test feature flags
console.log('\n🚩 Feature Flags:');
const features = [
    'NOTIFICATIONS',
    'TYPING_INDICATOR', 
    'ONLINE_STATUS',
    'FILE_UPLOAD',
    'EMOJI_PICKER',
    'MESSAGE_SEARCH'
];

features.forEach(feature => {
    const enabled = envConfig.isFeatureEnabled(feature);
    console.log(`  ${feature}: ${enabled ? '✅ Enabled' : '❌ Disabled'}`);
});

// Test URL generation
console.log('\n🔗 URL Generation:');
console.log(`  API Base: ${envConfig.getApiUrl()}`);
console.log(`  API Messages: ${envConfig.getApiUrl('/messages')}`);
console.log(`  Socket URL: ${envConfig.getSocketUrl()}`);
console.log(`  File Upload: ${envConfig.getFileUploadUrl()}`);
console.log(`  File URL: ${envConfig.getFileUrl('example.jpg')}`);

// Test environment file detection
console.log('\n📁 Environment Variables:');
const envVars = [
    'VITE_API_URL',
    'VITE_FRONTEND_URL',
    'VITE_SOCKET_URL',
    'VITE_DEBUG_MODE',
    'VITE_LOG_LEVEL'
];

envVars.forEach(varName => {
    // Handle both Vite and Node.js environments
    const value = (typeof import.meta !== 'undefined' && import.meta.env?.[varName]) || 
                  process.env[varName];
    console.log(`  ${varName}: ${value ? '✅ Set' : '❌ Not set'}`);
});

console.log('\n🎯 Environment Summary:');
if (envConfig.isLocal) {
    console.log('  🏠 Running in LOCAL mode - Using local URLs and debug features');
} else if (envConfig.isProduction) {
    console.log('  🚀 Running in PRODUCTION mode - Using production URLs and optimized settings');
} else {
    console.log('  🔧 Running in DEVELOPMENT mode - Using development settings');
}

console.log('\n✅ Frontend environment test completed!');
