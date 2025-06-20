# Remote Desktop Application Server

This is the backend server for the Remote Desktop Application. It provides APIs and WebSocket functionality for user management, screen sharing, and remote control features.

## Features

- User authentication and authorization
- Screen sharing session management
- Real-time communication using WebSocket
- Remote control functionality
- SQLite database for data persistence
- Error logging and monitoring

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository
2. Navigate to the server directory:
   ```bash
   cd server
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the root directory with the following content:
   ```
   PORT=3000
   CLIENT_URL=http://localhost:5173
   JWT_SECRET=your_jwt_secret_key_here
   NODE_ENV=development
   ```

## Database Setup

The application uses SQLite as the database. The database file will be automatically created in the `data` directory when you start the server for the first time.

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user

### User Management
- `GET /api/users/profile/:userId` - Get user profile
- `PUT /api/users/profile/:userId` - Update user profile
- `GET /api/users/online` - Get online users

### Screen Sharing
- `POST /api/screen-share/sessions` - Create a new screen sharing session
- `GET /api/screen-share/sessions/:userId` - Get all sessions for a user
- `PUT /api/screen-share/sessions/:sessionId/end` - End a session
- `GET /api/screen-share/stats/:userId` - Get session statistics

## WebSocket Events

### User Status
- `setUserStatus` - Update user status
- `userStatusUpdate` - Broadcast user status changes

### Screen Sharing
- `screenShare:offer` - Send screen share offer
- `screenShare:answer` - Send screen share answer
- `screenShare:iceCandidate` - Exchange ICE candidates

### Remote Control
- `remoteControl:start` - Start remote control session
- `remoteControl:input` - Send remote control input events

## Error Handling

The server includes comprehensive error handling and logging:
- API errors are returned with appropriate HTTP status codes
- WebSocket errors are logged and handled gracefully
- Database errors are caught and logged
- All errors include descriptive messages for debugging

## Security

- JWT-based authentication
- Password hashing using bcrypt
- CORS protection
- Input validation
- Rate limiting (TODO)
- Request sanitization

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the ISC License. 