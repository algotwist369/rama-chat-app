#!/bin/bash

# SSL Certificate Setup Script for RAMA Chat App
# Run this script after your domains are pointing to your EC2 instance

set -e

echo "🔒 Setting up SSL certificates for RAMA Chat App..."

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as ubuntu user."
   exit 1
fi

# Check if domains are accessible
print_status "Checking domain accessibility..."

BACKEND_DOMAIN="c.api.d0s369.co.in"
FRONTEND_DOMAIN="chat.ciphra.in"

# Function to check domain
check_domain() {
    local domain=$1
    local ip=$(dig +short $domain)
    local server_ip=$(curl -s ifconfig.me)
    
    if [ -z "$ip" ]; then
        print_error "Domain $domain is not resolving to any IP address"
        return 1
    fi
    
    if [ "$ip" != "$server_ip" ]; then
        print_warning "Domain $domain resolves to $ip, but server IP is $server_ip"
        print_warning "Please update your DNS records to point to this server"
        return 1
    fi
    
    print_status "Domain $domain is correctly pointing to this server ($server_ip)"
    return 0
}

# Check both domains
if ! check_domain $BACKEND_DOMAIN; then
    print_error "Backend domain check failed. Please fix DNS settings first."
    exit 1
fi

if ! check_domain $FRONTEND_DOMAIN; then
    print_error "Frontend domain check failed. Please fix DNS settings first."
    exit 1
fi

# Copy Apache configurations
print_status "Setting up Apache virtual hosts..."

# Copy backend configuration
sudo cp /var/www/rama-chat/apache-configs/backend.conf /etc/apache2/sites-available/
sudo a2ensite backend

# Copy frontend configuration
sudo cp /var/www/rama-chat/apache-configs/frontend.conf /etc/apache2/sites-available/
sudo a2ensite frontend

# Test Apache configuration
print_status "Testing Apache configuration..."
sudo apache2ctl configtest

if [ $? -ne 0 ]; then
    print_error "Apache configuration test failed. Please check the configuration files."
    exit 1
fi

# Reload Apache
print_status "Reloading Apache..."
sudo systemctl reload apache2

# Install SSL certificates using Certbot
print_status "Installing SSL certificates..."

# Stop Apache temporarily for certificate installation
sudo systemctl stop apache2

# Install certificates
print_status "Installing certificate for $BACKEND_DOMAIN..."
sudo certbot certonly --standalone -d $BACKEND_DOMAIN --non-interactive --agree-tos --email admin@$BACKEND_DOMAIN

print_status "Installing certificate for $FRONTEND_DOMAIN..."
sudo certbot certonly --standalone -d $FRONTEND_DOMAIN --non-interactive --agree-tos --email admin@$FRONTEND_DOMAIN

# Update Apache configurations with SSL settings
print_status "Updating Apache configurations with SSL settings..."

# Update backend configuration
sudo sed -i 's/# SSLEngine on/SSLEngine on/' /etc/apache2/sites-available/backend.conf
sudo sed -i 's|# SSLCertificateFile /etc/letsencrypt/live/c.api.d0s369.co.in/fullchain.pem|SSLCertificateFile /etc/letsencrypt/live/c.api.d0s369.co.in/fullchain.pem|' /etc/apache2/sites-available/backend.conf
sudo sed -i 's|# SSLCertificateKeyFile /etc/letsencrypt/live/c.api.d0s369.co.in/privkey.pem|SSLCertificateKeyFile /etc/letsencrypt/live/c.api.d0s369.co.in/privkey.pem|' /etc/apache2/sites-available/backend.conf

# Update frontend configuration
sudo sed -i 's/# SSLEngine on/SSLEngine on/' /etc/apache2/sites-available/frontend.conf
sudo sed -i 's|# SSLCertificateFile /etc/letsencrypt/live/chat.ciphra.in/fullchain.pem|SSLCertificateFile /etc/letsencrypt/live/chat.ciphra.in/fullchain.pem|' /etc/apache2/sites-available/frontend.conf
sudo sed -i 's|# SSLCertificateKeyFile /etc/letsencrypt/live/chat.ciphra.in/privkey.pem|SSLCertificateKeyFile /etc/letsencrypt/live/chat.ciphra.in/privkey.pem|' /etc/apache2/sites-available/frontend.conf

# Create HTTP to HTTPS redirect configuration
print_status "Setting up HTTP to HTTPS redirects..."

# Backend redirect
sudo tee /etc/apache2/sites-available/backend-redirect.conf > /dev/null << EOF
<VirtualHost *:80>
    ServerName c.api.d0s369.co.in
    Redirect permanent / https://c.api.d0s369.co.in/
</VirtualHost>
EOF

# Frontend redirect
sudo tee /etc/apache2/sites-available/frontend-redirect.conf > /dev/null << EOF
<VirtualHost *:80>
    ServerName chat.ciphra.in
    Redirect permanent / https://chat.ciphra.in/
</VirtualHost>
EOF

# Enable redirect sites
sudo a2ensite backend-redirect
sudo a2ensite frontend-redirect

# Test Apache configuration again
print_status "Testing Apache configuration with SSL..."
sudo apache2ctl configtest

if [ $? -ne 0 ]; then
    print_error "Apache configuration test failed with SSL settings."
    exit 1
fi

# Start Apache
print_status "Starting Apache with SSL..."
sudo systemctl start apache2

# Set up automatic certificate renewal
print_status "Setting up automatic certificate renewal..."
sudo crontab -l 2>/dev/null | grep -v certbot > /tmp/crontab_backup || true
echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload apache2'" | sudo tee -a /tmp/crontab_backup
sudo crontab /tmp/crontab_backup
rm /tmp/crontab_backup

# Test SSL certificates
print_status "Testing SSL certificates..."

# Test backend SSL
if curl -s -I https://$BACKEND_DOMAIN/health | grep -q "200 OK"; then
    print_status "Backend SSL certificate is working correctly"
else
    print_warning "Backend SSL test failed. Please check the configuration."
fi

# Test frontend SSL
if curl -s -I https://$FRONTEND_DOMAIN/ | grep -q "200 OK"; then
    print_status "Frontend SSL certificate is working correctly"
else
    print_warning "Frontend SSL test failed. Please check the configuration."
fi

# Update PM2 environment
print_status "Updating PM2 environment for HTTPS..."
cd /var/www/rama-chat
pm2 stop all 2>/dev/null || true

# Update environment variables for HTTPS
sudo sed -i 's|API_URL=http://|API_URL=https://|' /var/www/rama-chat/.env.production
sudo sed -i 's|FILE_BASE_URL=http://|FILE_BASE_URL=https://|' /var/www/rama-chat/.env.production

# Restart backend with PM2
print_status "Restarting backend with updated configuration..."
pm2 start ecosystem.config.js
pm2 save

print_status "SSL setup completed successfully!"
print_status ""
print_status "Your application is now accessible via HTTPS:"
print_status "Backend API: https://$BACKEND_DOMAIN"
print_status "Frontend: https://$FRONTEND_DOMAIN"
print_status ""
print_status "SSL certificates will be automatically renewed."
print_status "You can test your application now!"

# Display final status
echo ""
echo "Final Status Check:"
echo "==================="
sudo systemctl status apache2 --no-pager -l
echo ""
sudo systemctl status redis-server --no-pager -l
echo ""
pm2 status
