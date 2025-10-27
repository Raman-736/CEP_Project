// backend/routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/authMiddleware');

// @route   GET /api/users/seniors
// @desc    Get all 'senior' users, with optional search (UPDATED)
// @access  Private
router.get('/seniors', auth, async (req, res) => {
  try {
    const { search } = req.query;

    let queryText = `
      SELECT 
        u.user_id, 
        u.username, 
        u.email, 
        u.year, 
        u.branch,
        c.club_name, -- ADDED club name
        STRING_AGG(s.skill_name, ', ') AS skills
      FROM 
        users u
      LEFT JOIN 
        user_skills us ON u.user_id = us.user_id
      LEFT JOIN 
        skills s ON us.skill_id = s.skill_id
      LEFT JOIN 
        clubs c ON u.club_id = c.club_id -- ADDED club join
      WHERE 
        u.user_role = 'senior'
    `;
    
    const queryParams = [];
    
    if (search) {
      queryParams.push(`%${search}%`);
      queryText += `
        AND u.user_id IN (
          SELECT u_search.user_id FROM users u_search
          LEFT JOIN user_skills us_search ON u_search.user_id = us_search.user_id
          LEFT JOIN skills s_search ON us_search.skill_id = s_search.skill_id
          LEFT JOIN clubs c_search ON u_search.club_id = c_search.club_id -- ADDED
          WHERE 
            u_search.username ILIKE $1 OR
            u_search.branch ILIKE $1 OR
            s_search.skill_name ILIKE $1 OR
            c_search.club_name ILIKE $1 -- ADDED
        )
      `;
    }

    queryText += ' GROUP BY u.user_id, c.club_name ORDER BY u.username ASC'; // ADDED c.club_name to GROUP BY

    const { rows } = await db.query(queryText, queryParams);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// We can add routes for getting a single user profile later
// router.get('/profile/:id', auth, ...)

module.exports = router;