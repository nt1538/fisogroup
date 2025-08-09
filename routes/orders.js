const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

function getPercentByLevel(level) {
  const map = {
    'Level A': 70,
    'Level B': 75,
    'Level C': 80,
    'Agency 1': 85,
    'Agency 2': 90,
    'Agency 3': 95,
    'Vice President': 100,
  };
  return map[level] || 70;
}
// ======== CREATE LIFE ORDER =========
router.post('/life', verifyToken, async (req, res) => {
  await createBaseOrder(req, res, 'application_life', 'Personal Commission');
});

// ======== CREATE ANNUITY ORDER ========
router.post('/annuity', verifyToken, async (req, res) => {
  await createBaseOrder(req, res, 'application_annuity', 'Personal Commission');
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
      full_name,
      national_producer_number,
      hierarchy_level = 'Level A',
      mra_status = 'none',
      split_percent = 100,
      split_with_id = null,
      insured_name,
      writing_agent = full_name,
      product_rate: productRateRaw // <-- NEW (optional in body)
    } = req.body;

    // fetch user
    const userRes = await client.query(
      `SELECT id, hierarchy_level FROM users WHERE id = $1`,
      [user_id]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const currentLevel = user.hierarchy_level || hierarchy_level;
    const commission_percent = getPercentByLevel(currentLevel);

    // commission_amount still based on initial_premium (unchanged)
    const commission_amount = (Number(initial_premium) || 0) * commission_percent / 100;

    // ---- product_rate handling ----
    // Defaults: life = 1.00, annuity = 0.06
    const defaultRate = tableName === 'application_annuity' ? 0.06 : 1.0;
    let product_rate = productRateRaw != null ? Number(productRateRaw) : defaultRate;

    // sanitize: must be finite and within a sane range
    if (!Number.isFinite(product_rate)) product_rate = defaultRate;
    if (product_rate < 0) product_rate = 0;

    let insertSQL = `INSERT INTO ${tableName} (
      user_id, policy_number, order_type, commission_percent, commission_amount,
      application_status, full_name, national_producer_number, hierarchy_level,
      carrier_name, product_name, application_date, insured_name, writing_agent,
      initial_premium, mra_status, split_percent, split_with_id`;

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
      insured_name,
      writing_agent,
      initial_premium,
      mra_status,
      split_percent,
      split_with_id
    ];

    if (tableName === 'application_life') {
      insertSQL += `, face_amount, target_premium, product_rate`;
      values.push(face_amount, target_premium, product_rate);
    } else if (tableName === 'application_annuity') {
      insertSQL += `, flex_premium, product_rate`;
      values.push(flex_premium, product_rate);
    } else {
      // if you have other tables and still want rate saved, add generically:
      insertSQL += `, product_rate`;
      values.push(product_rate);
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

function getDateRange(range) {
  const now = new Date();
  let start;

  switch (range) {
    case 'ytd':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'rolling_3':
      start = new Date();
      start.setMonth(now.getMonth() - 3);
      break;
    case 'rolling_12':
      start = new Date();
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return null;
  }

  return {
    start: start.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0]
  };
}

// ✅ 通用逻辑
async function fetchCommissionData(type, req, res) {
  const { status, order_type, range, startDate, endDate } = req.query;
  const userId = req.user.id;

  let query = `SELECT * FROM commission_${type} WHERE user_id = $1`;
  const params = [userId];
  let i = 2;

  if (status) {
    query += ` AND application_status = $${i++}`;
    params.push(status);
  }

  if (order_type) {
    query += ` AND order_type = $${i++}`;
    params.push(order_type);
  }

  if (range && range !== 'all') {
    const dates = getDateRange(range);
    if (dates) {
      query += ` AND application_date BETWEEN $${i++} AND $${i++}`;
      params.push(dates.start, dates.end);
    }
  } else if (startDate && endDate) {
    query += ` AND application_date BETWEEN $${i++} AND $${i++}`;
    params.push(startDate, endDate);
  }

  query += ` ORDER BY application_date DESC`;

  try {
    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    console.error(`Error fetching ${type} orders:`, err);
    res.status(500).json({ error: `Failed to fetch ${type} orders` });
  }
}

// ✅ life route
router.get('/life', verifyToken, (req, res) => {
  fetchCommissionData('life', req, res);
});

// ✅ annuity route
router.get('/annuity', verifyToken, (req, res) => {
  fetchCommissionData('annuity', req, res);
});


// 用户获取自己的 application_life 订单
router.get('/application/life', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT * FROM application_life WHERE user_id = $1',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user life applications:', err);
    res.status(500).json({ error: 'Failed to fetch life application orders' });
  }
});

// 用户获取自己的 application_annuity 订单
router.get('/application/annuity', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT * FROM application_annuity WHERE user_id = $1',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user annuity applications:', err);
    res.status(500).json({ error: 'Failed to fetch annuity application orders' });
  }
});

router.put('/application/:type/:id', verifyToken, async (req, res) => {
  const { type, id } = req.params;
  const {
    policy_number,
    initial_premium,
    commission_amount,
    face_amount,
    target_premium,
    carrier_name,
    product_name,
    application_date,
    mra_status,
    Explanation
  } = req.body;

  const userId = req.user.id;

  // 防止非法类型
  const allowed = ['life', 'annuity'];
  if (!allowed.includes(type)) {
    return res.status(400).json({ error: 'Invalid application type' });
  }

  const table = `application_${type}`;

  try {
    // 确保用户只能编辑自己的订单
    const check = await pool.query(`SELECT * FROM ${table} WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'You are not authorized to edit this order' });
    }

    const updateQuery = `
      UPDATE ${table}
      SET policy_number = $1,
          initial_premium = $2,
          commission_amount = $3,
          face_amount = $4,
          target_premium = $5,
          carrier_name = $6,
          product_name = $7,
          application_date = $8,
          mra_status = $9,
          explanation = $10
      WHERE id = $11
      RETURNING *;
    `;

    const values = [
      policy_number,
      initial_premium,
      commission_amount,
      face_amount,
      target_premium,
      carrier_name,
      product_name,
      application_date,
      mra_status,
      Explanation,
      id
    ];

    const result = await pool.query(updateQuery, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating user application order:', err);
    res.status(500).json({ error: 'Failed to update application order' });
  }
});

module.exports = router;

