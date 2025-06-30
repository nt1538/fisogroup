const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// 🔍 多条件搜索订单（life + annuity 合并）
router.get('/orders', verifyToken, verifyAdmin, async (req, res) => {
  const {
    query = '', status = '', sort = 'desc',
    startDate = '', endDate = ''
  } = req.query;

  try {
    const values = [];
    const conditions = [];

    if (query) {
      values.push(`%${query}%`);
      conditions.push(`(u.name ILIKE $${values.length} OR o.id::text ILIKE $${values.length})`);
    }
    if (status) {
      values.push(status);
      conditions.push(`o.application_status = $${values.length}`);
    }
    if (startDate) {
      values.push(startDate);
      conditions.push(`o.created_at >= $${values.length}`);
    }
    if (endDate) {
      values.push(endDate);
      conditions.push(`o.created_at <= $${values.length}`);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const queryText = `
      (
        SELECT o.*, u.name AS user_name, 'life' AS order_type
        FROM life_orders o
        JOIN users u ON o.user_id = u.id
        ${whereClause}
      )
      UNION ALL
      (
        SELECT o.*, u.name AS user_name, 'annuity' AS order_type
        FROM annuity_orders o
        JOIN users u ON o.user_id = u.id
        ${whereClause}
      )
      ORDER BY created_at ${sort}
      LIMIT 100
    `;

    const result = await pool.query(queryText, values);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin order search error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ✏️ 编辑订单（life or annuity）
router.put('/orders/:type/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { type, id } = req.params;
  const {
    application_status, policy_number, commission_percent, initial_premium,
    commission_amount, note
  } = req.body;

  const table = type === 'life' ? 'life_orders' : 'annuity_orders';

  try {
    const query = `
      UPDATE \${table}
      SET application_status = $1,
          policy_number = $2,
          commission_percent = $3,
          initial_premium = $4,
          commission_amount = $5,
          note = $6
      WHERE id = $7
      RETURNING *;
    `;
    const values = [
      application_status, policy_number, commission_percent,
      initial_premium, commission_amount, note, id
    ];

    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// 👤 编辑员工信息
router.put('/employees/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const {name, email, state, introducer_id, level_percent, total_earnings, commission, hierarchy_level, national_producer_number} = req.body;

  try {
    const query = `
      UPDATE users
      SET name = $1, email = $2, state = $3, introducer_id = $4, level_percent = $5, total_earnings = $6, commission = $7, 
      profit = $8, hierarchy_level = $9, national_producer_number = $10
      WHERE id = $11
      RETURNING *;
    `;
    const values = [name, email, state, introducer_id, level_percent, total_earnings, commission, hierarchy_level, national_producer_number, id];

    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

router.get('/employees/:id', verifyToken, async (req, res) => {
  const userId = parseInt(req.params.id);

  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, state, introducer_id, level_percent, total_earnings, commission, profit, created_at, hierarchy_level, national_producer_number
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching employee by ID:', err);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

router.get('/employees', verifyToken, verifyAdmin, async (req, res) => {
  const { query = '' } = req.query;
  try {
    const result = await pool.query(
      `SELECT id, name, email, total_earnings, hierarchy_level
       FROM users
       WHERE name ILIKE $1 OR email ILIKE $1
       ORDER BY id DESC
       LIMIT 100`,
      [`%${query}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error searching employees:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;