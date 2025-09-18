#!/bin/bash

# RAMA Chat App - Production Deployment Script
# ============================================
# This script deploys the RAMA Chat App to AWS EC2 with custom domains
# Frontend: https://chat.d0s369.co.in
# Backend: https://c.d0s369.co.in

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="rama-chat"
DOMAIN_FRONTEND="chat.d0s369.co.in"
DOMAIN_BACKEND="c.d0s369.co.in"
BACKEND_PORT=5000
WEB_ROOT="/var/www/rama-chat"
SERVICE_USER="ubuntu"

# Helper functions
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
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root"
        exit 1
    fi
}

# Check if required commands exist
check_dependencies() {
    print_status "Checking dependencies..."
    
    local deps=("node" "npm" "git" "curl" "sudo")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            print_error "$dep is not installed"
            exit 1
        fi
    done
    
    print_success "All dependencies found"
}

# Install system dependencies
install_system_deps() {
    print_status "Installing system dependencies..."
    
    sudo apt update
    sudo apt install -y \
        nginx \
        certbot \
        python3-certbot-nginx \
        ufw \
        docker.io \
        docker-compose \
        curl \
        wget \
        git \
        build-essential
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    
    print_success "System dependencies installed"
}

# Install Node.js and PM2
install_nodejs() {
    print_status "Installing Node.js and PM2..."
    
    # Install Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Install PM2 globally
    sudo npm install -g pm2
    
    print_success "Node.js and PM2 installed"
}

# Setup project directory
setup_project() {
    print_status "Setting up project directory..."
    
    # Create web root directory
    sudo mkdir -p $WEB_ROOT
    sudo chown $SERVICE_USER:$SERVICE_USER $WEB_ROOT
    
    # Clone or update repository
    if [ -d "$WEB_ROOT/.git" ]; then
        print_status "Updating existing repository..."
        cd $WEB_ROOT
        git pull origin main
    else
        print_status "Cloning repository..."
        git clone https://github.com/algotwist369/rama-chat-app.git $WEB_ROOT
        cd $WEB_ROOT
    fi
    
    print_success "Project directory setup complete"
}

# Install backend dependencies
install_backend_deps() {
    print_status "Installing backend dependencies..."
    
    cd $WEB_ROOT/backend
    npm ci --production
    
    print_success "Backend dependencies installed"
}

# Install frontend dependencies and build
build_frontend() {
    print_status "Building frontend..."
    
    cd $WEB_ROOT/client
    npm ci
    npm run build
    
    # Copy build files to web root
    sudo mkdir -p $WEB_ROOT/client/dist
    sudo cp -r dist/* $WEB_ROOT/client/dist/
    sudo chown -R $SERVICE_USER:$SERVICE_USER $WEB_ROOT/client/dist
    
    print_success "Frontend built and deployed"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Backend environment
    if [ ! -f "$WEB_ROOT/backend/.env" ]; then
        cp $WEB_ROOT/backend/env.production.example $WEB_ROOT/backend/.env
        print_warning "Please update $WEB_ROOT/backend/.env with your production values"
    fi
    
    # Frontend environment
    if [ ! -f "$WEB_ROOT/client/.env.production" ]; then
        cp $WEB_ROOT/client/env.production.example $WEB_ROOT/client/.env.production
        print_warning "Please update $WEB_ROOT/client/.env.production with your production values"
    fi
    
    print_success "Environment files setup complete"
}

# Setup MongoDB with Docker
setup_mongodb() {
    print_status "Setting up MongoDB with Docker..."
    
    # Create MongoDB data directory
    sudo mkdir -p /var/lib/mongodb
    sudo chown $SERVICE_USER:$SERVICE_USER /var/lib/mongodb
    
    # Run MongoDB container
    sudo docker run -d \
        --name mongodb \
        --restart unless-stopped \
        -p 27017:27017 \
        -v /var/lib/mongodb:/data/db \
        -e MONGO_INITDB_DATABASE=rama-chat-prod \
        mongo:latest
    
    # Wait for MongoDB to start
    sleep 10
    
    print_success "MongoDB setup complete"
}

# Setup PM2 ecosystem
setup_pm2() {
    print_status "Setting up PM2 ecosystem..."
    
    cd $WEB_ROOT/backend
    
    # Create PM2 ecosystem file if it doesn't exist
    if [ ! -f "ecosystem.config.js" ]; then
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'rama-chat-backend',
    script: 'src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: $BACKEND_PORT
    },
    error_file: './logs/err-0.log',
    out_file: './logs/out-0.log',
    log_file: './logs/combined-0.log',
    time: true
  }]
};
EOF
    fi
    
    # Create logs directory
    mkdir -p logs
    
    # Start application with PM2
    pm2 start ecosystem.config.js
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup
    
    print_success "PM2 ecosystem setup complete"
}

# Setup Nginx
setup_nginx() {
    print_status "Setting up Nginx..."
    
    # Create frontend site configuration
    sudo tee /etc/nginx/sites-available/$DOMAIN_FRONTEND > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN_FRONTEND;
    root $WEB_ROOT/client/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Proxy socket.io requests
    location /socket.io/ {
        proxy_pass http://localhost:$BACKEND_PORT/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Proxy uploads
    location /uploads/ {
        proxy_pass http://localhost:$BACKEND_PORT/uploads/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Proxy health check
    location /health {
        proxy_pass http://localhost:$BACKEND_PORT/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Serve static files
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    # Create backend site configuration
    sudo tee /etc/nginx/sites-available/$DOMAIN_BACKEND > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN_BACKEND;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy all requests to backend
    location / {
        proxy_pass http://localhost:$BACKEND_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # Enable sites
    sudo ln -sf /etc/nginx/sites-available/$DOMAIN_FRONTEND /etc/nginx/sites-enabled/
    sudo ln -sf /etc/nginx/sites-available/$DOMAIN_BACKEND /etc/nginx/sites-enabled/
    
    # Remove default site
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload Nginx
    sudo nginx -t
    sudo systemctl reload nginx
    sudo systemctl enable nginx
    
    print_success "Nginx setup complete"
}

# Setup firewall
setup_firewall() {
    print_status "Setting up firewall..."
    
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
    
    print_success "Firewall setup complete"
}

# Setup SSL certificates
setup_ssl() {
    print_status "Setting up SSL certificates..."
    
    # Get SSL certificates
    sudo certbot --nginx -d $DOMAIN_FRONTEND -d $DOMAIN_BACKEND --non-interactive --agree-tos --email admin@d0s369.co.in
    
    # Setup auto-renewal
    sudo systemctl enable certbot.timer
    
    print_success "SSL certificates setup complete"
}

# Main deployment function
main() {
    print_status "Starting RAMA Chat App deployment..."
    
    check_root
    check_dependencies
    install_system_deps
    install_nodejs
    setup_project
    install_backend_deps
    build_frontend
    setup_environment
    setup_mongodb
    setup_pm2
    setup_nginx
    setup_firewall
    setup_ssl
    
    print_success "Deployment completed successfully!"
    print_status "Your application is now available at:"
    print_status "Frontend: https://$DOMAIN_FRONTEND"
    print_status "Backend: https://$DOMAIN_BACKEND"
    print_warning "Please update your environment files with production values:"
    print_warning "- $WEB_ROOT/backend/.env"
    print_warning "- $WEB_ROOT/client/.env.production"
}

# Run main function
main "$@"
