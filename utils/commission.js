const db = require('../db');

// 获取佣金等级阶梯
async function getCommissionChart() {
  const result = await db.query(
    `SELECT * FROM commission_chart ORDER BY min_amount ASC`
  );
  return result.rows;
}

// 获取当前总收益对应的等级百分比
function getLevelPercent(totalEarnings, chart) {
  let percent = 70;
  for (const row of chart) {
    if (totalEarnings >= row.min_amount && totalEarnings <= row.max_amount) {
      percent = row.commission_percent;
    }
  }
  return percent;
}

async function getTeamProfit(userId) {
  const queue = [userId];
  let totalProfit = 0;

  while (queue.length > 0) {
    const current = queue.shift();

    const { rows } = await db.query('SELECT id, profit FROM users WHERE introducer_id = $1', [current]);
    for (const user of rows) {
      totalProfit += parseFloat(user.profit || 0);
      queue.push(user.id);
    }
  }

  // 加上自己
  const selfResult = await db.query('SELECT profit FROM users WHERE id = $1', [userId]);
  totalProfit += parseFloat(selfResult.rows[0]?.profit || 0);

  return totalProfit;
}

async function insertCommissionOrder(order, user, type, percent, amount) {
  await db.query(
    `INSERT INTO ${orderTable} (
      user_id, full_name, national_producer_number, hierarchy_level,
      commission_percent, commission_amount, carrier_name, product_name_carrier,
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

async function distributeCommissions(order, currentUserId, originalCommission, parentOrderId = null, depth = 1, orderTable = 'life_orders') {
  if (!currentUserId) return;

  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [currentUserId]);
  const user = rows[0];
  if (!user) return;

  const chart = await getCommissionChart();
  const teamProfit = await getTeamProfit(user.id);
  const levelPercent = getLevelPercent(teamProfit, chart);
  const levelDifference = order.level_percent - levelPercent;

  // 计算 Level Difference
  if (levelDifference > 0) {
    const diffAmount = originalCommission * (levelDifference / 100);
    if (diffAmount > 0.01) {
      await insertCommissionOrder(order, user, 'Level Difference', levelDifference, diffAmount);
    }
  }

  // 计算 Generation Override
  const genPercent = depth === 1 ? 5 : depth === 2 ? 3 : depth === 3 ? 1 : 0;
  if (genPercent > 0) {
    const genAmount = originalCommission * (genPercent / 100);
    if (genAmount > 0.01) {
      await insertCommissionOrder(order, user, 'Generation Override', genPercent, genAmount);
    }
  }

  if (user.introducer_id) {
    await distributeCommissions(order, user.introducer_id, originalCommission, order.id, depth + 1, orderTable);
  }
}



async function handleCommissions(order, userId, orderTable) {
  const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  if (!user) return;

  const chart = await getCommissionChart();
  const profitBefore = parseFloat(user.profit || 0);
  const profitAfter = profitBefore + parseFloat(order.commission_from_carrier || 0);

  const split = parseFloat(order.split_percent || 100);
  const base = parseFloat(order.commission_from_carrier || 0);
  const chartPercent = order.chart_percent || 60;

  let remaining = base;
  let previousBoundary = 0;
  let commissionAmount = 0;
  const levelSegments = chart.filter(c => c.max_amount > profitBefore && c.min_amount < profitAfter);



  for (const segment of levelSegments) {
    const segStart = Math.max(segment.min_amount, profitBefore);
    const segEnd = Math.min(segment.max_amount, profitAfter);
    const segAmount = segEnd - segStart;

    const percent = (chartPercent * segment.commission_percent * split) / 10000;
    const amount = segAmount * percent;
    commissionAmount += amount;
  }

  // 更新订单的佣金信息
  await db.query(
    `UPDATE ${orderTable} 
     SET chart_percent = $1, level_percent = $2, commission_amount = $3
     WHERE id = $4`,
    [chartPercent, getLevelPercent(profitBefore, chart), commissionAmount, order.id]
  );

  // ✅ 仅个人佣金且订单状态为 completed 时更新 profit
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

  // 执行代际与级差分发
  await distributeCommissions(order, user.introducer_id, base, order.id, 1, orderTable);
}

module.exports = { handleCommissions };