import { WebSocketServer } from 'ws';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

const app = express();
app.use(cors());

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Map();

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received:', data);

      if (data.type === 'REGISTER') {
        // Register the client with their userId
        clients.set(data.from, ws);
        console.log(`Client registered: ${data.from}`);
        return;
      }

      // Forward the message to the target user
      const targetWs = clients.get(data.to);
      if (targetWs) {
        targetWs.send(JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    // Remove client from the map
    for (const [userId, client] of clients.entries()) {
      if (client === ws) {
        clients.delete(userId);
        console.log(`Client disconnected: ${userId}`);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
}); 