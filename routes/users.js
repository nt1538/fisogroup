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

module.exports = router;
