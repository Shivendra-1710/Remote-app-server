const { Server } = require('socket.io');
const ChatController = require('../controllers/chatController');
const { models } = require('../config/db');
let redisAdapter;
try {
  const { createAdapter } = require('@socket.io/redis-adapter');
  const Redis = require('ioredis');
  redisAdapter = { createAdapter, Redis };
} catch (error) {
  console.log('[SocketManager] Redis adapter not available, falling back to in-memory adapter');
  redisAdapter = null;
}

class SocketManager {
  constructor(server, options = {}) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "https://remotely1.netlify.app",
        methods: ["GET", "POST"],
        credentials: true
      },
      ...options
    });

    this.chatController = new ChatController(this.io);
    this.connectedUsers = new Map();
    this.activeScreenShares = new Map(); // Track active screen shares
    
    // Initialize Redis if configured and available
    if (redisAdapter && process.env.REDIS_URL) {
      try {
        const pubClient = new redisAdapter.Redis(process.env.REDIS_URL);
        const subClient = pubClient.duplicate();
        this.io.adapter(redisAdapter.createAdapter(pubClient, subClient));
        console.log('[SocketManager] Redis adapter initialized successfully');
      } catch (error) {
        console.error('[SocketManager] Failed to initialize Redis adapter:', error);
      }
    }

    this.setupSocketEvents();
  }

  async verifyUsers(senderId, receiverId) {
    try {
      const [sender, receiver] = await Promise.all([
        models.User.findByPk(senderId),
        models.User.findByPk(receiverId)
      ]);

      if (!sender || !receiver) {
        throw new Error('One or both users not found');
      }

      return true;
    } catch (error) {
      console.error('User verification failed:', error);
      return false;
    }
  }

  setupSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Handle user authentication
      socket.on('authenticate', async (userId) => {
        try {
          console.log('User authenticating:', userId);
          
          // Verify user exists in database
          const user = await models.User.findByPk(userId);
          if (!user) {
            throw new Error('User not found');
          }

          // Store user information
          this.connectedUsers.set(userId, socket.id);
          socket.userId = userId;
          
          console.log('User authenticated successfully:', userId);
          
          // Send authentication success
          socket.emit('auth_success');
          
          // Notify other users about this user's online status
          this.io.emit('user:online', { userId });
        } catch (error) {
          console.error('Authentication failed:', error);
          socket.emit('auth_error', { error: 'Authentication failed' });
        }
      });

      // Handle private messages
      socket.on('private_message', async ({ receiverId, message }) => {
        try {
          console.log('Received private message:', {
            senderId: socket.userId,
            receiverId,
            message
          });

          if (!socket.userId) {
            throw new Error('User not authenticated');
          }

          // Verify both users exist
          const usersExist = await this.verifyUsers(socket.userId, receiverId);
          if (!usersExist) {
            throw new Error('Invalid sender or receiver');
          }

          // Save message to database
          const savedMessage = await this.chatController.saveMessage(
            socket.userId,
            receiverId,
            message
          );

          console.log('Message saved:', savedMessage);

          // Send to receiver if online
          const receiverSocketId = this.connectedUsers.get(receiverId);
          if (receiverSocketId) {
            console.log('Sending message to receiver:', receiverId);
            this.io.to(receiverSocketId).emit('new_message', savedMessage);
          }

          // Send confirmation back to sender
          socket.emit('message_sent', savedMessage);
        } catch (error) {
          console.error('Error handling private message:', error);
          socket.emit('message_error', { 
            error: 'Failed to send message',
            details: error.message 
          });
        }
      });

      // Handle fetching chat history
      socket.on('get_chat_history', async ({ otherUserId }) => {
        try {
          console.log('Fetching chat history:', {
            userId: socket.userId,
            otherUserId
          });

          if (!socket.userId) {
            throw new Error('User not authenticated');
          }

          // Verify both users exist
          const usersExist = await this.verifyUsers(socket.userId, otherUserId);
          if (!usersExist) {
            throw new Error('Invalid users');
          }

          const messages = await this.chatController.getChatHistory(
            socket.userId,
            otherUserId
          );
          
          console.log('Sending chat history:', messages.length, 'messages');
          socket.emit('chat_history', messages);
        } catch (error) {
          console.error('Error fetching chat history:', error);
          socket.emit('chat_history_error', { 
            error: 'Failed to fetch chat history',
            details: error.message 
          });
        }
      });

      // Handle marking messages as read
      socket.on('mark_messages_read', async ({ senderId }) => {
        try {
          console.log('Marking messages as read:', {
            senderId,
            receiverId: socket.userId
          });

          if (!socket.userId) {
            throw new Error('User not authenticated');
          }

          // Verify both users exist
          const usersExist = await this.verifyUsers(senderId, socket.userId);
          if (!usersExist) {
            throw new Error('Invalid users');
          }

          await this.chatController.markMessagesAsRead(senderId, socket.userId);
          
          // Notify the sender that their messages were read
          const senderSocketId = this.connectedUsers.get(senderId);
          if (senderSocketId) {
            this.io.to(senderSocketId).emit('messages_read', { by: socket.userId });
          }
        } catch (error) {
          console.error('Error marking messages as read:', error);
          socket.emit('mark_messages_error', {
            error: 'Failed to mark messages as read',
            details: error.message
          });
        }
      });

      // Screen sharing signaling
      socket.on('screenShare:offer', ({ to, offer }) => {
        console.log('[SocketManager] Received screen share offer from', socket.userId, 'to', to);
        const targetSocketId = this.connectedUsers.get(to);
        if (targetSocketId) {
          console.log('[SocketManager] Forwarding offer to socket:', targetSocketId);
          socket.to(targetSocketId).emit('screenShare:offer', {
            from: socket.userId,
            offer
          });
          // Track the screen share
          this.activeScreenShares.set(socket.userId, to);
        } else {
          console.warn('[SocketManager] Target user not found for screen share offer:', to);
        }
      });

      socket.on('screenShare:answer', ({ to, answer }) => {
        console.log('[SocketManager] Received screen share answer from', socket.userId, 'to', to);
        const targetSocketId = this.connectedUsers.get(to);
        if (targetSocketId) {
          console.log('[SocketManager] Forwarding answer to socket:', targetSocketId);
          socket.to(targetSocketId).emit('screenShare:answer', {
            from: socket.userId,
            answer
          });
        } else {
          console.warn('[SocketManager] Target user not found for screen share answer:', to);
        }
      });

      socket.on('screenShare:iceCandidate', ({ to, candidate }) => {
        console.log('[SocketManager] Received ICE candidate from', socket.userId, 'to', to);
        const targetSocketId = this.connectedUsers.get(to);
        if (targetSocketId) {
          console.log('[SocketManager] Forwarding ICE candidate to socket:', targetSocketId);
          socket.to(targetSocketId).emit('screenShare:iceCandidate', {
            from: socket.userId,
            candidate
          });
        } else {
          console.warn('[SocketManager] Target user not found for ICE candidate:', to);
        }
      });

      socket.on('screenShare:start', ({ to }) => {
        console.log('[SocketManager] Starting screen share from', socket.userId, 'to', to);
        const targetSocketId = this.connectedUsers.get(to);
        if (targetSocketId) {
          console.log('[SocketManager] Notifying target about screen share start:', targetSocketId);
          socket.to(targetSocketId).emit('screenShare:start', {
            from: socket.userId
          });
          this.activeScreenShares.set(socket.userId, to);
        } else {
          console.warn('[SocketManager] Target user not found for screen share start:', to);
        }
      });

      socket.on('screenShare:accept', ({ to }) => {
        console.log('[SocketManager] Accepting screen share from', socket.userId, 'to', to);
        const targetSocketId = this.connectedUsers.get(to);
        if (targetSocketId) {
          console.log('[SocketManager] Notifying source about screen share accept:', targetSocketId);
          socket.to(targetSocketId).emit('screenShare:accept', {
            from: socket.userId
          });
        } else {
          console.warn('[SocketManager] Target user not found for screen share accept:', to);
        }
      });

      socket.on('screenShare:stop', ({ to }) => {
        console.log('[SocketManager] Stopping screen share from', socket.userId, 'to', to);
        const targetSocketId = this.connectedUsers.get(to);
        if (targetSocketId) {
          console.log('[SocketManager] Notifying target about screen share stop:', targetSocketId);
          socket.to(targetSocketId).emit('screenShare:stop', {
            from: socket.userId
          });
          this.activeScreenShares.delete(socket.userId);
        } else {
          console.warn('[SocketManager] Target user not found for screen share stop:', to);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (socket.userId) {
          // If user was sharing screen, notify the viewer
          const viewerId = this.activeScreenShares.get(socket.userId);
          if (viewerId) {
            const viewerSocketId = this.connectedUsers.get(viewerId);
            if (viewerSocketId) {
              socket.to(viewerSocketId).emit('screenShare:stop', {
                from: socket.userId
              });
            }
            this.activeScreenShares.delete(socket.userId);
          }

          console.log('User disconnected:', socket.userId);
          this.connectedUsers.delete(socket.userId);
          // Notify other users about this user's offline status
          this.io.emit('user:offline', { userId: socket.userId });
          console.log('Remaining active connections:', Array.from(this.connectedUsers.entries()));
        }
      });
    });
  }

  // Helper method to get socket by user ID
  getSocketId(userId) {
    const socketId = this.connectedUsers.get(userId);
    if (!socketId) {
      console.warn('[SocketManager] No socket found for user:', userId);
    }
    return socketId;
  }

  // Helper method to broadcast to all connected clients
  broadcast(event, data) {
    console.log('[SocketManager] Broadcasting event:', event, 'to all clients');
    this.io.emit(event, data);
  }
}

module.exports = SocketManager; 