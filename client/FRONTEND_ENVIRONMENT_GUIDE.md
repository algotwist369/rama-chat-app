# Frontend Environment Configuration Guide

## 🎯 Overview

Your RAMA Chat App frontend now automatically detects the environment and loads the appropriate configuration without any manual setup! The system intelligently switches between development and production settings based on the build mode and environment.

## 🚀 How It Works

### Automatic Environment Detection

The system automatically detects your environment using these indicators:

#### 🏠 **Local Development Mode**
- Running on localhost (127.0.0.1)
- Using development port (5173, 3000)
- Using HTTP protocol
- `import.meta.env.DEV === true`

#### 🚀 **Production Mode**
- `import.meta.env.MODE === 'production'`
- Running on production domain
- Using HTTPS protocol

#### 🔧 **Development Mode**
- `import.meta.env.MODE === 'development'`
- Vite development server

## 📁 Environment Files

The system loads configuration in this priority order:

1. **`.env`** - Base configuration (always loaded)
2. **`.env.local`** - Local machine overrides (highest priority for local)
3. **`.env.development`** - Development environment settings
4. **`.env.production`** - Production environment settings

## 🎮 Usage Examples

### Local Development (Automatic)
```bash
# Just run normally - automatically detects local environment
npm run dev
# or
npm run dev:local
```

### Force Development Mode
```bash
npm run dev:local
# or
vite --mode development
```

### Force Production Mode
```bash
npm run dev:prod
# or
vite --mode production
```

### Test Environment Detection
```bash
# Test current environment
npm run env:test

# Test specific environments
npm run env:local
npm run env:prod
```

## ⚙️ Environment-Specific Configurations

### 🏠 Local Development (Automatic)
```javascript
// Automatically configured when running locally
{
  API_URL: 'http://localhost:9080',
  FRONTEND_URL: 'http://localhost:5173',
  SOCKET_URL: 'http://localhost:9080',
  DEBUG_MODE: true,
  LOG_LEVEL: 'debug',
  ENABLE_DEV_TOOLS: true,
  API_TIMEOUT: 30000,
  SOCKET_TIMEOUT: 20000
}
```

### 🚀 Production (Automatic)
```javascript
// Automatically configured when MODE=production
{
  API_URL: 'https://chat.api.d0s369.co.in',
  FRONTEND_URL: 'https://rama.ciphra.in',
  SOCKET_URL: 'https://chat.api.d0s369.co.in',
  DEBUG_MODE: false,
  LOG_LEVEL: 'warn',
  ENABLE_DEV_TOOLS: false,
  API_TIMEOUT: 30000,
  SOCKET_TIMEOUT: 20000
}
```

## 🔧 Configuration Files

### Create Environment-Specific Files (Optional)

If you want to customize specific environments, create these files:

#### `.env.local` (Local Machine Overrides)
```env
# Override any setting for your local machine
VITE_API_URL=http://localhost:9080
VITE_FRONTEND_URL=http://localhost:5173
VITE_SOCKET_URL=http://localhost:9080
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

#### `.env.development` (Development Team)
```env
# Settings for development environment
VITE_API_URL=http://dev-api.example.com
VITE_FRONTEND_URL=http://dev.example.com
VITE_SOCKET_URL=http://dev-api.example.com
```

#### `.env.production` (Production Server)
```env
# Production settings
VITE_API_URL=https://chat.api.d0s369.co.in
VITE_FRONTEND_URL=https://rama.ciphra.in
VITE_SOCKET_URL=https://chat.api.d0s369.co.in
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=warn
```

## 🎯 Smart Defaults

The system provides intelligent defaults based on environment:

### API Settings
- **Local**: `http://localhost:9080` with relaxed timeouts
- **Production**: `https://chat.api.d0s369.co.in` with optimized timeouts

### Socket.io Settings
- **Local**: Local WebSocket with debug logging
- **Production**: Production WebSocket with minimal logging

### Feature Flags
- **Local**: All features enabled for testing
- **Production**: All features enabled for production use

### Performance Settings
- **Local**: Relaxed performance settings for development
- **Production**: Optimized performance settings

## 🚀 Deployment Scenarios

### Local Development
```bash
# Just run - automatically detects local environment
npm run dev
# Output: 🏠 Running in LOCAL development mode
```

### Production Build
```bash
# Build for production
npm run build:prod
# Output: 🚀 Running in PRODUCTION mode
```

### Development Build
```bash
# Build for development
npm run build:dev
# Output: 🔧 Running in DEVELOPMENT mode
```

## 🔍 Environment Detection Logic

```javascript
// The system detects environment using:
const isLocal = [
  window.location.hostname === 'localhost',
  window.location.hostname === '127.0.0.1',
  window.location.port === '5173',
  import.meta.env.DEV === true
].some(condition => condition);

const isProduction = import.meta.env.MODE === 'production';
```

## 🛠️ Customization

### Override Environment Detection
```bash
# Force local mode even on server
VITE_LOCAL_DEVELOPMENT=true npm run dev

# Force production mode even locally
npm run dev:prod
```

### Custom Environment Files
```bash
# Create custom environment file
cp env.development .env.staging

# Load custom environment
vite --mode staging
```

## 📊 Environment Information

The system provides detailed environment information:

```bash
npm run env:test
```

Output:
```
🌍 Frontend Environment Information:
=====================================
Environment: development
Mode: 🏠 Development
Local: ✅ Yes
API URL: http://localhost:9080
Frontend URL: http://localhost:5173
Socket URL: http://localhost:9080
Debug Mode: ✅ Enabled
Log Level: debug
=====================================
```

## 🎉 Benefits

1. **🔄 Zero Configuration**: Works out of the box
2. **🎯 Smart Detection**: Automatically detects environment
3. **🔒 Secure Defaults**: Production-ready security
4. **🏠 Developer Friendly**: Optimized for local development
5. **📁 Flexible**: Easy to override with custom files
6. **🚀 Production Ready**: Optimized for deployment

## 🚨 Important Notes

### URLs
- **Local**: Uses localhost URLs
- **Production**: Uses your production domains

### Debug Mode
- **Local**: Debug mode enabled for development
- **Production**: Debug mode disabled for performance

### Feature Flags
- **Local**: All features enabled for testing
- **Production**: All features enabled for production use

## 🎯 Quick Start

1. **Local Development**: Just run `npm run dev` - everything is automatic!
2. **Production**: Run `npm run build:prod` for production build
3. **Custom**: Create `.env.local` or `.env.production` files to override

## 🔧 Usage in Code

```javascript
import envConfig from './config/environment';

// Get configuration values
const apiUrl = envConfig.get('API_URL');
const isDebug = envConfig.get('DEBUG_MODE');

// Check feature flags
const notificationsEnabled = envConfig.isFeatureEnabled('NOTIFICATIONS');

// Get URLs
const apiEndpoint = envConfig.getApiUrl('/messages');
const socketUrl = envConfig.getSocketUrl();
const fileUrl = envConfig.getFileUrl('image.jpg');

// Print environment info
envConfig.printEnvironmentInfo();
```

**That's it! Your frontend automatically adapts to any environment! 🎉**
