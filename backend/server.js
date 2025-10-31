// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const db = require('./db');
const path = require('path');

// --- Setup Express App ---
const app = express();
app.use(cors());
app.use(express.json());

// --- Homepage Route ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/homepage.html'));
});

// --- Static Files ---
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

// --- Create HTTP Server and WebSocket Server ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const conversations = new Map();

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (messageData) => {
    const data = JSON.parse(messageData);

    // --- "join" Message ---
    if (data.type === 'join') {
      try {
        const payload = jwt.verify(data.token, process.env.JWT_SECRET);
        const userId = payload.user.id;
        const conversationId = data.conversationId;
        const user = await db.query(
          'SELECT username FROM users WHERE user_id = $1',
          [userId]
        );
        ws.userId = userId;
        ws.username = user.rows[0].username;
        ws.conversationId = conversationId;
        if (!conversations.has(conversationId)) {
          conversations.set(conversationId, new Set());
        }
        conversations.get(conversationId).add(ws);
        console.log(`User ${ws.username} joined conversation ${conversationId}`);
      } catch (err) {
        console.error('Auth error:', err.message);
        ws.close();
      }
    }

    // --- "message" Message (THIS IS THE CORRECTED BLOCK) ---
    if (data.type === 'message') {
      try {
        const { text } = data;
        const { userId, username, conversationId } = ws;

        // 1. Save message to DB and get the created row BACK
        //    RETURNING * gives us the real created_at timestamp
        const newMessage = await db.query(
          'INSERT INTO messages (conversation_id, sender_id, message_text) VALUES ($1, $2, $3) RETURNING *',
          [conversationId, userId, text]
        );
        
        const savedMsg = newMessage.rows[0];

        // 2. Create a payload that matches the history API shape
        const payload = {
          message_id: savedMsg.message_id,
          message_text: savedMsg.message_text,
          created_at: savedMsg.created_at, // The TRUE DB timestamp
          sender_username: username, // The sender's username
          sender_id: savedMsg.sender_id,
        };
        
        // 3. Create the final WebSocket message
        const messagePayload = JSON.stringify({
          type: 'newMessage',
          payload: payload, // Nest the payload
        });

        // 4. Broadcast the TRUE message to everyone
        if (conversations.has(conversationId)) {
          for (const client of conversations.get(conversationId)) {
            if (client.readyState === 1) { // WebSocket.OPEN
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
    console.log('Client disconnected');
    if (ws.conversationId && conversations.has(ws.conversationId)) {
      conversations.get(ws.conversationId).delete(ws);
      if (conversations.get(ws.conversationId).size === 0) {
        conversations.delete(ws.conversationId);
      }
    }
  });
});

// --- Start the Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server (HTTP and WebSocket) running on http://localhost:${PORT}`);
});