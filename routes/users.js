const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get user profile, earnings summary and term earnings
router.get('/me/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ytdEarnings = user.total_earnings || 0;
    const rollingEarnings = ytdEarnings;

    const termEarnings = [
      { period_start: '2025-01-01', period_end: '2025-03-31', earnings: ytdEarnings * 0.25 },
      { period_start: '2025-04-01', period_end: '2025-06-30', earnings: ytdEarnings * 0.25 },
      { period_start: '2025-07-01', period_end: '2025-09-30', earnings: ytdEarnings * 0.25 },
      { period_start: '2025-10-01', period_end: '2025-12-31', earnings: ytdEarnings * 0.25 }
    ];

    res.json({ user, ytdEarnings, rollingEarnings, termEarnings });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get full org chart with names and earnings
router.get('/org-chart/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await pool.query(`
      WITH RECURSIVE hierarchy AS (
        SELECT id, name, email, introducer_id, total_earnings
        FROM users
        WHERE id = $1
        UNION
        SELECT u.id, u.name, u.email, u.introducer_id, u.total_earnings
        FROM users u
        INNER JOIN hierarchy h ON u.introducer_id = h.id
      )
      SELECT * FROM hierarchy
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching org chart:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
