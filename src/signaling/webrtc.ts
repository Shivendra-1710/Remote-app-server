import { Server, Socket } from 'socket.io';
import { createServer } from 'http';

interface SignalingMessage {
  roomId: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidate;
}

export class WebRTCSignalingServer {
  private io: Server;
  private rooms: Map<string, Set<string>> = new Map();

  constructor(server: ReturnType<typeof createServer>) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join-room', (roomId: string) => {
        this.handleJoinRoom(socket, roomId);
      });

      socket.on('offer', (data: SignalingMessage) => {
        console.log('Received offer from', socket.id, 'for room', data.roomId);
        this.handleOffer(socket, data);
      });

      socket.on('answer', (data: SignalingMessage) => {
        console.log('Received answer from', socket.id, 'for room', data.roomId);
        this.handleAnswer(socket, data);
      });

      socket.on('ice-candidate', (data: SignalingMessage) => {
        console.log('Received ICE candidate from', socket.id, 'for room', data.roomId);
        this.handleIceCandidate(socket, data);
      });

      socket.on('stop-sharing', (data: { roomId: string }) => {
        console.log('Screen sharing stopped in room', data.roomId);
        socket.to(data.roomId).emit('share-stopped');
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleJoinRoom(socket: Socket, roomId: string) {
    // Leave all other rooms first
    this.rooms.forEach((clients, room) => {
      if (clients.has(socket.id)) {
        clients.delete(socket.id);
        socket.leave(room);
      }
    });

    // Join new room
    const room = this.rooms.get(roomId) || new Set();
    room.add(socket.id);
    this.rooms.set(roomId, room);
    socket.join(roomId);
    
    console.log(`Client ${socket.id} joined room ${roomId}`);
    console.log(`Room ${roomId} now has ${room.size} clients`);
  }

  private handleOffer(socket: Socket, data: SignalingMessage) {
    const { roomId, offer } = data;
    console.log(`Broadcasting offer to room ${roomId} from ${socket.id}`);
    socket.to(roomId).emit('offer', { offer, roomId });
  }

  private handleAnswer(socket: Socket, data: SignalingMessage) {
    const { roomId, answer } = data;
    console.log(`Broadcasting answer to room ${roomId} from ${socket.id}`);
    socket.to(roomId).emit('answer', { answer, roomId });
  }

  private handleIceCandidate(socket: Socket, data: SignalingMessage) {
    const { roomId, candidate } = data;
    console.log(`Broadcasting ICE candidate to room ${roomId} from ${socket.id}`);
    socket.to(roomId).emit('ice-candidate', { candidate, roomId });
  }

  private handleDisconnect(socket: Socket) {
    console.log('Client disconnected:', socket.id);
    // Remove socket from all rooms
    this.rooms.forEach((clients, roomId) => {
      if (clients.has(socket.id)) {
        clients.delete(socket.id);
        console.log(`Removed ${socket.id} from room ${roomId}`);
        
        // Notify others in the room
        socket.to(roomId).emit('peer-disconnected', { peerId: socket.id });
        
        // Clean up empty rooms
        if (clients.size === 0) {
          this.rooms.delete(roomId);
          console.log(`Removed empty room ${roomId}`);
        }
      }
    });
  }
} 