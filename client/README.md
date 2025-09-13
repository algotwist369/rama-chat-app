# Ramavan Chat Frontend

A modern, responsive, and feature-rich chat application built with React, Vite, and Tailwind CSS.

## 🚀 Features

### Core Features
- **Real-time Messaging**: Socket.io integration for instant messaging
- **Group Management**: Create, join, and manage chat groups
- **User Management**: Admin panel for user and group administration
- **File Sharing**: Upload and share files with drag-and-drop support
- **Message Forwarding**: Forward messages to multiple groups
- **Message Status**: Delivery and read receipts
- **Notifications**: Real-time notifications with browser support
- **Responsive Design**: Mobile-first design with dark mode support

### Advanced Features
- **Message Search**: Search through messages with filters
- **Typing Indicators**: See when users are typing
- **Online Status**: Real-time user presence
- **Message Editing**: Edit and delete messages
- **Emoji Support**: Built-in emoji picker
- **Voice Messages**: Voice recording support (UI ready)
- **Performance Monitoring**: Built-in performance tracking
- **Error Boundaries**: Graceful error handling
- **Lazy Loading**: Optimized component loading

## 🛠️ Tech Stack

- **React 19**: Latest React with concurrent features
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Socket.io Client**: Real-time communication
- **Axios**: HTTP client with interceptors
- **Lucide React**: Beautiful icons
- **React Hot Toast**: Toast notifications

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Environment Configuration

The app supports multiple environments:

```bash
# Development
npm run dev:local

# Production
npm run dev:prod

# Test environment
npm run env:test
```

Environment variables are configured in:
- `env.development` - Development settings
- `env.production` - Production settings

## 🎨 UI Components

### Enhanced Components
- **EnhancedSidebar**: Modern sidebar with search and group management
- **EnhancedChatHeader**: Rich chat header with member management
- **EnhancedMessageInput**: Advanced input with emoji picker and file upload
- **EnhancedNotificationPanel**: Comprehensive notification management
- **EnhancedAdminPanel**: Full-featured admin interface

### Design System
- **Consistent Colors**: Blue and indigo color scheme
- **Modern Typography**: Clean, readable fonts
- **Smooth Animations**: CSS transitions and transforms
- **Responsive Layout**: Mobile-first design
- **Dark Mode**: Full dark mode support

## 🔌 API Integration

### Enhanced API Layer
- **messageApi**: Enhanced with forwarding and search
- **groupApi**: Complete group management
- **authApi**: Authentication and user management
- **fileApi**: File upload with progress tracking
- **notificationApi**: Advanced notification handling

### Error Handling
- **Global Error Interceptor**: Consistent error handling
- **Custom Error Classes**: Structured error responses
- **Retry Logic**: Automatic retry for failed requests
- **Offline Support**: Graceful degradation

## 📱 Mobile Optimization

- **Touch Targets**: 44px minimum touch targets
- **Responsive Design**: Mobile-first approach
- **Performance**: Optimized for mobile devices
- **PWA Ready**: Service worker support ready

## 🎯 Performance Features

- **Lazy Loading**: Components loaded on demand
- **Code Splitting**: Automatic code splitting
- **Memoization**: React.memo for performance
- **Virtual Scrolling**: For large message lists
- **Caching**: Intelligent message caching
- **Bundle Analysis**: Built-in bundle analyzer

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Client-side validation
- **XSS Protection**: Sanitized inputs
- **CSRF Protection**: Built-in CSRF protection
- **Rate Limiting**: API rate limiting

## 📊 Monitoring & Analytics

- **Performance Monitoring**: Built-in performance tracking
- **Error Tracking**: Comprehensive error logging
- **User Analytics**: User behavior tracking
- **Network Monitoring**: Connection status tracking

## 🧪 Development

### Available Scripts

```bash
# Development
npm run dev                 # Start dev server
npm run dev:local          # Development mode
npm run dev:prod           # Production mode

# Building
npm run build              # Build for production
npm run build:dev          # Build development version
npm run build:prod         # Build production version
npm run build:analyze      # Build with bundle analysis

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues
npm run format             # Format code with Prettier
npm run format:check       # Check code formatting
npm run type-check         # TypeScript type checking

# Utilities
npm run clean              # Clean build artifacts
npm run preview            # Preview production build
npm run preview:prod       # Preview production build
```

### Project Structure

```
src/
├── api/                   # API layer
│   ├── authApi.js        # Authentication API
│   ├── groupApi.js       # Group management API
│   ├── messageApi.js     # Messaging API
│   ├── fileApi.js        # File upload API
│   ├── notificationApi.js # Notifications API
│   └── axiosInstance.js  # Axios configuration
├── components/            # React components
│   ├── admin/            # Admin panel components
│   ├── auth/             # Authentication components
│   ├── ChatWindow/       # Chat interface components
│   ├── common/           # Shared components
│   └── Enhanced*.jsx     # Enhanced components
├── context/              # React context
│   └── AuthContext.jsx   # Authentication context
├── hooks/                # Custom hooks
│   ├── auth/             # Authentication hooks
│   ├── adminHook/        # Admin panel hooks
│   └── *.js              # Other custom hooks
├── pages/                # Page components
│   ├── Dashboard.jsx     # Main dashboard
│   ├── Login.jsx         # Login page
│   ├── Register.jsx      # Registration page
│   └── EnhancedAdminPanel.jsx # Admin panel
├── styles/               # Styling
│   ├── enhanced.css      # Enhanced styles
│   └── smooth-transitions.css # Transitions
├── utils/                # Utility functions
│   ├── formatDate.js     # Date formatting
│   ├── fileDownload.js   # File download utilities
│   └── soundManager.js   # Sound management
└── sockets/              # Socket.io integration
    └── socket.js         # Socket configuration
```

## 🚀 Deployment

### Production Build

```bash
# Build for production
npm run build:prod

# The built files will be in the `dist` directory
```

### Environment Variables

Make sure to set the following environment variables:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_NAME=Ramavan Chat
VITE_APP_VERSION=1.0.0
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code examples

## 🔄 Updates

### Version 1.0.0
- Complete frontend rewrite
- Enhanced UI/UX design
- Improved performance
- Better mobile support
- Advanced features implementation
- Comprehensive error handling
- Modern development setup

---

**Built with ❤️ for the Ramavan Chat application**