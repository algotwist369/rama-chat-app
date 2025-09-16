# Environment Configuration Guide

## Overview
All environment variables are now consolidated in a single `.env` file. This simplifies configuration management and removes the need for multiple environment files.

## Setup Instructions

### 1. Configure Your Environment
The `.env` file contains two main sections:
- **LOCAL DEVELOPMENT CONFIGURATION** (currently active)
- **PRODUCTION CONFIGURATION** (commented out)

### 2. For Local Development
The local configuration is already active. Make sure to:
- Set your `MONGO_URI` with your MongoDB connection string
- Set a secure `JWT_SECRET` for authentication
- Adjust other settings as needed

### 3. For Production
To switch to production:
1. Comment out the entire "LOCAL DEVELOPMENT CONFIGURATION" section
2. Uncomment the "PRODUCTION CONFIGURATION" section
3. Update the production values:
   - Set `NODE_ENV=production`
   - Update `API_URL` and `FRONTEND_URL` to your production domains
   - Set a strong, unique `JWT_SECRET`
   - Configure production database settings
   - Update CORS origins for production domains

### 4. Required Variables
The following variables are required and must be set:
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT token signing

### 5. Security Notes
- Never commit the `.env` file to version control
- Use strong, unique secrets for production
- Regularly rotate JWT secrets in production
- Keep database credentials secure

## Environment Detection
The application automatically detects the environment based on:
- `NODE_ENV` variable
- Local development indicators (username, file paths, etc.)

## Migration from Old Files
The following files have been removed and consolidated into `.env`:
- `env.development`
- `env.example`
- `env.local`
- `env.production`

All their configurations are now available in the single `.env` file with clear sections for local and production environments.
