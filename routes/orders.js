// routes/orders.js
const express = require('express');
const pool = require('../db');
const router = express.Router();

// 工具函数：构建查询
function buildOrderQuery(table, status) {
  if (status) {
    return {
      text: `SELECT * FROM ${table} WHERE application_status ILIKE $1`,
      values: [status]
    };
  } else {
    return {
      text: `SELECT * FROM ${table}`,
      values: []
    };
  }
}

// 获取 life 订单
router.get('/life', async (req, res) => {
  const query = buildOrderQuery('life_orders', req.query.status);
  try {
    const result = await pool.query(query.text, query.values);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取 annuity 订单
router.get('/annuity', async (req, res) => {
  const query = buildOrderQuery('annuity_orders', req.query.status);
  try {
    const result = await pool.query(query.text, query.values);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
