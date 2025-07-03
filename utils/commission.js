const db = require('../db');

// 获取佣金等级表
async function getCommissionChart() {
  const result = await db.query('SELECT * FROM commission_chart ORDER BY min_amount ASC');
  return result.rows;
}

// 获取等级名称
function getLevelTitleByProfit(profit, chart) {
  for (const row of chart) {
    if (profit >= row.min_amount && profit <= row.max_amount) {
      return row.title;
    }
  }
  return 'Level A';
}

// 获取某等级对应提成%
function getLevelPercentByTitle(title, chart) {
  const found = chart.find(r => r.title === title);
  return found ? found.commission_percent : 70;
}

// 计算 rolling 一年团队利润（用于 introducer 提成等级）
async function getRollingYearTeamProfit(userId) {
  const queue = [userId];
  let total = 0;
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  while (queue.length > 0) {
    const current = queue.shift();

    const { rows } = await db.query('SELECT id FROM users WHERE introducer_id = $1', [current]);

    for (const u of rows) {
      queue.push(u.id);

      const res = await db.query(
        `SELECT SUM(commission_from_carrier) AS profit FROM life_orders 
         WHERE user_id = $1 AND application_status = 'completed' AND order_type = 'Personal Commission' AND application_date >= $2`,
        [u.id, oneYearAgo]
      );
      total += parseFloat(res.rows[0].profit || 0);
    }
  }

  return total;
}

// 插入佣金订单
async function insertCommissionOrder(order, user, type, percent, amount) {
  await db.query(
    `INSERT INTO life_orders (
      user_id, full_name, national_producer_number, hierarchy_level,
      commission_percent, commission_amount, carrier_name, product_name,
      application_date, policy_number, face_amount, target_premium,
      initial_premium, commission_from_carrier, application_status, mra_status, order_type
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, 'in_progress', 'none', $15
    )`,
    [
      user.id,
      user.name,
      user.national_producer_number,
      user.role,
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
      type
    ]
  );

  await db.query(
    'UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2',
    [amount, user.id]
  );
}

// 分发 introducer 的级差和代际提成
async function distributeCommissions(order, currentUserId, segments, parentOrderId = null, depth = 1) {
  if (!currentUserId) return;

  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [currentUserId]);
  const user = rows[0];
  if (!user) return;

  const chart = await getCommissionChart();
  const teamProfit = await getRollingYearTeamProfit(user.id);
  const introducerPercent = getLevelPercentByTitle(getLevelTitleByProfit(teamProfit, chart), chart);

  let totalLevelDiffAmount = 0;

  for (const seg of segments) {
    const diff = introducerPercent - seg.user_percent;
    if (diff > 0) {
      const diffAmount = seg.amount * (diff / 100);
      if (diffAmount > 0.01) {
        await insertCommissionOrder(order, user, 'Level Difference', diff, diffAmount);
        totalLevelDiffAmount += diffAmount;
      }
    }
  }

  // Generation override
  if (depth <= 3) {
    const genPercent = depth === 1 ? 5 : depth === 2 ? 3 : 1;
    const totalBase = segments.reduce((sum, s) => sum + s.amount, 0);
    const genAmount = totalBase * (genPercent / 100);
    if (genAmount > 0.01) {
      await insertCommissionOrder(order, user, 'Generation Override', genPercent, genAmount);
    }
  }

  if (user.introducer_id) {
    await distributeCommissions(order, user.introducer_id, segments, order.id, depth + 1);
  }
}

// 主函数：处理订单佣金（仅用于 Personal Commission）
async function handleCommissions(order, userId) {
  const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  if (!user) return;

  const chart = await getCommissionChart();
  const profitBefore = parseFloat(user.profit || 0);
  const profitAfter = profitBefore + parseFloat(order.commission_from_carrier || 0);

  const split = parseFloat(order.split_percent || 100);
  const base = parseFloat(order.commission_from_carrier || 0);
  const chartPercent = getLevelPercentByTitle(user.hierarchy_level, chart);

  let commissionAmount = 0;
  const commissionSegments = [];

  const levelSegments = chart.filter(c => c.max_amount > profitBefore && c.min_amount < profitAfter);
  for (const segment of levelSegments) {
    const segStart = Math.max(segment.min_amount, profitBefore);
    const segEnd = Math.min(segment.max_amount, profitAfter);
    const segAmount = segEnd - segStart;

    const percent = (chartPercent * segment.commission_percent * split) / 10000;
    const amount = segAmount * percent;
    commissionAmount += amount;

    commissionSegments.push({
      amount: segAmount,
      user_percent: segment.commission_percent,
    });
  }

  // 更新提成比例与金额
  await db.query(
    `UPDATE life_orders 
     SET commission_percent = $1, commission_amount = $2
     WHERE id = $3`,
    [chartPercent, commissionAmount, order.id]
  );

  // 更新 profit（仅 personal commission + completed）
  if (order.order_type === 'Personal Commission' && order.application_status === 'completed') {
    await db.query(
      'UPDATE users SET profit = profit + $1, total_earnings = total_earnings + $1 WHERE id = $2',
      [base, userId]
    );
  } else {
    await db.query(
      'UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2',
      [commissionAmount, userId]
    );
  }

  // 等级晋升
  const currentRank = chart.findIndex(c => c.title === user.hierarchy_level);
  const newLevel = chart.find(c => profitAfter >= c.min_amount && profitAfter <= c.max_amount);
  const newRank = chart.findIndex(c => c.title === newLevel?.title);
  if (newLevel && newRank > currentRank) {
    await db.query('UPDATE users SET hierarchy_level = $1 WHERE id = $2', [newLevel.title, userId]);
  }

  // 触发 introducer 提成发放
  await distributeCommissions(order, user.introducer_id, commissionSegments, order.id, 1);
}

module.exports = {
  handleCommissions
};
