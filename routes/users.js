// routes/users.js
const express = require('express');
const pool = require('../db');
const router = express.Router();

// 获取所有用户，按收益排序
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY total_earnings DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取组织图数据
router.get('/org-chart/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await pool.query('SELECT id, name, role, introducer_id FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const earningsRes = await pool.query(`
      SELECT
        SUM(amount) AS ytd_earnings,
        SUM(CASE WHEN order_date >= CURRENT_DATE - INTERVAL '12 months' THEN amount ELSE 0 END) AS rolling_earnings
      FROM commissions
      WHERE user_id = $1
    `, [id]);

    const termsRes = await pool.query(`
      SELECT period_start, period_end, SUM(amount) AS earnings
      FROM term_commissions
      WHERE user_id = $1
      GROUP BY period_start, period_end
      ORDER BY period_start DESC
      LIMIT 4
    `, [id]);

    res.json({
      user,
      ytdEarnings: parseFloat(earningsRes.rows[0].ytd_earnings || 0),
      rollingEarnings: parseFloat(earningsRes.rows[0].rolling_earnings || 0),
      termEarnings: termsRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
