// backend/routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/authMiddleware');

// @route   GET /api/users/seniors
// @desc    Get all 'senior' users, with optional search (UPDATED)
// @access  Private
router.get('/', auth, async (req, res) => { // Renamed from '/seniors' to '/'
  try {
    const { search } = req.query;

    let queryText = `
      SELECT 
        u.user_id, 
        u.username, 
        u.email, 
        u.year, 
        u.branch,
        c.club_name,
        STRING_AGG(s.skill_name, ', ') AS skills
      FROM 
        users u
      LEFT JOIN 
        user_skills us ON u.user_id = us.user_id
      LEFT JOIN 
        skills s ON us.skill_id = s.skill_id
      LEFT JOIN 
        clubs c ON u.club_id = c.club_id
      -- The "WHERE u.user_role = 'senior'" line is GONE --
    `;

    const queryParams = [];

    if (search) {
      queryParams.push(`%${search}%`);
      queryText += `
        WHERE u.user_id IN ( -- Changed from 'AND' to 'WHERE'
          SELECT u_search.user_id FROM users u_search
          LEFT JOIN user_skills us_search ON u_search.user_id = us_search.user_id
          LEFT JOIN skills s_search ON us_search.skill_id = s_search.skill_id
          LEFT JOIN clubs c_search ON u_search.club_id = c_search.club_id
          WHERE 
            u_search.username ILIKE $1 OR
            u_search.branch ILIKE $1 OR
            s_search.skill_name ILIKE $1 OR
            c_search.club_name ILIKE $1
        )
      `;
    }

    queryText += ' GROUP BY u.user_id, c.club_name ORDER BY u.username ASC';

    const { rows } = await db.query(queryText, queryParams);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.user_id, 
        u.username, 
        u.email, 
        u.year, 
        u.branch,
        u.club_id,
        STRING_AGG(s.skill_name, ', ') AS skills
      FROM 
        users u
      LEFT JOIN 
        user_skills us ON u.user_id = us.user_id
      LEFT JOIN 
        skills s ON us.skill_id = s.skill_id
      WHERE 
        u.user_id = $1
      GROUP BY 
        u.user_id;
    `;
    const { rows } = await db.query(query, [req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/users/me
// @desc    Update the logged-in user's profile
// @access  Private
router.put('/me', auth, async (req, res) => {
  const { year, branch, club_id, skills } = req.body;
  const userId = req.user.id;

  const client = await db.pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');

    // 1. Update the user's table
    await client.query(
      'UPDATE users SET year = $1, branch = $2, club_id = $3 WHERE user_id = $4',
      [year, branch, club_id, userId]
    );

    // 2. Wipe old skills for this user
    await client.query('DELETE FROM user_skills WHERE user_id = $1', [userId]);

    // 3. Add new skills (same logic as registration)
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
          [userId, skillId]
        );
      }
    }

    // 4. Commit transaction
    await client.query('COMMIT');
    res.json({ msg: 'Profile updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

module.exports = router;