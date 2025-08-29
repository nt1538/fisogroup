const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { handleCommissions, getHierarchy } = require('../utils/commission');
const { resolveProductForOrder } = require('../utils/productResolver')


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
    face_amount, target_premium, flex_premium, product_rate, commission_from_carrier,
    carrier_name, product_name, application_date, 
    commission_distribution_date, policy_effective_date, mra_status,
    split_percent, split_with_id, Explanation, comment
  } = req.body;

  const allowedTables = [
    'application_life', 'application_annuity',
    'commission_life', 'commission_annuity',
    'saved_life_orders', 'saved_annuity_orders'
  ];

  if (!allowedTables.includes(type)) {
    return res.status(400).json({ error: 'Invalid table type' });
  }

  const isLife = type.includes('life');
  const isSaved = type.startsWith('saved_');
  const baseType = isLife ? 'life' : 'annuity';

  try {
    const client = await pool.connect();

    // Load original
    const originalRes = await client.query(`SELECT * FROM ${type} WHERE id = $1`, [id]);
    const original = originalRes.rows[0];
    if (!original) {
      client.release();
      return res.status(404).json({ error: 'Order not found' });
    }

    // Saved_* tables: only comment is editable
    if (isSaved) {
      await client.query(`UPDATE ${type} SET comment = $1 WHERE id = $2`, [comment, id]);
      client.release();
      return res.json({ ...original, comment });
    }

    // Build dynamic update list
    let fields = [
      'application_status', 'policy_number', 'commission_percent', 'initial_premium',
      'commission_from_carrier', 'product_rate','carrier_name', 'product_name', 'application_date',
      'commission_distribution_date', 'policy_effective_date', 'mra_status',
      'split_percent', 'split_with_id', 'explanation'
    ];
    if (isLife) {
      fields.push('face_amount', 'target_premium');
    } else {
      fields.push('flex_premium');
    }

    const updateFields = [];
    const updateValues = [];
    let i = 1;
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = $${i++}`);
        updateValues.push(req.body[field]);
      }
    }
    updateFields.push(`id = $${i}`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE ${type}
         SET ${updateFields.slice(0, -1).join(', ')}
       WHERE ${updateFields[updateFields.length - 1]}
       RETURNING *;`;
    const result = await client.query(updateQuery, updateValues);
    let updatedOrder = result.rows[0];

    // If admin marks completed on an application_* row, append the comment line
    if (application_status === 'completed' && type.startsWith('application_')) {
      // Look up FISO/excess/renewal from product tables
      const prod = await resolveProductForOrder(
        {
          product_line: isLife ? 'life' : 'annuity',
          carrier_name: updatedOrder.carrier_name,
          product_name: updatedOrder.product_name,
          age_bracket: updatedOrder.age_bracket || null
        },
        client
      );

      const fiso = prod ? Number(prod.fiso_rate || 0) : 0;

      // Per your request: use target_premium in the formula text.
      // If you want annuity to use flex_premium instead, replace below:
      const base = isLife ? Number(updatedOrder.target_premium || 0) : Number(updatedOrder.flex_premium || 0);
      // const base = Number(updatedOrder.target_premium || 0);

      const expected = base * (fiso / 100);
      const received = commission_from_carrier != null ? Number(commission_from_carrier) : Number(updatedOrder.commission_from_carrier || 0);

      const prev = updatedOrder.comment ? `${updatedOrder.comment}\n` : '';
      const line = `received from carrier: $${received.toFixed(2)}, should be (target/base premium * fiso rate / 100) = $${expected.toFixed(2)}`;

      const { rows: r2 } = await client.query(
        `UPDATE ${type} SET comment = $1 WHERE id = $2 RETURNING *`,
        [prev + line, id]
      );
      updatedOrder = r2[0] || updatedOrder;
    }

    // Status transition: distribute or archive
    const userId = updatedOrder.user_id;

    if (application_status === 'completed' && type.startsWith('application_')) {
      if (isLife) {
        if (split_with_id && split_percent < 100) {
          const remainingPercent = 100 - split_percent;
          const splitUserRes = await client.query(`SELECT name FROM users WHERE id = $1`, [split_with_id]);
          const splitWritingAgent = splitUserRes.rows[0]?.name || 'Unknown';

          const userPart = {
            ...updatedOrder,
            initial_premium: updatedOrder.initial_premium * remainingPercent / 100,
            target_premium: updatedOrder.target_premium * remainingPercent / 100,
            commission_from_carrier: updatedOrder.commission_from_carrier * remainingPercent / 100,
          };

          const { id: _ignore, ...splitPart } = {
            ...updatedOrder,
            user_id: split_with_id,
            initial_premium: updatedOrder.initial_premium * split_percent / 100,
            target_premium: updatedOrder.target_premium * split_percent / 100,
            commission_from_carrier: updatedOrder.commission_from_carrier * split_percent / 100,
            split_id : userId,
            split_percent: remainingPercent,
            writing_agent: splitWritingAgent
          };

          const keys = Object.keys(splitPart);
          const values = Object.values(splitPart);
          const placeholders = keys.map((_, i) => `$${i + 1}`);
          const insertQuery = `INSERT INTO application_${baseType} (${keys.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *;`;
          const insertRes = await client.query(insertQuery, values);
          const insertedSplitOrder = insertRes.rows[0];

          const updateUserQuery = `UPDATE ${type} SET initial_premium = $1, target_premium = $2, commission_from_carrier = $3 WHERE id = $4 RETURNING *;`;
          const updatedUserRes = await client.query(updateUserQuery, [userPart.initial_premium, userPart.target_premium, userPart.commission_from_carrier, updatedOrder.id]);
          const updatedUserOrder = updatedUserRes.rows[0];

          await handleCommissions(updatedUserOrder, updatedUserOrder.user_id, baseType);
          await handleCommissions(insertedSplitOrder, insertedSplitOrder.user_id, baseType);
        } else {
          await handleCommissions(updatedOrder, userId, baseType);
        }
      } else {
        if (split_with_id && split_percent < 100) {
          const remainingPercent = 100 - split_percent;
          const splitUserRes = await client.query(`SELECT name FROM users WHERE id = $1`, [split_with_id]);
          const splitWritingAgent = splitUserRes.rows[0]?.name || 'Unknown';

          const userPart = {
            ...updatedOrder,
            flex_premium: updatedOrder.flex_premium * remainingPercent / 100,
          };

          const { id: _ignore, ...splitPart } = {
            ...updatedOrder,
            user_id: split_with_id,
            flex_premium: updatedOrder.flex_premium * split_percent / 100,
            split_percent: remainingPercent,
            writing_agent: splitWritingAgent
          };

          const keys = Object.keys(splitPart);
          const values = Object.values(splitPart);
          const placeholders = keys.map((_, i) => `$${i + 1}`);
          const insertQuery = `INSERT INTO application_${baseType} (${keys.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *;`;
          const insertRes = await client.query(insertQuery, values);
          const insertedSplitOrder = insertRes.rows[0];

          const updateUserQuery = `UPDATE ${type} SET flex_premium = $1 WHERE id = $2 RETURNING *;`;
          const updatedUserRes = await client.query(updateUserQuery, [userPart.flex_premium, updatedOrder.id]);
          const updatedUserOrder = updatedUserRes.rows[0];

          await handleCommissions(updatedUserOrder, updatedUserOrder.user_id, baseType);
          await handleCommissions(insertedSplitOrder, insertedSplitOrder.user_id, baseType);
        } else {
          await handleCommissions(updatedOrder, userId, baseType);
        }
      }

    } else if (['cancelled', 'rejected'].includes(application_status)) {
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
            total_earnings = GREATEST(total_earnings - $1, 0)
        WHERE id = $2
      `, [personalCommission, userId]);

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
        SET total_earnings = GREATEST(total_earnings - $1, 0)
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
  const {name, email, state, phone, introducer_id, total_earnings, team_profit, national_producer_number, hierarchy_level} = req.body;

  try {
    const query = `
      UPDATE users
      SET name = $1, email = $2, phone = $3, state = $4, introducer_id = $5,  total_earnings = $6, team_profit = $7,
      national_producer_number = $8, hierarchy_level = $9
      WHERE id = $10
      RETURNING *;
    `;
    const values = [name, email, phone, state, introducer_id, total_earnings, team_profit, national_producer_number, hierarchy_level, id];

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
      `SELECT id, name, email, phone, state, introducer_id, total_earnings, team_profit, hierarchy_level, national_producer_number
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