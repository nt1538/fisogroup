const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { handleCommissions, getHierarchy } = require('../utils/commission');


// 🔍 多条件搜索订单（life + annuity 合并）
router.get('/orders/:category', verifyToken, verifyAdmin, async (req, res) => {
  const {
    user_name,
    policy_number,
    start_date,
    end_date,
    category
  } = req.query;

  let tables = [];
  if (category === 'application') {
    tables = ['application_life', 'application_annuity'];
  } else if (category === 'commission') {
    tables = ['commission_life', 'commission_annuity'];
  } else if (category === 'saved') {
    tables = ['saved_life_orders', 'saved_annuity_orders'];
  } else {
    return res.status(400).json({ error: 'Invalid category' });
  }
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
      if (policy_number) {
        query += ` AND o.policy_number::TEXT ILIKE $${count++}`;
        values.push(`%${policy_number}%`);
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
    face_amount, target_premium, commission_from_carrier, carrier_name, product_name, application_date, 
    commission_distribution_date, policy_effective_date, mra_status, split_percent, split_with_id, Explanation
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
          face_amount = $5,
          target_premium = $6,
          commission_from_carrier = $7,
          carrier_name = $8,
          product_name = $9,
          application_date = $10,
          commission_distribution_date = $11,
          policy_effective_date = $12,
          mra_status = $13,
          split_percent = $14,
          split_with_id = $15,
          explanation = $16
      WHERE id = $17
      RETURNING *;
    `;
    const values = [
      application_status, policy_number, commission_percent,
      initial_premium, face_amount, target_premium, commission_from_carrier, carrier_name,
      product_name, application_date, commission_distribution_date, policy_effective_date, mra_status, split_percent, split_with_id, Explanation, id
    ];

    const result = await client.query(updateQuery, values);
    const updatedOrder = result.rows[0];

    // ====== 状态转移逻辑 ======
    const userId = updatedOrder.user_id;
    const isLife = type.includes('life');
    const baseType = isLife ? 'life' : 'annuity';

    if (application_status === 'completed' && type.startsWith('application_')) {
      if (split_with_id && split_percent < 100) {
        const remainingPercent = 100 - split_percent;

        // 当前用户保留部分
        const userPart = {
          ...updatedOrder,
          target_premium: (updatedOrder.target_premium * remainingPercent / 100),
        };

        // 拆分给 split_user_id 的部分（注意移除 id）
        const { id: _, ...splitPart } = {
          ...updatedOrder,
          user_id: split_with_id,
          target_premium: (updatedOrder.target_premium * split_percent / 100),
          split_percent: remainingPercent, // 保证拆分后总和为 100%
        };

        // 插入拆分订单
        const keys = Object.keys(splitPart);
        const values = Object.values(splitPart);
        const placeholders = keys.map((_, i) => `$${i + 1}`);

        const insertQuery = `
          INSERT INTO application_${baseType} (${keys.join(',')})
          VALUES (${placeholders.join(',')})
        RETURNING *;
        `;
        const insertRes = await client.query(insertQuery, values);
        const insertedSplitOrder = insertRes.rows[0];

        // 更新当前用户订单为其部分
        const updateUserQuery = `
        UPDATE ${type}
          SET target_premium = $1
          WHERE id = $2
          RETURNING *;
        `;
        const updatedUserRes = await client.query(updateUserQuery, [
          userPart.target_premium,
          updatedOrder.id,
      ]);
        const updatedUserOrder = updatedUserRes.rows[0];

        // 分别处理两人的佣金
        await handleCommissions(updatedUserOrder, updatedUserOrder.user_id, baseType);
        await handleCommissions(insertedSplitOrder, insertedSplitOrder.user_id, baseType);

      } else {
        // 没有分成情况，直接处理佣金
        await handleCommissions(updatedOrder, userId, baseType);
      }

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
      await client.query(`DELETE FROM ${type} WHERE id = $1`, [id]);
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
  const {name, email, state, phone, introducer_id, level_percent, total_earnings, commission, profit, team_profit, national_producer_number, hierarchy_level} = req.body;

  try {
    const query = `
      UPDATE users
      SET name = $1, email = $2, phone = $3, state = $4, introducer_id = $5, level_percent = $6, total_earnings = $7, commission = $8, profit = $9, team_profit = $10,
      national_producer_number = $11, hierarchy_level = $12
      WHERE id = $13
      RETURNING *;
    `;
    const values = [name, email, phone, state, introducer_id, level_percent, total_earnings, commission, profit, team_profit, national_producer_number, hierarchy_level, id];

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
      `SELECT id, name, email, phone, state, introducer_id, level_percent, total_earnings, commission, profit, team_profit, hierarchy_level, national_producer_number
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
      `SELECT id, name, email, phone, total_earnings, hierarchy_level, team_profit
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

router.get('/summary', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // 1. 用户总数
    const { rows: users } = await pool.query(`SELECT COUNT(*) FROM users`);
    const userCount = parseInt(users[0].count);

    // 2. application 状态为 in_progress 的订单数
    const { rows: appLife } = await pool.query(`
      SELECT COUNT(*) FROM application_life WHERE application_status = 'in_progress'
    `);
    const { rows: appAnnuity } = await pool.query(`
      SELECT COUNT(*) FROM application_annuity WHERE application_status = 'in_progress'
    `);
    const applicationOrderCount = parseInt(appLife[0].count) + parseInt(appAnnuity[0].count);

    // 3. saved_orders 中 application_status 为 distributed 的订单数量
    const { rows: savedLife } = await pool.query(`
      SELECT COUNT(*) FROM saved_life_orders WHERE application_status = 'distributed'
    `);
    const { rows: savedAnnuity } = await pool.query(`
      SELECT COUNT(*) FROM saved_annuity_orders WHERE application_status = 'distributed'
    `);
    const distributedOrderCount = parseInt(savedLife[0].count) + parseInt(savedAnnuity[0].count);

    // 4. 汇总 commission_life 和 commission_annuity 的总佣金金额
    const { rows: lifeTotal } = await pool.query(`
      SELECT COALESCE(SUM(commission_amount), 0) AS total FROM commission_life
    `);
    const { rows: annuityTotal } = await pool.query(`
      SELECT COALESCE(SUM(commission_amount), 0) AS total FROM commission_annuity
    `);
    const totalCommissionAmount = parseFloat(lifeTotal[0].total) + parseFloat(annuityTotal[0].total);

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

// 组织结构树接口（全公司）
router.get('/org-chart', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, introducer_id, hierarchy_level
      FROM users
    `);

    res.json(rows);
  } catch (err) {
    console.error('Error fetching org chart:', err);
    res.status(500).json({ error: 'Failed to load organization chart' });
  }
});


module.exports = router;