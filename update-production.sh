#!/bin/bash

# RAMA Chat App - Production Update Script
# ========================================
# This script updates the production deployment with latest changes

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/rama-chat"
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

# Check if running as correct user
check_user() {
    if [[ $USER != $SERVICE_USER ]]; then
        print_error "This script should be run as $SERVICE_USER"
        exit 1
    fi
}

# Backup current deployment
backup_current() {
    print_status "Creating backup of current deployment..."
    
    local backup_dir="/tmp/rama-chat-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup backend
    if [ -d "$PROJECT_DIR/backend" ]; then
        cp -r "$PROJECT_DIR/backend" "$backup_dir/"
    fi
    
    # Backup frontend build
    if [ -d "$PROJECT_DIR/client/dist" ]; then
        cp -r "$PROJECT_DIR/client/dist" "$backup_dir/"
    fi
    
    print_success "Backup created at: $backup_dir"
}

# Pull latest changes
update_code() {
    print_status "Pulling latest changes from repository..."
    
    cd "$PROJECT_DIR"
    git fetch origin
    git pull origin main
    
    print_success "Code updated successfully"
}

# Update backend
update_backend() {
    print_status "Updating backend..."
    
    cd "$PROJECT_DIR/backend"
    
    # Install/update dependencies
    npm ci --production
    
    # Restart PM2 process
    pm2 restart rama-chat-backend
    
    print_success "Backend updated successfully"
}

# Update frontend
update_frontend() {
    print_status "Updating frontend..."
    
    cd "$PROJECT_DIR/client"
    
    # Install/update dependencies
    npm ci
    
    # Build frontend
    npm run build
    
    # Copy new build files
    sudo cp -r dist/* /var/www/rama-chat/client/dist/
    sudo chown -R $SERVICE_USER:$SERVICE_USER /var/www/rama-chat/client/dist/
    
    print_success "Frontend updated successfully"
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Check PM2 status
    if pm2 list | grep -q "rama-chat-backend.*online"; then
        print_success "Backend is running"
    else
        print_error "Backend is not running"
        return 1
    fi
    
    # Check if frontend files exist
    if [ -f "/var/www/rama-chat/client/dist/index.html" ]; then
        print_success "Frontend files are deployed"
    else
        print_error "Frontend files are missing"
        return 1
    fi
    
    # Test API endpoint
    if curl -s -f "https://c.d0s369.co.in/health" > /dev/null; then
        print_success "API is responding"
    else
        print_warning "API health check failed"
    fi
    
    # Test frontend
    if curl -s -f "https://chat.d0s369.co.in/" > /dev/null; then
        print_success "Frontend is accessible"
    else
        print_warning "Frontend accessibility check failed"
    fi
}

# Show deployment status
show_status() {
    print_status "Deployment Status:"
    echo "=================="
    
    # PM2 status
    echo "Backend Status:"
    pm2 list | grep rama-chat-backend || echo "Backend not found"
    
    # Frontend status
    echo -e "\nFrontend Status:"
    if [ -d "/var/www/rama-chat/client/dist" ]; then
        echo "Frontend files: ✅ Deployed"
        echo "Last modified: $(stat -c %y /var/www/rama-chat/client/dist/index.html)"
    else
        echo "Frontend files: ❌ Missing"
    fi
    
    # Apache status
    echo -e "\nApache Status:"
    sudo systemctl is-active apache2 && echo "Apache: ✅ Running" || echo "Apache: ❌ Not running"
    
    # SSL status
    echo -e "\nSSL Status:"
    sudo certbot certificates 2>/dev/null | grep -A 2 "chat.d0s369.co.in" || echo "SSL certificates not found"
}

# Main update function
main() {
    print_status "Starting production update..."
    
    check_user
    backup_current
    update_code
    update_backend
    update_frontend
    verify_deployment
    
    print_success "Production update completed successfully!"
    show_status
}

# Handle script arguments
case "${1:-}" in
    "status")
        show_status
        ;;
    "backend")
        check_user
        update_backend
        print_success "Backend update completed"
        ;;
    "frontend")
        check_user
        update_frontend
        print_success "Frontend update completed"
        ;;
    "verify")
        verify_deployment
        ;;
    *)
        main
        ;;
esac
