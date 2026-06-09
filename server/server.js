const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const app = require('./src/app');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your_access_secret_here';

const server = http.createServer(app);

// Initialize Sockets using the unified socket hub
const initSocket = require('./src/socket/index');
const io = initSocket(server);

// A utility to push notifications from REST endpoints
app.set('io', io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
