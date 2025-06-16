const db = require('../db');

// Get the level percent for a given total earnings
async function getCommissionPercent(total) {
  const result = await db.query(
    `SELECT commission_percent FROM commission_chart
     WHERE $1 >= min_amount AND $1 <= max_amount
     ORDER BY min_amount DESC LIMIT 1`,
    [total]
  );
  return result.rows.length ? result.rows[0].commission_percent : 70;
}

// Recursively distribute commissions up the user hierarchy
async function distributeCommissions(order, currentUserId, originalCommission, parentOrderId = null, depth = 0) {
  if (depth >= 10 || !currentUserId) return; // Prevent infinite loop

  const userResult = await db.query('SELECT * FROM users WHERE id = $1', [currentUserId]);
  const user = userResult.rows[0];
  if (!user) return;

  const userTotal = parseFloat(user.total_earnings || 0);
  const userLevel = await getCommissionPercent(userTotal);
  const orderLevel = parseFloat(order.level_percent);

  let commissionType = 'Generation Override';
  let difference = orderLevel - userLevel;
  let percent = 0;

  if (depth === 0) {
    commissionType = 'Personal Commission';
    percent = parseFloat(order.commission_percent || 0);
  } else if (difference > 0) {
    commissionType = 'Level Difference';
    percent = difference;
  } else {
    percent = 5;
  }

  const amount = originalCommission * (percent / 100);
  if (amount <= 0.01) return;

  await db.query(
    `INSERT INTO life_orders (
      user_id, policy_number, commission_percent, commission_amount,
      chart_percent, level_percent, parent_order_id, order_type,
      application_status, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'in_progress', 'In Progress')`,
    [user.id, order.policy_number, percent, amount, order.chart_percent, userLevel, parentOrderId, commissionType]
  );

  await db.query('UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2', [amount, user.id]);

  if (user.introducer_id) {
    await distributeCommissions(order, user.introducer_id, originalCommission, order.id, depth + 1);
  }
}

// Main handler
async function handleCommissions(order, userId) {
  const user = (await db.query('SELECT * FROM users WHERE id = $1', [userId])).rows[0];
  if (!user) return;

  const total = parseFloat(user.total_earnings || 0);
  const levelPercent = await getCommissionPercent(total);
  const chartPercent = order.chart_percent || 60; // default chart percent
  const split = parseFloat(order.split_percent || 100);

  const base = parseFloat(order.commission_from_carrier || 0);
  const effectivePercent = (chartPercent * levelPercent * split) / 10000;
  const personalCommission = base * effectivePercent;

  await db.query(
    `UPDATE life_orders SET chart_percent = $1, level_percent = $2, commission_amount = $3
     WHERE id = $4`,
    [chartPercent, levelPercent, personalCommission, order.id]
  );

  await db.query(
    'UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2',
    [personalCommission, userId]
  );

  await distributeCommissions(order, user.introducer_id, base, order.id);
}

module.exports = { handleCommissions };
