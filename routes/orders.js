const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

function getPercentByLevel(level) {
  const map = {
    'Level A': 70,
    'Level B': 75,
    'Level C': 80,
    'Agency1': 85,
    'Agency2': 90,
    'Agency3': 95,
    'Vice President': 100,
  };
  return map[level] || 70;
}
// ======== CREATE LIFE ORDER =========
router.post('/life', verifyToken, async (req, res) => {
  await createBaseOrder(req, res, 'life_orders', 'Personal Commission');
});

// ======== CREATE ANNUITY ORDER ========
router.post('/annuity', verifyToken, async (req, res) => {
  await createBaseOrder(req, res, 'annuity_orders', 'Personal Commission');
});

// ========== HELPER: Create Base Order (no commissions yet) ==========
async function createBaseOrder(req, res, tableName, defaultType) {
  const client = await pool.connect();
  try {
    const {
      user_id,
      policy_number,
      initial_premium,
      flex_premium = null,
      order_type = defaultType,
      application_status = 'in_progress',
      product_name,
      carrier_name,
      application_date,
      face_amount,
      target_premium,
      commission_from_carrier,
      full_name,
      national_producer_number,
      hierarchy_level = 'Level A',
      mra_status = 'none'
    } = req.body;

    const userRes = await client.query(
      `SELECT id, hierarchy_level FROM users WHERE id = $1`,
      [user_id]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const currentLevel = user.hierarchy_level || hierarchy_level;
    const commission_percent = getPercentByLevel(currentLevel);
    const commission_amount = (initial_premium || 0) * commission_percent / 100;

    const insertRes = await client.query(
      `INSERT INTO ${tableName} (
        user_id, policy_number, order_type, commission_percent, commission_amount,
        application_status, full_name, national_producer_number, hierarchy_level,
        carrier_name, product_name,
        application_date, face_amount, target_premium, initial_premium,
        flex_premium, commission_from_carrier, mra_status
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18
      )
      RETURNING id`,
      [
        user_id,
        policy_number,
        order_type,
        commission_percent,
        commission_amount,
        application_status,
        full_name,
        national_producer_number,
        currentLevel,
        carrier_name,
        product_name,
        application_date,
        face_amount,
        target_premium,
        initial_premium,
        flex_premium,
        commission_from_carrier,
        mra_status
      ]
    );

    res.json({ message: 'Order created successfully', order_id: insertRes.rows[0].id });
  } catch (err) {
    console.error('Error creating base order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
}

// ======== ADMIN：Update Order Status + Trigger Commissions ========
router.post('/admin-orders/update-status', verifyToken, async (req, res) => {
  const { id, table, status } = req.body;
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE ${table} SET application_status = $1 WHERE id = $2`,
      [status, id]
    );

    if (status === 'completed') {
      const createCommission = require('../utils/createCommission');
      await createCommission(client, id, table);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update order status:', err);
    res.status(500).json({ success: false, error: 'Update failed' });
  } finally {
    client.release();
  }
});

// ========== 管理员查询所有订单 ==========
router.get('/orders', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const {
      query = '',
      status,
      sort = 'desc',
      startDate,
      endDate,
    } = req.query;

    let sql = `
      SELECT o.*, u.name AS employee_name
      FROM life_orders o
      JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    let params = [];

    if (query) {
      sql += ` AND (u.name ILIKE $${params.length + 1} OR o.policy_number ILIKE $${params.length + 1})`;
      params.push(`%${query}%`);
    }

    if (status) {
      sql += ` AND o.application_status = $${params.length + 1}`;
      params.push(status);
    }

    if (startDate) {
      sql += ` AND o.created_at >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND o.created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    sql += ` ORDER BY o.created_at ${sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC'}`;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ========== 获取单个订单 ==========
router.get('/admin/order/:table/:id', verifyToken, async (req, res) => {
  const { table, id } = req.params;
  try {
    const { rows } = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ========== 更新订单字段 ==========
router.post('/admin/order/update', verifyToken, async (req, res) => {
  const { table, id, updates } = req.body;
  const keys = Object.keys(updates);
  const values = Object.values(updates);
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  try {
    await pool.query(
      `UPDATE ${table} SET ${sets} WHERE id = $${keys.length + 1}`,
      [...values, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Update failed' });
  }
});

module.exports = router;

