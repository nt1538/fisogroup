const db = require('../db');

// 获取佣金等级表
async function getCommissionChart() {
  const result = await db.query('SELECT * FROM commission_chart ORDER BY min_amount ASC');
  return result.rows;
}

// 根据 profit 获取等级名
function getLevelTitleByProfit(profit, chart) {
  for (const row of chart) {
    if (profit >= row.min_amount && profit <= row.max_amount) return row.title;
  }
  return chart[0]?.title || 'Level A';
}

// 获取等级名对应提成比例
function getLevelPercentByTitle(title, chart) {
  const found = chart.find(r => r.title === title);
  return found ? found.commission_percent : chart[0].commission_percent;
}

// 获取 rolling 一年团队 profit
async function getRollingYearTeamProfit(userId) {
  const queue = [userId];
  let total = 0;
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  while (queue.length > 0) {
    const current = queue.shift();
    const res1 = await db.query('SELECT id FROM users WHERE introducer_id = $1', [current]);
    for (const u of res1.rows) {
      queue.push(u.id);
      const res2 = await db.query(
        `SELECT SUM(commission_from_carrier) AS profit FROM life_orders 
         WHERE user_id = $1 AND application_status = 'completed' AND order_type = 'Personal Commission' AND application_date >= $2`,
        [u.id, oneYearAgo]
      );
      total += parseFloat(res2.rows[0].profit || 0);
    }
  }

  return total;
}

// 插入佣金子订单
async function insertCommissionOrder(order, user, type, percent, amount, explanation = null, parentId = null) {
  await db.query(
    `INSERT INTO life_orders (
      user_id, full_name, national_producer_number, hierarchy_level,
      commission_percent, commission_amount, carrier_name, product_name,
      application_date, policy_number, face_amount, target_premium,
      initial_premium, commission_from_carrier, application_status, mra_status, 
      order_type, parent_order_id, explanation
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19
    )`,
    [
      user.id,
      user.name,
      user.national_producer_number,
      user.hierarchy_level,
      percent,
      amount,
      order.carrier_name,
      order.product_name_carrier,
      order.application_date,
      order.policy_number,
      order.face_amount,
      order.target_premium,
      order.initial_premium,
      order.commission_from_carrier,
      order.application_status,
      order.mra_status,
      type,
      parentId,
      explanation
    ]
  );

  await db.query('UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2', [amount, user.id]);
}

// 分发 introducer 级差与代际提成
async function distributeCommissions(order, currentUserId, segments, parentOrderId = null, depth = 1) {
  if (!currentUserId) return;

  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [currentUserId]);
  const user = rows[0];
  if (!user) return;

  const chart = await getCommissionChart();
  const teamProfit = await getRollingYearTeamProfit(user.id);
  const introducerPercent = getLevelPercentByTitle(getLevelTitleByProfit(teamProfit, chart), chart);

  for (const seg of segments) {
    const diff = introducerPercent - seg.user_percent;
    if (diff > 0.01) {
      const diffAmount = seg.amount * (diff / 100);
      const explanation = `Level Difference for profit segment [${seg.start}–${seg.end}]`;
      await insertCommissionOrder(order, user, 'Level Difference', diff, diffAmount, explanation, parentOrderId);
    }
  }

  // Generation Override
  if (depth <= 3) {
    const percent = depth === 1 ? 5 : depth === 2 ? 3 : 1;
    const base = segments.reduce((sum, s) => sum + s.amount, 0);
    const amount = base * (percent / 100);
    if (amount > 0.01) {
      const explanation = `Generation Override (Depth ${depth})`;
      await insertCommissionOrder(order, user, 'Generation Override', percent, amount, explanation, parentOrderId);
    }
  }

  if (user.introducer_id) {
    await distributeCommissions(order, user.introducer_id, segments, parentOrderId, depth + 1);
  }
}

// 主函数：处理一个完整订单的佣金逻辑
async function handleCommissions(order, userId) {
  const userRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];
  if (!user) return;

  const chart = await getCommissionChart();
  const profitBefore = parseFloat(user.profit || 0);
  const baseAmount = parseFloat(order.commission_from_carrier || 0);
  const profitAfter = profitBefore + baseAmount;

  const levelSegments = chart.filter(c => c.max_amount > profitBefore && c.min_amount < profitAfter);
  const segments = [];

  for (const seg of levelSegments) {
    const start = Math.max(seg.min_amount, profitBefore);
    const end = Math.min(seg.max_amount, profitAfter);
    const amount = end - start;

    if (amount > 0.01) {
      segments.push({
        start,
        end,
        amount,
        user_percent: seg.commission_percent
      });
    }
  }

  const split = parseFloat(order.split_percent || 100);
  let totalCommission = 0;

  for (const seg of segments) {
    const percent = (seg.user_percent * split) / 100;
    const commissionAmount = seg.amount * (percent / 100);
    totalCommission += commissionAmount;

    const explanation = `Personal Commission [${seg.start}–${seg.end}] as ${seg.user_percent}%`;
    await insertCommissionOrder(order, user, 'Personal Commission', percent, commissionAmount, explanation, order.id);
  }

  // 原订单更新为已拆分
  await db.query(
    `UPDATE life_orders SET application_status = 'splitted', commission_percent = $1, commission_amount = $2 WHERE id = $3`,
    [null, null, order.id]
  );

  // 更新用户 profit & hierarchy_level（只计 base，不计总佣金）
  await db.query('UPDATE users SET profit = profit + $1 WHERE id = $2', [baseAmount, userId]);

  const newLevel = getLevelTitleByProfit(profitAfter, chart);
  if (newLevel !== user.hierarchy_level) {
    await db.query('UPDATE users SET hierarchy_level = $1 WHERE id = $2', [newLevel, userId]);
  }

  // introducer 处理级差 + generation
  await distributeCommissions(order, user.introducer_id, segments, order.id, 1);
}

module.exports = {
  handleCommissions
};

