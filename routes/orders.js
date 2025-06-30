const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

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
      order_type = defaultType,
      application_status = 'in_progress',
    } = req.body;

    const userRes = await client.query(
      `SELECT id, level_percent FROM users WHERE id = $1`,
      [user_id]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const level_percent = user.level_percent || 0;

    const chartRes = await client.query(
      `SELECT COALESCE(SUM(initial_premium), 0) AS total
       FROM ${tableName}
       WHERE user_id = $1 AND order_type = 'Personal Commission'`,
      [user_id]
    );
    const totalPremium = parseFloat(chartRes.rows[0].total);
    let chart_percent = 70;
    if (totalPremium >= 2000000) chart_percent = 100;
    else if (totalPremium >= 1000000) chart_percent = 95;
    else if (totalPremium >= 500000) chart_percent = 90;
    else if (totalPremium >= 250000) chart_percent = 85;
    else if (totalPremium >= 60000) chart_percent = 80;
    else if (totalPremium >= 30000) chart_percent = 75;

    const actual_percent = Math.max(level_percent, chart_percent);
    const commission_amount = initial_premium * actual_percent / 100;

    const hierarchy_level = req.body.hierarchy_level || 'Level A';

    const insertRes = await client.query(
      `INSERT INTO ${tableName}
        (user_id, policy_number, order_type, commission_percent, commission_amount,
         chart_percent, level_percent, application_status,
         agent_fiso, first_name, last_name, national_producer_number, license_number, hierarchy_level, split_percent,
         carrier_name, product_type, product_name_carrier, application_date, face_amount, target_premium, initial_premium,
         commission_from_carrier, mra_status)
       VALUES ($1, $2, $3, $4, $5,
               $6, $7, $8,
               $9, $10, $11, $12, $13, $14, $15,
               $16, $17, $18, $19, $20, $21, $22,
               $23, $24)
       RETURNING id`,
      [
        user_id,
        policy_number,
        order_type,
        actual_percent,
        commission_amount,
        chart_percent,
        level_percent,
        application_status,
        req.body.agent_fiso,
        req.body.first_name,
        req.body.last_name,
        req.body.national_producer_number,
        req.body.license_number,
        hierarchy_level,
        req.body.split_percent || 100,
        req.body.carrier_name,
        req.body.product_type,
        req.body.product_name_carrier,
        req.body.application_date,
        req.body.face_amount,
        req.body.target_premium,
        initial_premium,
        req.body.commission_from_carrier,
        req.body.mra_status || 'none'
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

