const { models } = require('../config/db');
const { Op } = require('sequelize');

class ChatController {
  constructor(io) {
    this.io = io;
  }

  // Format message for frontend
  formatMessage(message) {
    return {
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.message,
      message: message.message, // Keep both for backward compatibility
      timestamp: message.createdAt,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      type: message.type || 'text',
      status: message.status || (message.read ? 'read' : 'sent'),
      read: message.read,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      imageUrl: message.imageUrl
    };
  }

  // Save a new chat message
  async saveMessage(senderId, receiverId, message) {
    try {
      console.log('Attempting to save message:', {
        senderId,
        receiverId,
        message
      });

      const chat = await models.Chat.create({
        senderId,
        receiverId,
        message,
        type: 'text',
        status: 'sent'
      });

      const formattedMessage = this.formatMessage(chat);
      console.log('Message saved successfully:', formattedMessage);
      return formattedMessage;
    } catch (error) {
      console.error('Error saving message:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Get chat history between two users
  async getChatHistory(userId1, userId2) {
    try {
      console.log('Fetching chat history between users:', {
        userId1,
        userId2
      });

      const messages = await models.Chat.findAll({
        where: {
          [Op.or]: [
            {
              senderId: userId1,
              receiverId: userId2
            },
            {
              senderId: userId2,
              receiverId: userId1
            }
          ]
        },
        include: [
          {
            model: models.User,
            as: 'Sender',
            attributes: ['id', 'username', 'name', 'avatar']
          },
          {
            model: models.User,
            as: 'Receiver',
            attributes: ['id', 'username', 'name', 'avatar']
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      const formattedMessages = messages.map(msg => this.formatMessage(msg));
      console.log('Found messages:', formattedMessages.length);
      return formattedMessages;
    } catch (error) {
      console.error('Error getting chat history:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Mark messages as read
  async markMessagesAsRead(senderId, receiverId) {
    try {
      console.log('Marking messages as read:', {
        senderId,
        receiverId
      });

      await models.Chat.update(
        { read: true, status: 'read' },
        {
          where: {
            senderId,
            receiverId,
            read: false
          }
        }
      );

      // Notify sender that messages were read
      const socket = this.io.sockets.sockets.get(senderId);
      if (socket) {
        socket.emit('messages_read', { by: receiverId });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = ChatController; 