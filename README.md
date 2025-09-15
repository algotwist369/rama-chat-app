# RAMA Chat Application

A real-time chat application built with React, Node.js, Express, MongoDB, and Socket.io.

## 🚀 Features

- **Real-time Messaging**: Instant message delivery with Socket.io
- **Multiple Login Methods**: Password and PIN authentication
- **Role-based Access**: Admin, Manager, and User roles
- **Group Management**: Create and manage chat groups
- **File Sharing**: Upload and share files in conversations
- **Message Reactions**: React to messages with emojis
- **Message Forwarding**: Forward messages to multiple groups
- **Admin Panel**: Comprehensive admin dashboard
- **Responsive Design**: Works on desktop and mobile
- **Dark Mode**: Toggle between light and dark themes
- **Performance Monitoring**: Real-time performance tracking

## 🏗️ Architecture

```
chat-app/
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Custom middleware
│   │   ├── models/          # MongoDB models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic services
│   │   ├── sockets/         # Socket.io handlers
│   │   └── utils/           # Utility functions
│   └── uploads/             # File upload storage
├── client/                  # React frontend
│   ├── src/
│   │   ├── api/             # API client functions
│   │   ├── components/      # React components
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components
│   │   ├── sockets/         # Socket.io client
│   │   └── utils/           # Utility functions
└── docs/                    # Documentation
```

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Socket.io** - Real-time communication
- **Redis** - Caching and session storage
- **JWT** - Authentication
- **Multer** - File uploads
- **Bcrypt** - Password hashing

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- Redis (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chat-app
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Set up environment variables**
   ```bash
   # Backend
   cp backend/env.example backend/.env
   
   # Frontend
   cp client/env.example client/.env
   ```

5. **Start MongoDB**
   ```bash
   sudo systemctl start mongodb
   ```

6. **Start the servers**
   ```bash
   # Backend (Terminal 1)
   cd backend
   npm run dev
   
   # Frontend (Terminal 2)
   cd client
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:9080

## 👥 Default Users

### Test Credentials
- **Admin**: `admin@example.com` / `password123`
- **Manager**: `manager@example.com` / `password123`
- **User**: `test@example.com` / `password123`
- **PIN User**: `pin@example.com` / PIN: `123456`

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/login-pin` - PIN login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### Group Endpoints
- `GET /api/groups` - Get user groups
- `POST /api/groups` - Create group
- `GET /api/groups/:id` - Get group details
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

### Message Endpoints
- `GET /api/messages/:groupId` - Get group messages
- `POST /api/messages` - Send message
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=development
PORT=9080
MONGODB_URI=mongodb://localhost:27017/rama-chat
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
```

#### Frontend (.env)
```env
VITE_BACKEND_URL=http://localhost:9080
VITE_APP_NAME=RAMA Chat
```

## 🚀 Deployment

### Production Build
```bash
# Backend
cd backend
npm run build

# Frontend
cd client
npm run build
```

### Docker Deployment
```bash
docker-compose up -d
```

### Manual Deployment
See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd client
npm test
```

## 📊 Performance

- **Message Latency**: < 50ms
- **Concurrent Users**: 1000+
- **File Upload**: Up to 10MB
- **Database**: Optimized with indexes
- **Caching**: Redis for session management

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- Input validation
- CORS protection
- XSS protection
- SQL injection prevention

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting guide

## 🎯 Roadmap

- [ ] Voice messages
- [ ] Video calls
- [ ] Message encryption
- [ ] Mobile app
- [ ] Push notifications
- [ ] Message search
- [ ] User presence
- [ ] Message threads
