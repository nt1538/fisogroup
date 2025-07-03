const db = require('../db');

// 获取佣金等级阶梯
async function getCommissionChart() {
  const result = await db.query(
    `SELECT * FROM commission_chart ORDER BY min_amount ASC`
  );
  return result.rows;
}

function getLevelTitleByProfit(profit, chart) {
  for (const row of chart) {
    if (profit >= row.min_amount && profit <= row.max_amount) {
      return row.title;
    }
  }
  return 'Level A';
}

function getLevelPercentByTitle(title, chart) {
  const found = chart.find(r => r.title === title);
  return found ? found.commission_percent : 70;
}

function getLevelPercent(profit, chart) {
  for (const row of chart) {
    if (profit >= row.min_amount && profit <= row.max_amount) {
      return row.commission_percent;
    }
  }
  return 70;
}

async function getTeamProfit(userId) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const res = await db.query(
    `SELECT SUM(commission_from_carrier) AS profit FROM life_orders 
     WHERE user_id = $1 AND application_status = 'completed' AND order_type = 'Personal Commission' AND application_date >= $2`,
    [userId, oneYearAgo]
  );

  return parseFloat(res.rows[0].profit || 0);
}

async function getRollingYearTeamProfit(userId) {
  const queue = [userId];
  let total = 0;
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  while (queue.length > 0) {
    const current = queue.shift();

    const { rows } = await db.query(
      'SELECT id FROM users WHERE introducer_id = $1',
      [current]
    );

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

async function insertCommissionOrder(order, user, type, percent, amount, orderTable) {
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

async function distributeCommissions(order, currentUserId, segments, parentOrderId = null, depth = 1, orderTable = 'life_orders') {
  if (!currentUserId) return;

  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [currentUserId]);
  const user = rows[0];
  if (!user) return;

  const chart = await getCommissionChart();
  const teamProfit = await getTeamProfit(user.id);
  const introducerPercent = getLevelPercent(teamProfit, chart);

  let totalLevelDiffAmount = 0;

  for (const seg of segments) {
    const diff = introducerPercent - seg.user_percent;
    if (diff > 0) {
      const diffAmount = seg.amount * (diff / 100);
      if (diffAmount > 0.01) {
        await insertCommissionOrder(order, user, 'Level Difference', diff, diffAmount, orderTable);
        totalLevelDiffAmount += diffAmount;
      }
    }
  }

  if (depth <= 3) {
    const genPercent = depth === 1 ? 5 : depth === 2 ? 3 : depth === 3 ? 1 : 0;
    const totalBase = segments.reduce((sum, s) => sum + s.amount, 0);
    const genAmount = totalBase * (genPercent / 100);
    if (genAmount > 0.01) {
      await insertCommissionOrder(order, user, 'Generation Override', genPercent, genAmount, orderTable);
    }
  }

  if (user.introducer_id) {
    await distributeCommissions(order, user.introducer_id, segments, order.id, depth + 1, orderTable);
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

  let commissionAmount = 0;
  const levelSegments = chart.filter(c => c.max_amount > profitBefore && c.min_amount < profitAfter);

  let commissionSegments = [];

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

  const userLevel = user.hierarchy_level || 'Level A';
  const currentLevel = chart.find(c => c.title === userLevel);
  const currentLevelRank = chart.findIndex(c => c.title === userLevel);
  const currentLevelPercent = currentLevel ? currentLevel.commission_percent : 70;

  const updatedProfit = profitBefore + base;

  const newLevel = chart.find(c =>
    updatedProfit >= c.min_amount && updatedProfit <= c.max_amount
  );

  if (newLevel) {
    const newLevelRank = chart.findIndex(c => c.title === newLevel.title);
    if (newLevelRank > currentLevelRank) {
      await db.query(
        'UPDATE users SET hierarchy_level = $1 WHERE id = $2',
        [newLevel.title, userId]
      );
    }
  }

  await db.query(
    `UPDATE ${orderTable} 
     SET chart_percent = $1, level_percent = $2, commission_amount = $3
     WHERE id = $4`,
    [chartPercent, currentLevelPercent, commissionAmount, order.id]
  );

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

  await distributeCommissions(order, user.introducer_id, commissionSegments, order.id, 1, orderTable);
}

module.exports = {
  handleCommissions,
  getCommissionChart,
  getRollingYearTeamProfit
};
