const express = require('express');
const router = express.Router();
const pool = require('../db');
const { getCommissionPercent } = require('../utils/commission');

// 创建新订单
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      user_id,
      company,
      policy_number,
      amount,
      state,
      date = new Date(),
      order_type = 'Personal Commission'
    } = req.body;

    // 获取 chart_percent（图表中根据 amount 得出的佣金比率）
    const chart_percent = await getCommissionPercent(client, user_id, amount);

    // 获取用户注册时设置的佣金比率
    const userRes = await client.query(
      `SELECT level_percent, introducer_id FROM users WHERE id = $1`,
      [user_id]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 计算实际佣金比例
    const actual_percent = Math.max(user.level_percent, chart_percent);
    const commission_amount = amount * actual_percent / 100;

    // 插入主订单（当前用户订单）
    const insertRes = await client.query(
      `INSERT INTO life_orders 
        (user_id, company, policy_number, amount, state, date, order_type, commission_percent, commission_amount, chart_percent, level_percent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        user_id,
        company,
        policy_number,
        amount,
        state?.toUpperCase() || null,
        date,
        actual_percent,
        commission_amount,
        chart_percent,
        user.level_percent
      ]
    );

    const orderId = insertRes.rows[0].id;

    // 给 introducer 逐层返佣逻辑（如有 introducer 且有差值）
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
        const introCommission = amount * introDiff / 100;

        await client.query(
          `INSERT INTO life_orders 
            (user_id, company, policy_number, amount, state, date, order_type, commission_percent, commission_amount, parent_order_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            introducer.id,
            company,
            policy_number,
            amount,
            state?.toUpperCase() || null,
            date,
            'Introducer Commission',
            introDiff,
            introCommission,
            orderId
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
});

module.exports = router;
