const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/auth');
const { createUserRouter } = require('./routes/users');
const createChatRouter = require('./routes/chat');
const UserController = require('./controllers/userController');
const SocketManager = require('./utils/socketManager');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200
};

// Initialize Socket.IO with CORS configuration
const socketManager = new SocketManager(server);

// Initialize controllers
const userController = new UserController(socketManager.io);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', createUserRouter(userController));
app.use('/api/chat', createChatRouter(socketManager.io));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database first
    await connectDB();
    
    // Start the server after successful database connection
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();