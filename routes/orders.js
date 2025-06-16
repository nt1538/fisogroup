const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { getCommissionPercent } = require('../utils/commission');

// ======== CREATE LIFE ORDER =========
router.post('/life', verifyToken, async (req, res) => {
  await createOrder(req, res, 'life_orders', 'Personal Commission');
});

// ======== CREATE ANNUITY ORDER ========
router.post('/annuity', verifyToken, async (req, res) => {
  await createOrder(req, res, 'annuity_orders', 'Personal Commission');
});

// ======== GET LIFE ORDERS (with ?status= optional) ========
router.get('/life', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status;

    let query = `SELECT * FROM life_orders WHERE user_id = $1`;
    let params = [userId];

    if (status) {
      query += ` AND application_status = $2`;
      params.push(status);
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching life orders:', err);
    res.status(500).json({ error: 'Failed to fetch life orders' });
  }
});

// ======== GET ANNUITY ORDERS (with ?status= optional) ========
router.get('/annuity', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status;

    let query = `SELECT * FROM annuity_orders WHERE user_id = $1`;
    let params = [userId];

    if (status) {
      query += ` AND application_status = $2`;
      params.push(status);
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching annuity orders:', err);
    res.status(500).json({ error: 'Failed to fetch annuity orders' });
  }
});

// ========= ORDER CREATION SHARED LOGIC =========
async function createOrder(req, res, tableName, defaultType) {
  const client = await pool.connect();
  try {
    const {
      user_id,
      policy_number,
      initial_premium,
      order_type = defaultType,
      application_status = 'in_progress',
    } = req.body;

    // 获取用于计算佣金的百分比
    const chart_percent = await getCommissionPercent(client, user_id, initial_premium);

    const userRes = await client.query(
      `SELECT level_percent, introducer_id FROM users WHERE id = $1`,
      [user_id]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const actual_percent = Math.max(user.level_percent, chart_percent);
    const commission_amount = initial_premium * actual_percent / 100;

    // 插入主订单记录
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
        user.level_percent,
        application_status,
        req.body.agent_fiso,
        req.body.first_name,
        req.body.last_name,
        req.body.national_producer_number,
        req.body.license_number,
        req.body.hierarchy_level,
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

    const orderId = insertRes.rows[0].id;

    // Introducer 佣金分配
    let introducerId = user.introducer_id;
    let remainingPercent = actual_percent;

    while (introducerId && remainingPercent > 0) {
      const introRes = await client.query(
        `SELECT id, introducer_id, level_percent FROM users WHERE id = $1`,
        [introducerId]
      );
      const introducer = introRes.rows[0];
      if (!introducer) break;

      const introPercent = introducer.level_percent;
      const introDiff = Math.max(0, remainingPercent - introPercent);
      if (introDiff > 0.01) {
        const introCommission = initial_premium * introDiff / 100;

        await client.query(
          `INSERT INTO ${tableName}
            (user_id, policy_number, order_type, commission_percent, commission_amount,
             chart_percent, level_percent, parent_order_id, application_status)
           VALUES ($1, $2, 'Introducer Commission', $3, $4,
                   $5, $6, $7, $8)`,
          [
            introducer.id,
            policy_number,
            introDiff,
            introCommission,
            chart_percent,
            introPercent,
            orderId,
            application_status
          ]
        );
        remainingPercent = introPercent;
      }

      introducerId = introducer.introducer_id;
    }

    res.json({ message: 'Order created successfully', order_id: orderId });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
}

module.exports = router;
