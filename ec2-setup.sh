#!/bin/bash

# EC2 Server Setup Script for RAMA Chat App
# Run this script on your EC2 instance after connecting via SSH

set -e

echo "🚀 Setting up EC2 server for RAMA Chat App..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js (Latest LTS version)
print_status "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js version: $NODE_VERSION"
print_status "npm version: $NPM_VERSION"

# Install Apache Web Server
print_status "Installing Apache..."
sudo apt install apache2 -y

# Enable required Apache modules
print_status "Enabling Apache modules..."
sudo a2enmod rewrite
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod ssl
sudo a2enmod headers
sudo a2enmod deflate
sudo a2enmod expires

# Start and enable Apache
sudo systemctl start apache2
sudo systemctl enable apache2

# Install Redis
print_status "Installing Redis..."
sudo apt install redis-server -y

# Configure Redis
print_status "Configuring Redis..."
sudo sed -i 's/# requirepass foobared/requirepass ramachat123/' /etc/redis/redis.conf
sudo sed -i 's/bind 127.0.0.1 ::1/bind 127.0.0.1/' /etc/redis/redis.conf
sudo sed -i '/^# maxmemory/a maxmemory 256mb\nmaxmemory-policy allkeys-lru' /etc/redis/redis.conf

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Test Redis
if redis-cli -a ramachat123 ping | grep -q "PONG"; then
    print_status "Redis is working correctly"
else
    print_error "Redis configuration failed"
    exit 1
fi

# Install PM2
print_status "Installing PM2..."
sudo npm install -g pm2

# Install Git
print_status "Installing Git..."
sudo apt install git -y

# Install Certbot for SSL
print_status "Installing Certbot..."
sudo apt install certbot python3-certbot-apache -y

# Create project directories
print_status "Creating project directories..."
sudo mkdir -p /var/www/rama-chat
sudo chown -R ubuntu:ubuntu /var/www/rama-chat

# Create uploads directory
sudo mkdir -p /var/www/rama-chat/uploads/chat-files
sudo chown -R ubuntu:ubuntu /var/www/rama-chat/uploads

# Create logs directory
sudo mkdir -p /var/log/rama-chat
sudo chown -R ubuntu:ubuntu /var/log/rama-chat

# Create PM2 directory
mkdir -p ~/.pm2

# Disable default Apache site
print_status "Disabling default Apache site..."
sudo a2dissite 000-default

# Check if all services are running
print_status "Checking services..."
if sudo systemctl is-active --quiet apache2; then
    print_status "Apache is running"
else
    print_error "Apache is not running"
fi

if sudo systemctl is-active --quiet redis-server; then
    print_status "Redis is running"
else
    print_error "Redis is not running"
fi

# Configure firewall (if ufw is available)
if command -v ufw &> /dev/null; then
    print_status "Configuring firewall..."
    sudo ufw --force enable
    sudo ufw allow ssh
    sudo ufw allow 'Apache Full'
    sudo ufw status
fi

# Set up log rotation for application logs
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/rama-chat > /dev/null << EOF
/var/log/rama-chat/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        /usr/bin/pm2 reloadLogs
    endscript
}
EOF

# Create environment file for production
print_status "Creating production environment file..."
sudo tee /var/www/rama-chat/.env.production > /dev/null << 'EOF'
# Production Environment Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# API Configuration
API_URL=https://c.api.d0s369.co.in
FRONTEND_URL=https://chat.ciphra.in

# Database Configuration (MongoDB Atlas)
MONGO_URI=mongodb+srv://infoalgotwist_db_user:inH2z5QJVydf9JYN@cluster0.w6hcrf0.mongodb.net/rama-chat-app
MONGO_SSL=true
MONGO_SSL_VALIDATE=true

# JWT Configuration
JWT_SECRET=RAMA_CHAT_PRODUCTION_SECRET_$(date +%s)
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGINS=https://chat.ciphra.in
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization

# Socket.io Configuration
SOCKET_CORS_ORIGINS=https://chat.ciphra.in
SOCKET_CORS_CREDENTIALS=true
SOCKET_CORS_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
SOCKET_TRANSPORTS=polling,websocket
SOCKET_ALLOW_EIO3=true
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000
SOCKET_MAX_HTTP_BUFFER_SIZE=1000000

# File Upload Configuration
FILE_BASE_URL=https://c.api.d0s369.co.in
UPLOAD_PATH=/uploads/chat-files
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpeg,jpg,png,gif,pdf,doc,docx,txt,mp4,avi,mkv

# Redis Configuration
USE_REDIS=true
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=ramachat123

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging Configuration
LOG_LEVEL=warn
LOG_FILE_PATH=/var/log/rama-chat/production.log

# Body Parsing
JSON_LIMIT=10mb
URL_LIMIT=10mb
EOF

sudo chown ubuntu:ubuntu /var/www/rama-chat/.env.production

# Create PM2 ecosystem file
print_status "Creating PM2 ecosystem file..."
sudo tee /var/www/rama-chat/ecosystem.config.js > /dev/null << 'EOF'
module.exports = {
  apps: [{
    name: 'rama-chat-backend',
    script: './backend/src/server.js',
    cwd: '/var/www/rama-chat',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      HOST: '0.0.0.0'
    },
    error_file: '/var/log/rama-chat/backend-error.log',
    out_file: '/var/log/rama-chat/backend-out.log',
    log_file: '/var/log/rama-chat/backend-combined.log',
    time: true
  }]
};
EOF

sudo chown ubuntu:ubuntu /var/www/rama-chat/ecosystem.config.js

print_status "EC2 server setup completed successfully!"
print_status "Next steps:"
print_status "1. Configure your domain DNS to point to this server"
print_status "2. Deploy your application using the deploy script"
print_status "3. Set up SSL certificates with Certbot"
print_status "4. Configure Apache virtual hosts"

echo ""
echo "Server Information:"
echo "==================="
echo "Public IP: $(curl -s ifconfig.me)"
echo "Node.js: $NODE_VERSION"
echo "npm: $NPM_VERSION"
echo "Apache: $(apache2 -v | head -n1)"
echo "Redis: $(redis-server --version | head -n1)"
echo "PM2: $(pm2 --version)"
echo ""
echo "Your server is ready for deployment!"
