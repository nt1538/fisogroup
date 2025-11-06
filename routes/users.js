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
       WHERE user_id = $1 AND commission_distribution_date >= date_trunc('year', CURRENT_DATE)`,
      [userId]
    );
    const ytdQueryAnnuity = await client.query(
      `SELECT COALESCE(SUM(commission_amount), 0) AS total
       FROM commission_annuity
       WHERE user_id = $1 AND commission_distribution_date >= date_trunc('year', CURRENT_DATE)`,
      [userId]
    );
    const lifeYtd = Number(ytdQueryLife.rows[0].total) || 0;
    const annuityYtd = Number(ytdQueryAnnuity.rows[0].total) || 0;

    const ytdEarnings = lifeYtd + annuityYtd;

    // 近12个月的总佣金
    const rollingQueryLife = await client.query(
      `SELECT COALESCE(SUM(commission_amount), 0) AS total
       FROM commission_life
       WHERE user_id = $1 AND commission_distribution_date >= CURRENT_DATE - INTERVAL '12 months'`,
      [userId]
    );
    const rollingQueryAnnuity = await client.query(
      `SELECT COALESCE(SUM(commission_amount), 0) AS total
       FROM commission_annuity
       WHERE user_id = $1 AND commission_distribution_date >= CURRENT_DATE - INTERVAL '12 months'`,
      [userId]
    );
    const rollingLife = Number(rollingQueryLife.rows[0].total) || 0;
    const rollingAnnuity = Number(rollingQueryAnnuity.rows[0].total) || 0;

    const rollingEarnings = rollingLife + rollingAnnuity;

    const sql = `
    WITH params AS (
      SELECT 
        date_trunc('day', CURRENT_DATE - INTERVAL '12 months') AS start_dt,
        date_trunc('day', CURRENT_DATE) AS end_dt
    ),
    series AS (
      -- 4 equal buckets across the last 12 months
      SELECT
        1 AS term, start_dt AS period_start, start_dt + (end_dt - start_dt) * 0.25 AS period_end FROM params
      UNION ALL SELECT
        2, start_dt + (end_dt - start_dt) * 0.25, start_dt + (end_dt - start_dt) * 0.50 FROM params
      UNION ALL SELECT
        3, start_dt + (end_dt - start_dt) * 0.50, start_dt + (end_dt - start_dt) * 0.75 FROM params
      UNION ALL SELECT
        4, start_dt + (end_dt - start_dt) * 0.75, end_dt FROM params
    ),
    all_commissions AS (
      SELECT commission_distribution_date, commission_amount
      FROM commission_life
      WHERE user_id = $1
        AND commission_distribution_date >= (SELECT start_dt FROM params)
        AND commission_distribution_date <  (SELECT end_dt   FROM params)
      UNION ALL
      SELECT commission_distribution_date, commission_amount
      FROM commission_annuity
      WHERE user_id = $1
        AND commission_distribution_date >= (SELECT start_dt FROM params)
        AND commission_distribution_date <  (SELECT end_dt   FROM params)
    ),
    bucketed AS (
      SELECT 
        s.term,
        s.period_start,
        s.period_end,
        SUM(CASE 
              WHEN a.commission_distribution_date >= s.period_start
              AND a.commission_distribution_date <  s.period_end
              THEN a.commission_amount::numeric
              ELSE 0
            END) AS total
      FROM series s
      LEFT JOIN all_commissions a
        ON a.commission_distribution_date >= s.period_start
      AND a.commission_distribution_date <  s.period_end
      GROUP BY s.term, s.period_start, s.period_end
    )
    SELECT term, period_start, period_end, COALESCE(total, 0) AS total
    FROM bucketed
    ORDER BY term;
    `;

    const { rows } = await client.query(sql, [userId]);

    // Convert NUMERIC to Number (pg returns strings for NUMERIC)
    const termEarnings = rows.map(r => ({
      term: r.term,
      period_start: r.period_start,
      period_end: r.period_end,
      total: Number(r.total) || 0
    }));
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

// ✅ Change password
router.post('/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id; // comes from verifyToken middleware

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing current or new password.' });
  }

  try {
    const client = await pool.connect();

    // Fetch current user
    const userQuery = await client.query('SELECT id, password FROM users WHERE id = $1', [userId]);
    const user = userQuery.rows[0];

    if (!user) {
      client.release();
      return res.status(404).json({ error: 'User not found.' });
    }

    // Compare old password
    const bcrypt = require('bcryptjs');
    const validPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validPassword) {
      client.release();
      return res.status(401).json({ error: 'Incorrect current password.' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update in DB
    await client.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, userId]);
    client.release();

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});



module.exports = router;

