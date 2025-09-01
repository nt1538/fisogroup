// cron/rebuildTeamProfits.js
const db = require('../db');

// ---- helpers (same behavior as your runtime logic) ----
async function getCommissionChart() {
  const res = await db.query(
    'SELECT title, min_amount, commission_percent FROM commission_chart ORDER BY min_amount ASC'
  );
  return res.rows || [];
}

function reconcileLevel(teamProfit, currentLevel, chart) {
  let idx = chart.findIndex(r => r.title === currentLevel);
  if (idx === -1) idx = 0; // if unknown, start from the lowest tier

  // promotion-only: keep bumping up while meeting next threshold
  while (idx + 1 < chart.length && teamProfit >= Number(chart[idx + 1].min_amount)) {
    idx++;
  }
  return chart[idx].title;
}

// ---- main job ----
async function rebuildTeamProfits() {
  try {
    console.log('🛠 正在重新计算所有用户的 team_profit（滚动 12 个月内）...');

    const { rows: lifeOrders } = await db.query(`
      SELECT user_id, target_premium, COALESCE(product_rate, 100) AS product_rate
      FROM saved_life_orders
      WHERE commission_distribution_date >= NOW() - INTERVAL '12 months'
    `);

    const { rows: annuityOrders } = await db.query(`
      SELECT user_id, flex_premium, COALESCE(product_rate, 6) AS product_rate
      FROM saved_annuity_orders
      WHERE commission_distribution_date >= NOW() - INTERVAL '12 months'
    `);

    const allOrders = [
      ...lifeOrders.map(o => ({
        user_id: o.user_id,
        credit:
          (parseFloat(o.target_premium || 0) * parseFloat(o.product_rate || 100)) / 100 || 0
      })),
      ...annuityOrders.map(o => ({
        user_id: o.user_id,
        credit:
          (parseFloat(o.flex_premium || 0) * parseFloat(o.product_rate || 6)) / 100 || 0
      })),
    ];

    const profitMap = new Map();
    for (const o of allOrders) {
      if (!o.user_id) continue;
      profitMap.set(o.user_id, (profitMap.get(o.user_id) || 0) + o.credit);
    }

    // fetch chart once
    const chart = await getCommissionChart();

    // update profit and (promotion-only) level
    for (const [userId, profit] of profitMap.entries()) {
      const profitFixed = Number(profit.toFixed(2));

      // 1) set team_profit to the recomputed rolling value
      await db.query(`UPDATE users SET team_profit = $1 WHERE id = $2`, [profitFixed, userId]);

      // 2) read current level and reconcile
      const { rows } = await db.query(
        `SELECT hierarchy_level, team_profit FROM users WHERE id = $1`,
        [userId]
      );
      if (!rows.length) continue;

      const currentLevel = rows[0].hierarchy_level;
      const teamProfitNow = Number(rows[0].team_profit) || 0;
      const newLevel = reconcileLevel(teamProfitNow, currentLevel, chart);

      if (newLevel !== currentLevel) {
        await db.query(`UPDATE users SET hierarchy_level = $1 WHERE id = $2`, [newLevel, userId]);
        console.log(`🔼 用户 ${userId} 晋升: ${currentLevel} → ${newLevel}（team_profit=${teamProfitNow}）`);
      } else {
        console.log(`🔄 更新用户 ${userId} 的 team_profit = ${profitFixed}（等级保持 ${currentLevel}）`);
      }
    }

    console.log(`✅ 重算完成，共更新 ${profitMap.size} 位用户的 team_profit 与等级`);
  } catch (err) {
    console.error('❌ Error rebuilding team profits:', err);
  }
}

module.exports = { rebuildTeamProfits };