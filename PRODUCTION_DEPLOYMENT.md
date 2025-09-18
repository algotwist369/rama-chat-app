# RAMA Chat App - Production Deployment Guide

This guide covers deploying the RAMA Chat App to AWS EC2 with custom domains using Apache (instead of Nginx).

## 🚀 Quick Deployment

### Prerequisites
- AWS EC2 instance (Ubuntu 20.04+)
- Domain names configured with DNS A records pointing to your EC2 public IP
- SSH access to your EC2 instance

### Custom Domains
- **Frontend**: `https://chat.d0s369.co.in`
- **Backend**: `https://c.d0s369.co.in`

## 📋 Step-by-Step Deployment

### 1. Connect to Your EC2 Instance
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### 2. Clone the Repository
```bash
git clone https://github.com/algotwist369/rama-chat-app.git
cd rama-chat-app
```

### 3. Install System Dependencies
```bash
sudo apt update
sudo apt install -y nodejs npm git curl wget apache2 certbot python3-certbot-apache ufw docker.io
```

### 4. Install PM2
```bash
sudo npm install -g pm2
```

### 5. Setup MongoDB with Docker
```bash
sudo docker run -d --name mongodb -p 27017:27017 -e MONGO_INITDB_DATABASE=rama-chat-prod mongo:latest
```

### 6. Configure Backend Environment
```bash
cd backend
cp env.production.example .env
nano .env
```

Update the following values in `.env`:
```env
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# API Configuration (Custom Domains - HTTPS)
API_URL=https://c.d0s369.co.in
FRONTEND_URL=https://chat.d0s369.co.in

# Database Configuration
MONGO_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/rama-chat-app

# CORS Configuration (Custom Domains - HTTPS)
CORS_ORIGINS=https://chat.d0s369.co.in,https://c.d0s369.co.in
CORS_CREDENTIALS=true

# Socket.io Configuration (Custom Domains - HTTPS)
SOCKET_CORS_ORIGINS=https://chat.d0s369.co.in,https://c.d0s369.co.in
SOCKET_CORS_CREDENTIALS=true

# File Upload Configuration
FILE_BASE_URL=https://c.d0s369.co.in
```

### 7. Install Backend Dependencies and Start
```bash
npm install
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 8. Configure Frontend Environment
```bash
cd ../client
cp env.production.example .env.production
nano .env.production
```

Update the following values in `.env.production`:
```env
# API Configuration (Custom Domains - HTTPS)
VITE_API_URL=https://c.d0s369.co.in
VITE_FRONTEND_URL=https://chat.d0s369.co.in
VITE_SOCKET_URL=https://c.d0s369.co.in
```

### 9. Build and Deploy Frontend
```bash
npm install
npm run build
sudo mkdir -p /var/www/rama-chat/client/dist
sudo cp -r dist/* /var/www/rama-chat/client/dist/
```

### 10. Configure Apache Virtual Hosts

#### Frontend Virtual Host
```bash
sudo nano /etc/apache2/sites-available/chat.d0s369.co.in.conf
```

```apache
<VirtualHost *:80>
    ServerName chat.d0s369.co.in
    DocumentRoot /var/www/rama-chat/client/dist
    
    # Proxy API requests to backend
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:5000/api/
    ProxyPassReverse /api/ http://localhost:5000/api/
    
    # Proxy socket.io requests
    ProxyPass /socket.io/ http://localhost:5000/socket.io/
    ProxyPassReverse /socket.io/ http://localhost:5000/socket.io/
    
    # Proxy uploads
    ProxyPass /uploads/ http://localhost:5000/uploads/
    ProxyPassReverse /uploads/ http://localhost:5000/uploads/
    
    # Proxy health check
    ProxyPass /health http://localhost:5000/health
    ProxyPassReverse /health http://localhost:5000/health
    
    # Serve static files
    <Directory /var/www/rama-chat/client/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Handle React Router - only for non-file requests
        RewriteEngine On
        RewriteBase /
        
        # Don't rewrite if file exists
        RewriteCond %{REQUEST_FILENAME} -f [OR]
        RewriteCond %{REQUEST_FILENAME} -d
        RewriteRule ^ - [L]
        
        # Rewrite everything else to index.html for React Router
        RewriteRule ^ index.html [L]
    </Directory>
    
    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/chat.d0s369.co.in_error.log
    CustomLog ${APACHE_LOG_DIR}/chat.d0s369.co.in_access.log combined
</VirtualHost>
```

#### Backend Virtual Host
```bash
sudo nano /etc/apache2/sites-available/c.d0s369.co.in.conf
```

```apache
<VirtualHost *:80>
    ServerName c.d0s369.co.in
    
    # Proxy all requests to backend
    ProxyPreserveHost On
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    
    # WebSocket support
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:5000/$1" [P,L]
    
    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/c.d0s369.co.in_error.log
    CustomLog ${APACHE_LOG_DIR}/c.d0s369.co.in_access.log combined
</VirtualHost>
```

### 11. Enable Apache Modules and Sites
```bash
sudo a2enmod rewrite proxy proxy_http ssl headers
sudo a2ensite chat.d0s369.co.in.conf
sudo a2ensite c.d0s369.co.in.conf
sudo systemctl restart apache2
```

### 12. Setup SSL Certificates
```bash
sudo certbot --apache -d chat.d0s369.co.in -d c.d0s369.co.in --non-interactive --agree-tos --email your-email@domain.com
```

### 13. Configure Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw --force enable
```

## 🔧 Key Configuration Files

### Backend Environment (.env)
- **Port**: 5000 (to avoid permission issues)
- **Database**: MongoDB Atlas or local Docker container
- **CORS**: Configured for custom domains with HTTPS
- **Socket.io**: Configured for WebSocket connections

### Frontend Environment (.env.production)
- **API URL**: Points to backend domain with HTTPS
- **Socket URL**: Points to backend domain for WebSocket connections
- **Frontend URL**: Points to frontend domain

### Apache Configuration
- **Frontend**: Serves React app and proxies API calls
- **Backend**: Proxies all requests to Node.js backend
- **SSL**: Handled by Certbot with automatic renewal

## 🐛 Common Issues and Solutions

### 1. API Routes Returning 404
**Problem**: Frontend can't reach backend API
**Solution**: Ensure API routes are defined BEFORE frontend serving logic in `backend/src/app.js`

### 2. Socket Connection Issues
**Problem**: WebSocket connections failing
**Solution**: 
- Check `VITE_SOCKET_URL` in frontend environment
- Ensure Apache WebSocket proxy configuration is correct
- Verify backend Socket.io CORS settings

### 3. Mixed Content Errors
**Problem**: HTTPS frontend trying to connect to HTTP backend
**Solution**: Ensure all URLs use HTTPS in production environment files

### 4. CORS Errors
**Problem**: Cross-origin requests blocked
**Solution**: 
- Update `CORS_ORIGINS` in backend environment
- Remove duplicate CORS headers from Apache configuration
- Ensure backend handles CORS properly

### 5. React Router Issues
**Problem**: Direct URL access returns 404
**Solution**: Ensure Apache rewrite rules serve `index.html` for non-file requests

## 📊 Monitoring and Maintenance

### Check Application Status
```bash
# Check PM2 status
pm2 status

# Check PM2 logs
pm2 logs rama-chat-backend

# Check Apache status
sudo systemctl status apache2

# Check SSL certificate status
sudo certbot certificates
```

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild frontend
cd client
npm run build
sudo cp -r dist/* /var/www/rama-chat/client/dist/

# Restart backend
cd ../backend
pm2 restart rama-chat-backend
```

### Backup Database
```bash
# MongoDB backup (if using local MongoDB)
sudo docker exec mongodb mongodump --out /backup

# MongoDB Atlas backup (automatic with Atlas)
```

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **SSL Certificates**: Use Let's Encrypt for free SSL certificates
3. **Firewall**: Only open necessary ports (22, 80, 443, 5000)
4. **Database**: Use MongoDB Atlas for production (more secure than local)
5. **CORS**: Configure CORS properly for your domains only
6. **Headers**: Use security headers in Apache configuration

## 📝 Environment Variables Reference

### Backend (.env)
```env
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
API_URL=https://c.d0s369.co.in
FRONTEND_URL=https://chat.d0s369.co.in
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
CORS_ORIGINS=https://chat.d0s369.co.in,https://c.d0s369.co.in
SOCKET_CORS_ORIGINS=https://chat.d0s369.co.in,https://c.d0s369.co.in
FILE_BASE_URL=https://c.d0s369.co.in
```

### Frontend (.env.production)
```env
VITE_API_URL=https://c.d0s369.co.in
VITE_FRONTEND_URL=https://chat.d0s369.co.in
VITE_SOCKET_URL=https://c.d0s369.co.in
VITE_NODE_ENV=production
VITE_DEBUG_MODE=false
```

## 🆘 Support

If you encounter issues during deployment:

1. Check the logs: `pm2 logs rama-chat-backend`
2. Verify environment variables are set correctly
3. Ensure DNS records point to your EC2 instance
4. Check Apache configuration syntax: `sudo apache2ctl configtest`
5. Verify SSL certificates: `sudo certbot certificates`

For additional help, check the application logs and ensure all services are running properly.
