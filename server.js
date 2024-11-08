const WebSocket = require('ws');
const { createServer } = require('http');
const { parse } = require('url');
const express = require('express');

// Create an Express app to serve HTTP requests
const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/', (req, res) => {
  res.send('Hello, WebSocket server is running!');
});

const server = createServer(app);
const wss = new WebSocket.Server({ noServer: true });

const onlineUsers = new Map();
const letters = new Map();

// Heartbeat configuration
const HEARTBEAT_INTERVAL = 30000;
const CLIENT_TIMEOUT = 35000;

function noop() {}

function heartbeat() {
  this.isAlive = true;
}

function broadcastOnlineCount() {
  const count = onlineUsers.size;
  const message = JSON.stringify({ type: 'online_count', count });
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Clean up dead connections
const interval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping(noop);
  });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => {
  clearInterval(interval);
});

wss.on('connection', (ws) => {
  let userId = null;
  ws.isAlive = true;

  // Set up heartbeat
  ws.on('pong', heartbeat);

  // Send immediate connection acknowledgment
  ws.send(JSON.stringify({ type: 'connected' }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'join':
          userId = Math.random().toString(36).substr(2, 9);
          onlineUsers.set(userId, { name: data.name, ws });
          
          // Send joined confirmation
          ws.send(JSON.stringify({ 
            type: 'joined', 
            userId,
            onlineCount: onlineUsers.size 
          }));
          
          // Broadcast new count immediately
          broadcastOnlineCount();
          break;

        case 'letter':
          const onlineUserIds = Array.from(onlineUsers.keys()).filter(id => id !== userId);
          if (onlineUserIds.length === 0) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'No online users available to receive your letter.' 
            }));
            return;
          }

          const randomUserId = onlineUserIds[Math.floor(Math.random() * onlineUserIds.length)];
          const recipient = onlineUsers.get(randomUserId);
          const sender = onlineUsers.get(userId);

          const letter = {
            id: Math.random().toString(36).substr(2, 9),
            content: data.content,
            senderName: sender.name,
            recipientName: recipient.name,
            timestamp: new Date().toISOString()
          };

          letters.set(letter.id, letter);

          recipient.ws.send(JSON.stringify({
            type: 'receive_letter',
            letter
          }));

          ws.send(JSON.stringify({
            type: 'letter_sent',
            letter
          }));
          break;
      }
    } catch (error) {
      console.error('Message processing error:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to process message' 
      }));
    }
  });

  ws.on('close', () => {
    if (userId) {
      onlineUsers.delete(userId);
      broadcastOnlineCount();
    }
  });

  ws.on('error', () => {
    if (userId) {
      onlineUsers.delete(userId);
      broadcastOnlineCount();
    }
  });
});

server.on('upgrade', (request, socket, head) => {
  const { pathname } = parse(request.url);

  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`WebSocket server is running on port ${port}`);
});