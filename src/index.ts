import express from 'express';
import { createServer } from 'http';
import { WebRTCSignalingServer } from './signaling/webrtc';

const app = express();
const server = createServer(app);

// Initialize WebRTC signaling server
new WebRTCSignalingServer(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 