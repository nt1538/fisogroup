const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get user profile, earnings summary and term earnings
router.get('/users/me/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const client = await pool.connect();

    // Get user info
    const userQuery = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userQuery.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get YTD earnings
    const ytdQuery = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total 
       FROM life_orders 
       WHERE seller_id = $1 AND order_date >= date_trunc('year', CURRENT_DATE)`,
      [userId]
    );
    const ytdEarnings = ytdQuery.rows[0].total;

    // Get rolling 12-month earnings
    const rollingQuery = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total 
       FROM life_orders 
       WHERE seller_id = $1 AND order_date >= CURRENT_DATE - INTERVAL '12 months'`,
      [userId]
    );
    const rollingEarnings = rollingQuery.rows[0].total;

    // Get earnings per quarter (last 4 terms)
    const termQuery = await client.query(
      `SELECT 
         MIN(order_date) AS period_start,
         MAX(order_date) AS period_end,
         COALESCE(SUM(amount), 0) AS earnings
       FROM (
         SELECT *,
           width_bucket(order_date, CURRENT_DATE - INTERVAL '12 months', CURRENT_DATE, 4) AS term
         FROM life_orders
         WHERE seller_id = $1
       ) AS bucketed
       GROUP BY term
       ORDER BY term`,
      [userId]
    );

    const termEarnings = termQuery.rows;

    res.json({
      user,
      ytdEarnings,
      rollingEarnings,
      termEarnings
    });

    client.release();
  } catch (err) {
    console.error('Error fetching profile data:', err);
    res.status(500).json({ error: 'Internal server error' });
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
