// backend/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});

// Export the pool and a query function
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool, // Export the pool for transactions
};