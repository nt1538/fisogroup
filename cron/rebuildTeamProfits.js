// cron/rebuildTeamProfits.js
const db = require('../db');

async function rebuildTeamProfits() {
  try {
    console.log('🛠 正在重新计算所有用户的 team_profit（滚动 12 个月内）...');

    const { rows: lifeOrders } = await db.query(`
      SELECT user_id, target_premium, COALESCE(product_rate, 1.00) AS product_rate
      FROM saved_life_orders
      WHERE commission_distribution_date >= NOW() - INTERVAL '12 months'
    `);

    const { rows: annuityOrders } = await db.query(`
      SELECT user_id, flex_premium, COALESCE(product_rate, 0.06) AS product_rate
      FROM saved_annuity_orders
      WHERE commission_distribution_date >= NOW() - INTERVAL '12 months'
    `);

    const allOrders = [
      ...lifeOrders.map(o => ({
        user_id: o.user_id,
        // life uses target_premium * product_rate (default 1.00)
        credit: (parseFloat(o.target_premium || 0) * parseFloat(o.product_rate || 100) / 100) || 0
      })),
      ...annuityOrders.map(o => ({
        user_id: o.user_id,
        // annuity uses flex_premium * product_rate (default 0.06)
        credit: (parseFloat(o.flex_premium || 0) * parseFloat(o.product_rate || 6) / 100) || 0
      })),
    ];

    const profitMap = new Map();
    for (const o of allOrders) {
      if (!o.user_id) continue;
      profitMap.set(o.user_id, (profitMap.get(o.user_id) || 0) + o.credit);
    }

    for (const [userId, profit] of profitMap.entries()) {
      await db.query(
        `UPDATE users SET team_profit = $1 WHERE id = $2`,
        [profit.toFixed(2), userId]
      );
      console.log(`🔄 更新用户 ${userId} 的 team_profit = ${profit.toFixed(2)}`);
    }

    console.log(`✅ 重算完成，共更新 ${profitMap.size} 位用户的 team_profit`);
  } catch (err) {
    console.error('❌ Error rebuilding team profits:', err);
  }
}

module.exports = { rebuildTeamProfits };
