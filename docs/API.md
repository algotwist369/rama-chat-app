# API Documentation

## Base URL
```
http://localhost:9080/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": "user-id",
    "username": "username",
    "email": "user@example.com",
    "role": "user",
    "groupId": "group-id",
    "isOnline": true
  }
}
```

#### PIN Login
```http
POST /auth/login-pin
Content-Type: application/json

{
  "email": "user@example.com",
  "pin": "123456"
}
```

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "role": "user"
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

#### Get Profile
```http
GET /auth/profile
Authorization: Bearer <token>
```

### Groups

#### Get User Groups
```http
GET /groups
Authorization: Bearer <token>
```

**Response:**
```json
{
  "groups": [
    {
      "_id": "group-id",
      "name": "Group Name",
      "region": "Region",
      "users": ["user-id-1", "user-id-2"],
      "managers": ["manager-id"],
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Group
```http
POST /groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Group",
  "region": "Region",
  "description": "Group description"
}
```

#### Get Group Details
```http
GET /groups/:groupId
Authorization: Bearer <token>
```

#### Update Group
```http
PUT /groups/:groupId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Group Name",
  "description": "Updated description"
}
```

#### Delete Group
```http
DELETE /groups/:groupId
Authorization: Bearer <token>
```

### Messages

#### Get Group Messages
```http
GET /messages/:groupId?page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "messages": [
    {
      "_id": "message-id",
      "content": "Message content",
      "senderId": {
        "_id": "user-id",
        "username": "username"
      },
      "groupId": "group-id",
      "messageType": "text",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "reactions": [],
      "file": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### Send Message
```http
POST /messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Message content",
  "groupId": "group-id",
  "messageType": "text"
}
```

#### Edit Message
```http
PUT /messages/:messageId
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated message content"
}
```

#### Delete Message
```http
DELETE /messages/:messageId
Authorization: Bearer <token>
```

#### Forward Message
```http
POST /messages/:messageId/forward
Authorization: Bearer <token>
Content-Type: application/json

{
  "groupIds": ["group-id-1", "group-id-2"]
}
```

### Files

#### Upload File
```http
POST /files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
```

**Response:**
```json
{
  "filename": "uploaded-file.pdf",
  "originalName": "original-file.pdf",
  "size": 1024000,
  "mimetype": "application/pdf",
  "url": "/uploads/uploaded-file.pdf"
}
```

### Notifications

#### Get Notifications
```http
GET /notifications
Authorization: Bearer <token>
```

#### Mark Notifications as Seen
```http
PATCH /notifications/seen
Authorization: Bearer <token>
```

#### Clear Notifications
```http
DELETE /notifications
Authorization: Bearer <token>
```

## WebSocket Events

### Client to Server

#### Join Group
```javascript
socket.emit('join:group', { groupId: 'group-id' });
```

#### Send Message
```javascript
socket.emit('message:send', {
  content: 'Message content',
  groupId: 'group-id',
  messageType: 'text'
}, (response) => {
  console.log('Message sent:', response);
});
```

#### Edit Message
```javascript
socket.emit('message:edit', {
  messageId: 'message-id',
  content: 'Updated content',
  groupId: 'group-id'
});
```

### Server to Client

#### New Message
```javascript
socket.on('message:new', (message) => {
  console.log('New message:', message);
});
```

#### Message Edited
```javascript
socket.on('message:edited', ({ messageId, message }) => {
  console.log('Message edited:', messageId, message);
});
```

#### Message Deleted
```javascript
socket.on('message:deleted', ({ messageId }) => {
  console.log('Message deleted:', messageId);
});
```

#### User Online/Offline
```javascript
socket.on('user:online', (user) => {
  console.log('User online:', user);
});

socket.on('user:offline', (user) => {
  console.log('User offline:', user);
});
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error message",
  "details": {
    "field": "error description"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid credentials"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute
- **Message endpoints**: 100 requests per minute
- **File upload**: 10 requests per minute
- **General API**: 1000 requests per hour

## Pagination

Most list endpoints support pagination:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field (default: createdAt)
- `order`: Sort order (asc/desc, default: desc)

## File Upload Limits

- **Max file size**: 10MB
- **Allowed types**: 
  - Images: jpg, jpeg, png, gif
  - Videos: mp4, avi, mkv
  - Documents: pdf, doc, docx, txt
- **Storage**: Local filesystem in `/uploads` directory
