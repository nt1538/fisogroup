const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { handleCommissions } = require('../utils/commission');


// 🔍 多条件搜索订单（life + annuity 合并）
router.get('/orders', verifyToken, verifyAdmin, async (req, res) => {
  const {
    user_name,
    order_id,
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

router.get('/orders/:table_type/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { table_type, id } = req.params;

  // 限制只能访问指定表，防止 SQL 注入
  const validTables = ['life_orders', 'annuity_orders'];
  if (!validTables.includes(table_type)) {
    return res.status(400).json({ error: 'Invalid table type' });
  }

  try {
    const query = `
      SELECT o.*, u.name AS user_name
      FROM ${table_type} o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];
    order.table_type = table_type; // 手动补充字段，前端可能需要
    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ✏️ 编辑订单（life or annuity）
router.put('/orders/:type/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { type, id } = req.params;
  const {
    application_status, policy_number, commission_percent, initial_premium,
    commission_amount, face_amount, target_premium,
    carrier_name, product_name, application_date, mra_status
  } = req.body;

  const table = type === 'life_orders' ? 'life_orders' : 'annuity_orders';

  try {
    const client = await pool.connect();

    // 查询原始订单状态
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
          face_amount = $6,
          target_premium = $7,
          carrier_name = $8,
          product_name = $9,
          application_date = $10,
          mra_status = $11
      WHERE id = $12
      RETURNING *;
    `;
    const values = [
      application_status, policy_number, commission_percent,
      initial_premium, commission_amount, 
      face_amount, target_premium, carrier_name,
      product_name, application_date, mra_status, id
    ];

    const result = await client.query(updateQuery, values);
    const updatedOrder = result.rows[0];

    // 如果状态变为 completed 且原状态不是 completed，则触发佣金发放
    if (application_status === 'completed' && originalOrder.application_status !== 'completed') {
      updatedOrder.table_type = table; // 添加 table_type 供 handleCommissions 使用
      await handleCommissions(updatedOrder, updatedOrder.user_id, updatedOrder.table_type);
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