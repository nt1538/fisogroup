const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

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
  await getOrders(req, res, 'life_orders');
});

// ======== GET ANNUITY ORDERS (with ?status= optional) ========
router.get('/annuity', verifyToken, async (req, res) => {
  await getOrders(req, res, 'annuity_orders');
});

// ========== HELPER: Get Orders ==========
async function getOrders(req, res, tableName) {
  try {
    const userId = req.user.id;
    const status = req.query.status;

    let query = `SELECT * FROM ${tableName} WHERE user_id = $1`;
    let params = [userId];

    if (status) {
      query += ` AND application_status = $2`;
      params.push(status);
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(`Error fetching ${tableName}:`, err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

// ========== HELPER: Create Order ==========
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

    // 查询用户信息
    const userRes = await client.query(
      `SELECT id, level_percent, introducer_id FROM users WHERE id = $1`,
      [user_id]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const level_percent = user.level_percent || 0;

    // 动态设置 hierarchy level
    let hierarchy_level = 'Agent';
    if (level_percent >= 100) {
      hierarchy_level = 'Agency 1';
    } else if (level_percent >= 80) {
      hierarchy_level = 'Agency 2';
    } else if (level_percent >= 60) {
      hierarchy_level = 'Agency 3';
    }

    // 获取 chart commission：该用户所有 personal commission 的累计初始保费
    const chartRes = await client.query(
      `SELECT COALESCE(SUM(initial_premium), 0) AS total
       FROM ${tableName}
       WHERE user_id = $1 AND order_type = 'Personal Commission'`,
      [user_id]
    );
    const totalPremium = parseFloat(chartRes.rows[0].total);
    let chart_percent = 60;
    if (totalPremium >= 1000000) chart_percent = 110;
    else if (totalPremium >= 500000) chart_percent = 100;
    else if (totalPremium >= 200000) chart_percent = 90;
    else if (totalPremium >= 100000) chart_percent = 80;
    else if (totalPremium >= 50000) chart_percent = 70;

    const actual_percent = Math.max(level_percent, chart_percent);
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

    const orderId = insertRes.rows[0].id;

    // Introducer 分佣逻辑
    let introducerId = user.introducer_id;
    let remainingPercent = actual_percent;
    let generation = 1;

    while (introducerId) {
      const introRes = await client.query(
        `SELECT id, introducer_id, level_percent FROM users WHERE id = $1`,
        [introducerId]
      );
      const introducer = introRes.rows[0];
      if (!introducer) break;

      const introPercent = introducer.level_percent || 0;

      // === Level Difference 佣金 ===
      const diff = remainingPercent - introPercent;
      if (diff > 0.01) {
        const diffCommission = initial_premium * diff / 100;
        await client.query(
          `INSERT INTO ${tableName}
            (user_id, policy_number, order_type, commission_percent, commission_amount,
             chart_percent, level_percent, parent_order_id, application_status)
           VALUES ($1, $2, 'Level Difference', $3, $4,
                   $5, $6, $7, $8)`,
          [
            introducer.id,
            policy_number,
            diff,
            diffCommission,
            chart_percent,
            introPercent,
            orderId,
            application_status
          ]
        );
        remainingPercent = introPercent;
      }

      // === Generation Override ===
      if (introPercent >= 100) {
        let overridePercent = 0;
        if (generation === 1) overridePercent = 5;
        else if (generation === 2) overridePercent = 3;
        else if (generation === 3) overridePercent = 1;

        if (overridePercent > 0) {
          const overrideCommission = initial_premium * overridePercent / 100;
          await client.query(
            `INSERT INTO ${tableName}
              (user_id, policy_number, order_type, commission_percent, commission_amount,
               chart_percent, level_percent, parent_order_id, application_status)
             VALUES ($1, $2, 'Generation Override', $3, $4,
                     $5, $6, $7, $8)`,
            [
              introducer.id,
              policy_number,
              overridePercent,
              overrideCommission,
              chart_percent,
              introPercent,
              orderId,
              application_status
            ]
          );
        }
      }

      introducerId = introducer.introducer_id;
      generation += 1;
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
