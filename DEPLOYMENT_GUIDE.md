# RAMA Chat App - AWS EC2 Deployment Guide

This guide will help you deploy your RAMA Chat App on AWS EC2 with the following setup:
- **Frontend**: `https://chat.ciphra.in`
- **Backend API**: `https://c.api.d0s369.co.in`
- **Web Server**: Apache (with SSL certificates)
- **Process Manager**: PM2
- **Database**: MongoDB Atlas
- **Cache**: Redis

## Prerequisites

1. AWS Account with EC2 access
2. Domain names configured (chat.ciphra.in and c.api.d0s369.co.in)
3. MongoDB Atlas account and database
4. Your .pem key file from EC2 instance creation

## Step 1: EC2 Instance Setup

### 1.1 Launch EC2 Instance
1. Go to AWS Console → EC2 → Launch Instance
2. Choose **Ubuntu Server 22.04 LTS**
3. Select **t3.micro** (free tier) or **t3.small**
4. Create/select key pair and download .pem file
5. Configure security group with these rules:

```
Type          Protocol    Port Range    Source              Description
SSH           TCP         22            Your IP             SSH access
HTTP          TCP         80            0.0.0.0/0           Web traffic
HTTPS         TCP         443           0.0.0.0/0           Secure web traffic
Custom TCP    TCP         5000          0.0.0.0/0           Backend API
```

6. Launch instance and note the **Public IPv4 address**

### 1.2 Connect to Instance
```bash
ssh -i your-key.pem ubuntu@YOUR_PUBLIC_IP
```

## Step 2: Server Software Installation

On your EC2 instance, run the setup script:

```bash
# Download and run the setup script
wget https://raw.githubusercontent.com/your-repo/rama-chat-app/main/ec2-setup.sh
chmod +x ec2-setup.sh
./ec2-setup.sh
```

Or manually run these commands:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Apache
sudo apt install apache2 -y
sudo a2enmod rewrite proxy proxy_http proxy_wstunnel ssl headers deflate expires
sudo systemctl start apache2
sudo systemctl enable apache2

# Install Redis
sudo apt install redis-server -y
sudo sed -i 's/# requirepass foobared/requirepass ramachat123/' /etc/redis/redis.conf
sudo systemctl restart redis-server

# Install PM2
sudo npm install -g pm2

# Install Certbot for SSL
sudo apt install certbot python3-certbot-apache -y

# Create directories
sudo mkdir -p /var/www/rama-chat
sudo chown -R ubuntu:ubuntu /var/www/rama-chat
```

## Step 3: Domain DNS Configuration

Configure your DNS records to point to your EC2 instance:

### For chat.ciphra.in:
```
Type: A
Name: chat
Value: YOUR_EC2_PUBLIC_IP
TTL: 300
```

### For c.api.d0s369.co.in:
```
Type: A
Name: c.api
Value: YOUR_EC2_PUBLIC_IP
TTL: 300
```

Wait for DNS propagation (5-30 minutes).

## Step 4: Deploy Your Application

### 4.1 From Your Local Machine

Make sure you're in the project root directory and run:

```bash
# Make the deploy script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

The script will:
- Package your application
- Upload it to the server
- Install dependencies
- Build the frontend
- Start the backend with PM2

### 4.2 Manual Deployment (Alternative)

If the automated script doesn't work, you can deploy manually:

```bash
# From your local machine, create deployment package
tar -czf rama-chat.tar.gz backend/ client/

# Upload to server
scp -i your-key.pem rama-chat.tar.gz ubuntu@YOUR_PUBLIC_IP:/tmp/

# On the server
ssh -i your-key.pem ubuntu@YOUR_PUBLIC_IP

# Extract and setup
cd /tmp
tar -xzf rama-chat.tar.gz
sudo mv backend /var/www/rama-chat/
sudo mv client /var/www/rama-chat/frontend
sudo chown -R ubuntu:ubuntu /var/www/rama-chat

# Install dependencies
cd /var/www/rama-chat/backend
npm install --production

cd /var/www/rama-chat/frontend
npm install
npm run build:prod

# Start backend with PM2
cd /var/www/rama-chat/backend
pm2 start src/server.js --name "rama-chat-backend" --env production
pm2 save
pm2 startup
```

## Step 5: Configure Apache Virtual Hosts

### 5.1 Copy Apache Configurations

On your server, copy the Apache configuration files:

```bash
# Copy backend configuration
sudo cp /var/www/rama-chat/apache-configs/backend.conf /etc/apache2/sites-available/
sudo a2ensite backend

# Copy frontend configuration
sudo cp /var/www/rama-chat/apache-configs/frontend.conf /etc/apache2/sites-available/
sudo a2ensite frontend

# Disable default site
sudo a2dissite 000-default

# Test configuration
sudo apache2ctl configtest

# Reload Apache
sudo systemctl reload apache2
```

## Step 6: SSL Certificate Setup

After your domains are pointing to your server, set up SSL certificates:

```bash
# Run the SSL setup script
chmod +x ssl-setup.sh
./ssl-setup.sh
```

Or manually:

```bash
# Stop Apache temporarily
sudo systemctl stop apache2

# Get SSL certificates
sudo certbot certonly --standalone -d c.api.d0s369.co.in --non-interactive --agree-tos --email admin@c.api.d0s369.co.in
sudo certbot certonly --standalone -d chat.ciphra.in --non-interactive --agree-tos --email admin@chat.ciphra.in

# Update Apache configurations with SSL settings
# (The ssl-setup.sh script handles this automatically)

# Start Apache
sudo systemctl start apache2

# Set up auto-renewal
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload apache2'
```

## Step 7: Final Configuration

### 7.1 Update Environment Variables

Make sure your production environment file has the correct URLs:

```bash
# Edit the production environment file
sudo nano /var/www/rama-chat/.env.production
```

Ensure these values are correct:
```
API_URL=https://c.api.d0s369.co.in
FRONTEND_URL=https://chat.ciphra.in
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secure_jwt_secret
REDIS_PASSWORD=ramachat123
```

### 7.2 Restart Services

```bash
# Restart PM2 processes
pm2 restart all

# Restart Apache
sudo systemctl restart apache2

# Check status
pm2 status
sudo systemctl status apache2
```

## Step 8: Testing

Test your deployment:

1. **Backend Health Check**: https://c.api.d0s369.co.in/health
2. **Frontend**: https://chat.ciphra.in
3. **API Endpoints**: https://c.api.d0s369.co.in/api/auth/login

## Troubleshooting

### Common Issues:

1. **502 Bad Gateway**: Backend not running
   ```bash
   pm2 status
   pm2 logs rama-chat-backend
   ```

2. **SSL Certificate Issues**: Check domain DNS
   ```bash
   nslookup chat.ciphra.in
   nslookup c.api.d0s369.co.in
   ```

3. **Apache Errors**: Check configuration
   ```bash
   sudo apache2ctl configtest
   sudo tail -f /var/log/apache2/error.log
   ```

4. **Redis Connection Issues**:
   ```bash
   redis-cli -a ramachat123 ping
   ```

### Logs Locations:
- Backend logs: `/var/log/rama-chat/`
- Apache logs: `/var/log/apache2/`
- PM2 logs: `pm2 logs`

## Security Considerations

1. **Firewall**: Only open necessary ports
2. **JWT Secret**: Use a strong, unique secret
3. **Database**: Use MongoDB Atlas with proper authentication
4. **SSL**: Always use HTTPS in production
5. **Updates**: Keep system packages updated

## Monitoring

Set up monitoring for:
- Server resources (CPU, Memory, Disk)
- Application logs
- SSL certificate expiration
- Database connections

## Backup

Regularly backup:
- Application code
- Database (MongoDB Atlas provides this)
- SSL certificates
- Configuration files

## Support

If you encounter issues:
1. Check the logs
2. Verify DNS settings
3. Test individual components
4. Check firewall rules
5. Verify environment variables

Your RAMA Chat App should now be successfully deployed and accessible at:
- **Frontend**: https://chat.ciphra.in
- **Backend API**: https://c.api.d0s369.co.in
