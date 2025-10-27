// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/authMiddleware'); // Import our auth middleware

// @route   POST /api/chat/start
// @desc    Start or find a conversation with another user
// @access  Private
router.post('/start', auth, async (req, res) => {
  const { receiverId } = req.body; // The ID of the senior we want to chat with
  const senderId = req.user.id; // Our own ID from the token

  if (!receiverId) {
    return res.status(400).json({ msg: 'Receiver ID is required' });
  }

  try {
    // Check if a conversation already exists between these two users
    // We check both directions (user1 -> user2 OR user2 -> user1)
    let conversation = await db.query(
      'SELECT * FROM conversations WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)',
      [senderId, receiverId]
    );

    if (conversation.rows.length > 0) {
      // Conversation already exists
      res.json(conversation.rows[0]);
    } else {
      // Create a new conversation
      const newConversation = await db.query(
        'INSERT INTO conversations (user1_id, user2_id) VALUES ($1, $2) RETURNING *',
        [senderId, receiverId]
      );
      res.status(201).json(newConversation.rows[0]);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/chat/history/:id
// @desc    Get all messages for a specific conversation
// @access  Private
router.get('/history/:id', auth, async (req, res) => {
  const { id } = req.params; // This is the conversation_id

  try {
    // Get all messages, and join with user table to get sender's username
    const messages = await db.query(
      'SELECT m.message_id, m.message_text, m.created_at, u.username AS sender_username, m.sender_id FROM messages m JOIN users u ON m.sender_id = u.user_id WHERE m.conversation_id = $1 ORDER BY m.created_at ASC',
      [id]
    );

    res.json(messages.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/my-conversations', auth, async (req, res) => {
  const userId = req.user.id; // Get our ID from the token

  try {
    // This query is a bit complex. It does:
    // 1. Finds all conversations where our user is user1 OR user2.
    // 2. Joins with the users table to get the *other* person's details.
    // 3. Uses CASE to correctly pick the partner's ID (not our own).
    const query = `
      SELECT 
        c.conversation_id,
        u.user_id AS partner_id,
        u.username AS partner_username
      FROM 
        conversations c
      JOIN 
        users u ON u.user_id = CASE 
          WHEN c.user1_id = $1 THEN c.user2_id 
          ELSE c.user1_id 
        END
      WHERE 
        c.user1_id = $1 OR c.user2_id = $1
      ORDER BY 
        c.created_at DESC;
    `;
    
    const { rows } = await db.query(query, [userId]);
    res.json(rows);
    
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
module.exports = router;