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

    let insertSQL = `INSERT INTO ${tableName} (
      user_id, policy_number, order_type, commission_percent, commission_amount,
      application_status, full_name, national_producer_number, hierarchy_level,
      carrier_name, product_name, application_date, initial_premium, commission_from_carrier, mra_status`;
    
    const values = [
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
      initial_premium,
      commission_from_carrier,
      mra_status
    ];

    if (tableName === 'life_orders') {
      insertSQL += `, face_amount, target_premium`;
      values.push(face_amount, target_premium);
    } else if (tableName === 'annuity_orders') {
      insertSQL += `, flex_premium`;
      values.push(flex_premium);
    }

    insertSQL += `) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`;

    const insertRes = await client.query(insertSQL, values);

    res.json({ message: 'Order created successfully', order_id: insertRes.rows[0].id });
  } catch (err) {
    console.error('Error creating base order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
}

router.get('/life', async (req, res) => {
  const { status, order_type } = req.query;

  let query = 'SELECT * FROM life_orders WHERE 1=1';
  const params = [];
  let i = 1;

  if (status) {
    query += ` AND application_status = $${i++}`;
    params.push(status);
  }

  if (order_type) {
    query += ` AND order_type = $${i++}`;
    params.push(order_type);
  }

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching life orders:', err);
    res.status(500).json({ error: 'Failed to fetch life orders' });
  }
});

router.get('/annuity', async (req, res) => {
  const { status, order_type } = req.query;

  let query = 'SELECT * FROM annuity_orders WHERE 1=1';
  const params = [];
  let i = 1;

  if (status) {
    query += ` AND application_status = $${i++}`;
    params.push(status);
  }

  if (order_type) {
    query += ` AND order_type = $${i++}`;
    params.push(order_type);
  }

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching annuity orders:', err);
    res.status(500).json({ error: 'Failed to fetch annuity orders' });
  }
});


module.exports = router;

