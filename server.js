const WebSocket = require('ws');
const { createServer } = require('http');
const { parse } = require('url');

const server = createServer();
const wss = new WebSocket.Server({ noServer: true });

const onlineUsers = new Map();
const letters = new Map();

wss.on('connection', (ws) => {
  let userId = null;

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'join':
        userId = Math.random().toString(36).substr(2, 9);
        onlineUsers.set(userId, { name: data.name, ws });
        ws.send(JSON.stringify({ type: 'joined', userId }));
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
  });

  ws.on('close', () => {
    if (userId) {
      onlineUsers.delete(userId);
      broadcastOnlineCount();
    }
  });

  function broadcastOnlineCount() {
    const count = onlineUsers.size;
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ 
          type: 'online_count', 
          count 
        }));
      }
    });
  }
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