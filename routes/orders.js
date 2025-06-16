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

    const userRes = await client.query(
      `SELECT id, level_percent, introducer_id FROM users WHERE id = $1`,
      [user_id]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const level_percent = user.level_percent || 0;

    let hierarchy_level = 'Level A';
    if (level_percent >= 75) hierarchy_level = 'Level B';
    if (level_percent >= 80) hierarchy_level = 'Level C';
    if (level_percent >= 85) hierarchy_level = 'Agency 1';
    if (level_percent >= 90) hierarchy_level = 'Agency 2';
    if (level_percent >= 95) hierarchy_level = 'Agency 3';
    if (level_percent >= 100) hierarchy_level = 'Vice President';

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

    let introducerId = user.introducer_id;
    let remainingPercent = actual_percent;
    let generation = 1;
    let override_generation = 1;

    while (introducerId) {
  const introRes = await client.query(
    `SELECT id, name, hierarchy_level FROM users WHERE id = $1`,
  [introducerId]
  );
  const introducer = introRes.rows[0];
  if (!introducer) break;

  const introlevel_percent = introducer.level_percent || 0;

  const chartRes = await client.query(
    `SELECT COALESCE(SUM(initial_premium), 0) AS total
     FROM ${tableName}
     WHERE user_id = $1 AND order_type = 'Personal Commission'`,
    [introducerId]
  );

  const intrototalPremium = parseFloat(chartRes.rows[0].total);
  let introchart_percent = 70;
  if (intrototalPremium >= 2000000) introchart_percent = 100;
  else if (intrototalPremium >= 1000000) introchart_percent = 95;
  else if (intrototalPremium >= 500000) introchart_percent = 90;
  else if (intrototalPremium >= 250000) introchart_percent = 85;
  else if (intrototalPremium >= 60000) introchart_percent = 80;
  else if (intrototalPremium >= 30000) introchart_percent = 75;

  const intro_percent = Math.max(introlevel_percent, introchart_percent);

  const diff = intro_percent - remainingPercent;
  const first_name = introducer.name.split(' ')[0];
  const last_name = introducer.name.split(' ')[1] || '';

  //will change
  const national_producer_number = '';
  const license_number = '';
  if (diff > 0.01) {
    const diffCommission = initial_premium * diff / 100;
    await client.query(
      `INSERT INTO ${tableName}
    (user_id, policy_number, order_type, commission_percent, commission_amount,
     chart_percent, level_percent, application_status,
     agent_fiso, first_name, last_name, national_producer_number, license_number, hierarchy_level, split_percent,
     carrier_name, product_type, product_name_carrier, application_date, face_amount, target_premium, initial_premium,
     commission_from_carrier, mra_status, parent_order_id)
   VALUES ($1, $2, 'Level Difference', $3, $4,
           $5, $6, $7,
           $8, $9, $10, $11, $12, $13, $14,
           $15, $16, $17, $18, $19, $20, $21,
           $22, $23, $24)`,
  [
    introducer.id,
    policy_number,
    diff,
    diffCommission,
    introchart_percent,
    intro_percent,
    application_status,
    introducer.id,
    first_name,
    last_name,
    national_producer_number,
    license_number,
    //will change
    // introducer.national_producer_number,
    // introducer.license_number,
    introducer.hierarchy_level,             // optional or computed
    req.body.split_percent || 100,
    req.body.carrier_name,
    req.body.product_type,
    req.body.product_name_carrier,
    req.body.application_date,
    req.body.face_amount,
    req.body.target_premium,
    initial_premium,
    req.body.commission_from_carrier,
    req.body.mra_status || 'none',
    orderId
  ]
    );
    remainingPercent = intro_percent;
  }

  if (intro_percent >= 85) {
    let overridePercent = 0;
    if (override_generation === 1) overridePercent = 5;
    else if (override_generation === 2) overridePercent = 3;
    else if (override_generation === 3) overridePercent = 1;

    if (overridePercent > 0) {
      const overrideCommission = initial_premium * overridePercent / 100;
      await client.query(
        `INSERT INTO ${tableName}
    (user_id, policy_number, order_type, commission_percent, commission_amount,
     chart_percent, level_percent, application_status,
     agent_fiso, first_name, last_name, national_producer_number, license_number, hierarchy_level, split_percent,
     carrier_name, product_type, product_name_carrier, application_date, face_amount, target_premium, initial_premium,
     commission_from_carrier, mra_status, parent_order_id)
   VALUES ($1, $2, 'Generation Override', $3, $4,
           $5, $6, $7,
           $8, $9, $10, $11, $12, $13, $14,
           $15, $16, $17, $18, $19, $20, $21,
           $22, $23, $24)`,
  [
    introducer.id,
    policy_number,
    overridePercent,
    overrideCommission,
    introchart_percent,
    intro_percent,
    application_status,
    introducer.agent_fiso,
    introducer.first_name,
    introducer.last_name,
    national_producer_number,
    license_number,
    //will change
    // introducer.national_producer_number,
    // introducer.license_number,
    introducer.hierarchy_level,             // optional or computed
    req.body.split_percent || 100,
    req.body.carrier_name,
    req.body.product_type,
    req.body.product_name_carrier,
    req.body.application_date,
    req.body.face_amount,
    req.body.target_premium,
    initial_premium,
    req.body.commission_from_carrier,
    req.body.mra_status || 'none',
    orderId
  ]
      );
    }
    override_generation += 1;
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

