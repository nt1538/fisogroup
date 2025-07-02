const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// 🔍 多条件搜索订单（life + annuity 合并）
router.get('/orders', verifyToken, verifyAdmin, async (req, res) => {
  const {
    user_name,
    order_id,
    status,
    start_date,
    end_date
  } = req.query;

  const tables = ['life_orders', 'annuity_orders'];
  const allResults = [];

  try {
    for (const table of tables) {
      let query = `
        SELECT o.*, u.name AS user_name, '${table}' AS table_type
        FROM ${table} o
        JOIN users u ON o.user_id = u.id
        WHERE 1=1
      `;
      const values = [];
      let count = 1;

      if (user_name) {
        query += ` AND u.name ILIKE $${count++}`;
        values.push(`%${user_name}%`);
      }
      if (order_id) {
        query += ` AND o.id::TEXT ILIKE $${count++}`;
        values.push(`%${order_id}%`);
      }
      if (status) {
        query += ` AND o.application_status = $${count++}`;
        values.push(status);
      }
      if (start_date) {
        query += ` AND o.created_at >= $${count++}`;
        values.push(start_date);
      }
      if (end_date) {
        query += ` AND o.created_at <= $${count++}`;
        values.push(end_date);
      }

      query += ` ORDER BY o.created_at DESC LIMIT 100`;

      const result = await pool.query(query, values);
      allResults.push(...result.rows);
    }

    // 合并两个表的查询结果返回前端
    res.json(allResults);
  } catch (err) {
    console.error('Search orders error:', err);
    res.status(500).json({ error: 'Failed to search orders' });
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
    const client = await pool.connect();

    // 查询原始状态
    const originalResult = await client.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    const originalOrder = originalResult.rows[0];
    if (!originalOrder) {
      client.release();
      return res.status(404).json({ error: 'Order not found' });
    }

    // 更新订单
    const updateQuery = `
      UPDATE ${table}
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
    const result = await client.query(updateQuery, values);
    const updatedOrder = result.rows[0];

    // 如果状态变更为 completed，执行佣金分发
    if (application_status === 'completed' && originalOrder.application_status !== 'completed') {
      await handleCommissions(updatedOrder, updatedOrder.user_id);
    }

    client.release();
    res.json(updatedOrder);
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
      hierarchy_level = $8, national_producer_number = $9
      WHERE id = $10
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
  const userId = req.params.id;

  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, state, introducer_id, level_percent, total_earnings, commission, profit, hierarchy_level, national_producer_number
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

router.get('/summary', async (req, res) => {
  try {
    const { rows: users } = await pool.query(`SELECT COUNT(*) FROM users`);
    const { rows: lifeOrders } = await pool.query(`SELECT COUNT(*) FROM life_orders`);
    const { rows: annuityOrders } = await pool.query(`SELECT COUNT(*) FROM annuity_orders`);
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(commission_from_carrier), 0) as total FROM (
        SELECT commission_from_carrier FROM life_orders 
        WHERE application_status = 'completed' AND order_type = 'Personal Commission'
        UNION ALL
        SELECT commission_from_carrier FROM annuity_orders 
        WHERE application_status = 'completed' AND order_type = 'Personal Commission'
      ) AS combined
    `);

    const totalCommissionAmount = rows[0].total;

    res.json({
      userCount: parseInt(users[0].count),
      lifeOrderCount: parseInt(lifeOrders[0].count),
      annuityOrderCount: parseInt(annuityOrders[0].count),
      totalCommissionAmount: parseFloat(totalCommissionAmount[0].total),
    });
  } catch (err) {
    console.error('Error in /admin/summary:', err);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

module.exports = router;