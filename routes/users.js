const express = require('express');
const router = express.Router();
const pool = require('../db');

// ✅ 获取用户个人信息和收益统计
router.get('/me/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const client = await pool.connect();

    // 获取用户基本信息
    const userQuery = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userQuery.rows[0];
    if (!user) {
      client.release();
      return res.status(404).json({ error: 'User not found' });
    }

    // 当年起的总佣金（YTD）
    const ytdQuery = await client.query(
      `SELECT COALESCE(SUM(commission_amount), 0) AS total
      FROM life_orders
      WHERE user_id = $1 AND order_date >= date_trunc('year', CURRENT_DATE)`,
      [userId]
    );
    const ytdEarnings = ytdQuery.rows[0].total;

    // 近12个月的总佣金
    const rollingQuery = await client.query(
      `SELECT COALESCE(SUM(commission_amount), 0) AS total
      FROM life_orders
      WHERE user_id = $1 AND order_date >= CURRENT_DATE - INTERVAL '12 months'`,
      [userId]
    );
    const rollingEarnings = rollingQuery.rows[0].total;

    // 最近 4 个季度的佣金汇总（按季度分组）
    const termQuery = await client.query(
      `SELECT 
        MIN(order_date) AS period_start,
        MAX(order_date) AS period_end,
        SUM(commission_amount) AS total
      FROM (
        SELECT *,
          width_bucket(order_date, CURRENT_DATE - INTERVAL '12 months', CURRENT_DATE, 4) AS term
        FROM life_orders
        WHERE user_id = $1
      ) AS bucketed
      GROUP BY term
      ORDER BY term`,
      [userId]
    );

    const termEarnings = termQuery.rows;

    client.release();

    res.json({
      user,
      ytdEarnings,
      rollingEarnings,
      termEarnings
    });
  } catch (err) {
    console.error('Error fetching profile data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ 获取组织结构树（引荐关系）
router.get('/org-chart/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await pool.query(`
      WITH RECURSIVE hierarchy AS (
        SELECT id, name, email, introducer_id
        FROM users
        WHERE id = $1
        UNION
        SELECT u.id, u.name, u.email, u.introducer_id
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

