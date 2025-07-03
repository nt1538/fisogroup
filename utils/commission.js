const db = require('../db');

// 获取佣金等级表
async function getCommissionChart() {
  const result = await db.query('SELECT * FROM commission_chart ORDER BY min_amount ASC');
  return result.rows;
}

function getLevelTitleByProfit(profit, chart) {
  for (const row of chart) {
    if (profit >= row.min_amount && profit <= row.max_amount) return row.title;
  }
  return chart[0]?.title || 'Level A';
}

function getLevelPercentByTitle(title, chart) {
  const found = chart.find(r => r.title === title);
  return found ? found.commission_percent : chart[0].commission_percent;
}

async function getHierarchy(userId) {
  const hierarchy = [];
  let current = userId;

  while (current) {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [current]);
    if (!rows[0]) break;
    hierarchy.push(rows[0]);
    current = rows[0].introducer_id;
  }

  return hierarchy;
}

async function checkSplitPoints(order, chart, hierarchy) {
  const baseAmount = parseFloat(order.commission_from_carrier || 0);
  const splitPoints = new Set();

  for (const user of hierarchy) {
    const before = parseFloat(user.profit || 0);
    const after = before + baseAmount;
    const beforeTitle = getLevelTitleByProfit(before, chart);
    const afterTitle = getLevelTitleByProfit(after, chart);

    if (beforeTitle !== afterTitle) {
      for (const row of chart) {
        if (row.min_amount > before && row.min_amount < after) {
          splitPoints.add(row.min_amount);
        }
      }
    }
  }

  return splitPoints.size === 0 ? false : Array.from(splitPoints).sort((a, b) => a - b);
}

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
      user.id, user.name, user.national_producer_number, user.hierarchy_level,
      percent, amount, order.carrier_name, order.product_name_carrier,
      order.application_date, order.policy_number, order.face_amount,
      order.target_premium, order.initial_premium, order.commission_from_carrier,
      order.application_status, order.mra_status, type, parentId, explanation
    ]
  );

  await db.query('UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2', [amount, user.id]);
}

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
      const explanation = `Level Difference for segment [${seg.start}–${seg.end}]`;
      await insertCommissionOrder(order, user, 'Level Difference', diff, diffAmount, explanation, parentOrderId);
    }
  }

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

async function handleCommissionSegment(order, user, chart, profitStart, profitEnd, splitPercent = 100) {
  const segments = chart.filter(c => c.max_amount > profitStart && c.min_amount < profitEnd).map(seg => {
    const start = Math.max(seg.min_amount, profitStart);
    const end = Math.min(seg.max_amount, profitEnd);
    const amount = end - start;
    return { start, end, amount, user_percent: seg.commission_percent };
  });

  let totalCommission = 0;
  for (const seg of segments) {
    const percent = (seg.user_percent * splitPercent) / 100;
    const commissionAmount = seg.amount * (percent / 100);
    totalCommission += commissionAmount;

    const explanation = `Personal Commission [${seg.start}–${seg.end}] as ${seg.user_percent}%`;
    await insertCommissionOrder(order, user, 'Personal Commission', percent, commissionAmount, explanation, order.id);
  }

  await distributeCommissions(order, user.introducer_id, segments, order.id, 1);
  return profitEnd - profitStart;
}

async function handleCommissions(order, userId) {
  const userRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];
  if (!user) return;

  const chart = await getCommissionChart();
  const hierarchy = await getHierarchy(userId);
  const profitBefore = parseFloat(user.profit || 0);
  const baseAmount = parseFloat(order.commission_from_carrier || 0);
  const profitAfter = profitBefore + baseAmount;
  const splitPoints = await checkSplitPoints(order, chart, hierarchy);

  if (!splitPoints) {
    await handleCommissionSegment(order, user, chart, profitBefore, profitAfter, parseFloat(order.split_percent || 100));
    await db.query('UPDATE users SET profit = profit + $1 WHERE id = $2', [baseAmount, userId]);

    const newLevel = getLevelTitleByProfit(profitAfter, chart);
    if (newLevel !== user.hierarchy_level) {
      await db.query('UPDATE users SET hierarchy_level = $1 WHERE id = $2', [newLevel, userId]);
    }
    return;
  }

  const profitSegments = [profitBefore, ...splitPoints, profitAfter];
  for (let i = 0; i < profitSegments.length - 1; i++) {
    const segmentStart = profitSegments[i];
    const segmentEnd = profitSegments[i + 1];
    const used = await handleCommissionSegment(order, user, chart, segmentStart, segmentEnd, parseFloat(order.split_percent || 100));
    await db.query('UPDATE users SET profit = profit + $1 WHERE id = $2', [used, userId]);

    const updatedUser = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const newLevel = getLevelTitleByProfit(parseFloat(updatedUser.rows[0].profit), chart);
    if (newLevel !== updatedUser.rows[0].hierarchy_level) {
      await db.query('UPDATE users SET hierarchy_level = $1 WHERE id = $2', [newLevel, userId]);
    }
  }

  await db.query(`UPDATE life_orders SET application_status = 'splitted', commission_percent = $1, commission_amount = $2 WHERE id = $3`, [null, null, order.id]);
}

module.exports = {
  handleCommissions
};

