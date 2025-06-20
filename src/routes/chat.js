const express = require('express');
const auth = require('../middleware/auth');
const ChatController = require('../controllers/chatController');

function createChatRouter(io) {
  const router = express.Router();
  const chatController = new ChatController(io);

  // Get chat history between two users
  router.get('/history/:otherUserId', auth, async (req, res) => {
    try {
      const messages = await chatController.getChatHistory(
        req.user.id,
        req.params.otherUserId
      );
      res.json(messages);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  });

  // Mark messages as read
  router.post('/read/:senderId', auth, async (req, res) => {
    try {
      await chatController.markMessagesAsRead(
        req.params.senderId,
        req.user.id
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  });

  return router;
}

module.exports = createChatRouter; 