const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken,verifyAdmin } = require('../middleware/auth');

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
        `SELECT id, name, hierarchy_level, level_percent, introducer_id FROM users WHERE id = $1`,
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
    introducerId,
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
    introducerId,
    policy_number,
    overridePercent,
    overrideCommission,
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


router.get('/all-sub/:userId', async (req, res) => {
  const userId = req.params.id;
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    // 递归获取下级用户（含自己）
    const { rows: users } = await pool.query(`
      WITH RECURSIVE subordinates AS (
        SELECT id, name, hierarchy_level FROM users WHERE id = $1
        UNION
        SELECT u.id, u.name, u.hierarchy_level
        FROM users u
        INNER JOIN subordinates s ON u.introducer_id = s.id
      )
      SELECT * FROM subordinates
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const ids = users.map(u => u.id);

    // 获取 life_orders 表中这些用户的所有订单
    const { rows: orders } = await pool.query(`
      SELECT * FROM life_orders
      WHERE user_id = ANY($1)
      ORDER BY created_at DESC
    `, [ids]);

    // 可选：按用户分组 orders，方便前端显示
    const ordersByUser = {};
    for (const order of orders) {
      if (!ordersByUser[order.user_id]) {
        ordersByUser[order.user_id] = [];
      }
      ordersByUser[order.user_id].push(order);
    }

    // 拼装完整结构返回
    const result = users.map(u => ({
      id: u.id,
      name: u.name,
      hierarchy_level: u.hierarchy_level,
      orders: ordersByUser[u.id] || []
    }));

    res.json({ root_user_id: userId, subordinates: result });
  } catch (err) {
    console.error('Error fetching subordinate orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/by-user/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const { rows } = await pool.query(`
      SELECT id, policy_number, initial_premium, created_at, commission_percent, application_status, order_type
      FROM life_orders
      WHERE user_id = $1
      UNION ALL
      SELECT id, policy_number, initial_premium, created_at, commission_percent, application_status, order_type
      FROM annuity_orders
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId])

    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

router.post('/admin-orders/update-status', verifyToken, async (req, res) => {
  const { id, table, status } = req.body;
  const client = await pool.connect();
  try {
    // 更新状态
    await client.query(
      `UPDATE ${table} SET application_status = $1 WHERE id = $2`,
      [status, id]
    );

    // 如果变更为 completed，触发佣金生成逻辑
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

// 获取所有员工信息
router.get('/admin/employees', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, level_percent, hierarchy_level, introducer_id FROM users ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 更新员工资料
router.post('/admin/employees/update', verifyToken, async (req, res) => {
  const { id, name, email, level_percent, hierarchy_level, introducer_id } = req.body;
  try {
    await pool.query(
      'UPDATE users SET name = $1, email = $2, level_percent = $3, hierarchy_level = $4, introducer_id = $5 WHERE id = $6',
      [name, email, level_percent, hierarchy_level, introducer_id, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// 获取指定订单
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

// 更新订单内容
router.post('/admin/order/update', verifyToken, async (req, res) => {
  const { table, id, updates } = req.body; // updates: { field: value }
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

    // 搜索关键词（员工名或订单号）
    if (query) {
      sql += ` AND (u.name ILIKE $${params.length + 1} OR o.policy_number ILIKE $${params.length + 1})`;
      params.push(`%${query}%`);
    }

    // 状态筛选
    if (status) {
      sql += ` AND o.application_status = $${params.length + 1}`;
      params.push(status);
    }

    // 日期筛选
    if (startDate) {
      sql += ` AND o.created_at >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND o.created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    // 排序
    sql += ` ORDER BY o.created_at ${sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC'}`;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

module.exports = router;

