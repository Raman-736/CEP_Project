// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user (UPDATED WITH SKILLS)
router.post('/register', async (req, res) => {
  // 1. Destructure all fields from body (user_role is GONE)
  const { username, email, password, year, branch, skills, club_id } =
    req.body;

  // 2. Validation
  if (!username || !email || !password || !branch || !club_id) {
    return res
      .status(400)
      .json({ msg: 'Please enter all required fields' });
  }

  // 3. Use a DB client for transaction
  const client = await db.pool.connect();

  try {
    // --- START TRANSACTION ---
    await client.query('BEGIN');

    // 4. Check if user already exists
    let user = await client.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    if (user.rows.length > 0) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // 5. Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 6. Save user to database (user_role is GONE from query)
    const newUser = await client.query(
      `INSERT INTO users (username, email, password_hash, year, branch, club_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING user_id, username, email`, // Removed user_role
      [username, email, password_hash, year, branch, club_id]
    );

    const newUserId = newUser.rows[0].user_id;

    // --- 7. Process Skills ---
    if (skills && skills.length > 0) {
      for (const skillName of skills) {
        const skill = await client.query(
          `INSERT INTO skills (skill_name) 
           VALUES ($1) 
           ON CONFLICT (skill_name) 
           DO UPDATE SET skill_name = EXCLUDED.skill_name 
           RETURNING skill_id`,
          [skillName]
        );
        const skillId = skill.rows[0].skill_id;

        await client.query(
          'INSERT INTO user_skills (user_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [newUserId, skillId]
        );
      }
    }

    // 8. Commit the transaction
    await client.query('COMMIT');

    // 9. Create and return JWT (payload no longer has role)
    const payload = {
      user: {
        id: newUserId,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '30d' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ token });
      }
    );
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

// We will add the /api/auth/login route here later
// backend/routes/auth.js

// ... (your existing /register route code is up here) ...

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Simple validation
  if (!email || !password) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  try {
    // 1. Check if user exists
    let user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const matchedUser = user.rows[0];

    // 2. Check if password matches
    const isMatch = await bcrypt.compare(password, matchedUser.password_hash);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // 3. User is valid. Create and return a JSON Web Token (JWT)
    const payload = {
      user: {
        id: matchedUser.user_id,
        role: matchedUser.user_role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '30d' },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({ token }); // Send token back to client
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;