#!/bin/bash

# RAMA Chat App Deployment Script
# This script deploys both backend and frontend to AWS EC2

set -e

echo "🚀 Starting RAMA Chat App Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_USER="ubuntu"
SERVER_IP=""  # Will be set by user
APP_DIR="/var/www/rama-chat"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if server IP is provided
if [ -z "$SERVER_IP" ]; then
    echo "Please provide your EC2 server IP address:"
    read -p "Server IP: " SERVER_IP
fi

# Check if key file exists
KEY_FILE="rama-chat-keypair.pem"
if [ ! -f "$KEY_FILE" ]; then
    print_error "Key file $KEY_FILE not found!"
    print_error "Please make sure your .pem key file is in the current directory."
    exit 1
fi

print_status "Deploying to server: $SERVER_IP"

# Create deployment package
print_status "Creating deployment package..."

# Create temp directory
TEMP_DIR="temp-deploy"
rm -rf $TEMP_DIR
mkdir $TEMP_DIR

# Copy backend files
print_status "Packaging backend..."
cp -r backend $TEMP_DIR/
cp -r client $TEMP_DIR/frontend

# Remove unnecessary files
find $TEMP_DIR -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find $TEMP_DIR -name ".git" -type d -exec rm -rf {} + 2>/dev/null || true
find $TEMP_DIR -name "*.log" -type f -delete 2>/dev/null || true
find $TEMP_DIR -name ".env.local" -type f -delete 2>/dev/null || true

# Create deployment archive
tar -czf rama-chat-deploy.tar.gz -C $TEMP_DIR .

print_status "Uploading to server..."

# Upload to server
scp -i $KEY_FILE rama-chat-deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

# Create deployment script on server
cat > deploy-server.sh << 'EOF'
#!/bin/bash

set -e

APP_DIR="/var/www/rama-chat"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

echo "🚀 Deploying on server..."

# Create app directory
sudo mkdir -p $APP_DIR
sudo chown -R ubuntu:ubuntu $APP_DIR

# Extract deployment package
cd /tmp
tar -xzf rama-chat-deploy.tar.gz

# Move files to app directory
sudo rm -rf $APP_DIR/*
sudo mv * $APP_DIR/
sudo chown -R ubuntu:ubuntu $APP_DIR

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd $BACKEND_DIR
npm install --production

# Install frontend dependencies and build
echo "🏗️ Building frontend..."
cd $FRONTEND_DIR
npm install
npm run build:prod

# Set up uploads directory
sudo mkdir -p $BACKEND_DIR/uploads/chat-files
sudo chown -R ubuntu:ubuntu $BACKEND_DIR/uploads

# Set up logs directory
sudo mkdir -p /var/log/rama-chat
sudo chown -R ubuntu:ubuntu /var/log/rama-chat

# Restart services
echo "🔄 Restarting services..."
sudo systemctl restart redis-server
sudo systemctl restart apache2

# Stop existing PM2 processes
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Start backend with PM2
echo "🚀 Starting backend with PM2..."
cd $BACKEND_DIR
pm2 start src/server.js --name "rama-chat-backend" --env production
pm2 save
pm2 startup

echo "✅ Deployment completed successfully!"
echo "🌐 Backend: https://c.api.d0s369.co.in"
echo "🌐 Frontend: https://chat.d0s369.co.in"
EOF

# Upload and execute deployment script
scp -i $KEY_FILE deploy-server.sh $SERVER_USER@$SERVER_IP:/tmp/
ssh -i $KEY_FILE $SERVER_USER@$SERVER_IP "chmod +x /tmp/deploy-server.sh && /tmp/deploy-server.sh"

# Cleanup
rm -rf $TEMP_DIR
rm -f rama-chat-deploy.tar.gz
rm -f deploy-server.sh

print_status "Deployment completed successfully!"
print_status "Backend URL: https://c.api.d0s369.co.in"
print_status "Frontend URL: https://chat.d0s369.co.in"

echo ""
echo "Next steps:"
echo "1. Configure your domain DNS to point to your EC2 instance"
echo "2. Set up SSL certificates using Let's Encrypt"
echo "3. Test your application"
