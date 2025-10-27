// // backend/server.js
// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();

// const authRoutes = require('./routes/auth');
// // We will add these later:
// const userRoutes = require('./routes/users');
// const chatRoutes = require('./routes/chat');

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Middleware
// app.use(cors()); // Allows frontend to make requests
// app.use(express.json()); // Parses incoming JSON bodies

// // API Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/chat', chatRoutes);

// // Test route
// app.get('/', (req, res) => {
//   res.send('CampusConnect API is running!');
// });

// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });

// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const http = require('http'); // 1. Import http
const { WebSocketServer } = require('ws'); // 2. Import ws
const jwt = require('jsonwebtoken'); // 3. Import jwt
const db = require('./db'); // 4. Import db

// --- Setup Express App ---
const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

// --- API Routes ---
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');
const clubRoutes = require('./routes/clubs');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/clubs', clubRoutes);

app.get('/', (req, res) => {
  res.send('CampusConnect API is running!');
});

// --- 5. Create HTTP Server and WebSocket Server ---
const server = http.createServer(app); // Create an HTTP server from the Express app
const wss = new WebSocketServer({ server }); // Attach the WebSocket server to the HTTP server

// This Map will store active conversations: { conversationId -> Set(of WebSockets) }
const conversations = new Map();

wss.on('connection', (ws) => {
  // This code runs when a new client (browser) connects
  console.log('Client connected');

  ws.on('message', async (messageData) => {
    // This code runs when a message is received from a client
    const data = JSON.parse(messageData);

    // --- Message Type 1: "join" ---
    if (data.type === 'join') {
      try {
        // A. Authenticate the user's token
        const payload = jwt.verify(data.token, process.env.JWT_SECRET);
        const userId = payload.user.id;
        const conversationId = data.conversationId;

        // B. Get user info and store it on the WebSocket connection
        const user = await db.query(
          'SELECT username FROM users WHERE user_id = $1',
          [userId]
        );
        ws.userId = userId;
        ws.username = user.rows[0].username;
        ws.conversationId = conversationId;

        // C. Add this user's socket to the conversation "room"
        if (!conversations.has(conversationId)) {
          conversations.set(conversationId, new Set());
        }
        conversations.get(conversationId).add(ws);

        console.log(`User ${ws.username} joined conversation ${conversationId}`);
      } catch (err) {
        console.error('Auth error:', err.message);
        ws.close(); // Close connection if token is bad
      }
    }

    // --- Message Type 2: "message" ---
    if (data.type === 'message') {
      try {
        const { text } = data;
        const { userId, username, conversationId } = ws;

        // A. Save the message to the database
        await db.query(
          'INSERT INTO messages (conversation_id, sender_id, message_text) VALUES ($1, $2, $3)',
          [conversationId, userId, text]
        );

        // B. Create the message payload to broadcast
        const messagePayload = JSON.stringify({
          type: 'newMessage',
          text: text,
          senderId: userId,
          senderUsername: username,
          createdAt: new Date().toISOString(),
        });

        // C. Broadcast the message to everyone in the SAME conversation
        if (conversations.has(conversationId)) {
          for (const client of conversations.get(conversationId)) {
            if (client.readyState === 1) { // 1 = WebSocket.OPEN
              client.send(messagePayload);
            }
          }
        }
      } catch (err) {
        console.error('Message error:', err.message);
      }
    }
  });

  ws.on('close', () => {
    // This code runs when a client disconnects
    console.log('Client disconnected');
    
    // Remove the client from the conversation "room"
    if (ws.conversationId && conversations.has(ws.conversationId)) {
      conversations.get(ws.conversationId).delete(ws);
      if (conversations.get(ws.conversationId).size === 0) {
        conversations.delete(ws.conversationId);
      }
    }
  });
});

// --- 6. Start the Server ---
const PORT = process.env.PORT || 5000;
// Use server.listen, NOT app.listen
server.listen(PORT, () => {
  console.log(`Server (HTTP and WebSocket) running on http://localhost:${PORT}`);
});