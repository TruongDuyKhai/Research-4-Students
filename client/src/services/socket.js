import { io } from 'socket.io-client';

class SocketService {
  socket = null;

  connect(token) {
    if (this.socket) {
      if (this.socket.connected) return this.socket;
      this.socket.connect();
      return this.socket;
    }

    // Connect to Socket.io server with auth token in handshake
    this.socket = io({
      auth: { token },
      autoConnect: true,
      reconnection: true
    });

    this.socket.on('connect', () => {
      console.log('Socket.io client connected successfully');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket.io client connection error:', err);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }
}

const socketServiceInstance = new SocketService();
export default socketServiceInstance;
