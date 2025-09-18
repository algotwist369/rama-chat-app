#!/bin/bash

# RAMA Chat App - Simple Single Port AWS EC2 Deployment Script
# ============================================================

set -e  # Exit on any error

echo "🚀 Starting RAMA Chat App Simple Deployment on AWS EC2..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root. Use a regular user with sudo privileges."
    exit 1
fi

# Set custom domains
FRONTEND_DOMAIN="https://chat.d0s369.co.in"
BACKEND_DOMAIN="http://c.d0s369.co.in"
print_success "Frontend Domain: $FRONTEND_DOMAIN"
print_success "Backend Domain: $BACKEND_DOMAIN"

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
print_status "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_success "Node.js version: $NODE_VERSION"
print_success "NPM version: $NPM_VERSION"

# Install PM2 globally
print_status "Installing PM2 process manager..."
sudo npm install -g pm2

# Install MongoDB
print_status "Installing MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable MongoDB
print_status "Starting MongoDB service..."
sudo systemctl start mongod
sudo systemctl enable mongod

# Create application directory
print_status "Setting up application directory..."
sudo mkdir -p /var/www/rama-chat
sudo chown -R $USER:$USER /var/www/rama-chat

# Copy application files
print_status "Copying application files..."
cp -r ~/chat-app/* /var/www/rama-chat/

# Navigate to application directory
cd /var/www/rama-chat

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
npm install --production

# Create production environment file
print_status "Creating production environment configuration..."
cat > .env << EOF
# PRODUCTION CONFIGURATION FOR AWS EC2 (SINGLE PORT)
NODE_ENV=production
PORT=80
HOST=0.0.0.0

# API Configuration (Custom Domains)
API_URL=$BACKEND_DOMAIN
FRONTEND_URL=$FRONTEND_DOMAIN

# Database Configuration
MONGO_URI=mongodb://localhost:27017/rama-chat-prod

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)

# CORS Configuration (Custom Domains)
CORS_ORIGINS=$FRONTEND_DOMAIN,$BACKEND_DOMAIN
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization

# Socket.io Configuration (Custom Domains)
SOCKET_CORS_ORIGINS=$FRONTEND_DOMAIN,$BACKEND_DOMAIN
SOCKET_CORS_CREDENTIALS=true
SOCKET_CORS_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
SOCKET_TRANSPORTS=polling,websocket
SOCKET_ALLOW_EIO3=true
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000
SOCKET_MAX_HTTP_BUFFER_SIZE=1000000

# Redis Configuration
USE_REDIS=false
REDIS_URL=redis://localhost:6379

# File Upload Configuration
FILE_BASE_URL=$BACKEND_DOMAIN
UPLOAD_PATH=/uploads/chat-files
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpeg,jpg,png,gif,pdf,doc,docx,txt,mp4,avi,mkv

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
FREQUENCY_LIMIT_WINDOW=60000
FREQUENCY_LIMIT_MAX=100

# Logging Configuration
LOG_LEVEL=warn
LOG_FILE_PATH=./logs/app.log

# Body parsing limits
JSON_LIMIT=10mb
URL_LIMIT=10mb
MAX_REQUEST_SIZE=10mb

# Feature Flags
ENABLE_DEBUG_ROUTES=false
ENABLE_SWAGGER_UI=false
ENABLE_METRICS=false
ENABLE_USER_AGENT_VALIDATION=true
ENABLE_FILE_UPLOAD_SECURITY=true
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=30000
ENABLE_PERFORMANCE_MONITORING=false

# MongoDB Connection Settings
MONGO_SERVER_SELECTION_TIMEOUT=30000
MONGO_SOCKET_TIMEOUT=45000
MONGO_CONNECT_TIMEOUT=10000
MONGO_MAX_POOL_SIZE=10
MONGO_MIN_POOL_SIZE=1
MONGO_MAX_IDLE_TIME=30000
MONGO_WAIT_QUEUE_TIMEOUT=10000
EOF

# Create uploads directory
mkdir -p uploads/chat-files
mkdir -p logs

# Install frontend dependencies and build
print_status "Installing frontend dependencies..."
cd ../client
npm install

# Create frontend production environment file
print_status "Creating frontend production environment configuration..."
cat > .env.production << EOF
# PRODUCTION CONFIGURATION FOR AWS EC2 (CUSTOM DOMAINS)
VITE_API_URL=$BACKEND_DOMAIN
VITE_FRONTEND_URL=$FRONTEND_DOMAIN
VITE_SOCKET_URL=$BACKEND_DOMAIN
VITE_NODE_ENV=production
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=warn
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_TYPING_INDICATOR=true
VITE_ENABLE_ONLINE_STATUS=true
VITE_ENABLE_FILE_UPLOAD=true
VITE_ENABLE_EMOJI_PICKER=true
VITE_ENABLE_MESSAGE_SEARCH=true
VITE_API_TIMEOUT=30000
VITE_SOCKET_TIMEOUT=20000
VITE_SOCKET_RECONNECTION_ATTEMPTS=5
VITE_SOCKET_RECONNECTION_DELAY=2000
VITE_SOCKET_RECONNECTION_DELAY_MAX=10000
VITE_THEME=light
VITE_LANGUAGE=en
VITE_TIMEZONE=UTC
VITE_DATE_FORMAT=MM/DD/YYYY
VITE_TIME_FORMAT=12h
EOF

# Build frontend for production
print_status "Building frontend for production..."
npm run build:prod

# Configure PM2
print_status "Configuring PM2..."
cd /var/www/rama-chat/backend

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'rama-chat-backend',
    script: 'src/server.js',
    cwd: '/var/www/rama-chat/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 80
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start the application with PM2
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure firewall
print_status "Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

print_success "🎉 Simple Deployment completed successfully!"
print_status "Your RAMA Chat App is now running at:"
print_status "Frontend: $FRONTEND_DOMAIN"
print_status "Backend API: $BACKEND_DOMAIN"
print_status "API Endpoints: $BACKEND_DOMAIN/api"
print_status "Health Check: $BACKEND_DOMAIN/health"
print_status "Socket.io: $BACKEND_DOMAIN/socket.io"

print_warning "Important Notes:"
echo "1. Make sure your EC2 Security Group allows inbound traffic on ports 22 and 80"
echo "2. The application is running with PM2 - use 'pm2 status' to check status"
echo "3. Logs are available in /var/www/rama-chat/backend/logs/"
echo "4. To restart the application: pm2 restart rama-chat-backend"
echo "5. To view logs: pm2 logs rama-chat-backend"
echo "6. No Nginx required - everything runs on port 80!"

print_status "Simple deployment script completed!"
