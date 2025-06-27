// routes/adminOrders.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// 搜索所有订单（life + annuity 合并查询）
router.get('/search', async (req, res) => {
  const {
    user_name = '',
    order_id = '',
    status = '',
    start_date = '',
    end_date = '',
    sort_by = 'created_at',
    order = 'desc',
  } = req.query;

  try {
    const queryParts = [];
    const values = [];

    // 查询语句拼接（life_orders 与 annuity_orders 合并）
    let baseQuery = `
      SELECT o.*, u.name as user_name, 'life' as table_type
      FROM life_orders o
      JOIN users u ON o.user_id = u.id
    `;

    let whereClause = [];

    if (user_name) {
      values.push(`%${user_name}%`);
      whereClause.push(`u.name ILIKE $${values.length}`);
    }

    if (order_id) {
      values.push(order_id);
      whereClause.push(`o.id = $${values.length}`);
    }

    if (status) {
      values.push(status);
      whereClause.push(`o.application_status = $${values.length}`);
    }

    if (start_date) {
      values.push(start_date);
      whereClause.push(`o.created_at >= $${values.length}`);
    }

    if (end_date) {
      values.push(end_date);
      whereClause.push(`o.created_at <= $${values.length}`);
    }

    // 拼接 where 条件
    if (whereClause.length > 0) {
      baseQuery += ` WHERE ` + whereClause.join(' AND ');
    }

    const query = `
      (${baseQuery})
      UNION ALL
      (
        SELECT o.*, u.name as user_name, 'annuity' as table_type
        FROM annuity_orders o
        JOIN users u ON o.user_id = u.id
        ${whereClause.length > 0 ? ' WHERE ' + whereClause.join(' AND ') : ''}
      )
      ORDER BY ${sort_by} ${order}
      LIMIT 100
    `;

    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search orders' });
  }
});

module.exports = router;
