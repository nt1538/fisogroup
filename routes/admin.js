const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { handleCommissions, getHierarchy } = require('../utils/commission');


// 🔍 多条件搜索订单（life + annuity 合并）
router.get('/orders', verifyToken, verifyAdmin, async (req, res) => {
  const {
    user_name,
    order_id,
    start_date,
    end_date
  } = req.query;

  const tables = ['application_annuity', 'application_life', 'commission_annuity', 'commission_life', 'saved_annuity_orders', 'saved_life_orders'];
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
        query += ` AND o.application_date >= $${count++}`;
        values.push(start_date);
      }
      if (end_date) {
        query += ` AND o.application_date <= $${count++}`;
        values.push(end_date);
      }

      query += ` ORDER BY o.application_date DESC LIMIT 100`;

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
  const validTables = ['application_annuity', 'application_life', 'commission_annuity', 'commission_life', 'saved_annuity_orders', 'saved_life_orders'];
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
    carrier_name, product_name, application_date, mra_status, Explanation
  } = req.body;

  const allowedTables = [
    'application_life', 'application_annuity',
    'commission_life', 'commission_annuity',
    'saved_life_orders', 'saved_annuity_orders'
  ];

  if (!allowedTables.includes(type)) {
    return res.status(400).json({ error: 'Invalid table type' });
  }

  try {
    const client = await pool.connect();

    // 获取原始订单
    const originalRes = await client.query(`SELECT * FROM ${type} WHERE id = $1`, [id]);
    const original = originalRes.rows[0];
    if (!original) {
      client.release();
      return res.status(404).json({ error: 'Order not found' });
    }

    // 只允许修改 comment 字段（适用于 saved 表）
    if (type.startsWith('saved_')) {
      await client.query(`UPDATE ${type} SET comment = $1 WHERE id = $2`, [comment, id]);
      client.release();
      return res.json({ ...original, comment });
    }

    // 更新字段
    const updateQuery = `
      UPDATE ${type}
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
    updatedOrder.table_type = type;

    // ====== 状态转移逻辑 ======
    const userId = updatedOrder.user_id;
    const isLife = type.includes('life');
    const baseType = isLife ? 'life' : 'annuity';

    if (application_status === 'completed' && type.startsWith('application_')) {
      // 移动到 commission 表并触发佣金
      const insertCommissionQuery = `
        INSERT INTO commission_${baseType} (${Object.keys(updatedOrder).join(',')})
        VALUES (${Object.keys(updatedOrder).map((_, i) => `$${i + 1}`).join(',')})
      `;
      await client.query(insertCommissionQuery, Object.values(updatedOrder));
      await client.query(`DELETE FROM ${type} WHERE id = $1`, [id]);

      await handleCommissions(updatedOrder, userId, baseType);

    } else if (
      ['cancelled', 'rejected'].includes(application_status)
      && !type.startsWith('saved_')
    ) {
      // 移动到 saved 表
      const insertSavedQuery = `
        INSERT INTO saved_${baseType}_orders (${Object.keys(updatedOrder).join(',')})
        VALUES (${Object.keys(updatedOrder).map((_, i) => `$${i + 1}`).join(',')})
      `;
      await client.query(insertSavedQuery, Object.values(updatedOrder));
      await client.query(`DELETE FROM ${type} WHERE id = $1`, [id]);
    }

    client.release();
    res.json(updatedOrder);

  } catch (err) {
    console.error('❌ Error updating order:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});


router.delete('/orders/:type/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { type, id } = req.params;

  const allowedTables = [
    'application_life', 'application_annuity',
    'commission_life', 'commission_annuity'
  ];

  if (!allowedTables.includes(type)) {
    return res.status(400).json({ error: 'Invalid or non-deletable order type' });
  }

  const client = await pool.connect();

  try {
    // 1. 查找订单信息
    const orderRes = await client.query(`SELECT * FROM ${type} WHERE id = $1`, [id]);
    const order = orderRes.rows[0];
    if (!order) {
      client.release();
      return res.status(404).json({ error: 'Order not found' });
    }

    const userId = order.user_id;
    const baseAmount = parseFloat(order.commission_from_carrier || 0);
    const percent = parseFloat(order.commission_percent || 0);
    const personalCommission = baseAmount * (percent / 100);

    // 2. 如为 completed 且为 Personal Commission，则扣减相关数据
    if (order.application_status === 'completed' && order.order_type === 'Personal Commission') {
      await client.query(`
        UPDATE users
        SET profit = GREATEST(profit - $1, 0),
            commission = GREATEST(commission - $2, 0),
            total_earnings = GREATEST(total_earnings - $2, 0)
        WHERE id = $3
      `, [baseAmount, personalCommission, userId]);

      const hierarchy = await getHierarchy(userId);
      const allUserIds = hierarchy.map(u => u.id).concat(userId);
      for (const uid of allUserIds) {
        await client.query(`
          UPDATE users
          SET team_profit = GREATEST(team_profit - $1, 0)
          WHERE id = $2
        `, [baseAmount, uid]);
      }

      // 删除佣金记录
      await client.query(`DELETE FROM commissions WHERE source_order_id = $1`, [id]);
    }

    // 若是非 Personal Commission 但为 completed，也需部分扣减
    else if (order.application_status === 'completed') {
      await client.query(`
        UPDATE users
        SET profit = GREATEST(profit - $1, 0),
            total_earnings = GREATEST(total_earnings - $1, 0)
        WHERE id = $2
      `, [baseAmount, userId]);
    }

    // 3. 删除订单
    await client.query(`DELETE FROM ${type} WHERE id = $1`, [id]);

    client.release();
    res.json({ message: '✅ Order deleted and related records updated' });

  } catch (err) {
    console.error('❌ Failed to delete order:', err);
    client.release();
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// 👤 编辑员工信息
router.put('/employees/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const {name, email, state, introducer_id, level_percent, total_earnings, commission, profit, team_profit, national_producer_number, hierarchy_level} = req.body;

  try {
    const query = `
      UPDATE users
      SET name = $1, email = $2, state = $3, introducer_id = $4, level_percent = $5, total_earnings = $6, commission = $7, profit = $8, team_profit = $9,
      national_producer_number = $10, hierarchy_level = $11
      WHERE id = $12
      RETURNING *;
    `;
    const values = [name, email, state, introducer_id, level_percent, total_earnings, commission, profit, team_profit, national_producer_number, hierarchy_level, id];

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
      `SELECT id, name, email, state, introducer_id, level_percent, total_earnings, commission, profit, team_profit, hierarchy_level, national_producer_number
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
      `SELECT id, name, email, total_earnings, hierarchy_level, team_profit
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
    // 1. 用户总数
    const { rows: users } = await pool.query(`SELECT COUNT(*) FROM users`);
    const userCount = parseInt(users[0].count);

    // 2. 当前 application 状态为 in_progress 的订单数量
    const { rows: appLife } = await pool.query(`SELECT COUNT(*) FROM application_life WHERE application_status = 'in_progress'`);
    const { rows: appAnnuity } = await pool.query(`SELECT COUNT(*) FROM application_annuity WHERE application_status = 'in_progress'`);
    const applicationOrderCount = parseInt(appLife[0].count) + parseInt(appAnnuity[0].count);

    // 3. saved_orders 状态为 distributed 的订单数量
    const { rows: savedLife } = await pool.query(`SELECT COUNT(*) FROM saved_life_orders WHERE application_status = 'distributed'`);
    const { rows: savedAnnuity } = await pool.query(`SELECT COUNT(*) FROM saved_annuity_orders WHERE application_status = 'distributed'`);
    const distributedOrderCount = parseInt(savedLife[0].count) + parseInt(savedAnnuity[0].count);

    // 4. 总佣金分发金额
    const { rows: commissions } = await pool.query(`SELECT COALESCE(SUM(commission_amount), 0) AS total FROM commissions`);
    const totalCommissionAmount = parseFloat(commissions[0].total);

    res.json({
      userCount,
      applicationOrderCount,
      distributedOrderCount,
      totalCommissionAmount,
    });

  } catch (err) {
    console.error('❌ Error in /summary:', err);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});


module.exports = router;