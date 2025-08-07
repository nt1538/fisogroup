const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// ✅ 获取用户个人信息和收益统计
router.get('/me/:id', verifyToken, async (req, res) => {
  const userId = req.params.id;

  // 校验当前 token 用户是否请求自己的数据
  if (req.user.id !== userId) {
    return res.status(403).json({ error: 'Forbidden: ID mismatch' });
  }

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
    const ytdQueryLife = await client.query(
      `SELECT COALESCE(SUM(commission_amount), 0) AS total
       FROM commission_life
       WHERE user_id = $1 AND commission-distribution_date >= date_trunc('year', CURRENT_DATE)`,
      [userId]
    );
    const ytdQueryAnnuity = await client.query(
      `SELECT COALESCE(SUM(commission_amount), 0) AS total
       FROM commission_annuity
       WHERE user_id = $1 AND commission-distribution_date >= date_trunc('year', CURRENT_DATE)`,
      [userId]
    );
    const ytdEarnings = ytdQueryLife.rows[0].total + ytdQueryAnnuity.rows[0].total;

    // 近12个月的总佣金
    const rollingQueryLife = await client.query(
      `SELECT COALESCE(SUM(commission_amount), 0) AS total
       FROM commission_life
       WHERE user_id = $1 AND application_date >= CURRENT_DATE - INTERVAL '12 months'`,
      [userId]
    );
    const rollingQueryAnnuity = await client.query(
      `SELECT COALESCE(SUM(commission_amount), 0) AS total
       FROM commission_annuity
       WHERE user_id = $1 AND application_date >= CURRENT_DATE - INTERVAL '12 months'`,
      [userId]
    );
    const rollingEarnings = rollingQueryLife.rows[0].total + rollingQueryAnnuity.rows[0].total;

    // 最近 4 个季度的佣金汇总（按季度分组）
    const termQueryLife = await client.query(
  `SELECT 
    MIN(application_date) AS period_start,
    MAX(application_date) AS period_end,
    SUM(commission_amount) AS total
  FROM (
    SELECT *,
      width_bucket(
        EXTRACT(EPOCH FROM application_date),
        EXTRACT(EPOCH FROM CURRENT_DATE - INTERVAL '12 months'),
        EXTRACT(EPOCH FROM CURRENT_DATE),
        4
      ) AS term
    FROM commission_life
    WHERE user_id = $1
  ) AS bucketed
  GROUP BY term
  ORDER BY term`,
  [userId]
);
    const termQueryAnnuity = await client.query(
  `SELECT 
    MIN(application_date) AS period_start,
    MAX(application_date) AS period_end,
    SUM(commission_amount) AS total
  FROM (
    SELECT *,
      width_bucket(
        EXTRACT(EPOCH FROM application_date),
        EXTRACT(EPOCH FROM CURRENT_DATE - INTERVAL '12 months'),
        EXTRACT(EPOCH FROM CURRENT_DATE),
        4
      ) AS term
    FROM commission_annuity
    WHERE user_id = $1
  ) AS bucketed
  GROUP BY term
  ORDER BY term`,
  [userId]
);

    const termEarnings = termQueryLife.rows + termQueryAnnuity.rows;

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
router.get('/org-chart/:id', verifyToken, async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await pool.query(`
      WITH RECURSIVE hierarchy AS (
        SELECT id, name, email, introducer_id, hierarchy_level, total_earnings
        FROM users
        WHERE id = $1
        UNION
        SELECT u.id, u.name, u.email, u.introducer_id, u.hierarchy_level, u.total_earnings
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

