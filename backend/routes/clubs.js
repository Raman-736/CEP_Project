// backend/routes/clubs.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/authMiddleware');

// @route   GET /api/clubs
// @desc    Get all clubs
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Get all clubs *except* 'None'
    const clubs = await db.query(
      "SELECT * FROM clubs WHERE club_name != 'None' ORDER BY club_name"
    );
    res.json(clubs.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/clubs/:id/members
// @desc    Get all members for a specific club
// @access  Private
router.get('/:id/members', auth, async (req, res) => {
  const { id } = req.params; // club_id
  try {
    // This query is similar to the /seniors one, but shows ALL users
    const queryText = `
      SELECT 
        u.user_id, 
        u.username, 
        u.email, 
        u.year, 
        u.branch,
        u.user_role,
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
      WHERE 
        u.club_id = $1
      GROUP BY 
        u.user_id, c.club_name
      ORDER BY 
        u.year DESC, u.username ASC;
    `;
    
    const { rows } = await db.query(queryText, [id]);
    res.json(rows);
  } catch (err)
 {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;